"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * 카카오톡 공유 버튼. NEXT_PUBLIC_KAKAO_JS_KEY 가 있을 때만 SDK 로드/표시.
 * 키 미설정(현재 pending) 시 렌더링하지 않음 → 링크 복사로 대체 (graceful).
 */
declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (k: string) => void;
      Share: { sendDefault: (o: unknown) => void };
    };
  }
}

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

export function KakaoShareButton({ url, title }: { url: string; title: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!KEY) return;
    if (window.Kakao) {
      if (!window.Kakao.isInitialized()) window.Kakao.init(KEY);
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    s.async = true;
    s.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(KEY);
      setReady(true);
    };
    document.head.appendChild(s);
  }, []);

  if (!KEY || !ready) return null;

  function share() {
    window.Kakao?.Share.sendDefault({
      objectType: "feed",
      content: {
        title: "StarStock 주식 추천",
        description: title,
        imageUrl: `${window.location.origin}/og.png`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: "가입하고 VIP 받기", link: { mobileWebUrl: url, webUrl: url } }],
    });
  }

  return (
    <Button size="sm" variant="secondary" onClick={share}>
      💬 카카오톡 공유
    </Button>
  );
}
