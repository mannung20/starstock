"use client";

import { useEffect, useState } from "react";

function relativeMin(iso: string | null): string {
  if (!iso) return "-";
  const diffMin = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  const d = new Date(iso);
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${hhmm} (${diffMin}분 전)`;
}

/** 갱신 상태 바: 마지막 데이터 시각 + 다음 폴링 카운트다운 도트 */
export function RefreshBar({
  lastDataISO,
  lastPollMs,
  intervalMs,
  stale,
}: {
  lastDataISO: string | null;
  lastPollMs: number;
  intervalMs: number;
  stale: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainMs = Math.max(0, lastPollMs + intervalMs - now);
  const remainMin = Math.ceil(remainMs / 60_000);
  const dotsTotal = 5;
  const filled = Math.round((remainMs / intervalMs) * dotsTotal);
  const dots = "●".repeat(filled) + "○".repeat(dotsTotal - filled);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
      <span>
        {stale ? "🔴 서버 연결 지연 — " : "📡 "}
        마지막 갱신: <span className="font-medium text-foreground">{relativeMin(lastDataISO)}</span>
      </span>
      <span>
        다음 갱신: {remainMin}분 후 <span className="tracking-widest">{dots}</span>
      </span>
    </div>
  );
}
