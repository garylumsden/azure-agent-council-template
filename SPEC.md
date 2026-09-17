# SPEC — Agent Council (template)

## Purpose

A reusable template for a **multi-agent deliberation** demo on Microsoft Foundry + Azure. A council of
expert agents reviews a document and produces a structured, defensible decision, then discovers how
decisions interconnect over time. The template is **scenario-neutral**; a concrete demo is produced by
**configuration** (the Scenario Architect agent), not by editing the engine.

## Functional requirements

### Configuration (scenario)
- The scenario (branding, grounding domains, council composition) is read from `config/scenario.json`
  at startup. Absent ⇒ neutral defaults (generic branding, empty council).
- Persona system prompts are read from `config/prompts/*.md` on disk (no rebuild to change a persona).
- A guided **Scenario Architect** Copilot agent (`.github/agents/`) interviews the user and generates
  the config, prompts, branding, optional sample dossiers, and refreshed docs.

### Deliberation
- A user ingests a **Dossier** (Markdown) into the Dossier Library and submits it for **Deliberation**.
- The council runs a **live debate**: independent initial positions → moderated multi-round debate
  (hand-raise bids, speaker selection) → **Chair** synthesis.
- The Chair produces a structured **Assessment**: overall recommendation, chair summary, per-member
  deliberation summary + votes, conditions, dissent, and risks. Member set is taken from the active
  scenario roster; a `responded` flag prevents fabrication for silent members.

### Nexus
- After each assessment, the **Nexus Analyst** discovers **Nexuses** (interconnections) against prior
  assessments, classified as Implication / Contradiction / Dependency / Supersession / Reinforcement /
  Tension, with evidencing excerpts and a confidence level.
- Candidate retrieval is efficient: each assessment's summary embedding is computed once and persisted;
  Top-K nearest priors are found via **Cosmos DB NoSQL vector search** (no corpus re-embedding).

### Runtimes & models
- Two interchangeable runtimes (`ICouncilRuntime`): **Foundry Agents** (provisioned Prompt Agents) and
  **Local MAF Agents** (Microsoft Agent Framework over Foundry chat models, in-process).
- Per-tier model selection via `CouncilModels` profiles: `Frontier` / `Balanced` / `Fast` / `Grok`.
- Per-tier reasoning effort (GPT-5/o-series): minimal (bids) / low (members) / medium (synthesis).
- Grounding (Web IQ / Foundry IQ), scoped to the scenario's authoritative domains; empty ⇒ ungrounded.

### UI
- Blazor Server app with SignalR live updates: dashboard, Dossier Library, Assessment detail, Nexus
  Explorer (graph) + Alerts, and the live debate chamber. Branding (name, org, tagline, emblem) is
  config-driven; the dark theme is shared by default.
- Use a consistent navigation shell, page headers, toolbars, and empty states across all pages.
- The live debate offers **Live desk** and **Focus stage**. Switching layouts does not restart the
  debate or discard responses.
- Keep the moderator announcement and raised-hand reasons outside the response scroll area.
  Readers can inspect earlier responses and return to the latest response.
- Show moderator activity chronologically: calls for hands, member bids, speaker selections, and
  the supplied selection reasons. Show the local receipt time and round.
- The moderator timeline contains events received while the view is open. Reloading clears it.
  Reconnecting rejoins the debate group but does not replay missed events.
- Keep dossier and member details within the debate workspace. Preserve initial positions,
  content-safety notices, citations, Assessment links, and Nexus status.

## Non-functional requirements

- **Identity-based auth, zero keys** — the local server process uses the signed-in Microsoft Entra
  user through `DefaultAzureCredential` for Foundry and all Azure data/control-plane calls. The same
  user runs `azd up` and receives the required RBAC roles. The Foundry project managed identity is a
  separate service-to-service principal. Keep `disableLocalAuth: true`; do not add keys.
- **100% IaC** — all Azure resources via Bicep / `azd up`.
- **Local-only runtime** — run `dotnet run --project src/GovernanceCouncil.Web`. The app accepts
  loopback requests only. It has no container, hosted-agent, App Service, tunnel, proxy, port-forward,
  remote-server, or multi-user path. `ALLOW_REMOTE_ACCESS` is for troubleshooting only and adds no
  authentication.
- **.NET 10**, C# 13 idioms, async throughout.
- **Dependency pins** — `OpenAI 2.10.0` + `Microsoft.Extensions.AI.OpenAI 10.6.0` (Foundry bridge).

## Configuration contract

`ScenarioConfig` (`src/GovernanceCouncil.Core/Models/ScenarioConfig.cs`):

| Field | Notes |
|---|---|
| `branding.organisation` | Optional eyebrow. |
| `branding.appName` | App + nav title. |
| `branding.tagline` | One line under the title. |
| `branding.emblem` | Emoji, or a path under `wwwroot/branding/` (e.g. `branding/logo.svg`). |
| `groundingDomains` | Default authoritative hostnames. `[]` ⇒ ungrounded. |
| `council.chair/moderator/nexusAnalyst` | Framework roles (built-in neutral default prompts). |
| `council.members[]` | Debating personas: `id`, `name`, `role`, `description`, `tier`, `knowledgeDomains?`, `promptFile`. |

`tier ∈ { Reasoning, Synthesis, Fast }`. See `config/scenario.example.json` for a complete example.

## Out of scope (by design)

- No container, hosted-agent, App Service, tunnel, reverse-proxy, port-forward, remote-server, or
  multi-user deployment. The browser UI has no sign-in because the application is loopback-only.
- No application identity. The local process uses the signed-in developer's Microsoft Entra user
  identity through `DefaultAzureCredential`.
- No automated test suite (the framework is validated by build + manual runs).
- Framework vocabulary (Dossier / Deliberation / Assessment / Nexus / Council) is fixed in code; use
  your own words in prompts and sample documents.
