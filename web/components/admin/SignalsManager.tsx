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
// 홈 공개 기간 옵션. 관리자 조회 프리셋과 라벨은 같지만 '홈 노출 범위'를 뜻하는 별개 설정.
type HomeRange = "today" | "7d" | "30d" | "all";
const HOME_RANGE_LABEL: Record<HomeRange, string> = {
  today: "오늘",
  "7d": "최근7일",
  "30d": "최근30일",
  all: "전체",
};

export function SignalsManager({
  initial,
  today,
  homeVisible,
  homeRange,
  homeLimit,
}: {
  initial: BuySignalRow[];
  today: string; // KST YYYY-MM-DD
  homeVisible: boolean;
  homeRange: string; // today|7d|30d|all
  homeLimit: number; // 홈 표시 건수
}) {
  const [signals, setSignals] = useState<BuySignalRow[]>(initial);
  const [preset, setPreset] = useState<Preset>("all");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [showHome, setShowHome] = useState(homeVisible);
  const [savingCfg, setSavingCfg] = useState(false);

  // 홈 공개 범위(기간·건수) — 조회용 프리셋과 독립. '저장' 눌러야 실제 반영.
  const [pubRange, setPubRange] = useState<HomeRange>(
    (["today", "7d", "30d", "all"].includes(homeRange) ? homeRange : "all") as HomeRange
  );
  const [pubLimit, setPubLimit] = useState<number>(homeLimit);
  const [savingPub, setSavingPub] = useState(false);
  const [pubSaved, setPubSaved] = useState(false);

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

  // 전체 초기화: 재생신호 + note=null 유령신호까지 모두 삭제(테스트 데이터 정리용).
  // 실운영 신호도 함께 사라지므로 이중 확인.
  async function bulkDeleteAll() {
    if (!confirm("⚠️ 매수신호 이력을 '전체' 삭제합니다.\n재생신호뿐 아니라 홈에 보이는 실운영 신호까지 모두 사라집니다.\n계속할까요?")) return;
    if (prompt('되돌릴 수 없습니다. 계속하려면 "초기화" 를 입력하세요.') !== "초기화") return;
    const res = await fetch(`/api/admin/signals?scope=all`, { method: "DELETE" });
    if (res.ok) {
      const j = (await res.json().catch(() => ({}))) as { deleted?: number };
      alert(`매수신호 전체 ${j.deleted ?? 0}건 초기화 완료`);
      setSignals([]);
    } else {
      alert("전체 초기화에 실패했습니다.");
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

  // 홈 공개 범위(기간·건수) 저장 → home_signals_range / home_signals_limit
  async function savePublic() {
    const lim = Math.min(Math.max(Math.round(pubLimit) || 5, 1), 50);
    setPubLimit(lim);
    setSavingPub(true);
    setPubSaved(false);
    const res = await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: { home_signals_range: pubRange, home_signals_limit: String(lim) },
      }),
    });
    setSavingPub(false);
    if (res.ok) {
      setPubSaved(true);
      setTimeout(() => setPubSaved(false), 2000);
    } else {
      alert("공개 범위 저장에 실패했습니다.");
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
        <div className="flex items-center gap-2">
          <Button variant="destructive" onClick={bulkDeleteReplay}>재생신호 일괄삭제</Button>
          <Button variant="destructive" onClick={bulkDeleteAll}>전체 이력 초기화</Button>
        </div>
      </div>

      {/* 홈 공개 범위(기간·건수) — 아래 조회 버튼과 별개로, 회원 홈에 실제 노출될 범위 설정 */}
      <div className={`rounded-lg border p-4 ${showHome ? "" : "opacity-60"}`}>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold">🏠 홈 공개 범위</span>
          <span className="text-xs text-muted-foreground">회원 홈에 노출할 매수신호 기간·건수</span>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">공개 기간</span>
            <select
              value={pubRange}
              onChange={(e) => setPubRange(e.target.value as HomeRange)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              {(["today", "7d", "30d", "all"] as HomeRange[]).map((r) => (
                <option key={r} value={r}>{HOME_RANGE_LABEL[r]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">공개 건수 (1~50)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={pubLimit}
              onChange={(e) => setPubLimit(Number(e.target.value))}
              className="w-28 rounded-md border px-3 py-1.5 text-sm"
            />
          </label>
          <Button onClick={savePublic} disabled={savingPub}>
            {savingPub ? "저장 중…" : "공개 범위 저장"}
          </Button>
          {pubSaved && <span className="pb-1.5 text-xs text-emerald-600">저장됨 ✓</span>}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          현재 설정: <b>{HOME_RANGE_LABEL[pubRange]}</b> 기간 내 최신 <b>{pubLimit}</b>건을 홈에 공개
          {!showHome && " · (지금은 '홈 표시' 꺼짐 상태라 회원에게 보이지 않습니다)"}
        </p>
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
              {([
                { h: "종목" }, { h: "발생시각(KST)" },
                { h: "매수기준가", r: true }, { h: "발생가", r: true }, { h: "순위", r: true },
                { h: "비고" }, { h: "" },
              ] as { h: string; r?: boolean }[]).map(({ h, r }, i) => (
                <th key={i} className={`whitespace-nowrap px-3 py-2 font-medium${r ? " text-right" : ""}`}>{h}</th>
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
                <td className="px-3 py-2 tabular-nums text-right">{formatKRW(s.entry_price)}</td>
                <td className="px-3 py-2 tabular-nums text-right">{formatKRW(s.signal_price)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-muted-foreground">{s.rank ?? "-"}</td>
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
