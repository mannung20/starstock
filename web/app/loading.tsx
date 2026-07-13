/**
 * 루트 공통 로딩 UI (app/loading.tsx).
 * 하위 모든 라우트가 자체 loading.tsx 가 없으면 이 파일을 상속 →
 * force-dynamic 페이지 이동 시 즉시 표시(prefetch 셸 활성 + 체감 지연 제거).
 * 레이아웃(헤더/푸터)은 유지되고 본문 영역만 이 로딩으로 대체됨.
 */
export default function Loading() {
  return (
    <div className="container flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground"
          aria-hidden
        />
        <p className="text-sm">불러오는 중…</p>
        <span className="sr-only">로딩 중</span>
      </div>
    </div>
  );
}
