/**
 * 이메일 템플릿 (subject + html). sendEmail() 과 함께 사용.
 * Phase 4 p4-5(VIP 만료 D-3/D-0), p4-6(등급변경/추천 보상 알림)에서 재사용.
 */

const SITE = "StarStock";
const BRAND = "#e11d48"; // 서비스 포인트 컬러(상승=빨강)

function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f4f5;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
    <div style="background:${BRAND};color:#fff;padding:16px 20px;font-weight:700;font-size:18px">★ ${SITE}</div>
    <div style="padding:20px">
      <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
      <div style="font-size:14px;line-height:1.6;color:#3f3f46">${body}</div>
      ${cta ? `<a href="${cta.url}" style="display:inline-block;margin-top:16px;background:${BRAND};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${cta.label}</a>` : ""}
    </div>
    <div style="padding:14px 20px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa">
      본 메일은 발신 전용입니다. 투자 정보는 참고용이며 투자 책임은 본인에게 있습니다.
    </div>
  </div></body></html>`;
}

export interface EmailContent { subject: string; html: string }

/** VIP 만료 D-3 / D-0 알림 (p4-5) */
export function vipExpiryEmail(opts: { name?: string; daysLeft: number; endDate: string; renewUrl: string }): EmailContent {
  const who = opts.name ? `${opts.name}님` : "회원님";
  const when = opts.daysLeft <= 0 ? "오늘" : `${opts.daysLeft}일 후`;
  return {
    subject: opts.daysLeft <= 0 ? `[${SITE}] VIP 구독이 오늘 만료됩니다` : `[${SITE}] VIP 구독 만료 ${opts.daysLeft}일 전 안내`,
    html: layout(
      `VIP 구독이 ${when} 만료됩니다`,
      `${who}, VIP 구독이 <b>${opts.endDate}</b>에 만료될 예정입니다.<br/>연장하시면 전체 추천 종목과 상세 정보를 계속 이용하실 수 있습니다.`,
      { label: "구독 연장하기", url: opts.renewUrl }
    ),
  };
}

/** 등급 변경 완료 알림 (p4-6) */
export function gradeChangeEmail(opts: { name?: string; newRole: string; endDate?: string | null; siteUrl: string }): EmailContent {
  const who = opts.name ? `${opts.name}님` : "회원님";
  const period = opts.endDate ? `(${opts.endDate}까지)` : "";
  return {
    subject: `[${SITE}] 회원 등급이 ${opts.newRole.toUpperCase()} 로 변경되었습니다`,
    html: layout(
      `등급이 ${opts.newRole.toUpperCase()} 로 변경되었습니다 ${period}`,
      `${who}, 회원 등급이 변경되었습니다. 지금 바로 새로운 혜택을 확인해보세요.`,
      { label: "종목 확인하기", url: opts.siteUrl }
    ),
  };
}

/** HTML 특수문자 이스케이프 (사용자 입력을 본문에 넣기 전 필수). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 기능개선요청 → 관리자 알림 메일 (사용자 입력 이스케이프 처리 내장). */
export function featureRequestEmail(opts: {
  category: string;
  title: string;
  content: string;
  requesterEmail: string;
  requesterRole: string;
  contactEmail?: string;
  contact?: string;
  submittedAtKst: string;
}): EmailContent {
  const rows = [
    ["분류", esc(opts.category)],
    ["제목", esc(opts.title)],
    ["요청자", `${esc(opts.requesterEmail)} (${esc(opts.requesterRole)})`],
    ...(opts.contactEmail ? [["회신 이메일", esc(opts.contactEmail)]] : []),
    ...(opts.contact ? [["연락처", esc(opts.contact)]] : []),
    ["접수시각", esc(opts.submittedAtKst)],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#71717a;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0;font-weight:600">${v}</td></tr>`
    )
    .join("");
  const body = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px">${rows}</table>
    <div style="margin-top:8px;padding:12px;background:#f4f4f5;border-radius:8px;white-space:pre-wrap;word-break:break-word">${esc(opts.content)}</div>`;
  return {
    subject: `[${SITE}][기능개선요청] ${opts.category} - ${opts.title}`.replace(/[\r\n]+/g, " "),
    html: layout("새 기능개선요청이 접수되었습니다", body),
  };
}

/** 신규 회원 가입 알림 → 관리자 (최초 로그인 시, best-effort). */
export function newSignupEmail(opts: {
  userEmail: string;
  displayName?: string | null;
  joinedAt: string;
  adminUrl: string;
}): EmailContent {
  const rows = [
    ["이메일", esc(opts.userEmail)],
    ...(opts.displayName ? [["이름", esc(opts.displayName)]] : []),
    ["가입시각", esc(opts.joinedAt)],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#71717a;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0;font-weight:600">${v}</td></tr>`)
    .join("");
  return {
    subject: `[${SITE}] 신규 회원 가입 — ${esc(opts.userEmail)}`,
    html: layout(
      "신규 회원이 가입했습니다",
      `<table style="width:100%;border-collapse:collapse">${rows}</table>`,
      { label: "회원 관리 페이지", url: opts.adminUrl }
    ),
  };
}

/** 추천 보상 지급 알림 (p4-6) */
export function referralRewardEmail(opts: { name?: string; rewardDays: number; reason: string; siteUrl: string }): EmailContent {
  const who = opts.name ? `${opts.name}님` : "회원님";
  return {
    subject: `[${SITE}] 추천 보상 VIP ${opts.rewardDays}일이 지급되었습니다`,
    html: layout(
      `추천 보상 VIP ${opts.rewardDays}일 지급 🎉`,
      `${who}, ${opts.reason} 보상으로 VIP <b>${opts.rewardDays}일</b>이 적립되었습니다. 감사합니다!`,
      { label: "내 추천 현황 보기", url: `${opts.siteUrl}/referral` }
    ),
  };
}
