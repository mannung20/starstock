# -*- coding: utf-8 -*-
"""STARSTOCK_MASTER.xlsm MASTER 시트에 돌파 감도 변수(J3~K7) 라벨/기본값 세팅.
   J=변수명(라벨), K=값. uploader 가 매 주기 K3~K7 읽어 config.json 동기화.
   현재 config.json 값과 일치시켜 실행(되돌림 방지). Windows/pywin32.
"""
import os
import json
import win32com.client as win32

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = os.path.join(HERE, "STARSTOCK_MASTER.xlsm")

# config.json 현재값 로드(없으면 기본)
try:
    with open(os.path.join(HERE, "config.json"), encoding="utf-8") as f:
        ep = json.load(f).get("entry_price", {})
except Exception:
    ep = {}

ROWS = [
    (3, "buy돌파비율%", ep.get("breakout_ratio", 1.5),
     "활성화 선=전일고가×(1+K3/100). 낮출수록 민감(신호 많아짐)"),
    (4, "buy연속캔들", ep.get("consecutive_candles", 2),
     "활성화 확정 연속 캔들 수. 높일수록 신중"),
    (5, "캔들분", ep.get("candle_minutes", 3),
     "감지 주기(분)=루프 대기시간. 3분봉이면 3"),
    (6, "sell돌파비율%", ep.get("sell_breakout_ratio", 1.5),
     "손절조심 선=전일고가×(1-K6/100). 낮출수록 빨리 손절조심"),
    (7, "sell연속캔들", ep.get("sell_consecutive_candles", 2),
     "손절조심·관심끊음 확정 연속 캔들 수. 높일수록 신중"),
]
# ※ 상한밴드%(관망유지)·하한밴드%(관심끊음)·최소등락률%는 config.json 전용(셀 없음)


def main():
    excel = win32.Dispatch("Excel.Application")
    excel.Visible = True
    excel.DisplayAlerts = False
    excel.EnableEvents = False   # ★Workbook_Open(자동 업로더·팝업 등 시작 시퀀스) 실행 방지 — 셀만 세팅
    try:
        wb = None
        for b in excel.Workbooks:
            if b.Name.lower() == os.path.basename(MASTER).lower():
                wb = b
                break
        if wb is None:
            wb = excel.Workbooks.Open(MASTER)
        ws = wb.Sheets("MASTER")
        # 옛 J6/J7 잔상(최소등락률% 등) 정리 후 새로 기입
        for r in range(3, 8):
            for c in (10, 11, 12):
                ws.Cells(r, c).Value = ""
        ws.Range("I2").Value = "[돌파 감도] J=변수명 K=값 L=설명 (uploader가 매주기 config.json 동기화)"
        for r, name, val, desc in ROWS:
            ws.Cells(r, 10).Value = name   # J열
            ws.Cells(r, 11).Value = val    # K열
            ws.Cells(r, 12).Value = desc   # L열(설명)
            print(f"J{r}={name}  K{r}={val}  L{r}={desc}")
        # 전송모드 (P4): "전체"=top-10 전부 재전송(웹순위 일관성) / "확정만"=돌파 종목만
        ws.Range("O4").Value = "전송모드"
        ws.Range("P4").Value = "전체"
        ws.Range("O5").Value = "전체=웹순위 일관성 / 확정만=돌파만"
        print("O4=전송모드  P4=전체")
        wb.Save()
        print("저장 완료.")
    finally:
        excel.EnableEvents = True


if __name__ == "__main__":
    main()
