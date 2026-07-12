/**
 * 초경량 인메모리 레이트리밋 (PRD 6-2: 분당 10회).
 * ⚠️ Vercel 서버리스는 인스턴스마다 메모리가 분리되고 콜드스타트 시 초기화되므로
 *    엄밀한 전역 제한은 아님(best-effort). 엄격 제한 필요 시 Upstash Redis 로 교체.
 *    10종목 소규모 + 단일 업로더 특성상 MVP 수준에서는 충분.
 */
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (arr.length >= limit) {
    const oldest = arr[0];
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    hits.set(key, arr);
    return { allowed: false, retryAfterSec };
  }

  arr.push(now);
  hits.set(key, arr);
  return { allowed: true, retryAfterSec: 0 };
}
