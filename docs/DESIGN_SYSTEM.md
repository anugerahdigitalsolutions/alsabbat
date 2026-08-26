# ALSABBAT Design System (Phase 1)

Character: **Football Club + Modern + Professional + Premium + Strong**.
All values live as design tokens in `frontend/src/index.css` — components reference tokens,
never raw hex values, and the club record can override brand tokens at runtime.

## 1. Official brand colors (mandatory)

| Token | Value | Usage |
| --- | --- | --- |
| `--club-primary` | `#FCCF2B` | Primary CTA, highlight, accent, active indicators |
| `--club-secondary` | `#012891` | Navigation/section accent, interactive elements, football identity |
| `--club-tertiary` | `#000000` | Primary text, dark sections, footer, hero, admin sidebar |
| `--club-light` | `#FEFEFE` | Light background, card background, text on dark surfaces |

Accessibility rule: gold is used as a **background/accent with dark text**, never as body
text on white. Dark sections use `#FEFEFE` text.

## 2. Functional colors

`--success #16A34A` · `--warning #F59E0B` · `--error #DC2626` · `--info #0284C7`
(used only for state feedback; they never replace the brand identity).

## 3. Typography

| Role | Font | Usage |
| --- | --- | --- |
| Display | Space Grotesk (500/600/700) | Headings, nav labels, stat numbers, scores |
| Body | IBM Plex Sans (400/500/600) | Body copy, forms, tables |
| Mono | IBM Plex Mono | IDs, permissions, technical metadata |

Hierarchy: `h1` 36→60px tight tracking · `h2` 24→30px · `h3` 18→20px · body 14→16px
relaxed leading · small 12→14px muted. Numbers use `tabular-nums`.

## 4. Spacing, radius, elevation, motion

- Spacing scale: `--space-1..12` (4–48px), section padding 48–64px, card padding 16–24px.
- Radius: `--radius-sm 10px`, `--radius-md 14px`, `--radius-lg 18px`, `--radius-xl 22px`.
- Shadows: `--shadow-sm/md/lg` (soft, neutral, never colored).
- Motion: `--dur-1 120ms`, `--dur-2 180ms`, `--dur-3 260ms` with `--ease-out`; only
  `transition-colors`, `transition-shadow`, `transition-opacity` (never `transition: all`).
  `prefers-reduced-motion` disables animation.

## 5. Components

| Component | Spec |
| --- | --- |
| Buttons | Primary = gold background + `#1A1A1A` text; Secondary = blue + white; Outline; Ghost; Danger = `--error`. Sizes 36/40/44px. |
| Cards | `.als-card`: white surface, 1px `--border-soft`, `--radius-lg`, `--shadow-sm`, hover `--shadow-md`. Stat cards add a 3px gold top rail. |
| Forms | shadcn Input/Textarea/Select/Switch on white, blue focus ring, uppercase micro-labels, `*` for required, inline help and error text. |
| Tables | Header tinted `rgba(1,40,145,0.04)`, 44–52px rows, horizontal scroll on mobile, pagination showing the visible range and total. |
| Badges | Status badges use functional colors at 12–16% alpha; club accent badge uses gold at 12–16%. |
| Modals | shadcn Dialog for create/edit, AlertDialog for destructive confirmation. |
| Navigation | Public: sticky translucent header, gold underline for the active item, Sheet drawer on mobile. Admin: dark sidebar, active item = gold left rail + tinted background. |
| Footer | `--club-tertiary` background, gold section labels, pitch-line texture. |
| States | `LoadingState` (skeletons), `EmptyState` (icon + copy + action), `ErrorState` (alert + retry), branded 404 page. |

## 6. Texture & gradients

`.als-stadium-glow` (two mild radial glows) and `.als-pitch-lines` are used on hero,
page headers, login and 404 only — decorative overlays covering well under 20% of a
typical viewport and never behind reading content.

## 7. Responsive breakpoints

`<640px` mobile (priority) · `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`.
Containers: public `max-w-6xl`, admin `max-w-[1400px]`. Sidebar collapses to a Sheet below `lg`.

## 8. Runtime branding

`ClubContext` fetches `GET /api/club/active` and writes `--club-*` custom properties on
`:root`, so brand changes are made once in the admin Club module instead of in code.
