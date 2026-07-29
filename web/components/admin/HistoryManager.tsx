"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatKRW, formatPercent } from "@/lib/utils";
import {
  bucketValue,
  formatAchieved,
  bucketLabel,
  summarize,
  type SignalPerfRow,
} from "@/lib/signal-performance";
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

/** 수동 이력(stock_history) — 기존 표. */
function ManualView({
  rows,
  homeVisible,
}: {
  rows: StockHistoryRow[];
  homeVisible: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [showHome, setShowHome] = useState(homeVisible);
  const [savingCfg, setSavingCfg] = useState(false);

  async function remove(r: StockHistoryRow) {
    if (!confirm(`${r.stock_name ?? r.stock_code} 이력을 삭제할까요?`)) return;
    await fetch(`/api/admin/history/${r.id}`, { method: "DELETE" });
    router.refresh();
  }
  function done() { setAdding(false); router.refresh(); }
  const meta = (k: HistoryResult | null) => RESULTS.find((r) => r.key === k);

  // 홈 화면 표시여부 토글 → site_config.home_performance_visible 저장
  async function toggleHome(next: boolean) {
    setShowHome(next); // 낙관적 반영
    setSavingCfg(true);
    const res = await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: { home_performance_visible: next ? "true" : "false" } }),
    });
    setSavingCfg(false);
    if (!res.ok) {
      setShowHome(!next); // 실패 시 롤백
      alert("설정 저장에 실패했습니다.");
    }
  }

  if (adding) return <AddForm onDone={done} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showHome}
            disabled={savingCfg}
            onChange={(e) => toggleHome(e.target.checked)}
          />
          홈 화면에 수익률 현황 표시
          {savingCfg && <span className="text-xs text-muted-foreground">저장 중…</span>}
        </label>
        <Button onClick={() => setAdding(true)}>+ 마감 이력 추가</Button>
      </div>
      <p className="text-xs text-muted-foreground">공개 /history 및 홈 수익률 현황에 반영됩니다.</p>
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
                    {r.signal_id != null && r.return_rate != null && <span className="mr-1 text-xs font-normal text-muted-foreground">최고</span>}
                    {r.return_rate != null ? formatPercent(r.return_rate) : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {r.signal_id != null ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">최고달성</span>
                    ) : (
                      <span className={`font-medium ${m?.cls ?? ""}`}>{m?.label ?? "-"}</span>
                    )}
                  </td>
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
    </div>
  );
}

/** KST 신호시각 표기(MM/DD HH:mm) */
function fmtKST(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** 등급 배지 색상(달성률↑일수록 강조) */
function gradeCls(pct: number): string {
  const t = bucketValue(pct);
  if (t == null) return "text-muted-foreground";
  if (t >= 7) return "text-up font-bold";
  if (t >= 3) return "text-up";
  return "text-foreground";
}

/** 자동 이력(buy_signals finalized) — 최고달성률 표 + 요약 + 안내문. 진입 시 lazy fetch. */
function AutoView({ bridge }: { bridge: BridgeConfig }) {
  const router = useRouter();
  const [rows, setRows] = useState<SignalPerfRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [cfg, setCfg] = useState(bridge);
  const [minPctInput, setMinPctInput] = useState(String(bridge.minPct));
  const [savingCfg, setSavingCfg] = useState(false);

  // 브릿지 설정 저장(site_config PATCH). 낙관적 반영 후 실패 시 롤백.
  async function saveCfg(next: Partial<BridgeConfig>) {
    const prev = cfg;
    const merged = { ...cfg, ...next };
    setCfg(merged);
    setSavingCfg(true);
    const res = await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: {
          auto_bridge_enabled: merged.enabled ? "true" : "false",
          auto_bridge_min_pct: String(merged.minPct),
          auto_bridge_full_only: merged.fullOnly ? "true" : "false",
        },
      }),
    });
    setSavingCfg(false);
    if (!res.ok) { setCfg(prev); alert("설정 저장 실패"); }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const res = await fetch("/api/admin/signal-performance");
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "조회 실패");
        if (alive) setRows(j.rows ?? []);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 요약은 로컬 rows 로 재계산 → 수정/삭제 시 평균·등급건수 즉시 반영.
  const s = useMemo(() => summarize(rows), [rows]);

  async function remove(r: SignalPerfRow) {
    if (!confirm(`${r.stock_name || r.stock_code} 자동 이력(#${r.id})을 삭제할까요?\n매수신호 이력 1건이 제거됩니다.`)) return;
    setBusyId(r.id);
    const res = await fetch(`/api/admin/signal-performance/${r.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) { alert("삭제 실패"); return; }
    setRows((p) => p.filter((x) => x.id !== r.id));
    // CASCADE 로 승격행(stock_history)도 삭제됨 → 수동탭(서버 prop) 갱신 위해 refresh.
    router.refresh();
  }

  function startEdit(r: SignalPerfRow) {
    setEditingId(r.id);
    setEditVal(String(r.max_pct));
  }

  async function saveEdit(r: SignalPerfRow) {
    const v = Number(editVal);
    if (!Number.isFinite(v)) { alert("숫자를 입력하세요"); return; }
    setBusyId(r.id);
    const res = await fetch(`/api/admin/signal-performance/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_pct: v }),
    });
    setBusyId(null);
    if (!res.ok) { alert("수정 실패"); return; }
    const j = await res.json().catch(() => ({}));
    const nv = typeof j.max_pct === "number" ? j.max_pct : v;
    setRows((p) => p.map((x) => (x.id === r.id ? { ...x, max_pct: nv } : x)));
    setEditingId(null);
  }

  return (
    <div className="space-y-4">
      {/* 홈 자동승격(브릿지) 설정 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm">
          <span className="font-semibold">홈 자동승격</span>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.enabled} disabled={savingCfg}
              onChange={(e) => saveCfg({ enabled: e.target.checked })} />
            사용
          </label>
          <label className="flex items-center gap-1">
            최소 최고달성률
            <input type="number" step="0.5" value={minPctInput} disabled={savingCfg}
              onChange={(e) => setMinPctInput(e.target.value)}
              onBlur={() => {
                const v = Number(minPctInput);
                if (Number.isFinite(v) && v !== cfg.minPct) saveCfg({ minPct: v });
                else setMinPctInput(String(cfg.minPct));
              }}
              className="w-16 rounded-md border px-2 py-1 text-sm" />
            %
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.fullOnly} disabled={savingCfg}
              onChange={(e) => saveCfg({ fullOnly: e.target.checked })} />
            완주창만
          </label>
          {savingCfg && <span className="text-xs text-muted-foreground">저장 중…</span>}
          <span className="w-full text-xs text-muted-foreground">
            켜면 실신호·완주창·최고 {cfg.minPct}%↑ 신호가 확정 시 홈 수익률 현황에 최고달성으로 자동 노출됩니다(실현수익과 별도 표기).
          </span>
        </CardContent>
      </Card>

      {/* 안내문 (상시) */}
      <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <p>• 같은 종목이 하루에 여러 번 매수적기가 나면(쿨다운 후 재발생) 각각 <b>독립 이력</b>으로 기록됩니다 → 같은 종목이 여러 줄 보이는 것은 정상입니다.</p>
        <p>• 재생([replay]) 신호는 최고달성률 <b>집계에서 제외</b>됩니다(실시간 실신호만 집계).</p>
        <p>• 달성률은 <b>매수기준가(전일고가) 대비</b>이며, 신호 시점이 이미 설정된 밴드 상한 범위에서 시작할 수 있습니다. / 15:30 장마감 이후 신호는 추적창이 단축될 수 있습니다(<b>단축창</b> 표식, 요약 평균·등급 집계 제외).</p>
      </div>

      {/* 요약 (완주창만 집계) */}
      {!loading && rows.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
            <span className="font-semibold">집계 {s.total}건<span className="text-xs font-normal text-muted-foreground"> (완주창)</span></span>
            <span>평균 최고달성률 <b className="text-up">{s.avgMaxPct != null ? `${s.avgMaxPct.toFixed(1)}%` : "-"}</b> <span className="text-xs text-muted-foreground">(전일고가 대비)</span></span>
            <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>최대10% <b className="text-foreground">{s.buckets.g10}</b></span>
              <span>7% <b className="text-foreground">{s.buckets.g7}</b></span>
              <span>5% <b className="text-foreground">{s.buckets.g5}</b></span>
              <span>3% <b className="text-foreground">{s.buckets.g3}</b></span>
              <span>1% <b className="text-foreground">{s.buckets.g1}</b></span>
              <span>1%미만 <b className="text-foreground">{s.buckets.lt1}</b></span>
            </span>
            {s.shortCount > 0 && (
              <span className="text-xs text-muted-foreground">단축창 {s.shortCount}건(집계 제외)</span>
            )}
          </CardContent>
        </Card>
      )}

      {err && <p className="text-sm text-destructive">불러오기 실패: {err}</p>}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {["종목", "신호시각(KST)", "매수기준가", "최고달성률 (전일고가 대비)", "등급", "순위", "표식", "관리"].map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const editing = editingId === r.id;
              return (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2"><span className="font-semibold">{r.stock_name || "-"}</span> <span className="text-xs text-muted-foreground">{r.stock_code}</span></td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmtKST(r.signaled_at)}</td>
                <td className="px-3 py-2 tabular-nums">{formatKRW(r.entry_price)}</td>
                <td className={`px-3 py-2 font-semibold tabular-nums ${gradeCls(r.max_pct)}`}>
                  {editing ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number" step="0.01" autoFocus value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        className="w-24 rounded-md border px-2 py-1 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </span>
                  ) : formatAchieved(r.max_pct)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap"><span className={`rounded bg-muted px-1.5 py-0.5 text-xs ${gradeCls(r.max_pct)}`}>{bucketLabel(r.max_pct)}</span></td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.rank ?? "-"}</td>
                <td className="px-3 py-2">
                  {r.is_short && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">단축창</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {editing ? (
                    <span className="flex gap-1">
                      <Button size="sm" onClick={() => saveEdit(r)} disabled={busyId === r.id}>{busyId === r.id ? "저장 중…" : "저장"}</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>취소</Button>
                    </span>
                  ) : (
                    <span className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}>수정</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(r)} disabled={busyId === r.id}>삭제</Button>
                    </span>
                  )}
                </td>
              </tr>
            );})}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                {err ? "—" : "확정된 자동 최고달성률 이력이 없습니다. (실시간 매수적기 신호 발생 후 추적창 종료 시 표시됩니다)"}
              </td></tr>
            )}
            {loading && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">불러오는 중…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type BridgeConfig = { enabled: boolean; minPct: number; fullOnly: boolean };

export function HistoryManager({
  rows,
  homeVisible,
  bridge,
}: {
  rows: StockHistoryRow[];
  homeVisible: boolean;
  bridge: BridgeConfig;
}) {
  const [mode, setMode] = useState<"auto" | "manual">("manual");

  return (
    <div className="space-y-4">
      {/* 자동/수동 토글 */}
      <div className="inline-flex rounded-lg border p-0.5 text-sm">
        <button
          className={`rounded-md px-3 py-1.5 ${mode === "auto" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("auto")}
        >
          자동 (최고달성률)
        </button>
        <button
          className={`rounded-md px-3 py-1.5 ${mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("manual")}
        >
          수동 (마감 이력)
        </button>
      </div>

      {mode === "auto" ? <AutoView bridge={bridge} /> : <ManualView rows={rows} homeVisible={homeVisible} />}
    </div>
  );
}
