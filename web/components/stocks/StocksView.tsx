"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StockLayout } from "./StockLayout";
import { RefreshBar } from "./RefreshBar";
import { StatusLegend } from "@/components/home/StatusLegend";
import { Button } from "@/components/ui/button";
import type { StockRow } from "@/lib/types";
import type { ViewerRole } from "@/lib/stock-slots";

export interface StocksApiResponse {
  role: ViewerRole;
  count: number;
  total_visible: number;
  stocks: StockRow[];
  server_time: string;
}

function newestDataISO(stocks: StockRow[]): string | null {
  if (stocks.length === 0) return null;
  return stocks.reduce((a, b) => (a > b.updated_at ? a : b.updated_at), stocks[0].updated_at);
}

/** 메인 종목 뷰: N분 주기 폴링(GET /api/stocks) + 레이아웃 렌더 (PRD 3-6 폴링 확정). */
export interface BuyAlertConfig {
  imageEnabled: boolean;
  imageUrl: string;
  imageDuration: number; // 알림화면 표시 시간(초)
  soundEnabled: boolean;
  soundUrl: string;
}

export function StocksView({
  initial,
  freeCount,
  layout,
  intervalMs,
  buyAlert,
}: {
  initial: StocksApiResponse;
  freeCount: number;
  layout: "card" | "table";
  intervalMs: number;
  buyAlert: BuyAlertConfig;
}) {
  const [data, setData] = useState<StocksApiResponse>(initial);
  const [lastPollMs, setLastPollMs] = useState<number>(Date.now());
  const [stale, setStale] = useState(false);
  const [mobileView, setMobileView] = useState(false); // 모바일보기: 압축 카드 강제
  const busy = useRef(false);

  const effectiveLayout: "card" | "table" = mobileView ? "card" : layout;

  // 매수적기(status=buy) 종목 존재 여부 → 이미지/사운드 알림
  const buyExists = data.stocks.some((s) => s.status === "buy");
  const [soundOn, setSoundOn] = useState(false);
  const [imageShown, setImageShown] = useState(false); // 알림화면 표시 중(설정 시간 후 자동 숨김)
  const [imageLeft, setImageLeft] = useState(0); // 남은 표시 시간(초)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imgTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBuy = useRef(false);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current && buyAlert.soundUrl) audioRef.current = new Audio(buyAlert.soundUrl);
    return audioRef.current;
  }, [buyAlert.soundUrl]);

  const playAlert = useCallback(() => {
    const a = ensureAudio();
    if (a) { a.currentTime = 0; a.play().catch(() => {}); }
  }, [ensureAudio]);

  // 알림화면을 설정 시간(초)만큼 표시 + 남은시간 카운트다운, 0초에 자동 숨김
  const showImage = useCallback(() => {
    if (imgTimer.current) clearInterval(imgTimer.current);
    const total = Math.max(1, buyAlert.imageDuration);
    setImageShown(true);
    setImageLeft(total);
    imgTimer.current = setInterval(() => {
      setImageLeft((s) => {
        if (s <= 1) {
          if (imgTimer.current) clearInterval(imgTimer.current);
          setImageShown(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [buyAlert.imageDuration]);
  useEffect(() => () => { if (imgTimer.current) clearInterval(imgTimer.current); }, []);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    // 켜는 순간 미리듣기 겸 브라우저 오디오 잠금 해제(사용자 제스처)
    if (next) playAlert();
  }

  // 매수적기가 새로 등장하면(폴링/최초로드) 알림화면 표시 + 소리(켠 경우)
  useEffect(() => {
    if (buyExists && !prevBuy.current) {
      if (buyAlert.imageEnabled && buyAlert.imageUrl) showImage();
      if (soundOn) playAlert();
    }
    prevBuy.current = buyExists;
  }, [buyExists, soundOn, playAlert, showImage, buyAlert.imageEnabled, buyAlert.imageUrl]);

  const poll = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch("/api/stocks", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as StocksApiResponse;
      setData(json);
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      setLastPollMs(Date.now());
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const t = setInterval(poll, intervalMs);
    return () => clearInterval(t);
  }, [poll, intervalMs]);

  return (
    <div className="space-y-4">
      <RefreshBar
        lastDataISO={newestDataISO(data.stocks)}
        lastPollMs={lastPollMs}
        intervalMs={intervalMs}
        stale={stale}
      />
      {layout === "table" && (
        <div className="container flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="sm:hidden"
            onClick={() => setMobileView((v) => !v)}
          >
            {mobileView ? "📊 표 보기" : "📱 모바일 보기"}
          </Button>
        </div>
      )}
      <div>
        {/* 매수적기 알림화면: 설정 시간만큼 표시 + 남은시간 카운트, 후 자동 숨김 */}
        {buyAlert.imageEnabled && buyAlert.imageUrl && imageShown && (
          <div className="container mb-3">
            <div className="relative mx-auto w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buyAlert.imageUrl}
                alt="매수적기 알림"
                className="max-h-40 animate-pulse rounded-lg border"
              />
              <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                ⏳ {imageLeft}초
              </span>
            </div>
          </div>
        )}

        <div className="container">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">오늘의 매매종목</h2>
            <div className="flex flex-wrap gap-2">
              {buyAlert.imageEnabled && buyAlert.imageUrl && (
                <Button size="sm" variant="outline" onClick={showImage}>
                  🖼️ 알림화면 켜기
                </Button>
              )}
              {buyAlert.soundEnabled && buyAlert.soundUrl && (
                <Button size="sm" variant="outline" onClick={toggleSound}>
                  {soundOn ? "🔕 알림소리 끄기" : "🔔 알림소리 켜기"}
                </Button>
              )}
            </div>
          </div>
          <StockLayout
            stocks={data.stocks}
            role={data.role}
            totalVisible={data.total_visible}
            freeCount={freeCount}
            layout={effectiveLayout}
          />
        </div>
        <StatusLegend />
      </div>
    </div>
  );
}
