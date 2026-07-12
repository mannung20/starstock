import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** 로그인 유도 카드 (비회원, 무료 공개 가능한 rank) */
export function LoginLockedCard({ rank }: { rank: number }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 p-4 text-center">
        <span className="text-2xl" aria-hidden>🔒</span>
        <div className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">#{rank}</span> 로그인하면 무료 공개
        </div>
        <Link href="/login" className={buttonVariants({ size: "sm" })}>
          구글로 로그인
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * VIP 전용 잠금 카드 (블러). hover 시 미스터리 박스 흔들림 효과.
 * showCta=true 인 첫 카드에만 구독 안내 버튼 표시.
 */
export function VipLockedCard({ rank, showCta = false }: { rank: number; showCta?: boolean }) {
  return (
    <Card className="group relative overflow-hidden border-amber-200 transition-transform hover:animate-[wiggle_0.4s_ease-in-out]">
      <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="pointer-events-none absolute inset-0 select-none space-y-2 p-4 opacity-40 blur-sm">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-6 w-1/2 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
        </div>
        <Badge variant="vip" className="relative">⭐ #{rank} VIP 전용</Badge>
        <p className="relative text-xs text-muted-foreground">VIP 회원에게만 열리는 급등 후보 👆</p>
        {showCta && (
          <Link href="/#vip" className={buttonVariants({ size: "sm", variant: "secondary", className: "relative" })}>
            VIP 구독 안내
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
