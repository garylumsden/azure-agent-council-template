# Azure Agent Council — Template

A reusable **template** for a multi-agent **deliberation** demo on **Microsoft Foundry** and Azure. A
council of expert agents — debating **members** plus a **Chair**, a **Moderator**, and a **Nexus
Analyst** — reviews a document (a *Dossier*), holds a live, parliament-style debate, and produces a
structured **Assessment**. A **Nexus Analyst** then discovers how each assessment connects to prior
ones (implications, contradictions, dependencies…).

This repository ships the **engine, infrastructure, UI, and a guided setup agent** — but **no
scenario**. You make it concrete by describing your scenario (premise, branding, council, grounding)
and letting the **Scenario Architect** Copilot agent generate the configuration.

> Unconfigured, the app runs on **neutral defaults**: generic branding and an empty council. Configure
> a scenario to bring the council to life.

---

## Quickstart

### 1. Configure a scenario (recommended: the guided agent)

Open this repo in an editor with **GitHub Copilot** and run the **Scenario Architect** custom agent
(`.github/agents/scenario-architect.agent.md`). It interviews you and then writes:

- `config/scenario.json` — branding, grounding domains, and the council composition
- `config/prompts/<member-id>.md` — a system prompt per persona
- optional branding SVG (`wwwroot/branding/logo.svg`) and sample dossiers (`data/policies/*.md`)
- refreshed `README.md` + instructions describing your concrete scenario

Prefer to do it by hand? Copy `config/scenario.example.json` to `config/scenario.json` and edit it,
then add a `config/prompts/<id>.md` for each member.

### 2. Provision Azure (Bicep via `azd`)

```bash
# (Optional) supply a Microsoft Web IQ key so the Web IQ grounding tool is provisioned.
# Web IQ is limited-access (preview) — request a key from the Web IQ team. Skip this to run
# ungrounded, or switch grounding to Foundry IQ in the UI.
azd env set WEBIQ_API_KEY <your-web-iq-key>

azd up
```

Provisions Foundry (AI Services + project), model deployments, Cosmos DB, Blob Storage, AI Search, and
App Insights — all **identity-based (zero keys)**. The Web IQ key (if set) flows into Bicep
(`main.parameters.json` reads `${WEBIQ_API_KEY}`) → Key Vault + a CustomKeys connection. Post-provision
hooks write a local `.env`; for **local MAF mode** also add `WEBIQ_API_KEY=<key>` to
`src/GovernanceCouncil.Web/.env`. (Keyless alternative: bind the project MI in the Web IQ portal and use
AAD, scope `https://api.microsoft.ai/.default`.)

### 3. Run locally

```bash
dotnet run --project src/GovernanceCouncil.Web
```

The app **runs locally** and reads `config/scenario.json` at startup. Upload a Markdown dossier, choose
a deliberation, and watch the council debate.

---

## The scenario config

Everything scenario-specific lives in **`config/`** (read at startup; see
`config/scenario.example.json` for a complete, commented example):

```jsonc
{
  "branding": {
    "organisation": "Contoso Engineering",      // optional eyebrow
    "appName": "Architecture Review Board",      // app + nav title
    "tagline": "Design decisions, deliberated.",
    "emblem": "🏛️"                                // emoji, or "branding/logo.svg"
  },
  "groundingDomains": ["learn.microsoft.com"],   // [] = ungrounded (reason from the dossier only)
  "council": {
    "chair":        { "id": "chair",        "name": "...", "role": "...", "tier": "Synthesis", "promptFile": "chair.md" },
    "moderator":    { "id": "moderator",    "name": "...", "role": "...", "tier": "Fast",      "promptFile": "moderator.md" },
    "nexusAnalyst": { "id": "nexus-analyst","name": "...", "role": "...", "tier": "Synthesis", "promptFile": "nexus-analyst.md" },
    "members": [
      { "id": "security", "name": "Security Architect", "role": "Threat Modelling",
        "description": "...", "tier": "Reasoning", "knowledgeDomains": ["learn.microsoft.com"],
        "promptFile": "security.md" }
    ]
  }
}
```

- **Prompts are on disk** (`config/prompts/*.md`) — edit a persona and restart; no rebuild.
- **Chair / Moderator / Nexus Analyst** are framework roles with built-in scenario-neutral default
  prompts; override only if you want to.
- **Tiers** map roles to model tiers: `Reasoning` (members), `Synthesis` (chair/nexus), `Fast`
  (moderator/bids).
- Resolution: `COUNCIL_SCENARIO_PATH` env var → nearest `config/scenario.json` → neutral defaults.

---

## How it works

- **Two runtimes** behind one seam (`ICouncilRuntime`), switchable in the UI:
  - **Foundry Agents** (default) — one tooled **Prompt Agent** per member, provisioned in the project.
  - **Local MAF Agents** — Microsoft Agent Framework agents over the Foundry **chat models**,
    in-process; bids & speaker-selection run on a fast model.
- **Model profiles** (`COUNCIL_MODEL_PROFILE`, default `Fast`): `Frontier` / `Balanced` / `Fast` /
  `Grok` — a quality↔speed ladder selecting the model set across tiers.
- **Per-tier reasoning effort** (GPT-5 / o-series, and xAI **grok-4.3**): `minimal`/`none` bids ·
  `low` members · `medium` synthesis. Override with `COUNCIL_REASONING_EFFORT`. (The `Grok` profile
  uses grok-4.3, a single tunable reasoning model that honours `reasoning_effort`; older grok-4.1-fast
  ignores it.)
- **Grounding** (toggle in UI): **Web IQ** or **Foundry IQ**, each scoped to the scenario's
  authoritative domains (the Chair gets them all). No domains ⇒ ungrounded. In MAF mode the grounding
  tool is bounded per turn (3-iteration cap + a hard 2-call search budget) so a tool-eager model can't
  fire dozens of search calls per turn.
- **Nexus retrieval is efficient**: each assessment's summary is embedded once at creation and stored;
  Top-K candidate retrieval uses **Cosmos DB NoSQL vector search** (no corpus re-embedding).
- **Live debate** over SignalR: per-seat hand-raises, push-to-talk, citations, a scrolling transcript.

See `ARCHITECTURE.md` for the full picture and `docs/DESIGN.md` for the design system.

---

## Project structure

```
config/                     # scenario.json (+ prompts/) — the only scenario-specific config
  scenario.example.json     # a complete, commented example (not loaded)
  prompts/                  # config/prompts/<id>.md — one per persona
data/policies/              # sample dossiers (Markdown)
infra/                      # Bicep IaC (azd) — identity-based, zero keys
src/
  GovernanceCouncil.Core/   # domain models + scenario config (ScenarioConfig, Scenario, CouncilMembers)
  GovernanceCouncil.Data/   # Cosmos + Blob (identity auth)
  GovernanceCouncil.Agents/ # debate engine, runtimes, nexus, provisioning, grounding
  GovernanceCouncil.Web/    # Blazor Server UI + SignalR
.github/agents/scenario-architect.agent.md   # the guided setup agent
```

> The code namespace stays `GovernanceCouncil.*` as the framework's internal name — it is not shown to
> end users (branding is fully configurable).

---

## Customising further

- **Branding / look & feel**: the dark "council chamber" theme lives in `wwwroot/app.css` (CSS custom
  properties). Branding strings + emblem come from `config/scenario.json`; the theme is shared by
  default. Drop an SVG/PNG in `wwwroot/branding/` and point `emblem` at it.
- **Vocabulary**: the framework's domain language (Dossier / Deliberation / Assessment / Nexus /
  Council) is fixed in code; use your scenario's own words in prompts and sample documents.

## Conventions

- **.NET 10**, C# 13 idioms (records, primary constructors, file-scoped namespaces).
- **Identity-based auth everywhere** (`DefaultAzureCredential`) — no keys or connection strings.
- **100% IaC** — all Azure resources via Bicep / `azd`.
