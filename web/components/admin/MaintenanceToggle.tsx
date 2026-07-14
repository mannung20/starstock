"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 운영중/운영정지 토글. maintenance_mode(site_config) 를 PATCH.
 * 운영정지 시 비관리자에게 공개 페이지 대신 점검화면 노출.
 */
export function MaintenanceToggle({ initialOn }: { initialOn: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setSaving(true);
    const res = await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: { maintenance_mode: next ? "true" : "false" } }),
    });
    setSaving(false);
    if (!res.ok) {
      setOn(!next);
      alert("설정 저장에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      title="운영정지 시 비관리자에게 점검화면이 노출됩니다"
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
        on
          ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30"
          : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
      }`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${on ? "bg-red-500" : "bg-emerald-500"}`} />
      {on ? "운영정지" : "운영중"}
      {saving && <span className="text-xs text-muted-foreground">…</span>}
    </button>
  );
}
