---
brand: Cloudflare
brand_ko: 클라우드플레어
slug: cloudflare
generated: 2026-05-08
source_type: product_observation
confidence: medium
is_official: false

region: western
industry:
  - infra
  - dev-tools

color_tone: warm
primary_color_hex: "#F38020"
primary_color_name: "Cloudflare Orange"
mood:
  - 인프라
  - 신뢰
  - 속도

font_category: sans-serif
font_primary: Inter
font_korean_supported: true

density: compact
corner_style: soft
flatness: subtle

visual_style:
  - modern-minimal

theme_modes:
  - light
  - dark

released_year: 2010
last_major_revision: 2024
signature_keyword: "오렌지 구름 로고와 다크 대시보드의 글로벌 엣지 인프라 톤"

card_tokens: |
  {
    "light": { "bg": "#0F1116", "surface": "#1A1D24", "border": "#2A2D34", "fg": "#FFFFFF", "fg_muted": "#A4ABB7", "accent": "#F38020" },
    "dark":  { "bg": "#000000", "surface": "#0F1116", "border": "#1A1D24", "fg": "#F5F5F5", "fg_muted": "#A4ABB7", "accent": "#F38020" }
  }

hero_html: |
  <div style="font-family:Inter,'Pretendard',-apple-system,sans-serif;background:var(--card-bg);color:var(--card-fg);padding:0;height:100%;display:grid;grid-template-rows:auto 1fr;">
    <div style="background:var(--card-surface);border-bottom:1px solid var(--card-border);padding:8px 14px;display:flex;align-items:center;gap:8px;">
      <span style="display:inline-block;font-size:14px;line-height:1;">☁️</span>
      <strong style="font-size:13px;">Cloudflare</strong>
      <span style="margin-left:auto;font-size:11px;color:var(--card-fg-muted);">acme.com</span>
    </div>
    <div style="padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:var(--card-surface);border:1px solid var(--card-border);border-radius:8px;padding:12px;">
        <div style="font-size:10px;color:var(--card-fg-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">Requests</div>
        <div style="font-size:22px;font-weight:700;">2.4M</div>
        <div style="font-size:11px;color:#0CCE6B;font-weight:600;margin-top:2px;">▲ 12% · 24h</div>
      </div>
      <div style="background:var(--card-surface);border:1px solid var(--card-border);border-radius:8px;padding:12px;">
        <div style="font-size:10px;color:var(--card-fg-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">Threats</div>
        <div style="font-size:22px;font-weight:700;color:var(--card-accent);">812</div>
        <div style="font-size:11px;color:var(--card-fg-muted);margin-top:2px;">blocked</div>
      </div>
      <div style="grid-column:1/-1;background:var(--card-surface);border:1px solid var(--card-border);border-radius:8px;padding:12px;">
        <div style="font-size:10px;color:var(--card-fg-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Edge cache hit ratio</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;height:8px;background:var(--card-border);border-radius:9999px;overflow:hidden;">
            <div style="width:84%;height:100%;background:linear-gradient(90deg,#F38020,#FAA61A);"></div>
          </div>
          <strong style="font-size:14px;">84%</strong>
        </div>
      </div>
      <button style="grid-column:1/-1;background:var(--card-accent);color:#fff;border:0;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:600;font-family:inherit;align-self:flex-start;width:fit-content;">Purge cache</button>
    </div>
  </div>

sources:
  - https://www.cloudflare.com/
  - https://developers.cloudflare.com/
  - https://blog.cloudflare.com/
---

### ① 브랜드 DNA
- **브랜드명**: Cloudflare
- **한 줄 정체성**: 글로벌 엣지 네트워크로 인터넷의 모든 요청을 빠르고 안전하게 만드는 인프라 회사
- **공식 디자인 철학**: "Helping build a better Internet — fast, secure, accessible"
- **시그니처 요소 1개**: 오렌지(#F38020)→골드(#FAA61A) 그라데이션의 구름 로고 + 다크 대시보드 + 데이터 그래프

### ② 톤 & 무드
- **핵심 키워드 3개**: 인프라, 신뢰, 속도
- **무드 설명**: 다크 대시보드에 오렌지 액센트가 데이터 highlight로 등장. 차분한 grayscale 위에 단일 brand 컬러가 핵심 metric을 강조한다.
- **비주얼 스타일**: 모던 미니멀
- **밀도(Density)**: Compact — 데이터 대시보드
- **모서리 성향**: Soft (4~8px)
- **평면성**: Subtle

### ③ 컬러 시스템 (CSS 변수)

```css
:root {
  /* Primary - Cloudflare Orange */
  --color-primary-50:  #FEF1E0;
  --color-primary-100: #FDE0BC;
  --color-primary-200: #FAC078;
  --color-primary-300: #F7A03B;
  --color-primary-400: #F58E20;
  --color-primary-500: #F38020;  /* Cloudflare Orange */
  --color-primary-600: #D66B14;
  --color-primary-700: #AA5510;
  --color-primary-800: #7E400C;
  --color-primary-900: #522908;

  /* Secondary - Cloudflare Gold (그라데이션) */
  --color-secondary-500: #FAA61A;

  /* Cloudflare 시그니처 cloud gradient */
  --cf-cloud-start: #F38020;
  --cf-cloud-end:   #FAA61A;

  /* Neutral - Cloudflare gray */
  --color-neutral-0:    #FFFFFF;
  --color-neutral-50:   #F8F9FB;
  --color-neutral-100:  #ECEFF4;
  --color-neutral-200:  #DDE0E5;
  --color-neutral-300:  #C5C9D0;
  --color-neutral-500:  #8C9199;
  --color-neutral-700:  #5C6168;
  --color-neutral-800:  #2A2D34;
  --color-neutral-900:  #1A1D24;
  --color-neutral-1000: #0F1116;

  /* Semantic */
  --color-success-bg: #DCFAE6;
  --color-success-fg: #0CCE6B;
  --color-warning-bg: #FFF1D9;
  --color-warning-fg: #FAA61A;
  --color-error-bg:   #FCE4E4;
  --color-error-fg:   #F76262;
  --color-info-bg:    #E0F2FE;
  --color-info-fg:    #2596BE;

  /* Surface */
  --bg-base:     #FFFFFF;
  --bg-subtle:   #F8F9FB;
  --bg-elevated: #FFFFFF;
  --bg-overlay:  rgba(15,17,22,0.50);

  /* Text */
  --text-primary:    #1A1D24;
  --text-secondary:  #5C6168;
  --text-tertiary:   #8C9199;
  --text-on-primary: #FFFFFF;
  --text-disabled:   #C5C9D0;

  /* Border */
  --border-default: #DDE0E5;
  --border-subtle:  #ECEFF4;
  --border-strong:  #C5C9D0;
  --border-focus:   #F38020;
}

```

### ④ 타이포그래피
- **폰트 페어링**:
  - 영문: Inter (OFL) — Cloudflare 마케팅/대시보드 모두
  - 한글: Pretendard (OFL) / Apple SD Gothic Neo
  - 모노: ui-monospace, "JetBrains Mono"
- **위계**:
  - Display: 56px / 700 / 1.05 / -0.02em
  - H1: 36px / 700 / 1.15 / -0.01em
  - H2: 24px / 600 / 1.25 / 0
  - H3: 18px / 600 / 1.3 / 0
  - Body Large: 16px / 400 / 1.5 / 0
  - Body: 14px / 400 / 1.43 / 0
  - Body Small: 12px / 400 / 1.33 / 0
  - Caption: 11px / 600 / 1.27 / 0.04em (uppercase)

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
- **Container**: max-width 1280px, 좌우 패딩 24px

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
--shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 4px 12px rgba(0,0,0,0.10);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.14);
--shadow-xl: 0 20px 48px rgba(243,128,32,0.20);
```

### ⑧ Iconography
- **스타일**: Outline (Cloudflare 자체)
- **Stroke 굵기**: 1.5~2px
- **모서리 처리**: Round
- **추천 라이브러리**: Lucide / Phosphor

### ⑨ 컴포넌트 가이드

**Button**
```css
.btn {
  font: 600 14px/1 Inter, 'Pretendard', sans-serif;
  border-radius: var(--radius-md);
  padding: 0 14px;
  height: 36px;
  display: inline-flex; align-items: center; gap: 6px;
  border: 0;
  transition: background 100ms ease;
}
.btn-primary { background: var(--color-primary-500); color: #fff; }
.btn-primary:hover { background: var(--color-primary-600); }
.btn-primary:active { background: var(--color-primary-700); }
.btn-primary:disabled { background: var(--color-neutral-100); color: var(--text-disabled); }

.btn-cta { background: linear-gradient(135deg, var(--cf-cloud-start), var(--cf-cloud-end)); color: #fff; box-shadow: var(--shadow-md); }
.btn-cta:hover { box-shadow: var(--shadow-lg); }

.btn-secondary { background: var(--bg-base); color: var(--text-primary); border: 1px solid var(--border-default); }
.btn-secondary:hover { background: var(--bg-subtle); }
.btn-ghost { background: transparent; color: var(--color-primary-500); }
.btn-danger { background: var(--color-error-fg); color: #fff; }
```

**Input**
```css
.input {
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font-size: 14px;
}
.input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 2px rgba(243,128,32,0.20); }
```

**Card** (Metric tile)
```css
.metric { background: var(--bg-base); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; }
.metric .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); margin-bottom: 4px; }
.metric .num { font-size: 28px; font-weight: 700; line-height: 1.1; }
.metric .delta { font-size: 12px; margin-top: 4px; font-weight: 600; }
.metric .delta.up { color: var(--color-success-fg); }
.metric .delta.down { color: var(--color-error-fg); }
.card-elevated { box-shadow: var(--shadow-md); }
.card-outlined { box-shadow: none; }
```

**Badge**
```css
.tag { padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; line-height: 16px; display: inline-flex; align-items: center; gap: 4px; }
.tag-solid   { background: var(--color-primary-500); color: #fff; }
.tag-subtle  { background: var(--color-primary-50); color: var(--color-primary-700); }
.tag-outline { border: 1px solid var(--border-default); color: var(--text-primary); }
.tag-active  { background: var(--color-success-bg); color: var(--color-success-fg); }
.tag-active::before { content:""; width: 6px; height: 6px; border-radius: 50%; background: var(--color-success-fg); }
```

**Navigation (Top + Side)**
```css
.topnav { height: 56px; background: var(--bg-base); border-bottom: 1px solid var(--border-default); display: flex; align-items: center; padding: 0 24px; gap: 16px; }
.sidebar { width: 220px; background: var(--bg-base); border-right: 1px solid var(--border-default); padding: 16px 12px; }
.sidebar .item { padding: 8px 12px; border-radius: var(--radius-md); font-size: 14px; color: var(--text-primary); cursor: pointer; }
.sidebar .item:hover { background: var(--bg-subtle); }
.sidebar .item.active { background: var(--color-primary-50); color: var(--color-primary-700); font-weight: 600; }
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
1. Cloudflare 구름 로고를 회전/뒤집기 금지 — 항상 정방향
2. brand orange를 위험(error) 신호에 사용 금지 — 의미 신호 혼란
3. 데이터 그래프 라인을 5색 이상 동시에 사용 금지 — 가독성 저하
4. 다크 대시보드에서 풀 white 본문 사용 금지 — #A4ABB7~#FFF 범위 사용
5. 마케팅 hero에 채도 높은 그라데이션 배경 + brand 그라데이션 동시 사용 금지

### ⑫ 시그니처 적용 예시 (Dashboard)

```html
<style>
  body { margin: 0; font-family: Inter, 'Pretendard', -apple-system, sans-serif; color: #fff; background: #0F1116; }
  .topnav { height: 56px; background: #1A1D24; border-bottom: 1px solid #2A2D34; display: flex; align-items: center; padding: 0 20px; gap: 16px; }
  .topnav .logo { font-size: 22px; }
  .layout { display: grid; grid-template-columns: 220px 1fr; min-height: calc(100vh - 56px); }
  .sidebar { background: #1A1D24; border-right: 1px solid #2A2D34; padding: 16px 12px; }
  .sidebar .item { padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #A4ABB7; cursor: pointer; }
  .sidebar .item:hover { background: #2A2D34; color: #fff; }
  .sidebar .item.active { background: rgba(243,128,32,0.10); color: #F38020; font-weight: 600; }
  .main { padding: 24px 32px; }
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .head h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .grid-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .metric { background: #1A1D24; border: 1px solid #2A2D34; border-radius: 8px; padding: 14px; }
  .metric .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #A4ABB7; margin-bottom: 4px; }
  .metric .num { font-size: 26px; font-weight: 700; line-height: 1.1; }
  .metric .delta { font-size: 11px; margin-top: 4px; font-weight: 600; }
  .metric .delta.up { color: #0CCE6B; }
  .metric .delta.warn { color: #F38020; }
  .panel { background: #1A1D24; border: 1px solid #2A2D34; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .panel h3 { margin: 0 0 8px; font-size: 14px; font-weight: 600; }
  .progress { display: flex; align-items: center; gap: 12px; }
  .progress .bar { flex: 1; height: 8px; background: #2A2D34; border-radius: 9999px; overflow: hidden; }
  .progress .fill { height: 100%; background: linear-gradient(90deg, #F38020, #FAA61A); }
</style>

<header class="topnav">
  <span class="logo">☁️</span>
  <strong>Cloudflare</strong>
  <span style="color:#A4ABB7; font-size:13px;">/ acme.com</span>
  <span class="tag tag-active" style="margin-left:auto; background:rgba(12,206,107,0.15); color:#0CCE6B; padding:3px 10px; border-radius:9999px; font-size:11px; display:inline-flex; align-items:center; gap:4px;">● Active</span>
</header>

<div class="layout">
  <aside class="sidebar">
    <div class="item active">▤ Overview</div>
    <div class="item">⚡ Workers</div>
    <div class="item">🌐 DNS</div>
    <div class="item">🔒 Security</div>
    <div class="item">📊 Analytics</div>
    <div class="item">🚀 Pages</div>
    <div class="item">⚙ Settings</div>
  </aside>
  <main class="main">
    <div class="head">
      <h1>Overview · Last 24 hours</h1>
      <button class="btn btn-cta" style="background:linear-gradient(135deg,#F38020,#FAA61A); color:#fff; border:0; border-radius:6px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer;">Purge cache</button>
    </div>
    <div class="grid-metrics">
      <div class="metric"><div class="label">Total requests</div><div class="num">2.4M</div><div class="delta up">▲ 12%</div></div>
      <div class="metric"><div class="label">Bandwidth</div><div class="num">128 GB</div><div class="delta up">▲ 4%</div></div>
      <div class="metric"><div class="label">Threats blocked</div><div class="num" style="color:#F38020;">812</div><div class="delta warn">⚠ Higher than usual</div></div>
      <div class="metric"><div class="label">Avg response</div><div class="num">42ms</div><div class="delta up">▲ Faster</div></div>
    </div>
    <div class="panel">
      <h3>Edge cache hit ratio</h3>
      <div class="progress">
        <div class="bar"><div class="fill" style="width:84%;"></div></div>
        <strong>84%</strong>
      </div>
    </div>
  </main>
</div>
```
