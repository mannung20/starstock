import type { StockStatus } from "@/lib/types";

/** 엑셀 업로더가 보내는 종목 1건 */
export interface UploadStockItem {
  rank: number;
  hide: boolean; // stock_code 가 빈 문자열 → 해당 rank 숨김 마커 (PRD 4-4)
  stock_code: string;
  stock_name: string;
  current_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  target_price: number;
  stop_price: number;
  entry_price: number;
  entry_confirmed: boolean;
  status: StockStatus;
  memo: string | null;
}

export interface UploadPayload {
  timestamp: string;
  stocks: UploadStockItem[];
}

export type ValidationResult =
  | { ok: true; data: UploadPayload }
  | { ok: false; error: string; detail?: string };

const STATUS_VALUES: StockStatus[] = ["buy", "hold", "sell"];

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
    return Math.trunc(Number(v));
  return null;
}

/**
 * 업로드 페이로드 유효성 검사 (PRD 섹션 6-2).
 * - stocks 배열 길이 1~10
 * - rank 1~10 정수 (중복 불가)
 * - stock_code 6자리 숫자
 * - current_price > 0 (DDE #N/A 방지)
 * - status buy/hold/sell
 * 목표가/손절가/시고저가는 0 허용(운영자 미입력 가능).
 */
export function validateUploadPayload(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "Invalid data format", detail: "body가 객체가 아님" };

  const b = body as Record<string, unknown>;

  if (typeof b.timestamp !== "string")
    return { ok: false, error: "Invalid data format", detail: "timestamp 누락" };

  if (!Array.isArray(b.stocks))
    return { ok: false, error: "Invalid data format", detail: "stocks 배열 누락" };

  if (b.stocks.length < 1 || b.stocks.length > 10)
    return { ok: false, error: "Invalid data format", detail: "stocks 길이는 1~10" };

  const seenRanks = new Set<number>();
  const items: UploadStockItem[] = [];

  for (let i = 0; i < b.stocks.length; i++) {
    const raw = b.stocks[i] as Record<string, unknown>;
    const where = `stocks[${i}]`;

    const rank = toInt(raw.rank);
    if (rank === null || rank < 1 || rank > 10)
      return { ok: false, error: "Invalid data format", detail: `${where}.rank 는 1~10` };
    if (seenRanks.has(rank))
      return { ok: false, error: "Invalid data format", detail: `rank ${rank} 중복` };
    seenRanks.add(rank);

    const stockCode = String(raw.stock_code ?? "").trim();

    // 빈 stock_code = 숨김 마커 (해당 rank is_visible=false 처리, 가격 검증 스킵)
    if (stockCode === "") {
      items.push({
        rank,
        hide: true,
        stock_code: "",
        stock_name: "",
        current_price: 0,
        open_price: 0,
        high_price: 0,
        low_price: 0,
        target_price: 0,
        stop_price: 0,
        entry_price: 0,
        entry_confirmed: false,
        status: "hold",
        memo: null,
      });
      continue;
    }

    if (!/^\d{6}$/.test(stockCode))
      return { ok: false, error: "Invalid data format", detail: `${where}.stock_code 는 6자리 숫자` };

    const currentPrice = toInt(raw.current_price);
    if (currentPrice === null || currentPrice <= 0)
      return { ok: false, error: "Invalid data format", detail: `${where}.current_price 는 0 초과` };

    const status = String(raw.status ?? "hold") as StockStatus;
    if (!STATUS_VALUES.includes(status))
      return { ok: false, error: "Invalid data format", detail: `${where}.status 는 buy/hold/sell` };

    items.push({
      rank,
      hide: false,
      stock_code: stockCode,
      stock_name: String(raw.stock_name ?? "").slice(0, 50),
      current_price: currentPrice,
      open_price: toInt(raw.open_price) ?? 0,
      high_price: toInt(raw.high_price) ?? 0,
      low_price: toInt(raw.low_price) ?? 0,
      target_price: toInt(raw.target_price) ?? 0,
      stop_price: toInt(raw.stop_price) ?? 0,
      entry_price: toInt(raw.entry_price) ?? 0,
      entry_confirmed: raw.entry_confirmed === true,
      status,
      memo: raw.memo == null ? null : String(raw.memo),
    });
  }

  return { ok: true, data: { timestamp: b.timestamp, stocks: items } };
}

/** 요청 timestamp 가 서버 시각과 ±maxSkewSec 이내인지 (리플레이 방지) */
export function isTimestampFresh(timestamp: string, maxSkewSec = 30): boolean {
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return false;
  const diffSec = Math.abs(Date.now() - t) / 1000;
  return diffSec <= maxSkewSec;
}
