"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminUser } from "@/app/admin/users/page";
import type { UserRole } from "@/lib/types";

type Filter = "all" | "free" | "vip" | "noemail";

function ymd(iso: string | null) {
  return iso ? iso.slice(0, 10) : "-";
}

function RoleBadge({ role, banned }: { role: UserRole; banned: boolean }) {
  if (banned) return <Badge variant="outline" className="text-red-600">🚫차단</Badge>;
  if (role === "vip") return <Badge variant="vip">⭐VIP</Badge>;
  if (role === "admin") return <Badge variant="vip">ADMIN</Badge>;
  return <Badge variant="secondary">FREE</Badge>;
}

function RoleModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role === "vip" ? "vip" : "free");
  const [endDate, setEndDate] = useState<string>("");
  const [memo, setMemo] = useState<string>(user.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function quick(months: number | "inf") {
    if (months === "inf") return setEndDate("");
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setEndDate(d.toISOString().slice(0, 10));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    const res = await fetch(`/api/admin/users/${user.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, end_date: role === "vip" ? endDate || null : null, memo }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "저장 실패");
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{user.email ?? user.id} 등급 변경</h3>
            <button onClick={onClose} aria-label="닫기">✕</button>
          </div>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={role === "free"} onChange={() => setRole("free")} /> FREE
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={role === "vip"} onChange={() => setRole("vip")} /> VIP
            </label>
          </div>

          {role === "vip" && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">만료일 (비우면 무기한)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => quick(1)}>1개월</Button>
                <Button size="sm" variant="outline" onClick={() => quick(3)}>3개월</Button>
                <Button size="sm" variant="outline" onClick={() => quick(12)}>1년</Button>
                <Button size="sm" variant="outline" onClick={() => quick("inf")}>무기한</Button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">메모 (결제 내역 등)</label>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="입금확인 2026-07-08 카카오페이 30,000원"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <p className="text-xs text-muted-foreground">☐ 등급 변경 완료 이메일 발송 (🔒 Phase 4 예정)</p>
          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button onClick={save} disabled={saving}>{saving ? "저장 중…" : "변경 저장"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GrantModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState<number>(7);
  const [reason, setReason] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function grant() {
    setSaving(true);
    setErr(null);
    const res = await fetch("/api/admin/referral/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, days, reason }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "지급 실패");
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{user.email ?? user.id} VIP 일수 지급</h3>
            <button onClick={onClose} aria-label="닫기">✕</button>
          </div>

          <p className="text-xs text-muted-foreground">
            선택 회원에게 VIP 구독 일수를 직접 추가합니다. 기존 구독이 있으면 만료일이 연장되고(무기한은 유지),
            없으면 새로 생성됩니다. 보상 이력에 &apos;수동 지급&apos;으로 기록됩니다.
          </p>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">지급 일수 (1~3650)</label>
            <input
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-32 rounded-md border px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30, 60].map((d) => (
                <Button key={d} size="sm" variant="outline" onClick={() => setDays(d)}>{d}일</Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">사유 (선택, 감사 로그 기록)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="이벤트 보상, 오류 보정 등"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button onClick={grant} disabled={saving || !(days >= 1 && days <= 3650)}>
              {saving ? "지급 중…" : "VIP 지급"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function UsersTable({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modalUser, setModalUser] = useState<AdminUser | null>(null);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (q && !(u.email ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "free") return u.role === "free" && !u.is_banned;
      if (filter === "vip") return u.role === "vip";
      if (filter === "noemail") return !u.email;
      return true;
    });
  }, [users, q, filter]);

  async function toggleBan(u: AdminUser) {
    await fetch(`/api/admin/users/${u.id}/ban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_banned: !u.is_banned }),
    });
    router.refresh();
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "free", label: "FREE" },
    { key: "vip", label: "VIP" },
    { key: "noemail", label: "이메일없음" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 이메일 검색..."
          className="w-56 rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex gap-1">
          {tabs.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={filter === t.key ? "default" : "outline"}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length}명</span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">이메일</th>
              <th className="px-3 py-2 font-medium">등급</th>
              <th className="px-3 py-2 font-medium">가입일</th>
              <th className="px-3 py-2 font-medium">최종접속</th>
              <th className="px-3 py-2 font-medium">메모</th>
              <th className="px-3 py-2 font-medium">조작</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className={`border-t ${u.is_banned ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}>
                <td className="px-3 py-2">
                  {u.email ?? <span className="text-amber-600">이메일없음 ⚠️</span>}
                </td>
                <td className="px-3 py-2"><RoleBadge role={u.role} banned={u.is_banned} /></td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{ymd(u.joined_at)}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{ymd(u.last_login)}</td>
                <td className="px-3 py-2 max-w-[180px] truncate text-muted-foreground">{u.memo ?? "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setModalUser(u)}>변경</Button>
                    <Button size="sm" variant="outline" onClick={() => setGrantUser(u)}>VIP지급</Button>
                    <Button size="sm" variant={u.is_banned ? "secondary" : "destructive"} onClick={() => toggleBan(u)}>
                      {u.is_banned ? "해제" : "차단"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">회원이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalUser && (
        <RoleModal
          user={modalUser}
          onClose={() => setModalUser(null)}
          onSaved={() => {
            setModalUser(null);
            router.refresh();
          }}
        />
      )}

      {grantUser && (
        <GrantModal
          user={grantUser}
          onClose={() => setGrantUser(null)}
          onSaved={() => {
            setGrantUser(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
