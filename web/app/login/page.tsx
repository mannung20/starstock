"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 리다이렉트 플로우 에러(/login?error=...) 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(decodeURIComponent(err));
  }, []);

  async function signInGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/auth/popup-close`,
        skipBrowserRedirect: true,
        // ★핵심: 계정이 여러 개일 때 항상 계정 선택 화면을 띄운다(자동 로그인 방지)
        queryParams: { prompt: "select_account" },
      },
    });

    if (error || !data.url) {
      setError(error?.message ?? "로그인 오류가 발생했습니다.");
      setLoading(false);
      return;
    }

    const popup = window.open(
      data.url,
      "googleLogin",
      "width=480,height=600,left=200,top=100"
    );

    // 팝업 차단 → 리다이렉트 방식으로 폴백
    if (!popup) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      return;
    }

    let handled = false;

    // BroadcastChannel: 팝업(popup-close page)에서 결과 수신
    const bc = new BroadcastChannel("starstock_login");
    bc.onmessage = (e: MessageEvent<{ error?: string; ok?: boolean }>) => {
      handled = true;
      bc.close();
      clearInterval(timer);
      if (e.data?.error) {
        setError(e.data.error);
        setLoading(false);
      } else {
        router.push("/");
      }
    };

    // 폴백: 팝업을 사용자가 직접 닫은 경우
    const timer = setInterval(async () => {
      if (!popup.closed) return;
      clearInterval(timer);
      bc.close();
      if (handled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.push("/");
      else setLoading(false);
    }, 500);
  }

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 p-8 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold">★ StarStock</div>
            <p className="text-sm text-muted-foreground">구글 계정으로 간편하게 시작하세요</p>
          </div>
          <Button className="w-full" size="lg" onClick={signInGoogle} disabled={loading}>
            {loading ? "Google 계정 선택 중…" : "구글 로그인"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            로그인하면 무료 3개 종목이 즉시 공개됩니다.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
