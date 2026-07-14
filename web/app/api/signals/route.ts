import { NextResponse, type NextRequest } from "next/server";
import { getBuySignals } from "@/lib/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/signals?limit=N — 공개 매수신호 조회(홈 폴링).
 * RLS(note is null) 로 재생신호('[replay]') 는 자동 제외.
 */
export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 5, 1), 50);
  const signals = await getBuySignals(limit);
  return NextResponse.json({ signals, server_time: new Date().toISOString() });
}
