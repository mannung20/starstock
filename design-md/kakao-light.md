---
brand: Kakao
brand_ko: 카카오
slug: kakao
generated: 2026-05-08
source_type: product_observation
confidence: high
is_official: false

region: korea
industry:
  - social
  - consumer

color_tone: warm
primary_color_hex: "#FEE500"
primary_color_name: "Kakao Yellow"
mood:
  - 친근함
  - 소셜
  - 패밀리

font_category: sans-serif
font_primary: KakaoFont
font_korean_supported: true

density: comfortable
corner_style: round
flatness: subtle

visual_style:
  - modern-minimal
  - humanism

theme_modes:
  - light
  - dark

released_year: 2010
last_major_revision: 2024
signature_keyword: "Kakao Yellow와 5색 캐릭터의 한국 메신저 표준"

card_tokens: |
  {
    "light": { "bg": "#B2C7DA", "surface": "#FFFFFF", "border": "#F0F0F0", "fg": "#191919", "fg_muted": "#888888", "accent": "#FEE500" },
    "dark":  { "bg": "#1F1F1F", "surface": "#2D2D2D", "border": "#383838", "fg": "#F5F5F5", "fg_muted": "#A0A0A0", "accent": "#FEE500" }
  }

hero_html: |
  <div style="font-family:'KakaoFont',Pretendard,-apple-system,sans-serif;background:var(--card-bg);color:var(--card-fg);padding:0;height:100%;display:grid;grid-template-rows:auto 1fr;">
    <div style="background:var(--card-surface);border-bottom:1px solid var(--card-border);padding:10px 14px;display:flex;align-items:center;gap:8px;">
      <span style="display:inline-block;width:22px;height:22px;background:var(--card-accent);border-radius:7px;color:var(--card-fg);display:grid;place-items:center;font-weight:900;font-size:12px;">●</span>
      <strong style="font-size:14px;font-weight:700;">카카오톡</strong>
      <span style="margin-left:auto;font-size:18px;">🔍</span>
    </div>
    <div style="padding:10px;display:flex;flex-direction:column;gap:6px;">
      <div style="background:var(--card-surface);border-radius:12px;padding:10px;display:flex;gap:10px;align-items:center;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#FEE500,#FF7B7B);"></div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;">준이 ❤</div>
          <div style="font-size:11px;color:var(--card-fg-muted);line-height:1.4;">잘 도착했어! 점심값 토스로 보낼게~</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:var(--card-fg-muted);">12:32</div>
          <span style="background:var(--card-accent);color:var(--card-fg);padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:700;display:inline-block;margin-top:2px;">2</span>
        </div>
      </div>
      <div style="background:var(--card-surface);border-radius:12px;padding:10px;display:flex;gap:10px;align-items:center;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#FF7B7B,#7B68EE);"></div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;">디자인 팀 (12)</div>
          <div style="font-size:11px;color:var(--card-fg-muted);line-height:1.4;">미나: 시스템 v2 PR 올렸어요!</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:var(--card-fg-muted);">11:14</div>
          <span style="background:var(--card-accent);color:var(--card-fg);padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:700;display:inline-block;margin-top:2px;">8</span>
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.05);border-radius:12px;padding:10px;display:flex;gap:10px;align-items:center;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1AAD5C,#FEE500);"></div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--card-fg-muted);">소이</div>
          <div style="font-size:11px;color:var(--card-fg-muted);line-height:1.4;">사진 5장</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:var(--card-fg-muted);">어제</div>
        </div>
      </div>
    </div>
  </div>

sources:
  - https://www.kakaocorp.com/
  - https://design.kakao.com/
  - https://kakaofont.com/
---

### ① 브랜드 DNA
- **브랜드명**: Kakao (카카오)
- **한 줄 정체성**: 한국 사람들의 일상 메신저 — 카카오톡 중심의 소셜 슈퍼앱
- **공식 디자인 철학**: "사람과 사람을, 사람과 정보를, 사람과 사물을 더 가깝게"
- **시그니처 요소 1개**: Kakao Yellow(#FEE500) + 5색 카카오프렌즈 캐릭터(라이언/어피치/무지/제이지/네오) + 푸른 회색(#B2C7DA) 채팅 배경

### ② 톤 & 무드
- **핵심 키워드 3개**: 친근함, 소셜, 패밀리
- **무드 설명**: 노란 brand mark + 푸른 회색 채팅 배경 + 다양한 색의 캐릭터 아바타. 한국에서 가장 친숙한 톤.
- **비주얼 스타일**: 모던 미니멀 + 휴머니즘 (캐릭터)
- **밀도(Density)**: Comfortable
- **모서리 성향**: Round (12~16px)
- **평면성**: Subtle

### ③ 컬러 시스템 (CSS 변수)

```css
:root {
  /* Primary - Kakao Yellow */
  --color-primary-50:  #FFF8B8;
  --color-primary-100: #FFEF85;
  --color-primary-200: #FFEA51;
  --color-primary-300: #FEE52B;
  --color-primary-400: #FEE500;  /* Kakao Yellow */
  --color-primary-500: #FEE500;
  --color-primary-600: #E5CE00;
  --color-primary-700: #B8A500;
  --color-primary-800: #8C7E00;
  --color-primary-900: #5C5300;

  /* Secondary - Kakao Brown */
  --color-secondary-500: #4A2D17;     /* logo brown */

  /* 카카오 캐릭터 컬러 */
  --kakao-friends-yellow: #FEE500;     /* 무지 */
  --kakao-friends-brown:  #4A2D17;     /* 라이언 */
  --kakao-friends-pink:   #FF7B7B;     /* 어피치 */
  --kakao-friends-cream:  #FFF6E6;     /* 콘 */
  --kakao-friends-black:  #191919;     /* 네오 */

  /* Chat background */
  --chat-bg: #B2C7DA;     /* 카카오톡 채팅 배경 */

  /* Neutral */
  --color-neutral-0:    #FFFFFF;
  --color-neutral-50:   #FAFAFA;
  --color-neutral-100:  #F5F5F5;
  --color-neutral-200:  #F0F0F0;
  --color-neutral-300:  #D9D9D9;
  --color-neutral-500:  #A0A0A0;
  --color-neutral-700:  #888888;
  --color-neutral-800:  #555555;
  --color-neutral-900:  #191919;
  --color-neutral-1000: #000000;

  /* Semantic */
  --color-success-bg: #DCF7E5;
  --color-success-fg: #1AAD5C;
  --color-warning-bg: #FFF8B8;
  --color-warning-fg: #B8A500;
  --color-error-bg:   #FFE5E5;
  --color-error-fg:   #FF3838;
  --color-info-bg:    #E0F0FE;
  --color-info-fg:    #2563EB;

  /* Surface */
  --bg-base:     #FFFFFF;
  --bg-subtle:   #F5F5F5;
  --bg-elevated: #FFFFFF;
  --bg-overlay:  rgba(25,25,25,0.50);

  /* Text */
  --text-primary:    #191919;
  --text-secondary:  #555555;
  --text-tertiary:   #888888;
  --text-on-primary: #191919;       /* yellow 위에는 black */
  --text-disabled:   #D9D9D9;

  /* Border */
  --border-default: #F0F0F0;
  --border-subtle:  #FAFAFA;
  --border-strong:  #D9D9D9;
  --border-focus:   #FEE500;
}

```

### ④ 타이포그래피
- **폰트 페어링**:
  - 한글: KakaoFont / KakaoBig (자체) / Pretendard (OFL 폴백)
  - 영문: -apple-system / SF Pro
- **위계**:
  - Display: 56px / 800 / 1.05 / -0.025em
  - H1: 32px / 800 / 1.15 / -0.02em
  - H2: 22px / 700 / 1.25 / -0.015em
  - H3: 17px / 700 / 1.3 / -0.01em
  - Body Large: 16px / 500 / 1.5 / -0.01em
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
  --space-2xl: 40px;
  --space-3xl: 64px;
  ```
- **Container**: max-width 480px (모바일 우선)

### ⑥ Border Radius
```css
--radius-none: 0;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 18px;
--radius-xl: 24px;
--radius-full: 9999px;
```

### ⑦ Shadow / Elevation
```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
--shadow-xl: 0 16px 32px rgba(254,229,0,0.30);
```

### ⑧ Iconography
- **스타일**: Outline + Filled (Kakao 자체)
- **Stroke 굵기**: 2px
- **모서리 처리**: Round
- **추천 라이브러리**: Phosphor / Lucide

### ⑨ 컴포넌트 가이드

**Button**
```css
.btn {
  font: 700 16px/1 'KakaoFont', Pretendard, -apple-system, sans-serif;
  letter-spacing: -0.01em;
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 0;
  transition: background 100ms ease;
}
.btn-primary { background: var(--color-primary-500); color: var(--text-on-primary); }
.btn-primary:hover { background: var(--color-primary-300); }
.btn-secondary { background: var(--bg-subtle); color: var(--text-primary); }
.btn-ghost { background: transparent; color: var(--text-primary); }
.btn-danger { background: var(--color-error-fg); color: #fff; }
```

**Input**
```css
.input { background: var(--bg-subtle); border: 0; border-radius: var(--radius-md); padding: 14px 16px; font-size: 16px; font-family: inherit; }
.input:focus { outline: 2px solid var(--border-focus); outline-offset: -2px; }
```

**Card** (Chat bubble)
```css
.bubble { background: var(--color-primary-500); color: var(--text-on-primary); border-radius: 14px; padding: 8px 12px; font-size: 14px; line-height: 1.4; max-width: 70%; }
.bubble.received { background: var(--bg-base); color: var(--text-primary); }
.card { background: var(--bg-base); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; }
.card-elevated { box-shadow: var(--shadow-md); border-color: transparent; }
.card-outlined { box-shadow: none; }
```

**Badge / Unread count**
```css
.unread { background: var(--color-primary-500); color: var(--text-on-primary); padding: 1px 7px; border-radius: 9999px; font-size: 11px; font-weight: 800; line-height: 16px; min-width: 18px; text-align: center; display: inline-block; }
.tag { padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; line-height: 18px; display: inline-flex; align-items: center; gap: 4px; }
.tag-solid   { background: var(--color-primary-500); color: var(--text-on-primary); }
.tag-subtle  { background: var(--color-primary-50); color: var(--color-primary-700); }
.tag-outline { border: 1px solid var(--border-default); color: var(--text-primary); }
```

**Navigation (Top bar + Bottom tabs)**
```css
.topbar { padding: 12px 16px; background: var(--bg-base); display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-default); }
.bottomnav { background: var(--bg-base); display: grid; grid-template-columns: repeat(5, 1fr); padding: 8px 0; border-top: 1px solid var(--border-default); }
.bottomnav .item { padding: 6px; text-align: center; font-size: 11px; color: var(--text-tertiary); }
.bottomnav .item.active { color: var(--color-secondary-500); font-weight: 700; }
.bottomnav .item .ic { font-size: 22px; }
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
1. Yellow 위에 흰 텍스트 사용 금지 — 검정 사용
2. 채팅 배경(#B2C7DA)을 흰색으로 변경 금지 — 카카오톡 시그니처
3. 카카오프렌즈 캐릭터 비율을 임의 변경 금지
4. 본문 폰트 weight 400 이하 사용 금지 — 500+ Bold가 한국어 가독성
5. 메시지 bubble 라운드를 sharp로 변경 금지

### ⑫ 시그니처 적용 예시 (KakaoTalk chat)

```html
<style>
  body { margin: 0; font-family: 'KakaoFont', Pretendard, -apple-system, sans-serif; letter-spacing: -0.01em; color: #191919; background: #B2C7DA; }
  .app { max-width: 480px; margin: 0 auto; min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; }
  .topbar { background: #B2C7DA; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
  .topbar .back { font-size: 22px; color: #191919; }
  .topbar .name { font-weight: 700; font-size: 16px; }
  .messages { padding: 14px 12px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
  .row { display: flex; gap: 8px; align-items: flex-end; max-width: 80%; }
  .row.received { align-self: flex-start; }
  .row.sent { align-self: flex-end; flex-direction: row-reverse; }
  .row .av { width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #FEE500, #FF7B7B); flex: 0 0 36px; }
  .row .col { display: flex; flex-direction: column; gap: 4px; }
  .row .col .name { font-size: 12px; color: #555; font-weight: 600; }
  .bubble { padding: 8px 14px; border-radius: 14px; font-size: 15px; line-height: 1.4; max-width: 100%; }
  .row.sent .bubble { background: #FEE500; color: #191919; border-radius: 14px 4px 14px 14px; }
  .row.received .bubble { background: #fff; color: #191919; border-radius: 4px 14px 14px 14px; }
  .row .meta { font-size: 10px; color: #555; align-self: flex-end; }
  .composer { background: #fff; padding: 10px 12px; display: flex; align-items: center; gap: 8px; border-top: 1px solid #E5E5E5; }
  .composer .input { flex: 1; background: #F5F5F5; border: 0; border-radius: 14px; padding: 10px 14px; font-size: 15px; font-family: inherit; }
  .composer .send { background: #FEE500; color: #191919; border: 0; border-radius: 14px; padding: 10px 16px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
</style>

<div class="app">
  <header class="topbar">
    <span class="back">‹</span>
    <span class="name">준이 ❤</span>
    <span style="margin-left:auto; font-size:18px;">🔍 ☰</span>
  </header>
  <main class="messages">
    <div class="row received">
      <div class="av"></div>
      <div class="col">
        <div class="name">준이 ❤</div>
        <div class="bubble">잘 도착했어!</div>
      </div>
    </div>
    <div class="row received">
      <div style="width:36px;"></div>
      <div class="col">
        <div class="bubble">점심값 토스로 보낼게~</div>
      </div>
      <div class="meta">12:32</div>
    </div>
    <div class="row sent">
      <div class="bubble">고마워 ㅎㅎ 맛있게 먹었어 🍜</div>
      <div class="meta">1<br/>12:33</div>
    </div>
    <div class="row sent">
      <div class="bubble">조심히 들어가~</div>
      <div class="meta">12:34</div>
    </div>
  </main>
  <div class="composer">
    <span style="font-size:20px;">＋</span>
    <input class="input" placeholder="메시지 입력"/>
    <button class="send">전송</button>
  </div>
</div>
```
