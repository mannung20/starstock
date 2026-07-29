// =============================================================================
// 자동 최고달성률(max_pct) 등급/표시 헬퍼 — PRD v3 자동수익률이력기록 (rev3) 4-2/4-3
// API(server)와 관리자 자동표(client)가 공유. 순수 함수(테스트 용이).
// =============================================================================

/** 등급 경계(마일스톤). 큰 값부터 검사. */
export const BUCKET_THRESHOLDS = [10, 7, 5, 3, 1] as const;

/** 신호+60분 추적창(밀리초). tracking_until = signaled_at + 이 값(단축 아닐 때). */
export const TRACK_WINDOW_MS = 60 * 60 * 1000;

/**
 * 최고달성률(pct)이 넘어선 최고 마일스톤(10/7/5/3/1). 1% 미만이면 null.
 * (4-3 <1% 분기: 숫자 t 유무로 병기 문구를 갈라야 함)
 */
export function bucketValue(pct: number): number | null {
  for (const t of BUCKET_THRESHOLDS) if (pct >= t) return t;
  return null;
}

/**
 * 병기 표기(F-3): "4.7% (최대 3%달성)" / "0.4% (1% 미만)".
 * bucketValue 가 null(=<1%)이면 '(1% 미만)', 아니면 '(최대 t%달성)'.
 */
export function formatAchieved(pct: number): string {
  const t = bucketValue(pct);
  return t != null
    ? `${pct.toFixed(1)}% (최대 ${t}%달성)`
    : `${pct.toFixed(1)}% (1% 미만)`;
}

/** 등급 라벨만(요약/배지용): "최대 3%달성" / "1% 미만" */
export function bucketLabel(pct: number): string {
  const t = bucketValue(pct);
  return t != null ? `최대 ${t}%달성` : "1% 미만";
}

/**
 * 단축창 여부: tracking_until 이 (signaled_at + 60분)보다 이르면 true.
 * (마감 15:30 근처 신호 → least() 로 창이 당겨짐. 트리거가 동일 now() 로 두 값을
 *  세팅하므로 완주창은 정확히 동일 → '<' 비교로 단축만 걸러짐.)
 */
export function isShortWindow(signaledAt: string, trackingUntil: string | null): boolean {
  if (!trackingUntil) return false;
  return Date.parse(trackingUntil) < Date.parse(signaledAt) + TRACK_WINDOW_MS;
}

/** 관리자 자동표 1행 */
export type SignalPerfRow = {
  id: number;
  stock_code: string;
  stock_name: string;
  entry_price: number;
  signaled_at: string;      // timestamptz (KST 변환은 표시단)
  max_pct: number;
  rank: number | null;
  is_short: boolean;        // 단축창(요약 집계 제외 대상)
};

/** 등급별 건수 + 평균(완주창만 집계) */
export type SignalPerfSummary = {
  total: number;            // 완주창(full) 집계 대상 수
  buckets: { g10: number; g7: number; g5: number; g3: number; g1: number; lt1: number };
  avgMaxPct: number | null; // 완주창 평균 최고달성률(%)
  shortCount: number;       // 단축창 수(집계 제외, 참고 표시용)
};

/**
 * 요약 집계 — ★단축창(is_short) 신호는 창 길이 불균형으로 평균/등급건수를 왜곡하므로
 * 완주창(full)만 집계. 단축창 수는 참고로 별도 카운트.
 * 등급 건수는 bucketValue 기준 배타적(합계 = total).
 */
export function summarize(rows: SignalPerfRow[]): SignalPerfSummary {
  const full = rows.filter((r) => !r.is_short);
  const b = { g10: 0, g7: 0, g5: 0, g3: 0, g1: 0, lt1: 0 };
  let sum = 0;
  for (const r of full) {
    sum += r.max_pct;
    switch (bucketValue(r.max_pct)) {
      case 10: b.g10++; break;
      case 7: b.g7++; break;
      case 5: b.g5++; break;
      case 3: b.g3++; break;
      case 1: b.g1++; break;
      default: b.lt1++; break;
    }
  }
  return {
    total: full.length,
    buckets: b,
    avgMaxPct: full.length ? Math.round((sum / full.length) * 100) / 100 : null,
    shortCount: rows.length - full.length,
  };
}
