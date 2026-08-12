"use client";

import { useEffect } from "react";

export default function PopupClose() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const bc = new BroadcastChannel("starstock_login");
    bc.postMessage(error ? { error } : { ok: true });
    bc.close();
    window.close();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      로그인 처리 중…
    </div>
  );
}
