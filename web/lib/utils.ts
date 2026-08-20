import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 원화 정수 포맷 (예: 73200 -> "73,200") */
export function formatKRW(value: number | null | undefined): string {
  // ⚠️ Supabase numeric 컬럼은 런타임에 문자열("70000")로 올 수 있어 Number 강제.
  const n = typeof value === "number" ? value : Number(value);
  if (value == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("ko-KR");
}

/** 소수 1자리 퍼센트 (부호 포함, 예: 16.05 -> "+16.1%") */
export function formatPercent(value: number | null | undefined): string {
  // ⚠️ numeric→문자열 대비 Number 강제(문자열이면 .toFixed 없어 TypeError 발생).
  const n = typeof value === "number" ? value : Number(value);
  if (value == null || !Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
