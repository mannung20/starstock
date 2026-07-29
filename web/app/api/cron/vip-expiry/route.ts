import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { vipExpiryEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import type { ProfileRow, SubscriptionRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 오늘 기준 offsetDays 일 뒤 날짜 (YYYY-MM-DD, UTC) */
function dateStr(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/**
 * GET /api/cron/vip-expiry — 매일 1회 (vercel.json cron).
 *   p4-8: 만료 VIP 자동 강등 (활성 구독 없으면 role='free')
 *   p4-5: 만료 D-3 / D-0 이메일 알림 (미발송 건만, 플래그로 중복 방지)
 * 인증: Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 헤더로 호출.
 * ?dryRun=1 : 변경/발송 없이 대상 수만 계산 (안전 점검용).
 */
export async function GET(req: NextRequest) {
  // 1) 인증 (CRON_SECRET 설정 시 강제). 로컬 미설정이면 통과(개발용).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dry = new URL(req.url).searchParams.get("dryRun") === "1";
  const admin = createAdminClient();
  const SITE_URL = await getSiteUrl(); // 관리자 대표주소 우선 → env → 영구주소 (notify 클로저가 캡처)
  const today = dateStr(0);
  const d3 = dateStr(3);

  // ── p4-8: 만료 VIP 강등 ──────────────────────────────
  // role='vip' 인데 활성 구독(무기한 end_date=null 또는 end_date>=today)이 없으면 free.
  const { data: vips } = await admin.from("profiles").select("id").eq("role", "vip");
  const vipIds = ((vips ?? []) as { id: string }[]).map((p) => p.id);

  let downgradeIds: string[] = [];
  if (vipIds.length > 0) {
    const { data: subs } = await admin
      .from("subscriptions")
      .select("user_id, end_date")
      .in("user_id", vipIds);
    const active = new Set<string>();
    for (const s of (subs ?? []) as { user_id: string; end_date: string | null }[]) {
      if (s.end_date === null || s.end_date >= today) active.add(s.user_id);
    }
    downgradeIds = vipIds.filter((id) => !active.has(id));
    if (!dry && downgradeIds.length > 0) {
      await admin.from("profiles").update({ role: "free" }).in("id", downgradeIds);
    }
  }

  // ── p4-5: 만료 알림 D-3 / D-0 ────────────────────────
  async function notify(
    dateEq: string,
    flag: "expiry_d3_notified" | "expiry_d0_notified",
    daysLeft: number
  ): Promise<number> {
    const { data: subs } = await admin
      .from("subscriptions")
      .select("id, user_id, end_date")
      .eq("end_date", dateEq)
      .eq(flag, false);
    const rows = (subs ?? []) as { id: number; user_id: string; end_date: string }[];
    if (rows.length === 0) return 0;

    const { data: profs } = await admin
      .from("profiles")
      .select("id, email, display_name, email_notify")
      .in("id", rows.map((r) => r.user_id));
    const pmap = new Map(
      ((profs ?? []) as Pick<ProfileRow, "id" | "email" | "display_name" | "email_notify">[]).map(
        (p) => [p.id, p]
      )
    );

    const done: number[] = [];
    for (const r of rows) {
      const p = pmap.get(r.user_id);
      if (!p?.email || p.email_notify === false) continue; // 이메일 없음/수신거부 제외
      if (dry) {
        done.push(r.id);
        continue;
      }
      const tpl = vipExpiryEmail({
        name: p.display_name ?? undefined,
        daysLeft,
        endDate: r.end_date,
        renewUrl: `${SITE_URL}/notice`,
      });
      const res = await sendEmail({ to: p.email, subject: tpl.subject, html: tpl.html, kind: "vip_expiry" });
      // 실제 발송 성공(provider 설정됨)일 때만 플래그 처리 → 키 추가 후 재발송 가능
      if (res.ok && !res.skipped) done.push(r.id);
    }

    if (!dry && done.length > 0) {
      const patch: Partial<SubscriptionRow> = { [flag]: true };
      await admin.from("subscriptions").update(patch).in("id", done);
    }
    return done.length;
  }

  const notified_d3 = await notify(d3, "expiry_d3_notified", 3);
  const notified_d0 = await notify(today, "expiry_d0_notified", 0);

  return NextResponse.json({
    ok: true,
    dry,
    today,
    downgraded: downgradeIds.length,
    notified_d3,
    notified_d0,
  });
}
