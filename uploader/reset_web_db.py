# -*- coding: utf-8 -*-
"""웹 종목 DB(stocks) 소프트 초기화 — 전 종목 is_visible=false 로 숨김.

  ★핵심 안전 규칙
   - buy_signals(매수신호 이력)는 절대 건드리지 않음 → 보존기간 무제한 유지.
   - status 컬럼을 바꾸지 않으므로 buy_signals 트리거(after update OF status)도 안 걸림
     → 초기화로 인한 신호 오기록 없음.
   - 엑셀 시트는 손대지 않음(웹 DB 표시상태만 초기화).

  호출: 엑셀 STARSTOCK_MASTER.xlsm 의 Workbook_Open VBA → Shell 로 이 스크립트 실행.
  접속: web/.env.local 의 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 재사용.
  ★git 커밋 제외(로컬 전용).
"""
import os
import sys
import time
import datetime
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ENV = os.path.join(ROOT, "web", ".env.local")


def load_env(path):
    """web/.env.local 을 읽어 dict 로 반환."""
    d = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip().strip('"')
    return d


def main():
    try:
        env = load_env(ENV)
        supa = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
        skey = env["SUPABASE_SERVICE_ROLE_KEY"]
    except Exception as e:
        print(f"[초기화 실패] 환경설정 로드 오류: {e}")
        input("Enter 키를 눌러 닫기...")
        sys.exit(1)

    headers = {
        "apikey": skey,
        "Authorization": f"Bearer {skey}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",  # 영향받은 행 반환 → 건수 집계용
    }
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 현재 표시중(is_visible=true)인 stocks 만 숨김 처리.
    # buy_signals 는 URL 에 포함되지 않으므로 절대 건드리지 않음.
    url = f"{supa}/rest/v1/stocks?is_visible=eq.true"
    body = {"is_visible": False, "updated_at": now_iso}

    try:
        res = requests.patch(url, headers=headers, json=body, timeout=20)
        res.raise_for_status()
        count = len(res.json())
        print(f"[초기화 완료] stocks {count}건 숨김(is_visible=false). "
              f"buy_signals 이력은 보존됨.")
    except Exception as e:
        print(f"[초기화 실패] {e}")
        input("Enter 키를 눌러 닫기...")
        sys.exit(1)

    # 결과 확인용으로 잠깐 표시 후 자동 종료
    time.sleep(2)


if __name__ == "__main__":
    main()
