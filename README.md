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

### 2. Sign in and provision Azure (Bicep via `azd`)

Use the same Microsoft Entra user for provisioning and for running the app. The local process uses
`DefaultAzureCredential`, which discovers this signed-in user through the Azure CLI. The user must
have the RBAC roles that `azd up` assigns to the deploying principal.

```bash
az login
azd auth login

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

The app **runs only on the local workstation** and reads `config/scenario.json` at startup. It is not
a web-hosted, container-hosted, or multi-user service. The server rejects non-loopback requests with
HTTP 403. Do not expose it through a tunnel, reverse proxy, port-forward, or remote host.

The UI does not ask the user to sign in. The local server process authenticates to Foundry, Cosmos DB,
Blob Storage, AI Search, and Azure control-plane APIs as the **signed-in Microsoft Entra user** through
`DefaultAzureCredential`. Run `az login` with the same user that ran `azd up`. No API keys or app
credentials are used. The Foundry project managed identity is separate: Foundry uses it for its own
service-to-service access, but it is not the identity of the local web app.

Upload a Markdown dossier, choose a deliberation, and watch the council debate.

> [!IMPORTANT]
> `ALLOW_REMOTE_ACCESS=true` disables the loopback guard for troubleshooting. It does not add
> authentication. Do not set it for normal use.

For Microsoft guidance, see [Foundry tools authentication and authorization using .NET](https://learn.microsoft.com/dotnet/ai/azure-ai-services-authentication).

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
- **Live debate** over SignalR: choose **Live desk** or **Focus stage** without restarting the debate.
  Read responses independently of the moderator announcement and raised-hand reasons.
  A moderator timeline shows calls for hands, bids, speaker selections, and the supplied reasons.
  Entries show the local receipt time and round. They last only while the view remains open;
  reconnecting does not recover missed events.
- **Consistent app UI**: shared navigation, page headers, action groups, and readable empty states
  across dossiers, assessments, and Nexus pages.

See `ARCHITECTURE.md` for the full picture and `docs/DESIGN.md` for the design system.

## Interactive debate wireframes

The [Debate design lab](docs/wireframes/debate/README.md) preserves the five original wireframe ideas.
**Live desk** and **Focus stage** were selected for the live app. The other three ideas remain
historical prototypes only. The design lab uses synthetic data and does not connect to the live app.

```powershell
node docs\wireframes\debate\serve.mjs
```

Open <http://127.0.0.1:4317>.
Switch layouts, advance the simulated debate, inspect raised hands, and compare responses.

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
- **Avatars**: every persona shows an avatar in the chamber (in place of initials). Four role defaults
  ship in `wwwroot/branding/avatars/` (chair / moderator / nexus / member); override any persona by
  setting its `avatar` in `config/scenario.json` to a `wwwroot/` path or URL (see
  `wwwroot/branding/README.md`).
- **Vocabulary**: the framework's domain language (Dossier / Deliberation / Assessment / Nexus /
  Council) is fixed in code; use your scenario's own words in prompts and sample documents.

## Content safety (RAI policy)

Every chat model deployment is bound to a custom content-safety policy
(`Microsoft.CognitiveServices/accounts/raiPolicies`, `infra/`). Its thresholds **default to `Medium`
for every harm category — identical to `Microsoft.Default`** — so the template ships with standard,
safe filtering and behaves exactly as the platform default out of the box.

A scenario that produces legitimate content the default filter blocks at `medium` severity (e.g. a
fictional or adversarial debate) can **relax a category per repo with `azd env set` only — no Bicep
edits** — then re-provision:

```bash
azd env set COUNCIL_CONTENT_VIOLENCE_THRESHOLD High   # only block at High; allow Low/Medium
azd provision
```

Overridable env vars (each `Low` | `Medium` | `High`, default `Medium`):
`COUNCIL_CONTENT_HATE_THRESHOLD`, `COUNCIL_CONTENT_SEXUAL_THRESHOLD`,
`COUNCIL_CONTENT_VIOLENCE_THRESHOLD`, `COUNCIL_CONTENT_SELFHARM_THRESHOLD`
(plus `COUNCIL_CONTENT_POLICY_NAME` to rename the policy). A higher threshold blocks **less** (only at
that severity and above). The policy applies to the Foundry agents automatically because they run on
the bound deployments; its name is surfaced to the app as `COUNCIL_RAI_POLICY_NAME`.

> ⚠️ **Limited Access.** Thresholds **less restrictive than `Microsoft.Default`** (i.e. anything other
> than the default `Medium` blocking) require your subscription to be **approved for modified content
> filters** (Azure OpenAI Limited Access — see
> [Azure OpenAI Limited Access](https://learn.microsoft.com/azure/ai-foundry/responsible-ai/openai/limited-access)).
> Without approval the `raiPolicies` deployment is rejected, so leave the defaults unless your
> subscription is approved.

### Live per-deliberation toggle (single-presenter demo)

The dossier page has a **Content filter — Violence** control (`Unchanged` / `Low` / `Medium` / `High`)
that sets the Violence threshold applied to the **next** deliberation, so you can demo a block (strict)
then a pass (relaxed) on the same dossier without re-provisioning. Leaving it `Unchanged` makes no API
call. Because Azure content filters live on the model **deployment**, the app applies the choice by
updating the account's RAI policy at runtime (control plane), then waits a few seconds for it to
propagate before the council debates.

> ⚠️ This is a **single-presenter demo feature**. The update is **account-global** (it changes the
> policy for every bound deployment) and takes a few seconds to take effect — **do not run concurrent
> deliberations** while using it. It needs the runtime identity to have `raiPolicies/write` on the AI
> Services account (granted in `infra/` via Cognitive Services Contributor on the deploying user) and
> the `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `AI_SERVICES_RESOURCE_NAME`,
> `COUNCIL_RAI_POLICY_NAME` env vars (all set by `azd`); it no-ops cleanly if any are missing. Setting
> `Low`/`Medium`/`High` needs no approval — only turning a filter fully off needs Limited Access.

## Conventions

- **.NET 10**, C# 13 idioms (records, primary constructors, file-scoped namespaces).
- **Local-only process** — loopback access only; no container, hosted-agent, tunnel, proxy, or remote-server path.
- **User identity for Azure** — the local process uses the signed-in Microsoft Entra user through `DefaultAzureCredential`; no keys or connection strings.
- **100% IaC** — all Azure resources via Bicep / `azd`.
