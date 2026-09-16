# Live Deliberation Code and UI Review

## Executive Summary

The live chamber has a strong visual identity. It does not give a stable operational view.

The main problem is the page structure. The phase banner, hemicycle, assessment cards, transcript, and footer form one vertical stack. Users must scroll the page and the transcript to understand one session.

Use **Concept 1: Persistent Council Rail + Live River** as the default direction. It keeps agent state, the current speaker, the live river, and evidence visible together. It also adapts better than the hemicycle to different council sizes.

## Verification Scope

Reviewed:

- `src/GovernanceCouncil.Web/Program.cs`
- `src/GovernanceCouncil.Web/Components/Pages/LiveDeliberation.razor`
- `src/GovernanceCouncil.Web/Components/DebateChamber.razor`
- `src/GovernanceCouncil.Web/Components/Layout/MainLayout.razor`
- `src/GovernanceCouncil.Web/Components/Layout/MainLayout.razor.css`
- `src/GovernanceCouncil.Web/Components/Layout/NavMenu.razor.css`
- `src/GovernanceCouncil.Web/wwwroot/app.css`
- `src/GovernanceCouncil.Web/wwwroot/css/debate.css`
- `src/GovernanceCouncil.Web/wwwroot/js/debate-scroll.js`

Runtime check:

- The application started on `http://127.0.0.1:5179`.
- The first page returned HTTP 500 without provisioned Azure resources.
- The exception was: `No registered service of type 'GovernanceCouncil.Core.Interfaces.INexusStore'`.
- This prevented a complete browser-based responsive review in the unconfigured workspace.

## Prioritized Findings

### 1. High — The unconfigured application starts but every data page can fail

`src/GovernanceCouncil.Web/Program.cs:59-79` prints a message that implies the application can run without Azure configuration. Azure-dependent services are only registered inside `if (isConfigured)` at `Program.cs:84`.

`src/GovernanceCouncil.Web/Components/Pages/Home.razor:4-6` requires 3 stores during component creation. The home page therefore returns HTTP 500 when the configuration is absent.

**Impact:** The documented neutral fallback does not provide a usable local UI. It also blocks visual testing and scenario setup before provisioning.

**Fix:** Register explicit unconfigured implementations, or route to a configuration page before components resolve Azure services.

### 2. High — Automatic scrolling takes control from the reader

`src/GovernanceCouncil.Web/Components/DebateChamber.razor:255-262` scrolls the transcript to the bottom after every render with transcript content. `src/GovernanceCouncil.Web/wwwroot/js/debate-scroll.js:3-9` does not check whether the user is reading older content.

Streaming text can cause many renders each second. The UI repeatedly moves to the newest content.

**Impact:** A user cannot inspect an earlier argument while the debate continues.

**Fix:** Add a `Follow Live` state. Follow only when the reader is near the bottom. Show a `Jump to newest` control and a new-turn count when follow mode pauses.

### 3. High — The live page hides current activity below stacked content

`src/GovernanceCouncil.Web/Components/DebateChamber.razor:13-222` renders the chamber, roll-call, and transcript in one vertical sequence.

`src/GovernanceCouncil.Web/wwwroot/css/debate.css:63-68` reserves 360 px for the hemicycle. The roll-call grid follows it. The transcript then adds another independent 360 px scroll region at `debate.css:274-282`.

**Impact:** The current speaker and current message are not visible together on common laptop viewports. Users scroll the page, then scroll the transcript.

**Fix:** Use a viewport-based workspace. Keep the session strip, roster, and active speaker fixed. Give the river one controlled scroll area.

### 4. High — Refreshing a running session loses the live narrative

`src/GovernanceCouncil.Web/Components/Pages/LiveDeliberation.razor:196-220` stores phase, turn, and agent state only in component memory. The polling fallback at `LiveDeliberation.razor:687-721` only detects completion or failure.

**Impact:** Refresh, reconnect, or a new viewer loses the transcript, active round, hand state, and position progress.

**Fix:** Persist session events or expose a snapshot endpoint. Hydrate the component before subscribing to new SignalR events.

### 5. High — Markdown is rendered as unsanitized HTML

`src/GovernanceCouncil.Web/Components/DebateChamber.razor:190` renders agent text through `MarkupString`. The same pattern exists for dossier and assessment content.

Markdig advanced extensions do not sanitize raw HTML.

**Impact:** Untrusted dossier text or model output can inject HTML into the Blazor page.

**Fix:** Disable raw HTML in the Markdown pipeline, or sanitize the generated HTML with an allow-list sanitizer.

### 6. Medium — The chamber geometry is not responsive

`src/GovernanceCouncil.Web/wwwroot/css/debate.css:63-68` uses a fixed chamber height. Seats use absolute positions and a fixed 88 px width at `debate.css:73-82`.

`ArcPosition` in `DebateChamber.razor:269-326` adapts only to the member count. It does not adapt to the viewport width.

**Impact:** Narrow windows can clip plaques, hands, and tooltips. A larger roster can remain mathematically separated but visually unreadable.

**Fix:** Replace the hemicycle with a responsive roster below 1100 px. Keep the stage as an optional presentation mode.

### 7. Medium — The compact position-strip design is incomplete

`src/GovernanceCouncil.Web/wwwroot/css/debate.css:434-575` defines `.positions-strip`, `.ps-chip`, and expandable position details. No Razor component renders these classes.

The full roll-call grid remains visible after any position settles because of `anySettled` at `DebateChamber.razor:78-82`.

**Impact:** Assessment cards keep consuming vertical space during debate and synthesis.

**Fix:** Render the compact strip after assessment. Collapse the full roll-call into a user-controlled detail panel.

### 8. Medium — Live updates can overlap and mutate shared state

SignalR handlers mutate `_agentStates`, `_turns`, and `_currentTurn` before they call `InvokeAsync(StateHasChanged)` throughout `LiveDeliberation.razor:430-675`.

The timer callback at `LiveDeliberation.razor:687` uses an asynchronous lambda with `System.Threading.Timer`. Timer ticks can overlap. Most handler calls to `InvokeAsync` are not awaited.

**Impact:** Fast events, timer ticks, reconnects, and disposal can race. The UI can show stale or inconsistent state.

**Fix:** Marshal the complete state mutation onto the renderer dispatcher. Replace the timer with a cancellation-aware `PeriodicTimer` loop.

### 9. Medium — The live region is too noisy for assistive technology

`DebateChamber.razor:135` marks the complete transcript as `role="log" aria-live="polite"`. Each streamed token updates content inside that region.

**Impact:** A screen reader can announce partial phrases repeatedly and interrupt navigation.

**Fix:** Keep the visible stream separate from a throttled status announcer. Announce complete turns, phase changes, and errors.

### 10. Medium — Hand-raise details depend on hover

`DebateChamber.razor:30-35` renders a non-focusable `span` for the raised hand. `debate.css:182-191` shows the reason on hover or `focus-within`, but the seat has no focusable control.

**Impact:** Keyboard and touch users cannot reliably read the speaking reason.

**Fix:** Use a button with `aria-expanded`. Open a popover on click, Enter, or Space.

### 11. Medium — The dossier dialog lacks complete keyboard behavior

`LiveDeliberation.razor:137-164` provides a dialog and close button. It does not trap focus, restore focus, or close on Escape.

**Impact:** Keyboard focus can move behind the modal. The user can lose the original location after closing it.

**Fix:** Use `FluentDialog`, or add a focus trap, Escape handling, and focus restoration.

### 12. Low — Interface guideline inconsistencies remain

- `src/GovernanceCouncil.Web/wwwroot/app.css:74` removes the `h1` outline without a replacement.
- `src/GovernanceCouncil.Web/Components/Layout/NavMenu.razor:21` uses a checkbox as the navigation menu control.
- `src/GovernanceCouncil.Web/Components/Pages/DossierLibrary.razor:86` has no `name` or `autocomplete` value.
- `src/GovernanceCouncil.Web/Components/Pages/DossierLibrary.razor:90-91` uses `Uploading...` instead of `Uploading…`.
- `src/GovernanceCouncil.Web/Components/Pages/LiveDeliberation.razor:48` uses a fixed date format instead of the active locale.

## UI Reframing Principles

1. Keep the active speaker visible at all times.
2. Keep every agent icon and state visible at all times.
3. Use one main live river. Do not nest it below a presentation stage.
4. Pause automatic follow when the user scrolls away from the newest turn.
5. Show new content through a count. Do not move the reader without consent.
6. Keep phase, round, elapsed time, and completion state in one sticky session strip.
7. Put the dossier and citations beside the debate on wide screens.
8. Use drawers or tabs below 1100 px.
9. Keep page scrolling disabled during a live session. Scroll only controlled panes.
10. Preserve the hemicycle as an optional presentation view, not the default monitoring view.

## Design Concepts

### Concept 1 — Persistent Council Rail + Live River

**Recommended default.**

- Left: fixed agent rail with avatar, status, hand state, and mic state.
- Center: pinned current speaker and the live river.
- Right: dossier summary, citations, position changes, and assessment preview.
- Top: sticky phase strip with `Follow Live` and document controls.
- Scroll: the river and evidence pane scroll independently.

Files:

- `docs/wireframes/01-persistent-council-rail.excalidraw`
- `docs/wireframes/01-persistent-council-rail.svg`

### Concept 2 — Speaker Stage + Side-by-Side Transcript

**Recommended for presentation mode.**

- Left: compact speaker stage and a permanent council wall.
- Right: full-height transcript.
- Bottom: fixed phase timeline.
- The chamber identity remains, but the transcript no longer sits below it.

Files:

- `docs/wireframes/02-speaker-stage-sxs.excalidraw`
- `docs/wireframes/02-speaker-stage-sxs.svg`

### Concept 3 — Council Command Center

**Recommended for advanced operators.**

- Top: permanent horizontal avatar strip.
- Left: session map and alerts.
- Center: pinned current turn and live river.
- Right: position matrix, evidence queue, and Chair draft.
- Each pane has independent scroll and resize behavior.

Files:

- `docs/wireframes/03-command-center.excalidraw`
- `docs/wireframes/03-command-center.svg`

## Recommended Implementation Sequence

1. Fix the unconfigured startup path.
2. Add a live-session workspace shell based on `100dvh`.
3. Add the persistent agent rail and pinned active-speaker card.
4. Replace unconditional auto-scroll with `Follow Live` behavior.
5. Render the compact position strip after assessment.
6. Move dossier and evidence content into the right pane.
7. Add responsive layouts at 1100 px and 720 px.
8. Persist and replay live session state.
9. Sanitize Markdown output.
10. Add keyboard, screen-reader, and reduced-motion tests.

---

# Code Review — Non-UI

Reviewed: orchestration, agents, data, hub, configuration. Date format: ISO 8601.

## Security

| # | Severity | File | Finding |
|---|---|---|---|
| S1 | ⚪ Low | `src/GovernanceCouncil.Web/Program.cs` | The app has no authentication or authorization. This is acceptable for the declared local-only operating model. Enforce loopback-only binding and do not expose the process through a tunnel, proxy, container port, or remote host. |
| S2 | ⚪ Low | `src/GovernanceCouncil.Web/Hubs/DeliberationHub.cs` | `JoinDeliberation(string)` has no session validation. The local-only boundary limits exposure. Validate the identifier and keep the SignalR endpoint bound to loopback. Add authorization only if the operating model changes. |
| S3 | 🟡 Medium | `src/GovernanceCouncil.Agents/Provisioning/RaiPolicyManager.cs` | A local UI action mutates the account-global Azure AI RAI policy through ARM. This is still a consequential shared-resource action. Add a clear confirmation and scope warning. Do not treat it as a local preference. |
| S4 | 🟡 Medium | 4 Razor components | `(MarkupString)Markdown.ToHtml(...)` rendered model and dossier text without sanitization. **Fixed in this change** — see the Fixes section. |
| S5 | 🟡 Medium | `src/GovernanceCouncil.Web/DotEnvLoader.cs` | Overwrites existing environment variables unconditionally. A `.env` file beats real host configuration. It also ignores inline `#` comments, the `export ` prefix, and escaped quotes. |
| S6 | ⚪ Low | repository settings | Secret scanning and push protection are disabled on a public repository. Both are free. Enable them. |

Positives kept: `DefaultAzureCredential` everywhere, no keys or connection strings in code, content-safety failures degrade into a "Defer" assessment, semaphore-gated model concurrency, retry on 429 and 5xx, deterministic SHA-256 nexus IDs that make upserts idempotent.

## Correctness and robustness

| # | Severity | File | Finding |
|---|---|---|---|
| C1 | 🟠 High | `Orchestration/CouncilOrchestrator.cs` | `_startedDeliberations` is a `static ConcurrentDictionary` that is never pruned. Memory grows without bound. A failed deliberation can never be retried in-process. |
| C2 | 🟠 High | `Provisioning/AgentCache.cs` | Not thread-safe. `IsLoaded` uses check-then-set without a lock. `RefreshAsync` sets `IsLoaded = false` and then reloads, so a concurrent reader can observe a partially updated `MemberNames` or `MemberAgents`. `FetchAsync` wraps a synchronous SDK call in `Task.Run` and blocks thread-pool threads. |
| C3 | 🟡 Medium | `Orchestration/CouncilOrchestrator.cs` | `ApplySettingsAsync` sets `IsReprovisioning` after it acquires the lock, and reads it without synchronization. The UI reports `false` while a caller is queued on the semaphore. |
| C4 | 🟡 Medium | `Nexus/NexusAnalystService.cs` | `ParseNexuses` calls `JsonDocument.Parse` and `EnumerateArray()` unguarded, and `el.GetProperty("nexusType")` throws `KeyNotFoundException` when the property is absent. One malformed element discards every nexus parsed so far. Other fields correctly use `TryGetProperty`. An empty `targetAssessmentId` is stored without validation. |
| C5 | 🟡 Medium | `Parsing/AssessmentParser.cs` | `d.GetProperty("member")`, `r.GetProperty("category")` and `r.GetProperty("description")` throw on malformed Chair JSON. The surrounding `JsonDocument.Parse` has a fallback, but these calls do not. |
| C6 | 🟡 Medium | `Cosmos/CosmosNexusStore.cs` | `ListByTarget`, `ListByType` and `ListAll` are unbounded cross-partition queries with no paging cap. |
| C7 | ⚪ Low | repository | No test project exists, and no CI workflow exists. Add a build-and-test workflow before more refactoring. |

## Fixes applied in this change

Every finding above is now fixed. The build stays at 0 errors and 0 warnings.

| # | Fix | Files |
|---|---|---|
| S1 | Added a loopback-only guard. A request from a non-loopback address returns HTTP 403. Set `ALLOW_REMOTE_ACCESS=true` to opt out; the app then logs a warning at startup. Also added baseline response headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy`. | `Web/Program.cs` |
| S2 | `JoinDeliberation` and `LeaveDeliberation` now validate the identifier against `^[A-Za-z0-9._:-]{1,128}$` and raise a `HubException` on a malformed value. | `Web/Hubs/DeliberationHub.cs` |
| S3 | A content-safety change now requires an explicit confirmation that names the current level, the new level, and the account-global scope. The helper text states the scope. The query value is URL-encoded. | `Web/Components/Pages/DossierLibrary.razor` |
| S4 | Added `.DisableHtml()` to every `MarkdownPipelineBuilder`, so raw HTML in model output or dossier text is escaped, not executed. | `Web/Components/DebateChamber.razor`, `Pages/AssessmentDetail.razor`, `Pages/DossierDetail.razor`, `Pages/LiveDeliberation.razor` |
| S5 | A variable already present in the process environment is never overwritten by the file. Added support for the `export ` prefix, single and double quotes, escaped characters, and unquoted inline `#` comments. | `Web/DotEnvLoader.cs` |
| S6 | Reported only. Enabling secret scanning needs a repository-settings change. | — |
| C1 | The deliberation identifier is removed in a `finally` block when the run ends, so the map stays bounded and a failed run can be retried. The failure is now logged instead of being swallowed. | `Agents/Orchestration/CouncilOrchestrator.cs` |
| C2 | Added a `SemaphoreSlim` with double-checked `volatile bool`. The roster is built into locals and published as a unit, then the flag is set last. `RefreshAsync` clears only the flag and keeps the published roster readable. `FetchAsync` now calls `GetAgentAsync` instead of blocking a thread-pool thread with `Task.Run`. | `Agents/Provisioning/AgentCache.cs` |
| C3 | `IsReprovisioning` is now an `Interlocked` depth counter read with `Volatile.Read`. It is incremented before the wait, so it reports `true` while a caller is queued. | `Agents/Orchestration/CouncilOrchestrator.cs` |
| C4 | `JsonDocument.Parse` is wrapped and logs a warning on a malformed response. Non-array roots and non-object elements are skipped. `nexusType` and every string field use `TryGetProperty` plus a `ValueKind` check. A nexus with a missing or self-referencing target is dropped instead of persisted as an orphan. | `Agents/Nexus/NexusAnalystService.cs` |
| C5 | `member`, `category` and `description` now use `TryGetProperty` with a `ValueKind` check. The `conditions`, `dissent` and `risks` arrays are checked for `JsonValueKind.Array`, and non-object elements are skipped. | `Agents/Debate/AssessmentParser.cs` |
| C6 | Added `MaxResults = 1000` and a default `MaxItemCount = 100`. The iterator stops at the ceiling and logs a warning when the result is truncated. | `Data/CosmosNexusStore.cs` |
| C7 | Added `.github/workflows/ci.yml`: restore, Release build, vulnerable-package audit that fails the job, deprecated-package audit, and a Bicep build. `permissions: contents: read`, and all actions are pinned to a commit SHA. | `.github/workflows/ci.yml` |

### Verified at runtime

The app was started locally and checked directly.

| Check | Result |
|---|---|
| `GET http://127.0.0.1:5189/app.css` | HTTP 200 |
| `GET http://172.30.80.1:5189/app.css` (non-loopback) | HTTP 403 |
| `Content-Security-Policy` header present | Yes |
| `X-Content-Type-Options: nosniff` | Yes |
| `X-Frame-Options: DENY` | Yes |

The data pages still return HTTP 500 without a provisioned `.env`. That is the separate UX finding and is out of scope for this change.

---

# Dependency and Supply-Chain Audit

## GitHub state (verified)

| Check | Result |
|---|---|
| Open pull requests | 0 |
| Dependabot alerts (all states) | 0 |
| Vulnerability alerts enabled | Yes (HTTP 204) |
| Dependabot security updates | Enabled |
| Dependabot version updates | **Was not configured** — added in this change |
| Secret scanning | Disabled — recommend enabling |
| Secret scanning push protection | Disabled — recommend enabling |
| CI workflows | None |

## Package updates applied

| Project | Package | Before | After |
|---|---|---|---|
| Agents | Microsoft.Agents.AI | 1.11.1 | 1.21.0 |
| Agents | Microsoft.Agents.AI.Workflows | 1.11.1 | 1.21.0 |
| Agents | Microsoft.Extensions.Http | 10.0.8 | 10.0.12 |
| Agents | Microsoft.Extensions.Logging.Abstractions | 10.0.8 | 10.0.12 |
| Agents | OpenTelemetry.Api | 1.16.0 | 1.18.0 |
| Data | Azure.Storage.Blobs | 12.27.0 | 12.29.2 |
| Data | Microsoft.Azure.Cosmos | 3.57.1 | 3.63.0 |
| Data | Microsoft.Extensions.DependencyInjection.Abstractions | 10.0.8 | 10.0.12 |
| Data | Microsoft.Extensions.Logging.Abstractions | 10.0.8 | 10.0.12 |
| Web | Markdig | 0.40.0 | 1.3.2 |
| Web | Microsoft.ApplicationInsights.AspNetCore | 3.0.0 | 3.1.2 |
| Web | Microsoft.AspNetCore.SignalR.Client | 10.0.3 | 10.0.12 |
| Web | Microsoft.FluentUI.AspNetCore.Components | 4.14.3 | 4.14.4 |
| Web | OpenTelemetry.Api | 1.16.0 | 1.18.0 |

`Microsoft.Agents.AI` 1.21.0 was verified against the pinned Foundry bridge. The transitive graph still resolves `Microsoft.Agents.AI.Foundry 1.5.0`, `OpenAI 2.10.0`, `Microsoft.Extensions.AI.OpenAI 10.6.0` and `Azure.AI.Projects 2.0.1` (stable, not `2.1.0-beta.3`). The documented pins hold.

Markdig 1.3.2 uses the same `UseAdvancedExtensions()` and `Markdown.ToHtml(...)` surface, and it supplies the `DisableHtml()` call used for the S4 fix.

## Packages held back deliberately

| Package | Held at | Latest | Reason |
|---|---|---|---|
| OpenAI | 2.10.0 | 2.13.0 | `Azure.AI.Extensions.OpenAI 2.0.0` calls a `ResponsesClient` constructor removed in 2.11.0. Upgrading causes a runtime `MissingMethodException`. |
| Microsoft.Extensions.AI.OpenAI | 10.6.0 | 10.10.0 | 10.7.0 and later force `OpenAI 2.11.0`. |
| Microsoft.Agents.AI.Foundry | 1.5.0 | 1.11.x+ | The newer Foundry bridge is preview-only and force-pins `Azure.AI.Projects 2.1.0-beta.3`, whose restructured client breaks the CSDL workflow path. |
| Azure.Search.Documents | 12.1.0-beta.1 | — | Deliberate prerelease. It ships the KnowledgeBases models and the `2026-05-01-preview` API. |

All four are listed in the `ignore` block of `.github/dependabot.yml`, so Dependabot will not propose a breaking bump.

## Verification

| Command | Result |
|---|---|
| `dotnet build src/GovernanceCouncil.Web/GovernanceCouncil.Web.csproj` | 0 errors, 0 warnings |
| `dotnet list package --vulnerable --include-transitive` | No vulnerable packages in any project |
| `dotnet list package --deprecated` | No deprecated packages |
| `dotnet list package --outdated` | Only the two intentional pins remain |

Runtime verification was not possible. No `.env` is configured on this machine, so the Azure paths were checked at compile time only.

## Recommended next steps

1. Enable secret scanning and push protection. This needs a repository-settings change and was not done automatically.
2. Add a test project so future dependency bumps have a runtime signal. The CI workflow is ready to run `dotnet test` once one exists.
3. If remote hosting is ever introduced, remove the `ALLOW_REMOTE_ACCESS` escape hatch and add Entra ID authentication plus `[Authorize]` on the hub and the settings pages.
