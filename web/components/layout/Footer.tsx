export function Footer() {
  return (
    <footer className="mt-12 border-t py-8 text-center text-xs text-muted-foreground">
      <div className="container space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="font-semibold text-foreground">StarStock</span>
          <span>·</span>
          <span>이용약관</span>
          <span>·</span>
          <span>개인정보처리방침</span>
          <span>·</span>
          <span>문의: help@starstock.kr</span>
        </div>
        <p>※ 본 서비스의 종목 정보는 투자 참고용이며 손실에 대한 책임을 지지 않습니다.</p>
      </div>
    </footer>
  );
}
