# -*- coding: utf-8 -*-
"""4구역 status 판정 — 실운영(starstock_uploader.py)·시뮬(replay_3min.py) 공통 모듈.

판정 규칙:
  · 현재가 > 상한밴드              → hold   (관망유지)
  · 매도활성화선 ≤ 현재가 ≤ 상한밴드 → buy    (매수적기)
  · 현재가 < 매도활성화선, 미확정    → buy    (매수적기 유지 — 깜빡임 방지)
  · 현재가 < 매도활성화선, 확정      → sell   (손절조심)
  · 현재가 < 하한밴드, 확정          → cutoff (관심끊음 → 웹숨김)

  손절조심·관심끊음 "확정"은 매도활성화선 아래 sell_cnt 캔들 연속일 때만 적용.
  down 카운트 갱신은 호출부(업로더·시뮬)가 담당하며, 이 함수는 이미 갱신된 값을 받는다.

Note:
  · min_change_rate 필터는 업로더가 활성화 스캔 단계에서 적용 — 이 함수 밖.
  · 콘솔 출력용 mark 문자열은 시뮬(replay_3min.py)이 직접 생성 — 이 함수 밖.
"""
from typing import Literal

Status = Literal["buy", "hold", "sell", "cutoff"]


def determine_status(
    cur: int,
    upper_band: int,
    sell_line: int,
    lower_band: int,
    down: int,
    sell_cnt: int,
) -> Status:
    """현재가·연속하락 카운트 → 4구역 status 반환.

    Args:
        cur:        현재가 (업로더: 실시간 스냅샷 / 시뮬: 봉 종가)
        upper_band: 상한밴드 — 관망유지 경계
        sell_line:  매도활성화선 — 손절조심 켜는 선
        lower_band: 하한밴드 — 관심끊음 경계
        down:       매도활성화선 아래 연속 캔들 수 (호출 전 갱신 완료)
        sell_cnt:   손절조심·관심끊음 확정에 필요한 연속 캔들 수

    Returns:
        "buy" / "hold" / "sell" / "cutoff"
    """
    if cur > upper_band:
        return "hold"
    if cur >= sell_line:
        return "buy"
    if down < sell_cnt:
        return "buy"   # 매도활성화선 아래 미확정 → 매수적기 유지(깜빡임 방지)
    if cur < lower_band:
        return "cutoff"
    return "sell"
