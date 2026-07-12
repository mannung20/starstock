"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatKRW, formatPercent } from "@/lib/utils";
import type { StockHistoryRow, HistoryResult } from "@/lib/types";

const RESULTS: { key: HistoryResult; label: string; cls: string }[] = [
  { key: "profit", label: "이익", cls: "text-up" },
  { key: "loss", label: "손실", cls: "text-down" },
  { key: "hold", label: "진행중", cls: "text-muted-foreground" },
  { key: "cancel", label: "취소", cls: "text-muted-foreground" },
];

const input = "w-full rounded-md border px-3 py-2 text-sm";

function AddForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    stock_code: "", stock_name: "", recommend_date: "", close_date: "",
    entry_price: "", exit_price: "", result: "profit" as HistoryResult, notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  // 미리보기 수익률 (진입가·청산가 입력 시 자동)
  const preview = useMemo(() => {
    const e = Number(f.entry_price), x = Number(f.exit_price);
    if (!e || !Number.isFinite(e) || !Number.isFinite(x) || f.exit_price === "") return null;
    return Math.round(((x - e) / e) * 10000) / 100;
  }, [f.entry_price, f.exit_price]);

  async function submit() {
    if (!f.stock_code.trim()) return setErr("종목코드를 입력하세요");
    setSaving(true); setErr(null);
    const res = await fetch("/api/admin/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "저장 실패"); setSaving(false); return;
    }
    onDone();
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="font-bold">추천 마감 이력 추가</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">종목코드*
            <input className={input} value={f.stock_code} onChange={(e) => set("stock_code", e.target.value)} placeholder="005930" />
          </label>
          <label className="text-sm">종목명
            <input className={input} value={f.stock_name} onChange={(e) => set("stock_name", e.target.value)} placeholder="삼성전자" />
          </label>
          <label className="text-sm">추천일
            <input type="date" className={input} value={f.recommend_date} onChange={(e) => set("recommend_date", e.target.value)} />
          </label>
          <label className="text-sm">마감일
            <input type="date" className={input} value={f.close_date} onChange={(e) => set("close_date", e.target.value)} />
          </label>
          <label className="text-sm">진입가
            <input type="number" className={input} value={f.entry_price} onChange={(e) => set("entry_price", e.target.value)} placeholder="70000" />
          </label>
          <label className="text-sm">청산가
            <input type="number" className={input} value={f.exit_price} onChange={(e) => set("exit_price", e.target.value)} placeholder="78000" />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex gap-3">
            {RESULTS.map((r) => (
              <label key={r.key} className="flex items-center gap-1">
                <input type="radio" checked={f.result === r.key} onChange={() => set("result", r.key)} /> {r.label}
              </label>
            ))}
          </div>
          {preview != null && (
            <span className="text-sm">
              수익률 자동계산:{" "}
              <b className={preview > 0 ? "text-up" : preview < 0 ? "text-down" : ""}>{formatPercent(preview)}</b>
            </span>
          )}
        </div>

        <label className="block text-sm">비고
          <input className={input} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="목표 도달 / 손절 등" />
        </label>

        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onDone}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "저장 중…" : "저장"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HistoryManager({ rows }: { rows: StockHistoryRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function remove(r: StockHistoryRow) {
    if (!confirm(`${r.stock_name ?? r.stock_code} 이력을 삭제할까요?`)) return;
    await fetch(`/api/admin/history/${r.id}`, { method: "DELETE" });
    router.refresh();
  }
  function done() { setAdding(false); router.refresh(); }
  const meta = (k: HistoryResult | null) => RESULTS.find((r) => r.key === k);

  return (
    <div className="space-y-4">
      {adding ? (
        <AddForm onDone={done} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">공개 /history 수익률 현황에 반영됩니다.</p>
            <Button onClick={() => setAdding(true)}>+ 마감 이력 추가</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {["종목", "추천일", "마감일", "진입가", "청산가", "수익률", "결과", ""].map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const m = meta(r.result);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2"><span className="font-semibold">{r.stock_name ?? "-"}</span> <span className="text-xs text-muted-foreground">{r.stock_code}</span></td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.recommend_date ?? "-"}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.close_date ?? "-"}</td>
                      <td className="px-3 py-2 tabular-nums">{formatKRW(r.entry_price)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatKRW(r.exit_price)}</td>
                      <td className={`px-3 py-2 font-semibold tabular-nums ${r.return_rate != null && r.return_rate > 0 ? "text-up" : r.return_rate != null && r.return_rate < 0 ? "text-down" : ""}`}>
                        {r.return_rate != null ? formatPercent(r.return_rate) : "-"}
                      </td>
                      <td className={`px-3 py-2 font-medium ${m?.cls ?? ""}`}>{m?.label ?? "-"}</td>
                      <td className="px-3 py-2"><Button size="sm" variant="destructive" onClick={() => remove(r)}>삭제</Button></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">등록된 수익률 이력이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
