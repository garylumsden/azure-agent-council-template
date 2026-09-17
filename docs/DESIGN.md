# Agent Council design system

The UI uses a shared navy theme, Segoe UI, and Fluent UI Blazor controls.
The refresh uses the Impeccable design process by Paul Bakaus: <https://impeccable.style>.
It retains the original palette and replaces decorative chamber geometry with readable workspaces.

## Overview

The primary debate audience is a presenter and an audience following an autonomous council.
Readers must see the current moderator announcement, raised hands, and responses without scrolling the whole page.
The user selected **Live desk** and **Focus stage**.
Conversation lanes, Split review, and the standalone Event timeline layout were rejected.
A compact moderator timeline belongs in both selected layouts.

The rest of the app uses consistent page headers, primary actions, toolbars, lists, and empty states.
Scenario configuration remains the source of branding, member names, roles, and roster size.

## Colors

Use the `--gc-*` properties from `wwwroot/app.css`.

| Token | Value | Purpose |
|---|---|---|
| `--gc-bg` | `#070d1c` | Page background |
| `--gc-bg-elevated` | `#0d1830` | Navigation and secondary regions |
| `--gc-surface` | `#14213f` | Work surfaces |
| `--gc-surface-2` | `#1b2a4a` | Hover and nested regions |
| `--gc-border` | `#25345c` | Surface boundaries |
| `--gc-border-strong` | `#3a4d7e` | Emphasised boundaries |
| `--gc-text` | `#e8eefc` | Primary text |
| `--gc-text-muted` | `#9fb2d6` | Supporting text |
| `--gc-text-soft` | `#94a9cc` | Metadata |
| `--gc-accent` | `#6ea8fe` | Actions and selection |
| `--gc-accent-hover` | `#8cbcff` | Action hover |
| `--gc-gold` | `#f4c542` | Live state and warnings |
| `--gc-success` | `#3ddc97` | Support and approval |
| `--gc-danger` | `#ff6b6b` | Opposition and errors |
| `--gc-neutral` | `#98a2b3` | Neutral status |

Pair status colors with explicit labels. Do not use color alone to communicate a state.
Persona colors remain derived from configuration identities.

## Typography

Use `"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif` for text.
Use the matching display family for headings.
Reserve monospace for source code and structured data.

| Role | Size / line height |
|---|---|
| Body | `.9375rem / 1.6` |
| Page title | `clamp(1.5rem, 1.2rem + .65vw, 1.875rem)` |
| Section heading | `1.25rem` |
| Subsection heading | `1.0625rem` |
| Small heading | `1rem` |
| Button | `.875rem` |
| Metadata | `.8125rem` |
| Badge | `.75rem` |
| Document prose | `.9375rem / 1.75` |

Use clear heading levels. Do not add decorative labels above headings.
Keep long response and document text within a readable measure.

## Layout

- The desktop navigation rail is `220px` wide.
- Below `960px`, use the mobile navigation menu.
- Standard content has a maximum width of `1440px`.
- Standard padding is `clamp(1.25rem, 3vw, 2.5rem)`.
- The live debate uses the remaining viewport instead of the standard scrolling page.
- Live desk places the roster, selected response, and moderator timeline in separate regions.
- Focus stage enlarges the response while retaining access to the moderator timeline.
- Keep moderator announcements and raised hands outside the response scroll region.
- Keep dossier and member inspectors inside the debate workspace.
- Adapt panels structurally on narrow screens. Do not create horizontal body scrolling.

## Elevation & Depth

Use surface color and borders to separate regions.
`--elev-0`, `--elev-1`, `--elev-2`, `--glow-accent`, and `--glow-live` are `none`.
`--elev-3` is `0 16px 40px rgba(0,0,0,.35)` for overlays.
Do not restore glowing cards or the radial hemicycle.

## Shapes

The standard radius is `6px`. The surface radius is `8px`.
Use consistent control shapes and restrained borders.
Do not make noninteractive cards appear clickable.

## Components

Shared helpers:
`gc-page-header`, `gc-page-title`, `gc-page-description`, `gc-toolbar`,
`gc-section-header`, `gc-empty-state`, `gc-surface`, `gc-list-row`, `gc-meta`,
and `gc-action-group`.

Keep existing `gc-card`, `gc-pill`, `gc-stat`, and `prose` helpers compatible.
Use Fluent controls where their existing bindings support the task.
Preserve visible focus indicators, accessible labels, and readable loading, error, and empty states.

The debate layout switch changes presentation only.
Keep stable response identities and the user's reading selection when events arrive.
Scroll automatically only when the reader is following the latest content.
Provide an explicit return-to-live action.

The moderator timeline shows received calls, bids, selections, and the supplied selection reasons.
Show local receipt times and rounds. Do not label this timeline as a durable audit log.
Reloading clears its entries. Reconnecting does not replay missed events.

## Do's and Don'ts

- Keep content, controls, and errors scenario-neutral.
- Keep complete assessments, dissent, risks, sources, and minutes accessible.
- Preserve confirmation before deletion or account-wide safety changes.
- Keep initial positions distinct from final votes.
- Support keyboard navigation and reduced motion.
- Do not add simulation controls to the production app.
- Do not add remote hosting, authentication changes, or new Azure calls as part of visual work.
