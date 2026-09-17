# Debate design lab

Five interactive wireframes explore a presenter-first debate workspace.
All documents, people, responses, and assessments in this prototype are synthetic.

**Decision:** Live desk and Focus stage were selected for the live app.
Conversation lanes, Split review, and Event timeline were rejected as layouts.
Both selected layouts now include a compact moderator timeline.
This directory preserves the original comparison; it is not the current production UI.

## Run locally

From the repository root, run:

```powershell
node docs\wireframes\debate\serve.mjs
```

Open <http://127.0.0.1:4317>.
Keep the terminal process running while you use the prototype.
The server binds only to loopback and serves an explicit list of prototype assets.
No packages, credentials, model calls, or Azure resources are required.
Alternatively, open `index.html` directly in a browser.

## Compare the five ideas

| Idea | Main interaction | Intended use |
|---|---|---|
| Live desk | Council, response, and response history in separate panels. | Follow the whole discussion. |
| Focus stage | One enlarged response with earlier and newer controls. | Present a debate to an audience. |
| Conversation lanes | A separate response column for each member. | Follow individual reasoning. |
| Split review | Pin an earlier response beside the latest response. | Compare a challenge with a response. |
| Event timeline | Select events from an ordered history. | Inspect the sequence without losing live context. |

The layout switcher preserves the current simulated event.
The Moderator and raised-hand shelf remain outside the response scroll areas.
Detail panels open inside the workspace without covering these live regions.
On narrow screens, swipe the raised-hand shelf, conversation lanes, and split panels horizontally.
The Live desk becomes a single response with earlier and newer controls.

## Interactions

- Select **Next event** to advance the synthetic debate.
- Select **Play demo** to advance every 7 seconds.
- Move the simulation slider to inspect initial assessment, open-floor, response, synthesis, and completed states.
- Select a raised hand to inspect its reason and the member's initial position.
- Select a dossier source to inspect the cited section locally.
- Read earlier responses, then select **Return to live**.
- Select **Scenarios** to try long responses, no hands, a blocked contribution, or a lost connection.
- Press **Escape** to close a detail panel.

Playback pauses only the simulation. It does not represent a production pause control.
Raised hands are not an ordered speaking queue. The Moderator chooses speakers.
Initial positions are not final votes or a consensus score.

## Scope and attribution

`fixture.js` supplies all synthetic data.
`app.js` manages the shared simulation and five layouts.
`styles.css` adapts the incumbent navy and Segoe UI vocabulary.

The design process uses **Impeccable**, by Paul Bakaus:
<https://impeccable.style>.
The prototype implementation is specific to this repository.
The existing production design authority remains `docs/DESIGN.md`.
The wireframes do not connect to the production app or Azure resources.
