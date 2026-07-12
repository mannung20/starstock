import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { getReferralStats } from "@/lib/server-data";
import type { UploadLogRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const head = { count: "exact" as const, head: true };

  const [totalRes, vipRes, todayRes, monthRes, noEmailRes, logsRes, lastUploadRes] =
    await Promise.all([
      admin.from("profiles").select("*", head),
      admin.from("profiles").select("*", head).eq("role", "vip"),
      admin.from("profiles").select("*", head).gte("joined_at", startOfTodayISO()),
      admin.from("subscriptions").select("*", head).gte("created_at", startOfMonthISO()),
      admin.from("profiles").select("*", head).is("email", null),
      admin
        .from("upload_logs")
        .select("*")
        .eq("action_type", "upload")
        .order("uploaded_at", { ascending: false })
        .limit(5),
      admin
        .from("upload_logs")
        .select("uploaded_at, status, records")
        .eq("action_type", "upload")
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const referral = await getReferralStats();

  const totalMembers = totalRes.count ?? 0;
  const vipCount = vipRes.count ?? 0;
  const todayNew = todayRes.count ?? 0;
  const monthChanges = monthRes.count ?? 0;
  const noEmailCount = noEmailRes.count ?? 0;
  const logs = (logsRes.data ?? []) as UploadLogRow[];
  const last = lastUploadRes.data as { uploaded_at: string; status: string | null; records: number | null } | null;
  const ageMin = last ? Math.floor((Date.now() - Date.parse(last.uploaded_at)) / 60_000) : null;
  const linkOk = last && ageMin != null && ageMin <= 15 && last.status === "success";

  const stats = [
    { label: "총 회원수", value: `${totalMembers}명` },
    { label: "VIP 회원수", value: `${vipCount}명` },
    { label: "오늘 신규 가입", value: `${todayNew}명` },
    { label: "이달 등급 변경", value: `${monthChanges}건` },
  ];

  return (
    <div className="space-y-6">
      {/* 엑셀 연동 상태 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">엑셀 연동 상태</h2>
        <Card>
          <CardContent className="p-4">
            {last ? (
              <div className="space-y-1">
                <div className="font-semibold">
                  {linkOk ? "🟢 정상 연동 중" : "🔴 연결 확인 필요"}
                  <span className="ml-3 text-sm font-normal text-muted-foreground">
                    마지막 수신: {new Date(last.uploaded_at).toLocaleString("ko-KR")} ({ageMin}분 경과)
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  최근 전송 종목: {last.records ?? 0}개 · 상태: {last.status}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">아직 업로드 기록이 없습니다.</div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 통계 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">통계</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 추천 통계 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">추천 통계</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "총 추천 가입", value: `${referral.totalReferrals}명` },
            { label: "이달 추천 가입", value: `${referral.monthReferrals}명` },
            { label: "지급 보상", value: `${referral.rewardCount}건` },
            { label: "지급 보상 일수", value: `${referral.rewardDays}일` },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mt-3">
          <CardContent className="p-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">상위 추천인 TOP 5</div>
            {referral.topReferrers.length === 0 ? (
              <div className="text-sm text-muted-foreground">아직 추천 가입 기록이 없습니다.</div>
            ) : (
              <ol className="space-y-1 text-sm">
                {referral.topReferrers.map((r, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">{["🥇", "🥈", "🥉", "4.", "5."][i]}</span>
                      {r.email ?? "(이메일 없음)"}
                    </span>
                    <span className="ml-3 shrink-0 font-semibold tabular-nums">{r.count}명</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 이메일 미등록 회원 */}
      {noEmailCount > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <span className="text-amber-700 dark:text-amber-400">
              ⚠️ 이메일 미등록 회원 {noEmailCount}명 — VIP 만료 알림 발송 불가
            </span>
            <Link href="/admin/users?filter=noemail" className="font-medium underline">
              회원 목록 보기 →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 최근 업로드 로그 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">최근 업로드 로그</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">시각</th>
                <th className="px-3 py-2 font-medium">상태</th>
                <th className="px-3 py-2 font-medium">종목수</th>
                <th className="px-3 py-2 font-medium">오류내용</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">기록 없음</td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2 tabular-nums">{new Date(l.uploaded_at).toLocaleTimeString("ko-KR")}</td>
                  <td className="px-3 py-2">
                    {l.status === "success" ? "✅ 성공" : l.status === "partial" ? "⚠️ 부분" : "❌ 실패"}
                  </td>
                  <td className="px-3 py-2">{l.records ?? 0}개</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.error_msg ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
