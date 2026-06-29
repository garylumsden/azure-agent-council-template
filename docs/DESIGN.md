# DESIGN.md — Agent Council

> Design system authored via the **gem-designer** method (create / design_system).
> Constraints: **dark-only**, **Fluent UI Blazor**, **WCAG 2.1 AA**, responsive.
> One memorable thing: **"Parliament at night"** — a calm, authoritative navy console that frames
> the live debate chamber as a broadcast centrepiece.

## 1. Visual Theme
- **Direction:** restrained *broadcast / mission-control*. Calm deep-navy surfaces, luminous blue
  accent, a single gold "on-air" highlight reserved for live/active states. Authority over flash.
- **Mood:** governmental credibility + live-event tension. Quiet by default; the chamber is the drama.
- **Foundation:** Fluent UI Blazor components themed via `FluentDesignTheme` (dark) + our token layer.

## 2. Color Palette (60-30-10, dark)
CSS variables (in `wwwroot/app.css`, applied under `:root`; app is always dark):
```
/* 60% — backgrounds */
--gc-bg:            #070d1c;  /* app base (deepest navy) */
--gc-bg-elevated:   #0d1830;  /* raised regions / header / nav */
--gc-surface:       #14213f;  /* cards, panels */
--gc-surface-2:     #1b2a4a;  /* nested / hover surface */
/* 30% — structure */
--gc-border:        #25345c;  /* hairline borders */
--gc-border-strong: #3a4d7e;  /* emphasised borders */
--gc-text:          #e8eefc;  /* primary text   (~15:1 on --gc-bg) */
--gc-text-muted:    #9fb2d6;  /* secondary      (~7:1) */
--gc-text-soft:     #7f93b8;  /* tertiary/labels (~4.7:1, AA) */
/* 10% — accent + semantics */
--gc-accent:        #6ea8fe;  /* primary action / links (~8:1) */
--gc-accent-hover:  #8cbcff;
--gc-accent-soft:   rgba(110,168,254,0.14);
--gc-gold:          #f4c542;  /* ON-AIR / live / active round only */
--gc-success:       #3ddc97;  /* Support / Approve */
--gc-info:          #6ea8fe;  /* Support w/ Conditions */
--gc-danger:        #ff6b6b;  /* Oppose / Reject */
--gc-warning:       #f4c542;  /* Defer */
--gc-neutral:       #98a2b3;  /* Abstain */
```
Map onto Fluent: `FluentDesignTheme` Mode=Dark, accent base ← `--gc-accent`, neutral base tuned to the
navy ramp; never use default Fluent purple/teal.

## 3. Typography
- **Family:** `"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif` (Microsoft-native, Fluent
  aligned). Display: `"Segoe UI Variable Display"` 600. Mono: `Consolas,"Courier New",monospace`.
- **Scale (1.250 major-third, 8pt rhythm):**
  display 2.0rem/700 · h1 1.6rem/600 · h2 1.3rem/600 · h3 1.1rem/600 · body 0.95rem/400 ·
  small 0.825rem/400 · eyebrow 0.72rem/700 (uppercase, letter-spacing .08em, `--gc-text-soft`).
- Line-height: body 1.6, headings 1.2. Max prose width ~72ch.

## 4. Component Stylings
- **Card** (`.gc-card`): `--gc-surface`, radius 16px, border `--gc-border`, `--elev-1`. Optional eyebrow
  + title. Hover → `--gc-surface-2` + `--elev-2`.
- **Stat tile** (`.gc-stat`): big display number, eyebrow label, optional trend; dashboard bento.
- **Button:** Fluent `Appearance.Accent` (primary), `Neutral` (secondary), `Stealth` (tertiary).
  44px min height. Focus ring 2px `--gc-accent` offset.
- **Stance / status pill** (`.gc-pill`): radius 999px, bg `color/14%` + solid text color, per semantic
  (support/conditions/oppose/abstain/defer/approve/reject). Replaces `bg-info text-dark`.
- **DataGrid** (`FluentDataGrid`): zebra `--gc-surface`/transparent, eyebrow header row, hover
  `--gc-surface-2`, links `--gc-accent`.
- **Nav** (`FluentNavMenu`): vertical rail on `--gc-bg-elevated`; active = `--gc-accent-soft` + left
  border `--gc-accent`; Fluent icons.
- **Prose** (`.prose`): re-point existing colors to tokens.
- **Chamber** (`debate.css`): keep radial navy stage; re-point hard-coded hexes to tokens; gold for
  round pill + active speaker mic; "ON AIR" stays `--gc-danger` red.

## 5. Layout Principles
- **Shell:** fixed left nav rail (240px ≥ md; collapsible drawer < md) + sticky top header (breadcrumbs
  + context actions) over a scrollable content well (max-width 1200px, 32px gutters).
- **Grid:** 12-col responsive; dashboard uses a **bento** of stat tiles + recent list.
- **8pt spacing** scale: 4/8/12/16/24/32/48. Section rhythm 32px.

## 6. Depth & Elevation (dark = glow, not shadow)
```
--elev-0: none;
--elev-1: 0 1px 2px rgba(0,0,0,.4), 0 0 0 1px var(--gc-border);
--elev-2: 0 6px 20px rgba(0,0,0,.45), 0 0 0 1px var(--gc-border);
--elev-3: 0 14px 40px rgba(0,0,0,.5), 0 0 0 1px var(--gc-border-strong);
--glow-accent: 0 0 0 1px rgba(110,168,254,.4), 0 0 18px rgba(110,168,254,.25);
--glow-live:   0 0 0 1px rgba(244,197,66,.5), 0 0 22px rgba(244,197,66,.3);
```

## 7. Do's / Don'ts
- ✅ Navy surfaces, one luminous-blue accent, gold ONLY for live/active.
- ✅ Eyebrow labels, generous spacing, glow elevation, Fluent components themed by token.
- ✅ WCAG AA text (≥4.5:1) and focus rings everywhere; honour `prefers-reduced-motion`.
- ❌ No Bootstrap `bg-light/bg-white/text-dark`; no second accent hue; no purple/teal "AI" gradients.
- ❌ No heavy drop shadows, no glassmorphism overload, no hardcoded hex in components (tokens only).

## 8. Responsive Behavior
- **≥1200:** full bento + nav rail. **768–1199:** nav rail, single-column content, tiles 2-up.
- **<768:** nav becomes top drawer, tiles stack, chamber scales seats, tables → stacked/scroll. Touch
  targets ≥44px. No horizontal body scroll.

## 9. Agent Prompt Guide (implementation rules)
1. Theme via `FluentDesignTheme Mode="Dark"`; colors come from `--gc-*` tokens — **never** hardcode hex
   in razor/scoped css.
2. Prefer Fluent components over raw HTML/Bootstrap; keep Bootstrap grid only transitionally.
3. Reuse shared classes: `.gc-card`, `.gc-pill`, `.gc-eyebrow`, `.gc-stat`, `.prose`.
4. Every interactive element: visible focus ring + ARIA label; every icon: `aria-hidden` or alt.
5. Preserve all behaviour, SignalR, data bindings — presentation only.
6. Build (`dotnet build`) after each page; keep 0 warnings / 0 errors.
