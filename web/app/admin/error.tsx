"use client";

// ★핵심: 관리자 영역 에러 경계. 하위 컴포넌트가 렌더 중 throw 해도 페이지 전체가
// 하얗게(=Application error: client-side exception) 죽지 않고, 실제 오류 메시지를
// 보여주고 '다시 시도'로 복구할 수 있게 한다. (2026-08 추가)
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 콘솔에 원본 오류 기록(진단용).
    console.error("[admin] client error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-bold">이 화면을 표시하는 중 오류가 발생했습니다</h2>
      <p className="max-w-xl break-words text-sm text-muted-foreground">
        {error.message || "알 수 없는 오류"}
        {error.digest && <span className="block text-xs">digest: {error.digest}</span>}
      </p>
      <Button onClick={() => reset()}>다시 시도</Button>
    </div>
  );
}
