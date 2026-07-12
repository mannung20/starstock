import { NextResponse } from "next/server";
import { getStocksPayload } from "@/lib/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stocks — 회원 등급별 종목 조회 (폴링 대상, PRD 5-2).
 * RLS 가 rank 범위(비회원1/free3/vip10)와 is_visible 을 자동 필터링.
 * 비회원(guest)에게는 target_price/stop_price 를 null 로 반환 (F12 우회 차단).
 * 로직은 lib/server-data.getStocksPayload 로 홈 SSR 과 공유.
 */
export async function GET() {
  try {
    const payload = await getStocksPayload();
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
