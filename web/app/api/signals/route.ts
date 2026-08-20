import { NextResponse, type NextRequest } from "next/server";
import { getBuySignals } from "@/lib/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/signals — 공개 매수신호 조회(홈 폴링).
 * 기간·건수는 관리자 설정(home_signals_range/limit)으로 제어 → getBuySignals() 내부 적용.
 * RLS(note is null) 로 재생신호('[replay]') 는 자동 제외.
 */
export async function GET(_req: NextRequest) {
  const signals = await getBuySignals();
  return NextResponse.json({ signals, server_time: new Date().toISOString() });
}
