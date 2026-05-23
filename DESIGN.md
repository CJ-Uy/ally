# Ally Design System

Reference for all agents and contributors. Follow this to keep the app looking consistent.

---

## Identity

**Ally** is a warm, calm study companion — she's a fox mascot, not an abstract AI widget. The design should feel hand-crafted and personal: cozy paper textures, soft pastels, slightly imperfect shapes. The target feel is Things 3 / Bear: modern but warm, never sterile or "AI-generated-looking."

---

## Color Palette — "Study Blue" (default light)

| Name | Token | Value | Usage |
|------|-------|-------|-------|
| Background | `--bg` | `#eef2f7` | App shell background |
| Panel | `--panel` | `#f9fbfd` | Cards, sidebars, bubbles |
| Ink | `--ink` | `#1e2a3d` | Primary text, borders |
| Ink soft | `--ink-soft` | `#6b7a93` | Secondary text, labels |
| Line | `--line` | `#dde5ee` | Borders, dividers |
| Sky | `--sky` | `#caddec` | Pastel accent — peach/blue |
| Sage | `--sage` | `#b8d0c4` | Pastel accent — green, "focused" state |
| Butter | `--butter` | `#f0e0b5` | Pastel accent — warm yellow |
| Blush | `--blush` | `#f4c9c2` | Pastel accent — pink, "blocked/paused" state |
| Fox | `--fox` | `#f5a66b` | Ally's warm orange — **only warm accent**. Use sparingly. |
| Accent | `--accent` | `#4a6fa5` | Primary interactive blue (buttons, links, active states) |

### Dark variant — "Twilight"

| Token | Value |
|-------|-------|
| `--bg` | `#1a2233` |
| `--panel` | `#232c40` |
| `--ink` | `#e8edf5` |
| `--ink-soft` | `#8b97ae` |
| `--line` | `#2e3852` |
| `--sky` | `#3f5878` |
| `--sage` | `#4f7464` |
| `--butter` | `#a8915a` |
| `--blush` | `#9b6a66` |
| `--fox` | `#f5a66b` (unchanged) |
| `--accent` | `#7b9fcc` |

---

## Typography — "Cozy Modern"

| Role | Font | Token | Use for |
|------|------|-------|---------|
| Display | Bricolage Grotesque | `--font-display` | Headings, session timer, hero copy |
| Body | Onest | `--font-body` | All body text, UI copy |
| Mono | DM Mono | `--font-mono` | Labels, stickers, counters, eyebrow text |
| Handwritten | Caveat | `--font-hand` | Sticky-note props on Ally, informal moments |

All loaded from Google Fonts. Import already in `src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Onest:wght@400;500;600;700&family=Caveat:wght@500&family=DM+Mono:wght@400;500&display=swap');
```

### Type scale rules

- **Session timer / hero numbers**: Bricolage Grotesque, 64px, letter-spacing: -1px, tabular-nums
- **Section headings**: Bricolage Grotesque, 18–22px, weight 500
- **Body copy**: Onest, 14–15px, line-height 1.5
- **Sticker / eyebrow labels**: DM Mono, 11px, `text-transform: uppercase`, `letter-spacing: 0.6px`

---

## Paper Texture

A CSS-only grain applied via `background-image` + `background-blend-mode: multiply`. Never use a real image for this.

```css
--paper-svg: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.12 0 0 0 0 0.18 0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
```

Apply to any panel or card:
```css
background-image: var(--paper-svg), <base-color>;
background-blend-mode: multiply;
```

---

## Ally the Fox

The mascot **is** the orb and the emotional anchor of the UI. The fox image lives at `public/ally.png`.

### Rendering

Always use `object-fit: contain` and `filter: drop-shadow(...)` (traces silhouette, not bounding box).

```css
img.ally {
  object-fit: contain;
  filter: drop-shadow(0 6px 12px rgba(30, 42, 61, 0.22));
}
```

### Personality props (SVG overlays)

Layer these as absolutely-positioned SVG siblings inside a `position: relative` wrapper:

| Prop | When | Description |
|------|------|-------------|
| `focus` | Studying | 3 rising dots top-right (thinking/concentrating) |
| `book` | Deep work | Open book SVG at feet |
| `mug` | Break | Tea mug bottom-right |
| `stop` | Lock mode | Red octagonal STOP sign to the **left** of Ally |
| `note` | Away / idle | Sticky note top-right ("studying! back@5") in Caveat font |
| `clock` | Break ending | Alarm clock top-right |

### Emotion overlays

Expressed via SVG eyebrow paths over the image (no separate emotion images):
- `apprehensive`: inner-up/outer-down brows + sweat drop — used before the STOP sign was finalised; currently STOP sign alone is the lock-mode signal.

### State → prop mapping

| App state | Ally prop | Notes |
|-----------|-----------|-------|
| Idle (orb) | none | Semi-transparent, barely visible |
| Studying (orb) | `focus` | Gentle breathe animation |
| Break (orb) | `mug` | Countdown badge visible |
| Lock screen | `stop` | Full-screen takeover, Ally slightly rotated (-4°) |

---

## Component Patterns

### Sticker / Pill

Small uppercase label pill:

```css
.sticker {
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-weight: 500;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.05);
}
```

Color variants: `--sage` (focused/ok), `--blush` (blocked/paused), `--sky` (info), `--panel` with border (muted).

### Button

```css
.btn {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-size: 14px;
  font-weight: 500;
}
.btn--primary {
  background: var(--accent);
  color: #fff;
  border-color: transparent;
}
```

### Card

```css
.card {
  border-radius: 14px;
  padding: 18px;
  background: var(--panel);
  background-image: var(--paper-svg);
  background-blend-mode: multiply;
  border: 1px solid var(--line);
  box-shadow: 0 1px 0 rgba(30,42,61,0.02), 0 6px 14px rgba(30,42,61,0.04);
}
```

Optional accent tape: `::before` pseudo-element, 32×12px, rotated `-3deg`, in `--blush` (or subject color).

### Speech Bubble

The lock screen uses a speech bubble from Ally. The tail is a rotated square with two borders:

```css
.bubble::before {
  content: "";
  position: absolute;
  left: -12px; top: 26px;
  width: 22px; height: 22px;
  background: var(--panel);
  transform: rotate(45deg);
  border-left: 1.5px solid var(--ink);
  border-bottom: 1.5px solid var(--ink);
}
```

### Squiggle underline

Hand-drawn SVG underline used under hero headings:

```jsx
<svg width={width} height={8} viewBox="0 0 80 8">
  <path d="M2 5 Q 10 1, 20 4 T 40 4 T 60 4 T 78 4"
    stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />
</svg>
```

---

## Layout — Main Dashboard

```
┌──────────────────────────────────────────────────┐
│ 240px sidebar │ flex-1 main workspace            │
│               │                                  │
│  [Ally] Ally  │  SESSION · SUBJECT               │
│               │  47:12  (Bricolage, 64px)        │
│  Today        │  [Focused] [0 breaks today]      │
│  ○ Task 1     │                      [End ▸]     │
│  ✓ Task 2     │                                  │
│  ○ Task 3     │  ┌─ Card: What you're working on │
│               │  └────────────────────────────── │
│  Upcoming:    │  ┌──────┐  ┌──────┐  ┌──────┐  │
│  Exam in 6d   │  Streak   Week      Blocked      │
└───────────────┴──────────────────────────────────┘
```

Idle state: centered hero — Ally image, headline, squiggle, "Start study session →" button.

## Layout — Lock Screen (chosen: Takeover + Speech Bubble)

```
┌────────────────────────────────────────────────────┐
│ [● TikTok blocked]   [session paused]          [×] │
│                                                     │
│  ┌──────────────┐   ┌─────────────────────────┐   │
│  │  [STOP] Ally │   │ ╔ Speech bubble ╗       │   │
│  │  (rotated)   │   │ ║ "Headline..." ╝       │   │
│  │              │   │ "subtext..."            │   │
│  │              │   │                         │   │
│  │ ally ·       │   │ [user] Honestly mush.   │   │
│  │ study guard  │   │ [ally] Fair — 5 min...  │   │
│  └──────────────┘   │                         │   │
│                      │ [Make your case…] [Send]│   │
│                      └─────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

Background: radial-gradient `--sky` → `--bg` + paper texture.

---

## CSS Variables — Where They Live

All design tokens are defined in `src/index.css` as `:root` custom properties. The lock window (`src/lock/lock.css`) duplicates them on `#lock-root` because it's a separate Electron renderer with its own HTML document.

The orb window (`src/orb/orb.css`) doesn't use CSS variables for colors (it's minimally styled) but does set `background: transparent` on html/body for the always-on-top transparent window.
