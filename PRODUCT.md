# Agent Council

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience for the debate UI is a presenter and an audience following an autonomous council.
The user confirmed this priority during the prototype discussion.

## Product Purpose

Agent Council demonstrates multi-agent deliberation on Microsoft Foundry.
Expert agents review a Dossier, debate their positions, and produce a structured Assessment.
A Nexus Analyst connects the Assessment to prior assessments.

## Operating Context

The Blazor Server app runs on the local workstation.
The presenter observes the council rather than selecting speakers.
The Moderator selects speakers from raised hands.
The user selected Live desk and Focus stage for the live debate.
The Moderator, raised hands, and response content must remain easy to follow together.
The user also requested a consistent refresh of the rest of the app.

## Capabilities and Constraints

- Keep the engine scenario-neutral. Load branding and council members from scenario configuration.
- Preserve initial positions, hand reasons, speaker responses, citations, moderator announcements, and assessment states.
- Keep Azure resources, authentication, model calls, and scenario configuration unchanged during UI work.
- Use clearly labelled synthetic data in the interactive wireframes.
- Simulation controls operate previews only, not an actual council.
- The moderator timeline records calls for hands, bids, selections, and the supplied selection reasons.
- Timeline entries last only while the view is open. Missed events are not replayed after reconnecting.
- Human intervention controls are not confirmed product capabilities.

## Evidence on Hand

- `README.md` describes the product and local execution model.
- `src/GovernanceCouncil.Web/Components/Pages/LiveDeliberation.razor` owns debate state.
- `src/GovernanceCouncil.Web/Components/DebateChamber.razor` renders the council and transcript.
- `docs/DESIGN.md` records the incumbent navy visual system.

## Product Principles

- Show the current speaker, moderator update, and raised hands together.
- Let the reader inspect earlier responses without losing current debate context.
- Distinguish observation controls from simulation controls.
- Do not infer consensus from initial positions.

## Accessibility & Inclusion

The incumbent design targets WCAG 2.1 AA.
Support keyboard controls, visible focus, reduced motion, and readable contrast.
Do not require hover to read a raised-hand reason.

## Open Decisions

Live desk and Focus stage are the approved layouts. Conversation lanes, Split review, and Event timeline layouts were rejected.
A compact moderator timeline remains part of both approved layouts.
Durable replay and additional user roles remain outside this UI refresh.
