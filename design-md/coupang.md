---
brand: Coupang
brand_ko: 쿠팡
slug: coupang
generated: 2026-05-08
source_type: product_observation
confidence: high
is_official: false

region: korea
industry:
  - ecommerce
  - consumer

color_tone: warm
primary_color_hex: "#EE2E24"
primary_color_name: "Coupang Red"
mood:
  - 빠름
  - 거래 우선
  - 정보 풍부

font_category: sans-serif
font_primary: Pretendard
font_korean_supported: true

density: compact
corner_style: soft
flatness: subtle

visual_style:
  - modern-minimal

theme_modes:
  - light

released_year: 2010
last_major_revision: 2024
signature_keyword: "Red 액센트와 로켓배송 배지의 한국 빠른 커머스 톤"

hero_html: |
  <div style="font-family:Pretendard,-apple-system,sans-serif;background:#FFFFFF;color:#191919;padding:0;height:100%;display:grid;grid-template-rows:auto 1fr;">
    <div style="background:#fff;border-bottom:1px solid #F2F2F2;padding:8px 14px;display:flex;align-items:center;gap:8px;">
      <strong style="font-size:18px;font-weight:900;color:#EE2E24;letter-spacing:-0.025em;">coupang</strong>
      <span style="margin-left:auto;font-size:18px;">🔍</span>
    </div>
    <div style="padding:10px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <div style="aspect-ratio:1;background:linear-gradient(135deg,#FFE5E2,#EE2E24);border-radius:8px;position:relative;">
            <span style="position:absolute;left:6px;top:6px;background:#fff;color:#0074E8;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">🚀 로켓</span>
          </div>
          <div style="margin-top:6px;">
            <div style="font-size:11px;line-height:1.3;color:#191919;font-weight:500;">생수 2L × 12개</div>
            <div style="font-size:10px;color:#888;text-decoration:line-through;margin-top:2px;">12,800원</div>
            <div style="display:flex;align-items:center;gap:4px;margin-top:1px;">
              <strong style="font-size:14px;color:#191919;font-weight:800;">9,800원</strong>
              <span style="background:#FFE5E2;color:#EE2E24;padding:1px 4px;border-radius:2px;font-size:9px;font-weight:800;">23%</span>
            </div>
          </div>
        </div>
        <div>
          <div style="aspect-ratio:1;background:linear-gradient(135deg,#FFC15B,#EE2E24);border-radius:8px;position:relative;">
            <span style="position:absolute;left:6px;top:6px;background:#fff;color:#0074E8;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">🚀 로켓프레시</span>
          </div>
          <div style="margin-top:6px;">
            <div style="font-size:11px;line-height:1.3;color:#191919;font-weight:500;">제주 감귤 3kg</div>
            <div style="display:flex;align-items:center;gap:4px;margin-top:3px;">
              <strong style="font-size:14px;color:#191919;font-weight:800;">12,900원</strong>
              <span style="background:#FFE5E2;color:#EE2E24;padding:1px 4px;border-radius:2px;font-size:9px;font-weight:800;">15%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

sources:
  - https://www.coupang.com/
  - https://news.coupang.com/
---

### ① 브랜드 DNA
- **브랜드명**: Coupang (쿠팡)
- **한 줄 정체성**: 한국 1위 e커머스 — 로켓배송으로 익일 도착의 표준
- **공식 디자인 철학**: "Wow the customer — fast, reliable, end-to-end"
- **시그니처 요소 1개**: Coupang Red(#EE2E24) + Rocket Blue(#0074E8) 로켓배송 배지 + 빨간 워드마크

### ② 톤 & 무드
- **핵심 키워드 3개**: 빠름, 거래 우선, 정보 풍부
- **무드 설명**: 흰 캔버스 + 빨간 액센트 + 로켓 파랑 신호. 가격/할인%/배송 정보가 한 화면에 빽빽하게 정리된다.
- **비주얼 스타일**: 모던 미니멀
- **밀도(Density)**: Compact — 정보량 최우선
- **모서리 성향**: Soft (4~8px)
- **평면성**: Subtle

### ③ 컬러 시스템 (CSS 변수)

```css
:root {
  /* Primary - Coupang Red */
  --color-primary-50:  #FFE5E2;
  --color-primary-100: #FFCFCA;
  --color-primary-200: #FF9890;
  --color-primary-300: #FF5F54;
  --color-primary-400: #F33D32;
  --color-primary-500: #EE2E24;  /* Coupang Red */
  --color-primary-600: #C9251D;
  --color-primary-700: #9C1D17;
  --color-primary-800: #6E1410;
  --color-primary-900: #420C09;

  /* Secondary - Rocket Blue */
  --color-secondary-500: #0074E8;

  /* Neutral */
  --color-neutral-0:    #FFFFFF;
  --color-neutral-50:   #FAFAFA;
  --color-neutral-100:  #F5F5F5;
  --color-neutral-200:  #F2F2F2;
  --color-neutral-300:  #E0E0E0;
  --color-neutral-500:  #C7C7C7;
  --color-neutral-700:  #888888;
  --color-neutral-800:  #555555;
  --color-neutral-900:  #191919;
  --color-neutral-1000: #000000;

  /* Semantic */
  --color-success-bg: #DCF7E5;
  --color-success-fg: #1AAD5C;
  --color-warning-bg: #FFF1D9;
  --color-warning-fg: #B45309;
  --color-error-bg:   #FFE5E2;
  --color-error-fg:   #EE2E24;
  --color-info-bg:    #E0F0FE;
  --color-info-fg:    #0074E8;

  /* Surface */
  --bg-base:     #FFFFFF;
  --bg-subtle:   #FAFAFA;
  --bg-elevated: #FFFFFF;
  --bg-overlay:  rgba(25,25,25,0.50);

  /* Text */
  --text-primary:    #191919;
  --text-secondary:  #555555;
  --text-tertiary:   #888888;
  --text-on-primary: #FFFFFF;
  --text-disabled:   #C7C7C7;

  /* Border */
  --border-default: #E0E0E0;
  --border-subtle:  #F2F2F2;
  --border-strong:  #C7C7C7;
  --border-focus:   #EE2E24;
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
  - 한글: Pretendard (OFL) / Apple SD Gothic Neo
  - 영문: -apple-system / SF Pro
- **위계**:
  - Display: 32px / 800 / 1.15 / -0.025em
  - H1: 22px / 800 / 1.2 / -0.02em
  - H2: 18px / 700 / 1.27 / -0.015em
  - H3: 15px / 700 / 1.3 / -0.01em
  - Body Large: 14px / 500 / 1.5 / -0.005em
  - Body: 13px / 500 / 1.5 / -0.005em
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
- **Container**: max-width 1280px, 좌우 패딩 12px (mobile) / 16px (desktop)

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
--shadow-xl: 0 16px 32px rgba(238,46,36,0.18);
```

### ⑧ Iconography
- **스타일**: Outline + Filled
- **Stroke 굵기**: 1.5~2px
- **모서리 처리**: Round
- **추천 라이브러리**: Phosphor / Lucide

### ⑨ 컴포넌트 가이드

**Button**
```css
.btn {
  font: 700 14px/1 Pretendard, -apple-system, sans-serif;
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

**Input**
```css
.input { background: var(--bg-base); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 8px 12px; font-size: 14px; }
.input:focus { outline: none; border-color: var(--border-focus); }
```

**Card**
```css
.card { background: var(--bg-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 12px; }
.card-elevated { box-shadow: var(--shadow-md); border-color: transparent; }
.card-outlined { box-shadow: none; }
```

**Badge / Rocket pill**
```css
.tag { padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 800; line-height: 16px; display: inline-flex; align-items: center; gap: 4px; }
.tag-rocket { background: #fff; color: var(--color-secondary-500); border: 1px solid var(--color-secondary-500); }
.tag-rocket::before { content: "🚀 "; }
.tag-discount { background: var(--color-primary-50); color: var(--color-primary-500); }
.tag-solid   { background: var(--color-primary-500); color: #fff; }
.tag-subtle  { background: var(--color-primary-50); color: var(--color-primary-700); }
.tag-outline { border: 1px solid var(--border-default); color: var(--text-primary); }
```

**Navigation**
```css
.topnav { padding: 10px 14px; display: flex; align-items: center; gap: 12px; background: var(--bg-base); border-bottom: 1px solid var(--border-subtle); }
.topnav .brand { font-weight: 900; font-size: 22px; color: var(--color-primary-500); letter-spacing: -0.025em; }
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
1. 로켓배송 배지 색을 brand red로 통일 금지 — Blue가 시그니처 (속도 신호)
2. 가격 영역에서 할인% 표기 누락 금지 — 거래 신호 핵심
3. 본문 폰트 weight 400 이하 사용 금지
4. brand red를 페이지 전체 배경으로 사용 금지 — 액션과 brand mark에만
5. 상품 사진 라운드를 12px+ 사용 금지 — 4~8px 시그니처

### ⑫ 시그니처 적용 예시 (Mobile feed)

```html
<style>
  body { margin: 0; font-family: Pretendard, -apple-system, sans-serif; letter-spacing: -0.01em; color: #191919; background: #fff; }
  .app { max-width: 480px; margin: 0 auto; }
  .topbar { padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
  .topbar .brand { font-weight: 900; font-size: 24px; color: #EE2E24; letter-spacing: -0.025em; }
  .topbar input { flex: 1; background: #F5F5F5; border: 0; border-radius: 6px; padding: 9px 14px; font-size: 13px; font-family: inherit; }
  .chips { padding: 0 14px 10px; display: flex; gap: 6px; overflow-x: auto; }
  .chip { background: #F5F5F5; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; flex: 0 0 auto; }
  .chip.active { background: #EE2E24; color: #fff; }
  .grid { padding: 4px 10px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .product .img { aspect-ratio: 1; border-radius: 8px; position: relative; overflow: hidden; }
  .product .img .rocket { position: absolute; left: 6px; top: 6px; background: #fff; color: #0074E8; border: 1px solid #0074E8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; }
  .product .info { padding: 8px 4px 0; }
  .product .name { font-size: 12px; line-height: 1.4; font-weight: 500; color: #191919; }
  .product .old { font-size: 11px; color: #888; text-decoration: line-through; margin-top: 4px; }
  .product .price-row { display: flex; align-items: center; gap: 4px; margin-top: 1px; }
  .product .price { font-size: 16px; font-weight: 800; color: #191919; }
  .product .pct { background: #FFE5E2; color: #EE2E24; padding: 1px 5px; border-radius: 3px; font-size: 11px; font-weight: 800; }
  .product .stars { font-size: 11px; color: #FFC700; margin-top: 4px; }
  .product .stars span { color: #888; margin-left: 2px; }
</style>

<div class="app">
  <header class="topbar">
    <span class="brand">coupang</span>
    <input value="감귤"/>
    <span style="font-size:18px;">🛒</span>
  </header>
  <div class="chips">
    <span class="chip active">전체</span>
    <span class="chip">🚀 로켓배송</span>
    <span class="chip">🚀 로켓프레시</span>
    <span class="chip">와우</span>
    <span class="chip">무료배송</span>
  </div>
  <div class="grid">
    <div class="product">
      <div class="img" style="background:linear-gradient(135deg,#FFE5E2,#EE2E24);"><span class="rocket">🚀 로켓배송</span></div>
      <div class="info"><div class="name">생수 2L × 12개 (브랜드 본사 직배송)</div><div class="old">12,800원</div><div class="price-row"><span class="pct">23%</span><span class="price">9,800원</span></div><div class="stars">★ 4.8 <span>(12,840)</span></div></div>
    </div>
    <div class="product">
      <div class="img" style="background:linear-gradient(135deg,#FFC15B,#EE2E24);"><span class="rocket">🚀 로켓프레시</span></div>
      <div class="info"><div class="name">제주 감귤 3kg (특품)</div><div class="price-row"><span class="pct">15%</span><span class="price">12,900원</span></div><div class="stars">★ 4.9 <span>(8,420)</span></div></div>
    </div>
    <div class="product">
      <div class="img" style="background:linear-gradient(135deg,#1AAD5C,#FFC15B);"><span class="rocket">🚀 로켓배송</span></div>
      <div class="info"><div class="name">친환경 채소 모음 1박스</div><div class="price-row"><span class="pct">10%</span><span class="price">18,900원</span></div><div class="stars">★ 4.7 <span>(2,140)</span></div></div>
    </div>
    <div class="product">
      <div class="img" style="background:linear-gradient(135deg,#0074E8,#FFE5E2);"><span class="rocket">🚀 로켓배송</span></div>
      <div class="info"><div class="name">친환경 행주 12장 세트</div><div class="price-row"><span class="pct">30%</span><span class="price">7,900원</span></div><div class="stars">★ 4.6 <span>(4,820)</span></div></div>
    </div>
  </div>
</div>
```
