"use client";

import { useEffect, useRef } from "react";

/**
 * Giscus(깃허브 Discussions 기반) 댓글 위젯 셸.
 * NEXT_PUBLIC_GISCUS_* 4개가 모두 설정되면 위젯을 로드, 아니면 안내를 표시(graceful).
 * 설정값은 https://giscus.app 에서 repo 연결 후 발급 (운영자).
 */
const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

const configured = !!(REPO && REPO_ID && CATEGORY && CATEGORY_ID);

export function GiscusComments() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configured || !ref.current) return;
    const el = ref.current;
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    const attrs: Record<string, string> = {
      "data-repo": REPO!,
      "data-repo-id": REPO_ID!,
      "data-category": CATEGORY!,
      "data-category-id": CATEGORY_ID!,
      "data-mapping": "pathname",
      "data-strict": "0",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": "preferred_color_scheme",
      "data-lang": "ko",
      "data-loading": "lazy",
    };
    Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, []);

  if (!configured) {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        💬 댓글 기능은 곧 제공될 예정입니다.
      </div>
    );
  }

  return <div ref={ref} className="giscus min-h-[200px]" />;
}
