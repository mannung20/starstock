import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/referral/read — 추천 알람 읽음 처리 (PRD api-11 / 섹션 17-7).
 * body: { all?: boolean, log_ids?: number[] }  — 둘 중 하나. 본인(referrer) 로그만 갱신.
 */
export async function POST(req: NextRequest) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { all?: boolean; log_ids?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const admin = createAdminClient();
  let q = admin
    .from("referral_logs")
    .update({ is_read: true })
    .eq("referrer_id", user.id)
    .eq("is_read", false);

  if (!body.all) {
    const ids = Array.isArray(body.log_ids)
      ? body.log_ids.map(Number).filter((n) => Number.isInteger(n))
      : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "all=true 또는 log_ids 배열이 필요합니다." },
        { status: 400 }
      );
    }
    q = q.in("id", ids);
  }

  const { error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
