"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
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
            {loading ? "이동 중…" : "구글로 로그인"}
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
