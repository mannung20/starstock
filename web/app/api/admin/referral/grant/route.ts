import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/referral/grant — 관리자 수동 VIP 보상 지급 (PRD 17-8)
 * body: { user_id: string, days: number, reason?: string }
 *  - referral_rewards 에 milestone 99+ / reward_type='manual' 로 이력 기록
 *  - grant_vip_days RPC 로 실제 VIP 일수 지급 (무기한/MAX 로직은 RPC 내부)
 *  - logAdminAction 감사 로그
 */
export async function POST(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { user_id?: string; days?: unknown; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = String(body.user_id ?? "").trim();
  if (!userId) return NextResponse.json({ error: "회원 ID 필수" }, { status: 400 });

  const days = Number(body.days);
  if (!Number.isFinite(days) || days < 1 || days > 3650)
    return NextResponse.json({ error: "지급 일수는 1~3650 사이여야 합니다" }, { status: 400 });
  const d = Math.trunc(days);

  const admin = createAdminClient();

  // 대상 회원 존재 확인
  const { data: prof } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (!prof) return NextResponse.json({ error: "존재하지 않는 회원" }, { status: 404 });

  // 다음 수동 milestone 번호 (99+ 구간, UNIQUE(referrer_id,milestone) 충돌 회피)
  const { data: last } = await admin
    .from("referral_rewards")
    .select("milestone")
    .eq("referrer_id", userId)
    .gte("milestone", 99)
    .order("milestone", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextMilestone = Math.max(98, (last as { milestone?: number } | null)?.milestone ?? 98) + 1;

  // 보상 이력 기록
  const { error: rwErr } = await admin.from("referral_rewards").insert({
    referrer_id: userId,
    milestone: nextMilestone,
    reward_days: d,
    reward_type: "manual",
  });
  if (rwErr) return NextResponse.json({ error: rwErr.message }, { status: 500 });

  // 실제 VIP 일수 지급 (무기한/기존만료일 MAX 연장 분기는 RPC 내부)
  const { error: rpcErr } = await admin.rpc("grant_vip_days", {
    p_user: userId,
    p_days: d,
    p_reason: "admin_manual",
  });
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });

  const email = (prof as { email?: string | null }).email ?? userId;
  const reason = String(body.reason ?? "").trim();
  await logAdminAction(
    ctx.userId,
    `수동 VIP ${d}일 지급 → ${email}${reason ? ` (${reason.slice(0, 100)})` : ""}`
  );
  return NextResponse.json({ success: true, days: d });
}
