import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stocks/status — 엑셀 연동 상태 (마지막 업로드 시각). 공개.
 * PRD 섹션 5-2. upload_logs 는 관리자 전용 RLS 이므로 service_role 로 조회하되
 * 민감정보 없이 시각/상태만 노출.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("upload_logs")
      .select("uploaded_at, status")
      .eq("action_type", "upload")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const row = data as { uploaded_at: string; status: string | null } | null;
    if (!row) {
      return NextResponse.json({ last_upload: null, status: "no_data" });
    }

    // 마지막 업로드가 15분 이내면 ok, 아니면 stale
    const ageMin = (Date.now() - Date.parse(row.uploaded_at)) / 60_000;
    const fresh = ageMin <= 15 && row.status === "success";

    return NextResponse.json({
      last_upload: row.uploaded_at,
      status: fresh ? "ok" : "stale",
      last_status: row.status,
    });
  } catch (e) {
    return NextResponse.json(
      { last_upload: null, status: "error", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
