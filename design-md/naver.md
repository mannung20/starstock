---
brand: Naver
brand_ko: 네이버
slug: naver
generated: 2026-05-08
source_type: product_observation
confidence: high
is_official: false

region: korea
industry:
  - consumer
  - media
  - social

color_tone: cool
primary_color_hex: "#03C75A"
primary_color_name: "Naver Green"
mood:
  - 검색 우선
  - 신뢰
  - 정보 풍부

font_category: sans-serif
font_primary: Nanum Square Neo
font_korean_supported: true

density: compact
corner_style: soft
flatness: subtle

visual_style:
  - modern-minimal

theme_modes:
  - light

released_year: 1999
last_major_revision: 2024
signature_keyword: "Naver Green과 검색바 모자(N) 모티프의 한국 검색 포털 표준"

hero_html: |
  <div style="font-family:'Nanum Square Neo','Nanum Square',Pretendard,-apple-system,sans-serif;background:#FFFFFF;color:#222222;padding:0;height:100%;display:grid;grid-template-rows:auto 1fr;">
    <div style="background:#fff;border-bottom:1px solid #F0F0F0;padding:10px 14px;display:flex;align-items:center;gap:8px;">
      <strong style="font-size:22px;font-weight:900;color:#03C75A;letter-spacing:-0.04em;">NAVER</strong>
      <span style="margin-left:auto;font-size:18px;">⓵</span>
    </div>
    <div style="padding:10px 14px;display:flex;flex-direction:column;gap:8px;">
      <div style="background:#fff;border:2px solid #03C75A;border-radius:8px;padding:6px 10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:14px;color:#03C75A;font-weight:700;">N</span>
        <input style="flex:1;border:0;outline:none;font-size:13px;font-family:inherit;background:transparent;" placeholder="검색어를 입력하세요" value="디자인 시스템"/>
        <span style="font-size:14px;color:#888;">🔍</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#222;padding:8px 4px;background:#F5F5F5;border-radius:8px;">📰<br/>뉴스</div>
        <div style="font-size:10px;font-weight:700;color:#222;padding:8px 4px;background:#F5F5F5;border-radius:8px;">🛒<br/>쇼핑</div>
        <div style="font-size:10px;font-weight:700;color:#222;padding:8px 4px;background:#F5F5F5;border-radius:8px;">🗺<br/>지도</div>
        <div style="font-size:10px;font-weight:700;color:#222;padding:8px 4px;background:#F5F5F5;border-radius:8px;">📺<br/>웹툰</div>
      </div>
      <div style="background:#fff;border:1px solid #F0F0F0;border-radius:8px;padding:10px;font-size:12px;">
        <div style="font-size:10px;color:#888;font-weight:700;margin-bottom:6px;">실시간 인기 검색어</div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span><strong style="color:#03C75A;">1</strong> 디자인 시스템</span><span style="color:#FF3838;font-weight:700;">▲ 12</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span><strong style="color:#03C75A;">2</strong> 토스</span><span style="color:#888;">―</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span><strong style="color:#222;">3</strong> 카카오</span><span style="color:#888;">▲ 4</span></div>
      </div>
    </div>
  </div>

sources:
  - https://www.naver.com/
  - https://naverservice.com/
---

### ① 브랜드 DNA
- **브랜드명**: Naver (네이버)
- **한 줄 정체성**: 한국 1위 검색 포털 — 뉴스/쇼핑/지도/웹툰까지 한 가족 슈퍼앱
- **공식 디자인 철학**: "정확한 정보, 친절한 도구 — 가장 자주 쓰는 일상의 시작점"
- **시그니처 요소 1개**: Naver Green(#03C75A) + 검색바 모자(N) 모티프 + Nanum Square Neo 폰트의 한국 검색 톤

### ② 톤 & 무드
- **핵심 키워드 3개**: 검색 우선, 신뢰, 정보 풍부
- **무드 설명**: 흰 캔버스 + Green 검색바 + 정보가 빽빽하게 채워진 화면. 한국에서 가장 많이 쓰이는 정보 우선 포털 톤.
- **비주얼 스타일**: 모던 미니멀
- **밀도(Density)**: Compact — 정보량 많은 포털
- **모서리 성향**: Soft (4~8px)
- **평면성**: Subtle

### ③ 컬러 시스템 (CSS 변수)

```css
:root {
  /* Primary - Naver Green */
  --color-primary-50:  #E0F8EC;
  --color-primary-100: #B2EFD0;
  --color-primary-200: #6BE3A4;
  --color-primary-300: #2ED884;
  --color-primary-400: #08CE69;
  --color-primary-500: #03C75A;  /* Naver Green */
  --color-primary-600: #02A848;
  --color-primary-700: #018236;
  --color-primary-800: #015D26;
  --color-primary-900: #003917;

  /* Secondary - Naver Black */
  --color-secondary-500: #222222;

  /* Naver 서비스 색 */
  --naver-news:  #1EBCD2;
  --naver-shop:  #FF5A1F;
  --naver-map:   #2DB400;
  --naver-pay:   #03C75A;

  /* Neutral */
  --color-neutral-0:    #FFFFFF;
  --color-neutral-50:   #FAFAFA;
  --color-neutral-100:  #F5F5F5;
  --color-neutral-200:  #F0F0F0;
  --color-neutral-300:  #E5E5E5;
  --color-neutral-500:  #C7C7C7;
  --color-neutral-700:  #888888;
  --color-neutral-800:  #555555;
  --color-neutral-900:  #222222;
  --color-neutral-1000: #000000;

  /* Semantic */
  --color-success-bg: #E0F8EC;
  --color-success-fg: #03C75A;
  --color-warning-bg: #FFF4D6;
  --color-warning-fg: #FF9500;
  --color-error-bg:   #FFE5E5;
  --color-error-fg:   #FF3838;
  --color-info-bg:    #E0F4FE;
  --color-info-fg:    #1EBCD2;

  /* Surface */
  --bg-base:     #FFFFFF;
  --bg-subtle:   #F5F5F5;
  --bg-elevated: #FFFFFF;
  --bg-overlay:  rgba(34,34,34,0.50);

  /* Text */
  --text-primary:    #222222;
  --text-secondary:  #555555;
  --text-tertiary:   #888888;
  --text-on-primary: #FFFFFF;
  --text-disabled:   #C7C7C7;

  /* Border */
  --border-default: #E5E5E5;
  --border-subtle:  #F0F0F0;
  --border-strong:  #C7C7C7;
  --border-focus:   #03C75A;
}

[data-theme="dark"] {
  --bg-base: #1A1A1A;
  --bg-subtle: #2D2D2D;
  --bg-elevated: #383838;
  --text-primary: #F5F5F5;
}
```

### ④ 타이포그래피
- **폰트 페어링**:
  - 한글: Nanum Square Neo / Nanum Square / Pretendard (OFL 폴백)
  - 영문: -apple-system / SF Pro
- **위계**:
  - Display: 48px / 800 / 1.1 / -0.025em
  - H1: 28px / 800 / 1.2 / -0.02em
  - H2: 20px / 700 / 1.27 / -0.015em
  - H3: 16px / 700 / 1.3 / -0.01em
  - Body Large: 15px / 500 / 1.5 / -0.005em
  - Body: 14px / 500 / 1.5 / -0.005em
  - Body Small: 13px / 500 / 1.43 / 0
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
- **Container**: max-width 1080px, 좌우 패딩 16px

### ⑥ Border Radius
```css
--radius-none: 0;
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;
```

### ⑦ Shadow / Elevation
```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
--shadow-xl: 0 16px 32px rgba(3,199,90,0.20);
```

### ⑧ Iconography
- **스타일**: Outline + Filled (Naver 자체)
- **Stroke 굵기**: 1.5~2px
- **모서리 처리**: Round
- **추천 라이브러리**: Phosphor / Lucide

### ⑨ 컴포넌트 가이드

**Button**
```css
.btn {
  font: 700 14px/1 'Nanum Square Neo', Pretendard, -apple-system, sans-serif;
  letter-spacing: -0.01em;
  border-radius: var(--radius-md);
  padding: 10px 16px;
  display: inline-flex; align-items: center; gap: 6px;
  border: 0;
  transition: background 100ms ease;
}
.btn-primary { background: var(--color-primary-500); color: #fff; }
.btn-primary:hover { background: var(--color-primary-600); }
.btn-secondary { background: var(--bg-base); color: var(--text-primary); border: 1px solid var(--border-strong); }
.btn-ghost { background: transparent; color: var(--color-primary-500); }
.btn-danger { background: var(--color-error-fg); color: #fff; }
```

**Input** (Naver 검색바 시그니처)
```css
.search { background: var(--bg-base); border: 2px solid var(--color-primary-500); border-radius: 6px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
.search input { flex: 1; border: 0; outline: none; font-size: 16px; font-family: inherit; }
.search .n-mark { font-size: 18px; color: var(--color-primary-500); font-weight: 900; font-family: 'Nanum Square Neo', sans-serif; }

.input { background: var(--bg-base); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 8px 12px; font-size: 14px; }
.input:focus { outline: none; border-color: var(--border-focus); }
```

**Card**
```css
.card { background: var(--bg-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 14px; }
.card-elevated { box-shadow: var(--shadow-md); border-color: transparent; }
.card-outlined { box-shadow: none; }
```

**Badge**
```css
.tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; line-height: 16px; display: inline-flex; align-items: center; gap: 4px; }
.tag-solid   { background: var(--color-primary-500); color: #fff; }
.tag-subtle  { background: var(--color-primary-50); color: var(--color-primary-700); }
.tag-outline { border: 1px solid var(--border-default); color: var(--text-primary); }
.rank        { color: var(--color-primary-500); font-weight: 800; }
.rank.top { color: var(--color-primary-500); }
.rank.steady { color: var(--text-primary); }
```

**Navigation**
```css
.topnav { padding: 12px 16px; display: flex; align-items: center; gap: 14px; background: var(--bg-base); border-bottom: 1px solid var(--border-default); }
.topnav .brand { font-weight: 900; color: var(--color-primary-500); font-size: 26px; letter-spacing: -0.04em; }
```

### ⑩ Motion
```css
--duration-fast: 100ms;
--duration-base: 200ms;
--duration-slow: 350ms;
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### ⑪ Anti-patterns
1. NAVER 워드마크의 letter-spacing tight 처리(-0.04em) 변경 금지
2. brand green을 destructive 액션에 사용 금지
3. 검색바 라운드를 12px+ 변경 금지 — 6px이 시그니처
4. 본문 폰트 weight 400 이하 사용 금지 — 500+ 가독성
5. 서비스(뉴스/쇼핑/지도/웹툰)의 색을 임의 매핑 금지

### ⑫ 시그니처 적용 예시 (Mobile home)

```html
<style>
  body { margin: 0; font-family: 'Nanum Square Neo', Pretendard, -apple-system, sans-serif; letter-spacing: -0.01em; color: #222; background: #fff; }
  .app { max-width: 480px; margin: 0 auto; min-height: 100vh; }
  .topbar { padding: 14px 16px; display: flex; align-items: center; gap: 14px; }
  .topbar .brand { font-weight: 900; color: #03C75A; font-size: 28px; letter-spacing: -0.04em; }
  .topbar .icons { margin-left: auto; display: flex; gap: 12px; font-size: 18px; }
  .search-bar { padding: 0 16px 12px; }
  .search { background: #fff; border: 2px solid #03C75A; border-radius: 6px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }
  .search .n { font-size: 16px; color: #03C75A; font-weight: 900; }
  .search input { flex: 1; border: 0; outline: none; font-size: 15px; font-family: inherit; }
  .quick { padding: 0 16px 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .quick .item { background: #F5F5F5; border-radius: 8px; padding: 14px 8px; text-align: center; cursor: pointer; }
  .quick .item .ic { font-size: 22px; margin-bottom: 6px; }
  .quick .item .name { font-size: 12px; font-weight: 700; }
  .news { padding: 0 16px 16px; }
  .news h3 { margin: 0 0 10px; font-size: 16px; font-weight: 800; }
  .ranking { background: #fff; border: 1px solid #F0F0F0; border-radius: 10px; padding: 12px 14px; }
  .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
  .row .left { display: flex; gap: 10px; align-items: center; }
  .row .left strong { font-size: 15px; font-weight: 800; min-width: 16px; text-align: center; }
  .row .left strong.top { color: #03C75A; }
  .row .right { font-size: 11px; font-weight: 700; }
  .row .right.up { color: #FF3838; }
  .row .right.same { color: #888; }
</style>

<div class="app">
  <header class="topbar">
    <span class="brand">NAVER</span>
    <span class="icons">🔔 ⓜ</span>
  </header>
  <div class="search-bar">
    <div class="search"><span class="n">N</span><input value="디자인 시스템"/><span style="font-size:18px; color:#888;">🔍</span></div>
  </div>
  <div class="quick">
    <div class="item"><div class="ic">📰</div><div class="name">뉴스</div></div>
    <div class="item"><div class="ic">🛒</div><div class="name">쇼핑</div></div>
    <div class="item"><div class="ic">🗺</div><div class="name">지도</div></div>
    <div class="item"><div class="ic">📺</div><div class="name">웹툰</div></div>
  </div>
  <section class="news">
    <h3>실시간 인기 검색어</h3>
    <div class="ranking">
      <div class="row"><div class="left"><strong class="top">1</strong><span>디자인 시스템</span></div><div class="right up">▲ 12</div></div>
      <div class="row"><div class="left"><strong class="top">2</strong><span>토스</span></div><div class="right same">―</div></div>
      <div class="row"><div class="left"><strong class="top">3</strong><span>카카오</span></div><div class="right up">▲ 4</div></div>
      <div class="row"><div class="left"><strong>4</strong><span>봄 패션</span></div><div class="right same">―</div></div>
      <div class="row"><div class="left"><strong>5</strong><span>제주 여행</span></div><div class="right up">▲ 2</div></div>
    </div>
  </section>
</div>
```
