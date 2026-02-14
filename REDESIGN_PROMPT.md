# AI Summit Strategist — Complete Redesign Specification

## To the Coding Agent

You are redesigning the **AI Summit Strategist** web app. The product generates personalized networking itineraries for the India AI Impact Summit (Feb 16–20, 2026). The current design is generic, juvenile, and looks like a Shadcn template. The user hates it.

Your job: Execute a full visual overhaul that makes this feel like a **precision tool for senior professionals** — sharp, efficient, and classy. Think Linear meets Notion meets Bloomberg. Not a toy. Not a SaaS template. A tool that a CXO would respect.

**Read `design-reference.html`** — it is a pixel-perfect, self-contained HTML reference showing every component in the new design system with exact CSS values. Use it as your source of truth.

---

## Design Direction: "Precision Concierge"

**One sentence**: A sharp, information-dense, light-mode interface that respects the user's intelligence and time — like a Bloomberg terminal had a baby with Linear.

**Emotional target**: The user should feel like they just opened a tool built by someone who understands their world, not a generic AI demo.

---

## 1. Color System

**CRITICAL: Replace ALL oklch values in `globals.css` with this system.**

The current design uses pure grays and scattered ad-hoc colors. The new system uses **warm-tinted neutrals** (not pure gray — every neutral has a tiny warm undertone) and **two intentional accent colors**.

### Surface Hierarchy (Backgrounds)
```
--surface-0: #FFFFFF       /* Page background */
--surface-1: #F8F8F7       /* Card backgrounds, sections, inputs */
--surface-2: #F0EFED       /* Hover states, inset areas, secondary cards */
--surface-3: #E8E6E3       /* Borders, dividers, disabled states */
```
Why warm-tinted: Pure gray (#F5F5F5) looks sterile and "AI-generated." These have a barely perceptible warm shift that makes the interface feel considered and intentional.

### Text Hierarchy
```
--text-primary: #1A1A19    /* Headlines, primary content */
--text-secondary: #5C5C5A  /* Body text, descriptions */
--text-tertiary: #8A8A87   /* Captions, metadata, timestamps */
--text-inverse: #FFFFFF    /* On dark/accent backgrounds */
```
**Rule**: Never use `text-gray-500`, `text-gray-400`, etc. from Tailwind's default palette. Map all grays to these four text tokens.

### Primary Accent: Deep Indigo
```
--accent-primary: #4338CA         /* Buttons, active states, links */
--accent-primary-hover: #3730A3   /* Hover */
--accent-primary-subtle: #EEF2FF  /* Light backgrounds for callouts */
--accent-primary-muted: #C7D2FE   /* Progress bars, light indicators */
```
Usage: Primary CTA buttons, selected states, links, progress indicators, quiz selections, focus rings. This replaces all `blue-600`, `blue-700` usage.

### Secondary Accent: Warm Amber
```
--accent-secondary: #D97706        /* Warnings, "must attend", highlights */
--accent-secondary-hover: #B45309
--accent-secondary-subtle: #FFFBEB
--accent-secondary-muted: #FDE68A
```
Usage: Conflict warnings, heavy hitter badges, urgency indicators. Sparing use — accent, not primary.

### Tier Badge Colors
These are critical for the plan page. Each tier has a distinct, muted color pair:
```
Must Attend:    bg #DBEAFE, text #1E40AF   (deep blue — commanding)
Should Attend:  bg #EDE9FE, text #6D28D9   (purple — strong)
Nice to Have:   bg #ECFDF5, text #047857   (green — opportunity)
Wildcard:       bg #FFFBEB, text #B45309   (amber — surprise)
Heavy Hitter:   bg #FFF1F2, text #BE123C   (rose — VIP)
Score badge:    bg #F0EFED, text #5C5C5A   (neutral, monospaced number)
```
**Rule**: Badge backgrounds are pastel/muted. Badge text is saturated. This creates clear visual hierarchy without screaming.

### Semantic Colors
```
Success:  #059669 / bg #ECFDF5
Warning:  #D97706 / bg #FFFBEB
Error:    #DC2626 / bg #FEF2F2
```

### Score Gradient (for score bars in event cards)
```
80+:  #059669 (green)
50-79: #D97706 (amber)
<50:  #8A8A87 (gray)
```

---

## 2. Typography

**Replace Noto Sans with Plus Jakarta Sans.** This is the primary and only font for all UI text. Add JetBrains Mono for monospaced elements (scores, terminal, timestamps).

### Font Loading
```tsx
// layout.tsx — use next/font
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})
```

### Type Scale
| Token | Size | Use |
|-------|------|-----|
| text-xs | 0.75rem (12px) | Metadata, badges, overlines |
| text-sm | 0.8125rem (13px) | Captions, secondary text |
| text-base | 0.9375rem (15px) | Body text (slightly smaller than default 16px — denser feel) |
| text-lg | 1.125rem (18px) | Card titles, section headings |
| text-xl | 1.375rem (22px) | Page subtitles |
| text-2xl | 1.75rem (28px) | Page titles (mobile) |
| text-3xl | 2.25rem (36px) | Page titles (desktop) |
| text-4xl | 2.75rem (44px) | Hero headline (desktop) |

### Type Rules
1. **Headlines**: `font-weight: 800` (extrabold), `letter-spacing: -0.025em` (tight), `line-height: 1.15`
2. **Section headings**: `font-weight: 700`, `letter-spacing: -0.025em`
3. **Card titles**: `font-weight: 600`
4. **Body text**: `font-weight: 400`, `line-height: 1.55`
5. **Overlines/labels**: `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.1em`, `font-size: 12px`
6. **Monospaced elements** (scores, terminal, timestamps): JetBrains Mono, `font-weight: 500`

### Tailwind Config
Add to `tailwind.config.js`:
```js
theme: {
  extend: {
    fontFamily: {
      display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-mono)', 'monospace'],
    },
    fontSize: {
      'xs': '0.75rem',
      'sm': '0.8125rem',
      'base': '0.9375rem',
      'lg': '1.125rem',
      'xl': '1.375rem',
      '2xl': '1.75rem',
      '3xl': '2.25rem',
      '4xl': '2.75rem',
    },
  }
}
```

---

## 3. Spacing, Borders & Shadows

### Border Radius
```
sm: 6px     /* Badges, small elements */
md: 8px     /* Inputs, buttons */
lg: 12px    /* Cards */
xl: 16px    /* Large cards, modals */
full: 9999px /* Pills */
```
**CRITICAL**: The current design uses `rounded-2xl` (16px) everywhere. The new design is sharper — most cards use `rounded-xl` (12px). Buttons use `rounded-lg` (8px). Badges use `rounded-md` (6px). Only pills and filter chips use `rounded-full`.

### Shadows
```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
--shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
--shadow-card-hover: 0 8px 28px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04);
```
**Rule**: Shadows are subtle and layered (two-layer shadows for depth). No hard drop shadows. Cards start with `shadow-xs` and gain `shadow-sm` or `shadow-md` on hover. The current `shadow-lg` on everything is too heavy.

### Borders
```
Default: 1px solid #E8E6E3 (surface-3)
Subtle: 1px solid rgba(0,0,0,0.06)
```
**Rule**: Cards use `border-subtle` (barely visible, relies on shadow for separation). Only dividers and explicit borders use `border-default`.

---

## 4. Animation System

### Page Transitions
Every page should have a `fadeInUp` entrance animation on the main content container:
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
/* Duration: 500ms, easing: cubic-bezier(0.16, 1, 0.3, 1) */
```

### List Stagger
Event cards and quiz options should stagger in with increasing delay:
```css
@keyframes staggerIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
/* Each item: animation-delay = index * 50ms */
```

### Quiz Step Transitions
When moving between quiz steps, use a slide animation:
```css
/* Entering step: slide in from right */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}
/* Duration: 350ms */
```

### Interactive States
- **Buttons**: `transform: scale(0.97)` on `:active` (press feedback)
- **Cards**: Smooth `box-shadow` transition on hover (`250ms ease-out`)
- **Selected states** (quiz cards, pills, dates): Border + background color transition (`150ms`)
- **Score bars**: Animate width from 0% on mount (`600ms ease-out`)
- **Accordion expand**: Height transition with opacity (`250ms`)

### Easing Functions
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);    /* Snappy deceleration — use for most */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Subtle bounce — use for selections */
```

### What to Remove
- Kill `gradient-text` animation (the blue→cyan gradient on headlines). Replace with solid `--text-primary` color. Gradient text screams "AI demo."
- Kill any generic CSS shimmer/skeleton animations. Use simple `opacity: 0.5` pulse for loading states.

---

## 5. Component Specifications

### 5.1 Buttons (modify `button.tsx`)

| Variant | Background | Text | Border | Shadow |
|---------|-----------|------|--------|--------|
| Primary (default) | `--accent-primary` | White | None | `shadow-sm` + inset glow |
| Primary hover | `--accent-primary-hover` | White | None | `shadow-md` |
| Secondary | `--surface-1` | `--text-primary` | `1px solid --surface-3` | None |
| Ghost | Transparent | `--text-secondary` | None | None |
| Ghost hover | `--surface-1` | `--text-primary` | None | None |

All buttons: `font-weight: 600`, `font-size: 13px`, `padding: 12px 20px`, `border-radius: 8px`.
Large variant: `font-size: 15px`, `padding: 16px 24px`.

The primary button should have a subtle inset highlight on the top edge:
```css
box-shadow: var(--shadow-sm), 0 1px 0 rgba(255,255,255,0.1) inset;
```

### 5.2 Cards (modify `card.tsx`)

```
Background: --surface-0 (white)
Border: 1px solid rgba(0,0,0,0.06)
Border-radius: 12px
Padding: 20px
Shadow: shadow-xs
Hover shadow: shadow-sm
Hover border: 1px solid --surface-3
Transition: box-shadow 250ms, border-color 250ms
```

### 5.3 Badges (modify `badge.tsx`)

```
Font: 12px, font-weight 600
Padding: 3px 8px
Border-radius: 6px (NOT rounded-full — sharper)
Line-height: 1.4
```
Each tier has its own bg/text color pair (see §1 Tier Badge Colors above). The score badge uses monospaced font.

### 5.4 Event Card (modify `EventCard.tsx`)

This is the **highest-impact component**. See `design-reference.html` for the full visual. Key changes:

1. **Remove excessive whitespace** — the current card is too airy. Tighten padding.
2. **Badge row at top**: Tier + Heavy Hitter + Score in one horizontal row. No stacking.
3. **One-liner callout**: Left-bordered block (`3px solid --accent-primary`) on `--surface-1` background. NOT a full-width colored bar.
4. **Meta row** (time, venue): `12px`, `--text-tertiary`, monospaced time.
5. **Speakers**: Separated by `·` (middle dot), not semicolons.
6. **Networking Intel accordion**: Trigger is an uppercase label ("NETWORKING INTEL") with a chevron. Content has distinct blocks for icebreaker (indigo border), strategy (green border), and score breakdown (bar chart).
7. **Score breakdown**: Horizontal bars with labels, track, fill, and value. Not a pie chart or plain numbers.
8. **Conflict warning**: Yellow-tinted strip at the bottom with `⚠️` icon.
9. **Timeline connector**: On the plan page, cards are connected by a vertical timeline with color-coded dots matching the tier.

### 5.5 Quiz Components

**Spotify-style onboarding feel**: One question per screen, large text, generous tap targets, smooth transitions.

**Quiz Progress**: Replace dots with a thin 2px horizontal progress bar at the top. Fill animates smoothly with `--accent-primary`.

**Role Cards (Step 1)**:
- 2-column grid (mobile), 3-column (desktop)
- Each card: emoji icon in a 36px rounded square, label below
- Selected state: `--accent-primary-subtle` background, `2px solid --accent-primary` border
- Generous padding: 20px vertical, 12px horizontal

**Interest/Mission Pills (Steps 2 & 3)**:
- Flex-wrap layout
- Each pill: `padding: 12px 16px`, `border-radius: 9999px`, `font-size: 13px`, `font-weight: 500`
- Default: `--surface-1` background, no border
- Selected: `--accent-primary-subtle` background, `1.5px solid --accent-primary` border, `--accent-primary` text
- Below the pills: counter text ("2 of 3 selected") in `--text-tertiary`

**Quiz Question Text**: `font-size: 22px` (mobile) / `28px` (desktop), `font-weight: 700`, `--text-primary`.

**Step Transition**: When advancing steps, outgoing step slides out left, incoming step slides in from right (350ms).

### 5.6 Terminal (Loading Page)

Keep the terminal concept but make it cleaner:
- Dark background: `#1A1A19`
- Title bar: `#2A2A28` with traffic light dots
- Text: JetBrains Mono, `13px`, `#A0A09D` (muted)
- Success lines: `--semantic-success` green
- Cursor: Blinking block cursor in `--accent-primary`
- Progress bar: 2px at the bottom, `--accent-primary` fill on `#2A2A28` track
- Card shadow: `shadow-lg` (this card should feel elevated)
- Border-radius: 12px

### 5.7 Date Selector (Landing Page)

Replace the current toggle buttons with compact date cards in a horizontal scroll:
- Each card: `min-width: 64px`, flexbox column (day abbreviation on top, date number below)
- Day text: `12px`, uppercase, `--text-tertiary`
- Date number: `18px`, `font-weight: 700`, `--text-primary`
- Selected: `--accent-primary-subtle` bg, `1.5px solid --accent-primary` border, indigo text
- Container: horizontal scroll with hidden scrollbar on mobile

### 5.8 Search & Filters (Explore Page)

**Search input**: Full-width, `--surface-1` background, subtle border, 40px left padding for search icon. Focus state: `--surface-0` bg, `--accent-primary-muted` border, 3px `--accent-primary-subtle` focus ring.

**Filter chips**: Horizontal scrollable row below search. Each chip is a pill (`border-radius: 9999px`, `6px 12px` padding, `12px` font). Active chips get `--accent-primary-subtle` bg and a count badge (small indigo circle with white number).

### 5.9 Empty State

Centered layout:
- 48px icon in a `--surface-1` rounded square
- Title: `15px`, `font-weight: 600`, `--text-primary`
- Description: `13px`, `--text-tertiary`, `max-width: 280px`
- Action button: Secondary variant below

### 5.10 Stats Row (Landing Page)

3-column grid of compact stat cards:
- `--surface-1` background, `border-radius: 8px`
- Value: `22px`, `font-weight: 700`, JetBrains Mono, `--text-primary`
- Label: `12px`, `--text-tertiary`
- Centered text

---

## 6. Page-Specific Instructions

### 6.1 Landing Page (`page.tsx`)

**Layout**: Centered, `max-width: 520px` (mobile) / `680px` (tablet) / `780px` (desktop). Not wider — this is a focused funnel, not a dashboard.

**Remove**: The gradient-text headline effect. Replace with solid `--text-primary` extrabold text.

**Hero Structure**:
1. Overline badge: "INDIA AI IMPACT SUMMIT 2026" — uppercase, `12px`, `font-weight: 600`, `letter-spacing: 0.1em`, `--text-tertiary`. No icon. No pill background.
2. Headline: "Don't Waste Your Time at the India AI Summit" — `28px` mobile / `44px` desktop, `font-weight: 800`, `--text-primary`
3. Subheadline: "Get Your High-ROI Networking Strategy in 30 Seconds" — `15px`, `--text-secondary`
4. Date selector (see §5.7)
5. CTA button: "Build My Strategy →" — Primary, large variant
6. Stats row (see §5.10)
7. Explore preview section with 6 featured heavy-hitter cards
8. Footer note: "Free. No signup required. Takes 30 seconds." — `13px`, `--text-tertiary`, centered

**Spacing between sections**: `32px–48px`. Current design is too cramped in some places and too loose in others.

### 6.2 Quiz Page (`quiz/page.tsx`)

**Layout**: Full viewport height per step. Content vertically centered (or top-aligned with generous top padding on mobile).

**Structure**:
1. Top: Ghost "← Back" button + thin progress bar
2. Middle: Question + selection grid/pills (see §5.5)
3. Bottom: "Next →" or "Generate My Strategy" primary button, fixed at bottom on mobile (`position: sticky; bottom: 0`)

**Tab bar** (Quick Quiz vs LinkedIn): Style as a subtle segmented control at the top, not a Shadcn tab component. Two options, `--surface-1` bg for inactive, `--surface-0` bg with `shadow-xs` for active. `border-radius: 8px` container.

**LinkedIn tab**: Clean textarea with character counter. `--surface-1` bg, subtle border, 200px min-height.

### 6.3 Loading Page (`loading/page.tsx`)

Full viewport centered terminal card (see §5.6). Below the terminal: "Building your personalized strategy" text that changes to "Redirecting to your strategy..." — `13px`, `--text-tertiary`, centered.

### 6.4 Plan Page (`plan/[id]/page.tsx`)

**Header**:
- Ghost "← Start Over" link + "Share Plan" secondary button (right-aligned)
- Overline: "INDIA AI IMPACT SUMMIT 2026"
- Dynamic headline from `plan.headline` — `28px` mobile / `36px` desktop, `font-weight: 800`
- Strategy note — `15px`, `--text-secondary`
- Inline stats: "12 events · 2 days · 8 exhibitors" — `13px`, monospaced numbers, `--text-tertiary`

**Day sections**:
- Day header: "Thursday, February 19" + "4 events" count — separated by baseline alignment
- Border-bottom divider under day header
- Timeline layout for event cards (see §5.4 timeline connector)

**Exhibitors section**:
- Section heading: "Exhibitors to Visit" with count
- Horizontal scroll on mobile, grid on desktop
- Each card: Logo/initial, name, one-liner, score badge, hover-reveal networking tip

### 6.5 Explore Page (`explore/page.tsx`)

**Sticky header**: Search bar + filter chips stick to top on scroll.

**Event list**: Collapsible cards. Collapsed = title + date/time/venue + badges. Expanded = full detail with one-liner, description, speakers, keywords, networking intel.

**Count display**: "{filtered} of {total} events" in `--text-tertiary` below search.

---

## 7. Tailwind Configuration Changes

### `globals.css` — Replace the entire `:root` block
Replace all oklch variables with the CSS custom properties from §1. Add animation keyframes from §4. Remove `gradient-text` class.

### `tailwind.config.js`
Extend with the custom font sizes, font families, border radii, and shadow values from this spec. Map CSS variables to Tailwind tokens where possible.

### `layout.tsx`
- Replace Noto Sans with Plus Jakarta Sans + JetBrains Mono via `next/font/google`
- Apply `${jakarta.variable} ${jetbrains.variable}` to body
- Set `font-family: var(--font-display)` as default on body
- Body classes: `bg-white text-[#5C5C5A] antialiased`

---

## 8. What NOT to Change

- **UX flow**: Landing → Quiz → Loading → Plan → Explore. Do not alter any navigation paths.
- **Data contracts**: localStorage keys, API calls, scoring logic — all unchanged.
- **Functionality**: All buttons, actions, and interactions work exactly as before.
- **Content**: Headlines, copy, quiz options, terminal lines — keep all text identical unless noted.
- **Route structure**: All page routes remain the same.
- **Shadcn component structure**: Keep using Shadcn primitives (Accordion, Tabs, etc.) — just restyle them.

---

## 9. Quality Checklist

Before considering the redesign complete, verify:

- [ ] **No gradient text** anywhere (solid colors only for all text)
- [ ] **No pure grays** — all neutrals are warm-tinted
- [ ] **Plus Jakarta Sans** loaded and rendering on all pages
- [ ] **JetBrains Mono** on scores, timestamps, terminal, stat values
- [ ] **Badge system** uses correct tier colors (6 distinct pairs)
- [ ] **Event card** one-liner has left-border callout style (not full-width bar)
- [ ] **Quiz** has Spotify-style full-height steps with progress bar (not dots)
- [ ] **Quiz selections** have clear selected states (indigo border + subtle bg)
- [ ] **Date selector** is horizontal scroll with day/date compact cards
- [ ] **Terminal** uses dark bg (#1A1A19) with JetBrains Mono
- [ ] **Buttons** have press feedback (scale 0.97 on active)
- [ ] **Page transitions** use fadeInUp animation on mount
- [ ] **Event cards** stagger in with 50ms delays
- [ ] **Score bars** animate from 0% width on mount
- [ ] **Empty state** exists for explore page with no results
- [ ] **Focus states** on inputs use indigo ring (not browser default)
- [ ] **Mobile**: All touch targets ≥ 44px, no horizontal scroll overflow except intentional (dates, filters, exhibitors)
- [ ] **No blue-600, blue-700, gray-500, gray-400** from default Tailwind palette anywhere

---

## 10. Files to Modify (Priority Order)

1. `web/src/app/globals.css` — Color system, animations, CSS variables
2. `web/src/app/layout.tsx` — Font loading, body classes
3. `web/tailwind.config.ts` — Theme extensions
4. `web/src/components/ui/button.tsx` — Button variants
5. `web/src/components/ui/badge.tsx` — Tier badge system
6. `web/src/components/ui/card.tsx` — Card base
7. `web/src/components/results/EventCard.tsx` — Event card redesign
8. `web/src/components/results/ExhibitorCard.tsx` — Exhibitor card redesign
9. `web/src/app/page.tsx` — Landing page
10. `web/src/app/quiz/page.tsx` — Quiz flow
11. `web/src/app/loading/page.tsx` — Terminal loading
12. `web/src/app/plan/[id]/page.tsx` — Plan results
13. `web/src/app/explore/page.tsx` — Event explorer
14. `web/src/components/ui/tabs.tsx` — Tab restyling
15. `web/src/components/ui/accordion.tsx` — Accordion restyling

---

## 11. Reference Files

| File | Purpose |
|------|---------|
| `design-reference.html` | **Visual source of truth** — every component rendered with exact CSS |
| `docs/UX_FLOW.md` | Complete UX specification — pages, elements, actions, navigation |
| `docs/REDESIGN_HANDOVER.md` | Current design audit and file inventory |
| `CLAUDE.md` | Full project context, data structures, architecture |
