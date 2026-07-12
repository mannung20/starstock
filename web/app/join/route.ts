import { NextResponse, type NextRequest } from "next/server";
import { isValidRefCode } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /join?ref=CODE — 추천 URL 랜딩 (PRD page-6 / 섹션 17-7).
 * ref 코드를 httpOnly 쿠키로 저장 후 /login 으로 유도.
 * 가입 완료 시 /auth/callback 이 이 쿠키를 읽어 process_referral RPC 를 호출한다.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const ref = searchParams.get("ref");

  const res = NextResponse.redirect(`${origin}/login`);

  if (isValidRefCode(ref)) {
    res.cookies.set("ref", ref, {
      httpOnly: true,
      sameSite: "lax", // OAuth 리다이렉트(top-level) 후 콜백에서도 전송됨
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30일
    });
  }

  return res;
}
