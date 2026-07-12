"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tab = "basic" | "footer" | "nav" | "ops" | "referral";
const TABS: { key: Tab; label: string }[] = [
  { key: "basic", label: "기본정보" },
  { key: "footer", label: "하단정보" },
  { key: "nav", label: "네비게이션" },
  { key: "ops", label: "운영설정" },
  { key: "referral", label: "추천설정" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "w-full max-w-md rounded-md border px-3 py-2 text-sm";

export function SiteManager({ config }: { config: Record<string, string> }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("basic");
  const [c, setC] = useState<Record<string, string>>(config);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: string, v: string) => setC((p) => ({ ...p, [k]: v }));
  const val = (k: string, d = "") => c[k] ?? d;
  const bool = (k: string, d = false) => (c[k] ?? String(d)) === "true";

  async function save(keys: string[], override?: Record<string, string>) {
    setSaving(true);
    setMsg(null);
    const src = override ?? c;
    const entries = Object.fromEntries(keys.map((k) => [k, src[k] ?? ""]));
    const res = await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setSaving(false);
    setMsg(res.ok ? "저장되었습니다." : "저장 실패");
    if (res.ok) router.refresh();
  }

  // 추천 숫자 키: 빈값/음수/비정상 입력이 site_config 에 문자열로 저장되면
  // RPC 의 value::int 캐스트가 예외를 던져 신규 가입 추천처리 전체가 실패한다.
  // → 저장 직전 정수 보정(빈값/오류 시 기본값), UI 에도 반영.
  const REFERRAL_NUM_DEFAULTS: Record<string, number> = {
    referral_referee_days: 7,
    referral_milestone_1_count: 3, referral_milestone_1_days: 14,
    referral_milestone_2_count: 7, referral_milestone_2_days: 30,
    referral_milestone_3_count: 15, referral_milestone_3_days: 60,
    referral_repeat_count: 5, referral_repeat_days: 14,
  };

  async function saveReferral() {
    const fixed: Record<string, string> = { ...c };
    for (const [k, def] of Object.entries(REFERRAL_NUM_DEFAULTS)) {
      const n = parseInt(c[k] ?? "", 10);
      fixed[k] = String(Number.isFinite(n) && n >= 0 ? n : def);
    }
    fixed.referral_enabled = bool("referral_enabled", true) ? "true" : "false";
    setC(fixed);
    await save([...Object.keys(REFERRAL_NUM_DEFAULTS), "referral_enabled"], fixed);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setMsg(null); }}
            className={cn(
              "px-4 py-2 text-sm",
              tab === t.key ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          {tab === "basic" && (
            <>
              <Field label="서비스명">
                <input className={inputCls} value={val("service_name", "StarStock")} onChange={(e) => set("service_name", e.target.value)} />
              </Field>
              <Field label="로고 텍스트">
                <input className={inputCls} value={val("logo_text", "★ StarStock")} onChange={(e) => set("logo_text", e.target.value)} />
              </Field>
              <Field label="색상 테마">
                <div className="flex gap-4 text-sm">
                  {["light", "dark"].map((t) => (
                    <label key={t} className="flex items-center gap-1">
                      <input type="radio" checked={val("theme", "light") === t} onChange={() => set("theme", t)} /> {t === "light" ? "라이트" : "다크"}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="서비스 상태">
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={!bool("maintenance_mode")} onChange={() => set("maintenance_mode", "false")} /> 정상 운영
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={bool("maintenance_mode")} onChange={() => set("maintenance_mode", "true")} /> 점검 모드
                  </label>
                </div>
              </Field>
              <Field label="점검 메시지">
                <input className={inputCls} value={val("maintenance_msg")} onChange={(e) => set("maintenance_msg", e.target.value)} />
              </Field>
              <Button onClick={() => save(["service_name", "logo_text", "theme", "maintenance_mode", "maintenance_msg"])} disabled={saving}>저장</Button>
            </>
          )}

          {tab === "footer" && (
            <>
              <Field label="문의 이메일">
                <input className={inputCls} value={val("footer_email")} onChange={(e) => set("footer_email", e.target.value)} />
              </Field>
              <Field label="회사/운영자명 (선택)">
                <input className={inputCls} value={val("footer_company")} onChange={(e) => set("footer_company", e.target.value)} />
              </Field>
              <Field label="사업자등록번호 (선택)">
                <input className={inputCls} value={val("footer_business_no")} onChange={(e) => set("footer_business_no", e.target.value)} />
              </Field>
              <Field label="면책조항">
                <textarea className={cn(inputCls, "h-20")} value={val("footer_disclaimer")} onChange={(e) => set("footer_disclaimer", e.target.value)} />
              </Field>
              <Button onClick={() => save(["footer_email", "footer_company", "footer_business_no", "footer_disclaimer"])} disabled={saving}>저장</Button>
            </>
          )}

          {tab === "nav" && (
            <>
              <p className="text-sm text-muted-foreground">상단 메뉴 표시 항목 (체크 해제 시 즉시 숨김)</p>
              {[
                { k: "nav_show_notice", label: "공지사항" },
                { k: "nav_show_board", label: "게시판" },
                { k: "nav_show_history", label: "수익률 현황" },
              ].map((n) => (
                <label key={n.k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={bool(n.k, true)} onChange={(e) => set(n.k, String(e.target.checked))} /> {n.label}
                </label>
              ))}
              <p className="text-xs text-muted-foreground">※ 홈 메뉴는 항상 표시(고정)</p>
              <Button onClick={() => save(["nav_show_notice", "nav_show_board", "nav_show_history"])} disabled={saving}>저장</Button>
            </>
          )}

          {tab === "ops" && (
            <>
              <Field label="비회원 공개 종목 수 (1~10)">
                <input type="number" min={1} max={10} className={cn(inputCls, "w-24")} value={val("guest_visible_count", "1")} onChange={(e) => set("guest_visible_count", e.target.value)} />
              </Field>
              <Field label="무료회원 공개 종목 수 (1~10)">
                <input type="number" min={1} max={10} className={cn(inputCls, "w-24")} value={val("free_visible_count", "3")} onChange={(e) => set("free_visible_count", e.target.value)} />
              </Field>
              <Field label="엑셀 업로드 기본 주기(분)">
                <div className="flex flex-wrap gap-3 text-sm">
                  {["1", "3", "5", "10", "30"].map((m) => (
                    <label key={m} className="flex items-center gap-1">
                      <input type="radio" checked={val("upload_interval_default", "5") === m} onChange={() => set("upload_interval_default", m)} /> {m}분
                    </label>
                  ))}
                </div>
              </Field>
              <p className="text-xs text-muted-foreground">
                ※ 매수기준가 조건(돌파율/연속봉)은 site_config 제외 → uploader/config.json 직접 편집 후 Python 재시작
              </p>
              <Button onClick={() => save(["guest_visible_count", "free_visible_count", "upload_interval_default"])} disabled={saving}>저장</Button>
            </>
          )}

          {tab === "referral" && (
            <>
              <Field label="추천인 시스템">
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={bool("referral_enabled", true)} onChange={() => set("referral_enabled", "true")} /> 활성화(ON)
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={!bool("referral_enabled", true)} onChange={() => set("referral_enabled", "false")} /> 끄기
                  </label>
                </div>
              </Field>

              <div className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-medium">피추천인 웰컴 보상</p>
                <Field label="추천 URL로 가입한 신규 회원에게 즉시 지급 (VIP 일)">
                  <input type="number" min={0} max={3650} className={cn(inputCls, "w-28")} value={val("referral_referee_days", "7")} onChange={(e) => set("referral_referee_days", e.target.value)} />
                </Field>
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-sm font-medium">마일스톤 보상 (추천인 기준)</p>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-12 text-muted-foreground">{n}단계</span>
                    추천
                    <input type="number" min={1} max={9999} className={cn(inputCls, "w-20")} value={val(`referral_milestone_${n}_count`, ["3", "7", "15"][n - 1])} onChange={(e) => set(`referral_milestone_${n}_count`, e.target.value)} />
                    명 달성 시 VIP
                    <input type="number" min={0} max={3650} className={cn(inputCls, "w-20")} value={val(`referral_milestone_${n}_days`, ["14", "30", "60"][n - 1])} onChange={(e) => set(`referral_milestone_${n}_days`, e.target.value)} />
                    일 지급
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">※ 변경 시 이미 달성한 회원에게 소급 적용되지 않습니다.</p>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-medium">3단계 달성 후 반복 보상</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  3단계 초과 후, 추가
                  <input type="number" min={1} max={9999} className={cn(inputCls, "w-20")} value={val("referral_repeat_count", "5")} onChange={(e) => set("referral_repeat_count", e.target.value)} />
                  명마다 VIP
                  <input type="number" min={0} max={3650} className={cn(inputCls, "w-20")} value={val("referral_repeat_days", "14")} onChange={(e) => set("referral_repeat_days", e.target.value)} />
                  일 지급
                </div>
                <p className="text-xs text-muted-foreground">※ 무한 반복 지급 (예: 20명=1회, 25명=2회…). 변경 시 미달성 구간부터 적용됩니다.</p>
              </div>

              <Button onClick={saveReferral} disabled={saving}>저장</Button>
            </>
          )}

          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
