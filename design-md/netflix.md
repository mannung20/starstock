---
brand: Netflix
brand_ko: 넷플릭스
slug: netflix
generated: 2026-05-08
source_type: product_observation
confidence: high
is_official: false

region: western
industry:
  - media
  - consumer

color_tone: cool
primary_color_hex: "#E50914"
primary_color_name: "Netflix Red"
mood:
  - 시네마틱
  - 다크
  - 몰입감

font_category: sans-serif
font_primary: Netflix Sans
font_korean_supported: true

density: compact
corner_style: sharp
flatness: layered

visual_style:
  - modern-minimal

theme_modes:
  - dark

released_year: 2007
last_major_revision: 2024
signature_keyword: "검정 캔버스에 Red 워드마크와 시네마틱 포스터 그리드의 OTT 톤"

hero_html: |
  <div style="font-family:'Netflix Sans',Inter,'Pretendard',-apple-system,sans-serif;background:#000000;color:#FFFFFF;padding:0;height:100%;display:grid;grid-template-rows:auto 1fr;">
    <div style="background:linear-gradient(180deg,rgba(0,0,0,0.85) 0%,transparent 100%);padding:10px 14px;display:flex;align-items:center;gap:8px;">
      <strong style="font-size:18px;font-weight:800;color:#E50914;letter-spacing:-0.05em;">NETFLIX</strong>
      <span style="margin-left:auto;font-size:11px;color:#fff;">Mina ▾</span>
    </div>
    <div style="padding:10px;display:flex;flex-direction:column;gap:8px;">
      <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#831010 0%,#000 70%);border-radius:0;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(0,0,0,0.85) 100%);"></div>
        <div style="position:absolute;left:14px;bottom:14px;">
          <div style="font-size:18px;font-weight:800;letter-spacing:-0.01em;line-height:1;">The City</div>
          <div style="font-size:9px;color:#E5E5E5;margin:4px 0;display:flex;gap:6px;align-items:center;"><span>★ 9.2</span><span>·</span><span>2026</span><span>·</span><span style="border:1px solid #fff;padding:0 4px;font-size:8px;">15+</span></div>
          <div style="display:flex;gap:4px;margin-top:6px;">
            <button style="background:#fff;color:#000;border:0;padding:4px 10px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:4px;">▶ 재생</button>
            <button style="background:rgba(109,109,110,0.7);color:#fff;border:0;padding:4px 10px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;">정보</button>
          </div>
        </div>
      </div>
      <div style="font-size:12px;font-weight:700;color:#fff;margin-top:4px;">지금 뜨는 콘텐츠</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
        <div style="aspect-ratio:2/3;background:linear-gradient(135deg,#831010,#000);border-radius:0;"></div>
        <div style="aspect-ratio:2/3;background:linear-gradient(135deg,#0E1116,#831010);border-radius:0;"></div>
        <div style="aspect-ratio:2/3;background:linear-gradient(135deg,#E50914,#000);border-radius:0;"></div>
      </div>
    </div>
  </div>

sources:
  - https://www.netflix.com/
  - https://brand.netflix.com/
---

### ① 브랜드 DNA
- **브랜드명**: Netflix
- **한 줄 정체성**: 글로벌 OTT의 표준 — 콘텐츠 추천과 시네마틱 시청 경험
- **공식 디자인 철학**: "Where stories take you — cinematic, personal, immersive"
- **시그니처 요소 1개**: Netflix Red(#E50914) 워드마크 + 검정 캔버스 + 큰 포스터 그리드의 시네마틱 톤

### ② 톤 & 무드
- **핵심 키워드 3개**: 시네마틱, 다크, 몰입감
- **무드 설명**: 풀 다크 캔버스 위에 큰 포스터/트레일러 hero가 화면을 채운다. UI chrome은 거의 사라지고 콘텐츠가 모든 것.
- **비주얼 스타일**: 모던 미니멀
- **밀도(Density)**: Compact — 포스터 그리드
- **모서리 성향**: Sharp (0~4px) — 포스터의 sharp 시그니처
- **평면성**: Layered — 그라데이션, hover scale

### ③ 컬러 시스템 (CSS 변수)

```css
:root {
  /* Primary - Netflix Red */
  --color-primary-50:  #FEE6E8;
  --color-primary-100: #FCBFC4;
  --color-primary-200: #F8888F;
  --color-primary-300: #F25058;
  --color-primary-400: #ED2C36;
  --color-primary-500: #E50914;  /* Netflix Red */
  --color-primary-600: #C00710;
  --color-primary-700: #95050C;
  --color-primary-800: #6B0408;
  --color-primary-900: #3D0205;

  /* Secondary - Netflix Black */
  --color-secondary-500: #141414;

  /* Neutral */
  --color-neutral-0:    #FFFFFF;
  --color-neutral-50:   #F2F2F2;
  --color-neutral-100:  #E5E5E5;
  --color-neutral-200:  #B3B3B3;
  --color-neutral-300:  #808080;
  --color-neutral-500:  #555555;
  --color-neutral-700:  #333333;
  --color-neutral-800:  #1F1F1F;
  --color-neutral-900:  #141414;        /* canvas */
  --color-neutral-1000: #000000;

  /* Semantic */
  --color-success-bg: #DCF7E5;
  --color-success-fg: #46D369;
  --color-warning-bg: #FFF1D9;
  --color-warning-fg: #F5A623;
  --color-error-bg:   #FCE4E4;
  --color-error-fg:   #E50914;
  --color-info-bg:    #E0F0FE;
  --color-info-fg:    #0096FF;

  /* Surface */
  --bg-base:     #141414;
  --bg-subtle:   #1F1F1F;
  --bg-elevated: #2F2F2F;
  --bg-overlay:  rgba(0,0,0,0.85);

  /* Text */
  --text-primary:    #FFFFFF;
  --text-secondary:  #B3B3B3;
  --text-tertiary:   #808080;
  --text-on-primary: #FFFFFF;
  --text-disabled:   #555555;

  /* Border */
  --border-default: #333333;
  --border-subtle:  #1F1F1F;
  --border-strong:  #555555;
  --border-focus:   #FFFFFF;
}

[data-theme="light"] {
  --bg-base: #FFFFFF;
  --bg-subtle: #F2F2F2;
  --bg-elevated: #FFFFFF;
  --text-primary: #141414;
  --text-secondary: #555555;
}
```

### ④ 타이포그래피
- **폰트 페어링**:
  - 영문: Netflix Sans (자체) — 폴백 -apple-system, "Helvetica Neue"
  - 한글: Pretendard (OFL) / Apple SD Gothic Neo
- **위계**:
  - Display: 80px / 800 / 1.05 / -0.025em (hero title)
  - H1: 56px / 800 / 1.1 / -0.02em
  - H2: 32px / 700 / 1.2 / -0.01em
  - H3: 22px / 700 / 1.3 / 0
  - Body Large: 18px / 400 / 1.5 / 0
  - Body: 14px / 400 / 1.43 / 0
  - Body Small: 12px / 400 / 1.33 / 0
  - Caption: 11px / 600 / 1.27 / 0

### ⑤ 스페이싱
- **Base unit**: 4px
- **토큰**:
  ```css
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 40px;
  --space-3xl: 64px;
  ```
- **Container**: fluid, 좌우 패딩 4% (mobile) / 4% (desktop)

### ⑥ Border Radius
```css
--radius-none: 0;        /* 포스터 기본 */
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 6px;
--radius-xl: 8px;
--radius-full: 9999px;
```

### ⑦ Shadow / Elevation
```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0,0,0,0.30);
--shadow-md: 0 8px 24px rgba(0,0,0,0.50);
--shadow-lg: 0 16px 40px rgba(0,0,0,0.70);
--shadow-xl: 0 24px 60px rgba(229,9,20,0.40);
```

### ⑧ Iconography
- **스타일**: Filled (재생 컨트롤) + Outline
- **Stroke 굵기**: 2px
- **모서리 처리**: Round
- **추천 라이브러리**: Lucide / Phosphor

### ⑨ 컴포넌트 가이드

**Button**
```css
.btn {
  font: 700 14px/1 'Netflix Sans', -apple-system, 'Pretendard', sans-serif;
  border-radius: var(--radius-md);
  padding: 0 24px;
  height: 40px;
  display: inline-flex; align-items: center; gap: 6px;
  border: 0;
  transition: background 100ms ease;
}
.btn-primary { background: var(--color-primary-500); color: #fff; }
.btn-primary:hover { background: var(--color-primary-600); }
.btn-primary:active { background: var(--color-primary-700); }
.btn-play { background: #fff; color: #000; }       /* 시그니처: 흰 재생 버튼 */
.btn-play:hover { background: rgba(255,255,255,0.75); }
.btn-secondary { background: rgba(109,109,110,0.7); color: #fff; }
.btn-secondary:hover { background: rgba(109,109,110,0.4); }
.btn-ghost { background: transparent; color: #fff; }
.btn-danger { background: var(--color-error-fg); color: #fff; }
```

**Input**
```css
.input { background: rgba(22,22,22,0.66); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 10px 14px; font-size: 14px; color: #fff; }
.input:focus { outline: none; border-color: #fff; }
```

**Card** (Poster card)
```css
.poster { aspect-ratio: 2/3; background: var(--bg-subtle); border-radius: 0; cursor: pointer; transition: transform 200ms ease, box-shadow 200ms ease; }
.poster:hover { transform: scale(1.05); box-shadow: var(--shadow-md); z-index: 2; }
.card { background: var(--bg-elevated); border-radius: var(--radius-md); padding: 16px; }
.card-elevated { box-shadow: var(--shadow-md); }
.card-outlined { box-shadow: none; border: 1px solid var(--border-default); }
```

**Badge / Maturity rating**
```css
.tag { padding: 0 8px; height: 20px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 600; line-height: 20px; display: inline-flex; align-items: center; }
.tag-solid   { background: var(--color-primary-500); color: #fff; }
.tag-subtle  { background: var(--color-primary-50); color: var(--color-primary-700); }
.tag-outline { border: 1px solid #fff; color: #fff; background: transparent; }
.maturity { border: 1px solid #fff; color: #fff; padding: 0 4px; font-size: 11px; font-weight: 600; }
```

**Navigation (Top bar — gradient fade)**
```css
.topnav { padding: 16px 4%; background: linear-gradient(180deg, rgba(0,0,0,0.85), transparent); position: fixed; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 24px; z-index: 10; }
.topnav.scrolled { background: var(--bg-base); }
.topnav .brand { font-weight: 800; color: var(--color-primary-500); font-size: 24px; letter-spacing: -0.05em; }
```

### ⑩ Motion
```css
--duration-fast: 100ms;
--duration-base: 250ms;
--duration-slow: 400ms;
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
/* 포스터 hover scale */
--ease-poster: cubic-bezier(0.4, 0, 0.2, 1);
```

### ⑪ Anti-patterns
1. brand red를 본문 텍스트로 사용 금지 — 액션과 워드마크에만
2. 페이지 캔버스를 흰색으로 변경 금지 — 다크가 시그니처
3. 포스터 라운드를 8px+ 변경 금지 — sharp 0px이 표준
4. 라이트 테마는 마케팅에만 사용, 시청 UI는 다크 강제
5. Netflix Red 위에 흰 텍스트 외 다른 색 사용 금지

### ⑫ 시그니처 적용 예시 (Browse view)

```html
<style>
  body { margin: 0; font-family: 'Netflix Sans', -apple-system, 'Pretendard', sans-serif; color: #fff; background: #141414; }
  .topnav { padding: 18px 4%; background: rgba(0,0,0,0.85); position: sticky; top: 0; display: flex; align-items: center; gap: 24px; z-index: 10; }
  .topnav .brand { font-weight: 800; color: #E50914; font-size: 28px; letter-spacing: -0.05em; }
  .topnav nav { display: flex; gap: 18px; font-size: 14px; }
  .topnav nav a { color: #E5E5E5; }
  .topnav nav a.active { color: #fff; font-weight: 700; }
  .hero { aspect-ratio: 16/7; background: linear-gradient(135deg, #831010 0%, #000 60%); position: relative; }
  .hero::before { content:""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 30%, rgba(20,20,20,0.85) 80%, #141414 100%); }
  .hero .info { position: absolute; left: 4%; bottom: 16%; max-width: 480px; }
  .hero h1 { font-size: 64px; font-weight: 800; line-height: 1.0; letter-spacing: -0.02em; margin: 0 0 12px; }
  .hero .meta { display: flex; gap: 8px; align-items: center; font-size: 13px; color: #E5E5E5; margin-bottom: 12px; }
  .hero .meta .maturity { border: 1px solid #fff; padding: 0 6px; font-size: 12px; font-weight: 600; }
  .hero .desc { font-size: 14px; line-height: 1.5; color: #E5E5E5; margin-bottom: 16px; }
  .hero .actions { display: flex; gap: 10px; }
  .row { padding: 24px 4% 8px; }
  .row h2 { margin: 0 0 12px; font-size: 18px; font-weight: 700; }
  .row .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .poster { aspect-ratio: 2/3; cursor: pointer; transition: transform 200ms ease; }
  .poster:hover { transform: scale(1.06); z-index: 5; }
</style>

<header class="topnav">
  <div class="brand">NETFLIX</div>
  <nav>
    <a class="active">홈</a>
    <a>시리즈</a>
    <a>영화</a>
    <a>최신</a>
    <a>내가 찜한 콘텐츠</a>
  </nav>
  <span style="margin-left:auto; font-size:13px; display:flex; gap:14px;">🔍 알림 ▾ Mina</span>
</header>

<section class="hero">
  <div class="info">
    <h1>THE CITY</h1>
    <div class="meta"><span style="color:#46D369; font-weight:700;">99% 매치</span><span>2026</span><span class="maturity">15+</span><span>시즌 2</span></div>
    <p class="desc">평범한 직장인이 도시의 어둠을 마주하며 자신의 정체를 찾아가는 여정. 한국발 글로벌 히트 스릴러.</p>
    <div class="actions">
      <button class="btn btn-play" style="background:#fff; color:#000; border:0; border-radius:4px; padding:10px 26px; font-size:15px; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer; font-family:inherit;">▶ 재생</button>
      <button class="btn btn-secondary" style="background:rgba(109,109,110,0.7); color:#fff; border:0; border-radius:4px; padding:10px 22px; font-size:15px; font-weight:700; cursor:pointer; font-family:inherit;">ⓘ 정보 보기</button>
    </div>
  </div>
</section>

<div class="row">
  <h2>지금 뜨는 콘텐츠</h2>
  <div class="grid">
    <div class="poster" style="background:linear-gradient(135deg,#831010,#000);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#0E1116,#831010);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#E50914,#000);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#46D369,#0E1116);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#F5A623,#831010);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#0096FF,#0E1116);"></div>
  </div>
</div>
<div class="row">
  <h2>한국 콘텐츠</h2>
  <div class="grid">
    <div class="poster" style="background:linear-gradient(135deg,#831010,#E50914);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#1F1F1F,#831010);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#0E1116,#46D369);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#0096FF,#831010);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#FFC15B,#000);"></div>
    <div class="poster" style="background:linear-gradient(135deg,#7B68EE,#000);"></div>
  </div>
</div>
```
