/** 운영정지(점검) 안내 화면 — 비관리자에게 공개 페이지 대신 표시. */
export function MaintenanceScreen({ message }: { message?: string }) {
  const text = message && message.trim() !== ""
    ? message
    : "서비스 점검 중입니다. 잠시 후 다시 이용해 주세요.";
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="text-6xl">🛠️</div>
      <h1 className="text-2xl font-bold">잠시 점검 중입니다</h1>
      <p className="max-w-md whitespace-pre-line text-sm text-muted-foreground">{text}</p>
    </main>
  );
}
