"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DisplayConfigRow, ConfigRole } from "@/lib/types";

const REQUIRED = new Set(["rank", "stock_name", "current_price", "status"]);
const ROLES: { key: ConfigRole; label: string }[] = [
  { key: "guest", label: "비회원" },
  { key: "free", label: "무료회원" },
  { key: "vip", label: "VIP" },
];

export function DisplayManager({ rows, layout }: { rows: DisplayConfigRow[]; layout: "card" | "table" }) {
  const router = useRouter();
  const [curLayout, setCurLayout] = useState<"card" | "table">(layout);
  const [savingLayout, setSavingLayout] = useState(false);
  const [role, setRole] = useState<ConfigRole>("free");
  const [edits, setEdits] = useState<DisplayConfigRow[]>(rows);
  const [savingCols, setSavingCols] = useState(false);

  const roleRows = useMemo(
    () => edits.filter((r) => r.role === role).sort((a, b) => a.display_order - b.display_order),
    [edits, role]
  );

  function update(id: number, patch: Partial<DisplayConfigRow>) {
    setEdits((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveLayout() {
    setSavingLayout(true);
    await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: { stock_layout: curLayout } }),
    });
    setSavingLayout(false);
    router.refresh();
  }

  async function saveColumns() {
    setSavingCols(true);
    const updates = roleRows.map((r) => ({
      role: r.role,
      column_key: r.column_key,
      is_visible: r.is_visible,
      label: r.label,
      display_order: r.display_order,
    }));
    await fetch("/api/admin/display-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    setSavingCols(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* 레이아웃 유형 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">레이아웃 유형</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            {(["card", "table"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setCurLayout(l)}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-center text-sm transition-colors",
                  curLayout === l ? "border-primary bg-primary/10 font-semibold" : "hover:bg-accent"
                )}
              >
                {l === "card" ? "▦ 카드형 (그리드 2~3열)" : "≡ 테이블형 (행/열 리스트)"}
              </button>
            ))}
            <Button onClick={saveLayout} disabled={savingLayout || curLayout === layout}>
              {savingLayout ? "저장 중…" : "저장 → 즉시 전환"}
            </Button>
          </CardContent>
        </Card>
        <p className="mt-1 text-xs text-muted-foreground">※ 테이블형에서 아래 열 순서/숨김이 의미 있음. 카드형은 표시명만 반영.</p>
      </section>

      {/* 열 표시 설정 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">열 표시 설정</h2>
        <div className="mb-2 flex gap-1">
          {ROLES.map((r) => (
            <Button key={r.key} size="sm" variant={role === r.key ? "default" : "outline"} onClick={() => setRole(r.key)}>
              {r.label}
            </Button>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">항목</th>
                  <th className="px-3 py-2 font-medium">표시 여부</th>
                  <th className="px-3 py-2 font-medium">화면 표시명</th>
                </tr>
              </thead>
              <tbody>
                {roleRows.map((r) => {
                  const required = REQUIRED.has(r.column_key);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{r.column_key}</td>
                      <td className="px-3 py-2">
                        {required ? (
                          <span className="text-xs text-muted-foreground">🔒 필수</span>
                        ) : (
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={r.is_visible}
                              onChange={(e) => update(r.id, { is_visible: e.target.checked })}
                            />
                            {r.is_visible ? "표시" : "숨김"}
                          </label>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={r.label ?? ""}
                          onChange={(e) => update(r.id, { label: e.target.value })}
                          className="w-40 rounded border px-2 py-1 text-sm"
                        />
                      </td>
                    </tr>
                  );
                })}
                {roleRows.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">설정 항목이 없습니다. (04_seed.sql 실행 필요)</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <div className="mt-3 flex justify-end">
          <Button onClick={saveColumns} disabled={savingCols}>{savingCols ? "저장 중…" : "저장"}</Button>
        </div>
      </section>
    </div>
  );
}
