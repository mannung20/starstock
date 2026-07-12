import { statusMeta } from "@/lib/stock-calc";
import type { StockStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusSignal({ status, className }: { status: StockStatus; className?: string }) {
  const m = statusMeta(status);
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", m.className, className)}>
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </span>
  );
}
