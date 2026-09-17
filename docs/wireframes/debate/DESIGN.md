---
name: Agent Council debate wireframes
description: Provisional documentation for this prototype directory only.
colors:
  bg: "#070d1c"
  surface: "#0d1830"
  surface-raised: "#14213f"
  surface-hover: "#1b2a4a"
  border: "#25345c"
  border-strong: "#3a4d7e"
  text: "#e8eefc"
  muted: "#a6b6d3"
  soft: "#93a6c9"
  blue: "#88b8ff"
  blue-soft: "#192f50"
  gold: "#f4c542"
  green: "#82d9b8"
  red: "#ffa0ad"
typography:
  body:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: "14px"
    lineHeight: 1.8
  heading:
    fontFamily: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif'
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.02em"
rounded: { base: "7px", inspector: "10px", inspector-mobile: "8px" }
spacing:
  workspace-inset: "28px"
  desk-gap: "12px"
  mobile-inset: "12px"
---

## Overview

This document applies only to `docs\wireframes\debate`.
These are provisional interactive prototypes, not an approved production design.
The production identity is inherited; `docs\DESIGN.md` remains the production authority.
Five layouts help a presenter and audience follow an autonomous council without scrolling between live regions.
All data is synthetic. The production app, Azure resources, and scenario configuration are unchanged.
The design process uses **Impeccable by Paul Bakaus**: <https://impeccable.style>.
The finish review is closed. All 3 mobile readability and discovery corrections are resolved.

## Colors

Navy surfaces and borders separate work areas without decorative gradients.
Blue marks actions, selected responses, and focus. Gold marks Moderator content, live states, and raised hands.
Green marks support and completion. Red marks opposition, blocked content headings, and connection loss.
`text`, `muted`, and `soft` provide text hierarchy. Avatar colors distinguish synthetic members.
Frontmatter color names map directly to custom properties in `styles.css`.

## Typography

Segoe UI text and display stacks use local system fallbacks; no font download is required.
The frontmatter body size and line height describe default response paragraphs; heading values describe `h1`.
Default response headings use 24px; Focus stage uses 32px headings and 16px paragraphs.
At widths up to 767px, response headings use 22px and paragraphs use 14px with 1.7 line height.
Response paragraphs have a 72ch maximum width. Mobile hand reasons use 12px with 1.45 line height.

## Layout

The app uses a seven-row grid with `100dvh` height and a desktop minimum height of 640px.
The Moderator and raised-hand shelf remain outside response scroll areas. Detail panels stay inside the workspace.
Live desk uses three columns: council, response, and history. Focus stage shows one response above a compact roster.
Conversation lanes use six columns by default. Split review uses two columns. Event timeline pairs history with a response.
At widths up to 1199px, lanes use three columns. At widths up to 767px, they scroll horizontally.
Mobile Live desk hides side panels and exposes response navigation. Mobile Focus stage hides the compact roster.
Mobile split and timeline panels also scroll horizontally. Raised hands use 82% width cards with proximity snapping.
The mobile switcher shows an idea count. The hand shelf shows a swipe hint and visible reasons.
Short mobile screens allow the Moderator strip to scroll within 76px. The layout does not promise zero internal scrolling.
Exact media queries and responsive dimensions are recorded in `design-system.json`.

## Elevation & Depth

Panels use flat surface fills and 1px borders. The detail drawer uses a directional shadow at stacking level 20.
The toast uses a smaller shadow at stacking level 40. Exact shadows are recorded in the JSON sidecar.

## Shapes

The shared radius is 7px. The drawer uses 10px on desktop and 8px on mobile.
Avatars and state dots are circular. Small tags and response controls also use 3px or 4px corners.

## Components

The layout switcher preserves the simulated event. **Return to live** restores live response following.
Raised-hand details show reasons and initial positions. Source controls open local synthetic dossier sections.
The transport advances synthetic events, including timed playback every 7 seconds. It does not control production agents.
Keyboard support includes a skip link, visible focus, and Escape to close details. CSS motion respects reduced-motion preferences.

## Do's and Don'ts

- **Do** retain synthetic labels, visible hand reasons, and the separate Moderator and hand regions.
- **Do** preserve the focus outline and reduced-motion behavior recorded in the sidecar.
- **Don't** present raised hands as an ordered queue. The Moderator chooses speakers.
- **Don't** present initial positions as final votes or consensus.
- **Don't** treat these prototype layouts or tokens as production approval.
