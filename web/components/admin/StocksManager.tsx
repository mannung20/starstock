"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { upEnergy, energyBand } from "@/lib/stock-calc";
import { formatKRW } from "@/lib/utils";
import type { StockRow, StockStatus } from "@/lib/types";

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}/${parts[2]}`;
}

function Row({ stock }: { stock: StockRow }) {
  const router = useRouter();
  const [target, setTarget] = useState(String(stock.target_price));
  const [stop, setStop] = useState(String(stock.stop_price));
  const [status, setStatus] = useState<StockStatus>(stock.status);
  const [memo, setMemo] = useState(stock.memo ?? "");
  const [visible, setVisible] = useState(stock.is_visible);
  const [saving, setSaving] = useState(false);

  const empty = !stock.stock_code;
  const energy = upEnergy(stock);

  async function toggleVisible() {
    const next = !visible;
    setVisible(next);
    await fetch(`/api/admin/stocks/${stock.stock_code}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_visible: next }),
    });
    router.refresh();
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/stocks/${stock.stock_code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        memo,
        target_price: Number(target) || 0,
        stop_price: Number(stop) || 0,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <tr className={`border-t align-top ${!visible ? "bg-muted/40 text-muted-foreground line-through" : ""}`}>
      <td className="px-2 py-2">
        <button onClick={toggleVisible} title="표시/숨김 토글">{visible ? "🟢" : "⚫"}</button>
      </td>
      <td className="px-2 py-2 tabular-nums text-xs text-muted-foreground">{fmtDate(stock.entry_date)}</td>
      <td className="px-2 py-2 font-bold text-muted-foreground">{stock.rank}</td>
      <td className="px-2 py-2 font-semibold">{empty ? "(비어있음)" : stock.stock_name}</td>
      <td className="px-2 py-2 tabular-nums">{formatKRW(stock.current_price)}</td>
      <td className="px-2 py-2">
        <input value={target} onChange={(e) => setTarget(e.target.value)} className="w-24 rounded border px-2 py-1 text-sm tabular-nums" inputMode="numeric" />
      </td>
      <td className="px-2 py-2">
        <input value={stop} onChange={(e) => setStop(e.target.value)} className="w-24 rounded border px-2 py-1 text-sm tabular-nums" inputMode="numeric" />
      </td>
      <td className="px-2 py-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as StockStatus)} className="rounded border px-2 py-1 text-sm">
          <option value="buy">buy</option>
          <option value="hold">hold</option>
          <option value="sell">sell</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <input value={memo} onChange={(e) => setMemo(e.target.value)} className="w-40 rounded border px-2 py-1 text-sm" />
      </td>
      <td className="px-2 py-2 tabular-nums">
        {stock.entry_confirmed ? `${formatKRW(stock.entry_price)} ✅` : "- ⬜"}
      </td>
      <td className="px-2 py-2 tabular-nums">
        {energy != null ? `${Math.round(energy)}% ${energyBand(energy).badge}` : "-"}
      </td>
      <td className="px-2 py-2">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "…" : "저장"}</Button>
      </td>
    </tr>
  );
}

export function StocksManager({ stocks }: { stocks: StockRow[] }) {
  const [dateFilter, setDateFilter] = useState<string>("all");

  const uniqueDates = Array.from(
    new Set(stocks.map((s) => s.entry_date).filter(Boolean))
  ).sort().reverse() as string[];

  const filtered =
    dateFilter === "all" ? stocks : stocks.filter((s) => s.entry_date === dateFilter);

  const cols = ["표시", "날짜", "순위", "종목명", "현재가", "목표가", "손절가", "상태", "메모", "매수기준가", "상승에너지", ""];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">날짜 필터</span>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="all">전체 ({stocks.length}종목)</option>
          {uniqueDates.map((d) => (
            <option key={d} value={d}>
              {d} ({stocks.filter((s) => s.entry_date === d).length}종목)
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>{cols.map((c, i) => <th key={i} className="whitespace-nowrap px-2 py-2 font-medium">{c}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((s) => <Row key={s.stock_code || s.rank} stock={s} />)}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        🟢 표시중 · ⚫ 숨김(클릭 토글) · ✅ 매수기준가 확정 · ⬜ 미확정 · 날짜=TOP10 진입일 · 값 수정 후 [저장]
      </p>
    </div>
  );
}
