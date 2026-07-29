---
brand: Baemin
brand_ko: 배달의민족
slug: baemin
generated: 2026-05-08
source_type: product_observation
confidence: high
is_official: false

region: korea
industry:
  - ecommerce
  - consumer

color_tone: cool
primary_color_hex: "#2AC1BC"
primary_color_name: "Baemin Mint"
mood:
  - 친근함
  - 위트
  - 한국적 감성

font_category: display
font_primary: 한나는열한살체
font_korean_supported: true

density: comfortable
corner_style: round
flatness: subtle

visual_style:
  - humanism
  - retro-craft

theme_modes:
  - light
  - dark

released_year: 2010
last_major_revision: 2024
signature_keyword: "한나체 손글씨와 민트의 위트있는 한국 음식 배달 톤"

card_tokens: |
  {
    "light": { "bg": "#FFFFFF", "surface": "#F5F5F5", "border": "#F0F0F0", "fg": "#191919", "fg_muted": "#666666", "accent": "#2AC1BC" },
    "dark":  { "bg": "#1A1A1A", "surface": "#2D2D2D", "border": "#383838", "fg": "#F5F5F5", "fg_muted": "#A0A0A0", "accent": "#2AC1BC" }
  }

hero_html: |
  <div style="font-family:'한나는열한살체','BMHANNAPro',Pretendard,-apple-system,sans-serif;background:var(--card-bg);color:var(--card-fg);padding:0;height:100%;display:grid;grid-template-rows:auto 1fr;">
    <div style="background:var(--card-accent);padding:14px 18px;display:flex;align-items:center;gap:8px;">
      <strong style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.025em;">배달의민족</strong>
    </div>
    <div style="padding:14px;display:flex;flex-direction:column;gap:8px;">
      <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:12px;display:flex;gap:10px;align-items:center;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#2AC1BC,#FFC700);"></div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:900;">배민의 추천 가게</div>
          <div style="font-size:11px;color:var(--card-fg-muted);margin-top:2px;">★ 4.8 · 배달 25~35분 · 배달팁 0원</div>
        </div>
        <span style="background:#FFF7CC;color:#B89400;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:900;">단골</span>
      </div>
      <div style="background:#FFF7CC;border-radius:14px;padding:14px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:24px;">🐔</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:900;">치킨 한 마리 어때요?</div>
          <div style="font-size:11px;color:var(--card-fg-muted);margin-top:2px;">오늘 저녁 메뉴 고민될 때</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;margin-top:6px;">
        <div style="background:var(--card-surface);border-radius:10px;padding:10px 4px;"><div style="font-size:22px;">🍗</div><div style="font-size:10px;font-weight:900;margin-top:4px;">치킨</div></div>
        <div style="background:var(--card-surface);border-radius:10px;padding:10px 4px;"><div style="font-size:22px;">🍕</div><div style="font-size:10px;font-weight:900;margin-top:4px;">피자</div></div>
        <div style="background:var(--card-surface);border-radius:10px;padding:10px 4px;"><div style="font-size:22px;">🍱</div><div style="font-size:10px;font-weight:900;margin-top:4px;">한식</div></div>
        <div style="background:var(--card-surface);border-radius:10px;padding:10px 4px;"><div style="font-size:22px;">🍔</div><div style="font-size:10px;font-weight:900;margin-top:4px;">버거</div></div>
      </div>
    </div>
  </div>

sources:
  - https://www.baemin.com/
  - https://design.woowahan.com/
  - https://woowahan.com/about
---

### ① 브랜드 DNA
- **브랜드명**: Baemin (배달의민족, 우아한형제들)
- **한 줄 정체성**: 한국 음식 배달 1위 — 위트있는 카피와 한글 손글씨로 사랑받는 브랜드
- **공식 디자인 철학**: "우리가 어떤 민족입니까 — 정체성, 위트, 따뜻함"
- **시그니처 요소 1개**: 한나는열한살체(자체 손글씨 폰트) + Baemin Mint(#2AC1BC) + 한국적 감성의 카피

### ② 톤 & 무드
- **핵심 키워드 3개**: 친근함, 위트, 한국적 감성
- **무드 설명**: 민트 헤더 + 손글씨 폰트 + 노란 단골/추천 카드. 진지한 커머스가 아닌 친구가 권하는 듯한 톤.
- **비주얼 스타일**: 휴머니즘 + 살짝의 retro craft (손글씨)
- **밀도(Density)**: Comfortable
- **모서리 성향**: Round (10~14px)
- **평면성**: Subtle

### ③ 컬러 시스템 (CSS 변수)

```css
:root {
  /* Primary - Baemin Mint */
  --color-primary-50:  #E0F8F7;
  --color-primary-100: #B5EEEC;
  --color-primary-200: #6FDBD7;
  --color-primary-300: #3FCBC6;
  --color-primary-400: #2DC4BF;
  --color-primary-500: #2AC1BC;  /* Baemin Mint */
  --color-primary-600: #20A29D;
  --color-primary-700: #197F7B;
  --color-primary-800: #115C59;
  --color-primary-900: #093937;

  /* Secondary - Baemin Yellow */
  --color-secondary-500: #FFC700;

  /* Neutral */
  --color-neutral-0:    #FFFFFF;
  --color-neutral-50:   #FAFAFA;
  --color-neutral-100:  #F5F5F5;
  --color-neutral-200:  #F0F0F0;
  --color-neutral-300:  #E0E0E0;
  --color-neutral-500:  #C7C7C7;
  --color-neutral-700:  #888888;
  --color-neutral-800:  #555555;
  --color-neutral-900:  #191919;
  --color-neutral-1000: #000000;

  /* Semantic */
  --color-success-bg: #DCF7E5;
  --color-success-fg: #1AAD5C;
  --color-warning-bg: #FFF7CC;
  --color-warning-fg: #B89400;
  --color-error-bg:   #FFE5E5;
  --color-error-fg:   #FF3838;
  --color-info-bg:    #E0F8F7;
  --color-info-fg:    #2AC1BC;

  /* Surface */
  --bg-base:     #FFFFFF;
  --bg-subtle:   #F5F5F5;
  --bg-elevated: #FFFFFF;
  --bg-overlay:  rgba(25,25,25,0.50);

  /* Text */
  --text-primary:    #191919;
  --text-secondary:  #555555;
  --text-tertiary:   #888888;
  --text-on-primary: #FFFFFF;
  --text-disabled:   #C7C7C7;

  /* Border */
  --border-default: #F0F0F0;
  --border-subtle:  #FAFAFA;
  --border-strong:  #E0E0E0;
  --border-focus:   #2AC1BC;
}

```

### ④ 타이포그래피
- **폰트 페어링**:
  - 한글 헤드: 한나는열한살체 / 한나체 Pro / Bm한나체 (배민체 가족)
  - 한글 본문: Pretendard (OFL) / 배민주아체
  - 영문: -apple-system / SF Pro
- **위계**:
  - Display (한나): 56px / 900 / 1.05 / -0.025em
  - H1 (한나): 32px / 900 / 1.15 / -0.02em
  - H2 (한나): 22px / 900 / 1.25 / -0.015em
  - H3 (한나): 17px / 900 / 1.3 / -0.01em
  - Body Large (Pretendard): 16px / 500 / 1.5 / -0.005em
  - Body (Pretendard): 14px / 500 / 1.5 / -0.005em
  - Body Small: 12px / 500 / 1.43 / 0
  - Caption: 11px / 700 / 1.27 / 0

### ⑤ 스페이싱
- **Base unit**: 4px
- **토큰**:
  ```css
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 48px;
  ```
- **Container**: max-width 480px (모바일 우선)

### ⑥ Border Radius
```css
--radius-none: 0;
--radius-sm: 8px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 20px;
--radius-full: 9999px;
```

### ⑦ Shadow / Elevation
```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
--shadow-xl: 0 16px 32px rgba(42,193,188,0.30);
```

### ⑧ Iconography
- **스타일**: Outline + Emoji 적극 사용
- **Stroke 굵기**: 2px
- **모서리 처리**: Round
- **추천 라이브러리**: 시스템 emoji + Phosphor

### ⑨ 컴포넌트 가이드

**Button**
```css
.btn {
  font: 900 16px/1 '한나는열한살체', Pretendard, -apple-system, sans-serif;
  letter-spacing: -0.01em;
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 0;
  transition: background 100ms ease;
}
.btn-primary { background: var(--color-primary-500); color: #fff; }
.btn-primary:hover { background: var(--color-primary-600); }
.btn-secondary { background: var(--bg-subtle); color: var(--text-primary); }
.btn-ghost { background: transparent; color: var(--color-primary-500); }
.btn-danger { background: var(--color-error-fg); color: #fff; }
```

**Input**
```css
.input { background: var(--bg-subtle); border: 0; border-radius: var(--radius-md); padding: 12px 14px; font-size: 15px; font-family: inherit; }
.input:focus { outline: 2px solid var(--border-focus); outline-offset: -2px; }
```

**Card**
```css
.card { background: var(--bg-base); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 14px; }
.card-elevated { box-shadow: var(--shadow-md); border-color: transparent; }
.card-outlined { box-shadow: none; }
```

**Badge**
```css
.tag { padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 900; line-height: 18px; display: inline-flex; align-items: center; gap: 4px; font-family: '한나는열한살체', Pretendard, sans-serif; }
.tag-solid   { background: var(--color-primary-500); color: #fff; }
.tag-subtle  { background: var(--color-primary-50); color: var(--color-primary-700); }
.tag-outline { border: 1px solid var(--border-default); color: var(--text-primary); }
.tag-yellow  { background: #FFF7CC; color: #B89400; }
```

**Navigation**
```css
.topnav { padding: 14px 18px; background: var(--color-primary-500); color: #fff; display: flex; align-items: center; gap: 12px; }
.topnav .brand { font-weight: 900; font-size: 22px; letter-spacing: -0.025em; font-family: '한나는열한살체', Pretendard, sans-serif; }
```

### ⑩ Motion
```css
--duration-fast: 100ms;
--duration-base: 250ms;
--duration-slow: 400ms;
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### ⑪ Anti-patterns
1. 한나체를 본문 단락(60자+)에 사용 금지 — 헤드라인/카피 전용, 본문은 Pretendard
2. 위트있는 카피를 진지한 거래 톤으로 변경 금지 — 친근함이 정체성
3. brand mint를 destructive 액션에 사용 금지
4. emoji 활용을 줄이지 말 것 — 친근 톤 핵심
5. 본문 폰트 weight 400 이하 사용 금지

### ⑫ 시그니처 적용 예시 (Mobile home)

```html
<style>
  body { margin: 0; font-family: Pretendard, -apple-system, sans-serif; letter-spacing: -0.01em; color: #191919; background: #fff; }
  .display { font-family: '한나는열한살체', Pretendard, sans-serif; font-weight: 900; }
  .app { max-width: 480px; margin: 0 auto; }
  .topbar { background: #2AC1BC; color: #fff; padding: 16px 18px; display: flex; align-items: center; gap: 10px; }
  .topbar .brand { font-family: '한나는열한살체', Pretendard, sans-serif; font-weight: 900; font-size: 22px; letter-spacing: -0.025em; }
  .topbar .icons { margin-left: auto; font-size: 18px; }
  .home { padding: 14px 16px 24px; display: flex; flex-direction: column; gap: 10px; }
  .greeting { font-family: '한나는열한살체', Pretendard, sans-serif; font-weight: 900; font-size: 22px; letter-spacing: -0.02em; line-height: 1.2; padding: 8px 4px; }
  .ad { background: #FFF7CC; border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 12px; }
  .ad .icon { font-size: 28px; }
  .ad strong { font-family: '한나는열한살체', Pretendard, sans-serif; font-weight: 900; font-size: 16px; letter-spacing: -0.01em; }
  .ad .sub { font-size: 12px; color: #555; margin-top: 2px; }
  .quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .quick .item { background: #F5F5F5; border-radius: 14px; padding: 14px 4px; text-align: center; cursor: pointer; }
  .quick .item .ic { font-size: 28px; }
  .quick .item .name { font-family: '한나는열한살체', sans-serif; font-weight: 900; font-size: 12px; margin-top: 6px; }
  .stores h3 { font-family: '한나는열한살체', sans-serif; font-weight: 900; font-size: 18px; margin: 12px 0 10px; padding: 0 4px; }
  .store { background: #fff; border: 1px solid #F0F0F0; border-radius: 14px; padding: 12px; display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
  .store .img { width: 56px; height: 56px; border-radius: 14px; flex: 0 0 56px; }
  .store .info { flex: 1; }
  .store .name { font-family: '한나는열한살체', sans-serif; font-weight: 900; font-size: 15px; }
  .store .meta { font-size: 11px; color: #666; margin-top: 4px; }
  .store .badge { background: #FFF7CC; color: #B89400; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-family: '한나는열한살체', sans-serif; font-weight: 900; }
</style>

<div class="app">
  <header class="topbar">
    <span class="brand">배달의민족</span>
    <span class="icons">🔔 ⓜ</span>
  </header>
  <main class="home">
    <div class="greeting">미나님,<br/>오늘 점심은 뭐 드세요? 🥄</div>
    <div class="ad">
      <span class="icon">🐔</span>
      <div><strong>치킨 한 마리 어때요?</strong><div class="sub">오늘 저녁 메뉴 고민될 때</div></div>
    </div>
    <div class="quick">
      <div class="item"><div class="ic">🍗</div><div class="name">치킨</div></div>
      <div class="item"><div class="ic">🍕</div><div class="name">피자</div></div>
      <div class="item"><div class="ic">🍱</div><div class="name">한식</div></div>
      <div class="item"><div class="ic">🍔</div><div class="name">버거</div></div>
      <div class="item"><div class="ic">🍜</div><div class="name">중식</div></div>
      <div class="item"><div class="ic">🍝</div><div class="name">양식</div></div>
      <div class="item"><div class="ic">🍣</div><div class="name">일식</div></div>
      <div class="item"><div class="ic">☕</div><div class="name">카페</div></div>
    </div>
    <section class="stores">
      <h3>요즘 잘나가는 가게</h3>
      <div class="store">
        <div class="img" style="background:linear-gradient(135deg,#2AC1BC,#FFC700);"></div>
        <div class="info"><div class="name">엄마의 한식백반</div><div class="meta">★ 4.8 · 배달 25~35분 · 배달팁 0원</div></div>
        <span class="badge">단골</span>
      </div>
      <div class="store">
        <div class="img" style="background:linear-gradient(135deg,#FFC700,#EE2E24);"></div>
        <div class="info"><div class="name">치킨박사 강남점</div><div class="meta">★ 4.7 · 배달 35~45분 · 배달팁 2,000원</div></div>
      </div>
      <div class="store">
        <div class="img" style="background:linear-gradient(135deg,#FFC700,#2AC1BC);"></div>
        <div class="info"><div class="name">동네 피자</div><div class="meta">★ 4.6 · 배달 30~40분 · 배달팁 1,500원</div></div>
      </div>
    </section>
  </main>
</div>
```
