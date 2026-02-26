# Design Redesign Handover

**Purpose**: Pass this document and the listed files to another AI agent so they can create a detailed redesign prompt. The current design is disliked and needs a full visual overhaul.

---

## 1. Essential Files (Must Read for Structure & Design)

### Root Layout & HTML Structure
| File | Role |
|------|------|
| `web/src/app/layout.tsx` | Root HTML shell, body classes, font (Noto Sans), metadata |
| `web/src/app/globals.css` | **CRITICAL** – CSS variables (colors, radii), Tailwind config, animations, gradient-text |

### Page Templates (HTML Structure + Layout)
| File | Role |
|------|------|
| `web/src/app/page.tsx` | Landing page – hero, date selector, stats, CTA, explore preview |
| `web/src/app/quiz/page.tsx` | Quiz flow – role/interests/missions selection, tabs (Quiz vs LinkedIn) |
| `web/src/app/loading/page.tsx` | Loading page – terminal-style animation |
| `web/src/app/explore/page.tsx` | Event browser – search, filters, collapsible event cards |
| `web/src/app/plan/[id]/page.tsx` | Results page – timeline, event cards, exhibitor section |

### Design System & Components
| File | Role |
|------|------|
| `web/components.json` | Shadcn UI config – style: "new-york", baseColor: "neutral", iconLibrary: "lucide" |
| `web/src/components/ui/button.tsx` | Button variants (default, outline, ghost, etc.) |
| `web/src/components/ui/card.tsx` | Card base component |
| `web/src/components/ui/tabs.tsx` | Tab styling |
| `web/src/components/ui/badge.tsx` | Badge styling |
| `web/src/components/ui/accordion.tsx` | Accordion used in EventCard |
| `web/src/components/results/EventCard.tsx` | **HIGH IMPACT** – event card layout, tier badges, score breakdown |
| `web/src/components/results/ExhibitorCard.tsx` | **HIGH IMPACT** – exhibitor card layout |

### Other UI Components (optional, lower impact)
- `web/src/components/ui/separator.tsx`, `sheet.tsx`, `dialog.tsx`, `scroll-area.tsx`, `toggle-group.tsx`, `toggle.tsx`

---

## 2. Current Design Summary

### Visual Style
- **Theme**: Light mode only – white backgrounds (`bg-white`), gray text (`gray-900`, `gray-500`, `gray-400`)
- **Primary accent**: Blue (`blue-600`, `blue-700`)
- **Font**: Noto Sans (Google Font)
- **Border radius**: `rounded-2xl` for cards, `rounded-full` for pills/badges
- **Shadows**: `hover:shadow-lg`, `shadow-md` on CTAs

### Color Palette (from globals.css `:root`)
- Background: `oklch(1 0 0)` (white)
- Foreground: `oklch(0.145 0 0)` (near black)
- Primary: `oklch(0.205 0 0)` (dark gray)
- Muted: `oklch(0.97 0 0)` (light gray)
- Destructive: `oklch(0.577 0.245 27.325)` (red)
- Chart colors: blue, cyan, purple, amber, etc.

### Semantic Colors Used in Pages
- **Blue**: Primary CTAs, selected states, links
- **Amber**: Heavy Hitter badges, conflict warnings
- **Cyan**: Stats (Users icon)
- **Purple**: Icebreaker callsouts
- **Emerald**: Networking tips, strategy callouts

### Layout Patterns
- Centered max-width: `max-w-4xl` / `max-w-2xl` / `max-w-xl`
- Mobile-first: `px-4 sm:px-6`, `py-6 sm:py-12`
- Sticky header on explore page
- Horizontal scroll for exhibitors on mobile

### Animations
- `animate-fade-in`, `animate-slide-up` (globals.css)
- `stagger-fade-in` for list items
- `gradient-text` for headlines (blue → cyan gradient)
- Terminal cursor blink on loading page

---

## 3. Project Context (from CLAUDE.md)

- **Product**: AI Summit Strategist – personalized networking itineraries for India AI Impact Summit (Feb 16–20, 2026)
- **Original design intent**: Dark mode, deep blues/blacks/whites, professional "Tech Summit" feel, mobile-first
- **Reality**: Implementation uses light mode, white backgrounds, gray text – does not match the original vision

---

## 3b. UX Flow (Must Pass to Redesign Agent)

**Pass `docs/UX_FLOW.md`** — it documents every page, element, action, and navigation:
- Which elements appear on which page
- Which button leads to what action and page
- Final output (what the plan page shows)
- Data flow (localStorage keys)

---

## 4. Design Preferences to Communicate

**User feedback**: "I hate the design" – full redesign desired.

**Suggested prompts for the redesign agent**:
- Consider dark mode (original vision) or a striking alternative
- Avoid generic "AI slop" – no bland gradients, Inter/Noto Sans, or predictable layouts
- Professional "Tech Summit" feel – high-end, not toy-like
- Mobile-first
- Keep UX flow intact (landing → quiz → loading → plan → explore)

---

## 5. Quick Reference: Markdown Files to Pass (Copy-Paste)

```
docs/UX_FLOW.md          # Full UX spec: pages, elements, actions, navigation
docs/REDESIGN_HANDOVER.md
CLAUDE.md
```

## 6. Code File Paths (for reference)

```
web/src/app/layout.tsx
web/src/app/globals.css
web/src/app/page.tsx
web/src/app/quiz/page.tsx
web/src/app/loading/page.tsx
web/src/app/explore/page.tsx
web/src/app/plan/[id]/page.tsx
web/components.json
web/src/components/ui/button.tsx
web/src/components/ui/card.tsx
web/src/components/ui/tabs.tsx
web/src/components/ui/badge.tsx
web/src/components/ui/accordion.tsx
web/src/components/results/EventCard.tsx
web/src/components/results/ExhibitorCard.tsx
CLAUDE.md
```

---

## 7. Suggested Redesign Prompt (Draft)

You can hand this to the redesign agent:

> Redesign the AI Summit Strategist web app. The product generates personalized networking itineraries for the India AI Impact Summit. Current design: light mode, white/gray/blue, Noto Sans, generic SaaS look. User dislikes it.
>
> **Constraints**: Keep the UX flow (landing → quiz → loading → plan → explore). Preserve all functionality.
>
> **Goals**: Create a distinctive, professional "Tech Summit" aesthetic. Consider dark mode (original vision) or a bold alternative. Avoid generic AI aesthetics. Mobile-first.
>
> **Files to modify**: Pass the files listed in REDESIGN_HANDOVER.md. Key touchpoints: globals.css (colors, radii, animations), layout.tsx (body, font), all page.tsx files, EventCard.tsx, ExhibitorCard.tsx, and Shadcn UI components (button, card, tabs, badge, accordion).
>
> **UX reference**: Use docs/UX_FLOW.md for exact page structure, elements, and navigation — preserve all of it.
