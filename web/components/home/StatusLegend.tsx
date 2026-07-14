/** 홈 종목표 하단 상태(🟢🔴🟡) 설명 범례. 라벨/색은 lib/stock-calc.ts statusMeta 와 일치. */
const ITEMS = [
  { emoji: "🟢", label: "매수적기", cls: "text-emerald-600", desc: "강력한 매수 타이밍 (매수기준가 ±1%)" },
  { emoji: "🔴", label: "손절조심", cls: "text-red-600", desc: "매수 상태라면 손절을 고려하세요" },
  { emoji: "🟡", label: "관망유지", cls: "text-amber-600", desc: "매수 대기 중" },
];

export function StatusLegend() {
  return (
    <div className="container">
      <div className="rounded-md bg-muted/60 px-4 py-2.5">
        <div className="mb-1.5 text-xs font-semibold text-muted-foreground">🚦 상태 표시 안내</div>
        <ul className="flex flex-col gap-1.5 text-xs sm:flex-row sm:flex-wrap sm:gap-x-5">
          {ITEMS.map((it) => (
            <li key={it.label} className="flex items-center gap-1.5">
              <span aria-hidden>{it.emoji}</span>
              <span className={`font-semibold ${it.cls}`}>{it.label}</span>
              <span className="text-muted-foreground">— {it.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
