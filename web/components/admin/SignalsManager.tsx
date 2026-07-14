"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";
import type { BuySignalRow } from "@/lib/types";

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

type Preset = "today" | "7d" | "30d" | "all" | "custom";

/**
 * 관리자 매수신호 이력 관리: 날짜별 조회(프리셋+단일날짜) · 개별삭제 · 재생신호 일괄삭제
 * · 홈 표시여부 체크박스(home_signals_visible).
 */
export function SignalsManager({
  initial,
  today,
  homeVisible,
}: {
  initial: BuySignalRow[];
  today: string; // KST YYYY-MM-DD
  homeVisible: boolean;
}) {
  const [signals, setSignals] = useState<BuySignalRow[]>(initial);
  const [preset, setPreset] = useState<Preset>("today");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [showHome, setShowHome] = useState(homeVisible);
  const [savingCfg, setSavingCfg] = useState(false);

  const load = useCallback(async (from: string | null, to: string | null) => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const res = await fetch(`/api/admin/signals?${qs.toString()}`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { signals: BuySignalRow[] };
      setSignals(json.signals ?? []);
    }
    setLoading(false);
  }, []);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "today") { setDate(today); load(today, today); }
    else if (p === "7d") load(daysAgo(6), today);
    else if (p === "30d") load(daysAgo(29), today);
    else if (p === "all") load(null, null);
  }
  function applyDate(d: string) {
    setDate(d);
    setPreset("custom");
    load(d, d);
  }

  async function removeOne(s: BuySignalRow) {
    if (!confirm(`${s.stock_name || s.stock_code} 신호(${fmtDateTime(s.signaled_at)})를 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/signals/${s.id}`, { method: "DELETE" });
    if (res.ok) setSignals((prev) => prev.filter((x) => x.id !== s.id));
  }

  async function bulkDeleteReplay() {
    if (!confirm("재생신호([replay])를 모두 삭제할까요?")) return;
    const res = await fetch(`/api/admin/signals?note=replay`, { method: "DELETE" });
    if (res.ok) {
      const j = (await res.json().catch(() => ({}))) as { deleted?: number };
      alert(`재생신호 ${j.deleted ?? 0}건 삭제`);
      setSignals((prev) => prev.filter((x) => x.note !== "[replay]"));
    }
  }

  async function toggleHome(next: boolean) {
    setShowHome(next);
    setSavingCfg(true);
    const res = await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: { home_signals_visible: next ? "true" : "false" } }),
    });
    setSavingCfg(false);
    if (!res.ok) {
      setShowHome(!next);
      alert("설정 저장에 실패했습니다.");
    }
  }

  const presetBtn = (p: Preset, label: string) => (
    <button
      onClick={() => applyPreset(p)}
      className={`rounded-md border px-3 py-1.5 text-sm ${preset === p ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* 홈 표시여부 + 재생신호 정리 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showHome} disabled={savingCfg} onChange={(e) => toggleHome(e.target.checked)} />
          홈 화면에 매수신호 이력 표시
          {savingCfg && <span className="text-xs text-muted-foreground">저장 중…</span>}
        </label>
        <Button variant="destructive" onClick={bulkDeleteReplay}>재생신호 일괄삭제</Button>
      </div>

      {/* 날짜별 조회 */}
      <div className="flex flex-wrap items-center gap-2">
        {presetBtn("today", "오늘")}
        {presetBtn("7d", "최근7일")}
        {presetBtn("30d", "최근30일")}
        {presetBtn("all", "전체")}
        <input
          type="date"
          value={date}
          onChange={(e) => applyDate(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        />
        <span className="ml-auto text-sm text-muted-foreground">
          총 {signals.length}건{loading && " · 불러오는 중…"}
        </span>
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {["종목", "발생시각(KST)", "매수기준가", "발생가", "순위", "비고", ""].map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">
                  <span className="font-semibold">{s.stock_name || "-"}</span>{" "}
                  <span className="text-xs text-muted-foreground">{s.stock_code}</span>
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmtDateTime(s.signaled_at)}</td>
                <td className="px-3 py-2 tabular-nums">{formatKRW(s.entry_price)}</td>
                <td className="px-3 py-2 tabular-nums">{formatKRW(s.signal_price)}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{s.rank ?? "-"}</td>
                <td className="px-3 py-2">
                  {s.note === "[replay]" && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">재생</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="destructive" onClick={() => removeOne(s)}>삭제</Button>
                </td>
              </tr>
            ))}
            {signals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  해당 기간 매수신호가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
