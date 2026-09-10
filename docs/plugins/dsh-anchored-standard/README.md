# dsh-anchored-standard

English | [中文](README.zh.md)

Experimental DeepSeek Harness agent presets — a base mode, two live-anchor variants, and one seeded prefab mode — that anchor a session's model trajectory on the Minimal condition (real Minimal tool schema, no auto-injected context), then promote to a small resident catalog once the session is durable, unlocking heavier Standard tools on demand.

> Curated high-star complement in `dsh-hub/plugins/skill/dsh-anchored-standard` (upstream `https://github.com/xiaobright/dsh-anchored-standard`, ★ 3k+, MIT). Community project, not an official DeepSeek preset and not affiliated with or endorsed by DeepSeek. This wrapper documents the DSH preset integration; see upstream README, `HANDOFF.md`, `HANDOFF-2.md`, and `prefab/README.md` for mechanism and results.

## Capability

| Mode | Directory | First model request | Anchor mechanism | Promotion signal | Cost |
|---|---|---|---|---|---|
| Anchored Standard | `preset/` | 2 tools (Minimal pair) | Minimal tool schema | first durable `tool/call` **or** `assistant/message` (`promoteOn: either`) | none |
| Zero-Anchored Standard | `zero-anchored-standard/` | 0 tools | one fixed anchor turn | anchor reply (`assistant/message`) | +1 call |
| Whoami Standard | `whoami-standard/` | 0 tools | "你是谁" self-intro turn | self-intro reply | +1 call |
| Prefab Anchored Standard | `prefab/` | seeded rolled history | bundled successful trajectory | already promoted in seed | none |
| Eternal Minimal | `eternal-minimal/` | 2 tools, forever | `dshx` bash gateway | none (no phases) | none |
| Wire Think-Execute Standard | `wire-think-standard/` | tools + `tool_choice: none` on sibling route | sibling provider `deepseek-wire-think` | per-turn steer | +1 call/turn |
| Combo Anchored | `combo-anchored/` | 0 tools, every turn | think split + depth gate + drip | per-mechanism | +1 call/turn |

Each mode directory is **self-contained** and installs alone under whatever id you copy it to. `prefab/` hydrates the blank session in place when its preset is selected. Invariants (`npm run check`): every `agent.cordis.yml` references only `./local.mjs`; shared plugins live in `shared/` and are materialized via `npm run sync`; `context-gate` stays FIRST row, `tool-bootstrap` right after.

The mechanism isolates three first-request levers (issue #11): tool schema (decisive at 256k maxTokens, Minimal pair 5/5 anchored), output budget (`bootstrapMaxTokens` 1024 anchors 26/32, opt-in), and injected reminders (AGENTS.md digest + skill catalog; suppressed via `context-gate`'s unified injection paths, not per-source).

## Config

All knobs are rows in each mode's `agent.cordis.yml`. Unknown keys fail at preset mount.

`context-gate` (FIRST row in `preset/`, `zero-anchored-standard/`, `whoami-standard/`):

| Key | Default | Meaning |
|---|---|---|
| `promoteOn` | `either` | `either`/`tool-call`/`assistant-message` |
| `includeSubagents` | `false` | Gate subagents too (`true` in base + whoami) |
| `enabled` | `true` | `false` disables both paths |
| `allowKinds` | `[skill-invocation]` | `source.kind` values allowed beyond claimed batch |

`tool-bootstrap` (in `preset/agent.cordis.yml`):

| Key | Default | Meaning |
|---|---|---|
| `bootstrapTools` | `[bash, str_replace_editor]` | Tools visible on request #1 |
| `promoteOn` | `either` | Promotion trigger |
| `bootstrapMaxTokens` | unset | Optional output cap for request #1; stripped after promotion |
| `includeSubagents` | `false` | Subagents take bootstrap too (`true` in base) |
| `compactionTools` | `[]` | Extra tools between compaction boundary and re-promotion |

Other rows: `zero-tool-bootstrap`, `anchor-turn` (`text` default "你是谁" / test notice), `eternal-minimal` (`guide`/`gateway`/`suppressedContextSources`), `cot-drip` (`every`/`maxPerTurn`/`text`), `toolchoice-adapter`/`wire-think`, `instruction-hint`. See upstream README Configuration reference and `shared/context-gate.mjs` for unified injection control.

## Events

- **Promotion** derived from **durable session events** (`tool/call` or `assistant/message` per `promoteOn`), so resume/reload preserves phase; `compaction/end` re-closes the gate.
- **Waterfalls**: `systemPrompt/assemble` (catalog strip/restore), `agent/pre-step` (keep claimed `next-turn` batch + `allowKinds`; think-step `mode` strip is per-step), `tools/pre-execute` (eternal-minimal `dshx` gateway), `tools/post-execute` (`cot-drip` additionalContexts).
- **Phase lifecycle** (base mode): request #1 bootstrap phase (Minimal pair, no injections, optional cap) → first durable signal → PROMOTION → request #2+ resident phase (bootstrap pair + discovery tools `dev_tool_search`/`skill_search`/`skill_load` + unlocked). Discovery tools grow the catalog via `dev_tool_search`; prefix-cache breaks at promotion.
- No telemetry, no network requests.

## Install

This is a **preset**, not an npm `dsh plugin` package. Install by copying the preset directory into the DSH agent-preset root. Verification uses a fresh preset selection (no profile `tmp` warning, `request/header` shows bootstrap pair on #1, resident set on #2).

```sh
# Clone the hub (already contains the submodule) or the upstream directly
git clone --recursive https://github.com/Lin-A1/dsh-hub.git
# or
git clone https://github.com/xiaobright/dsh-anchored-standard.git
cd dsh-anchored-standard

# One-command preset install (PowerShell)
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\anchored-standard'
if (Test-Path -LiteralPath $target) { throw "Preset already exists: $target" }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Copy-Item -Recurse -LiteralPath '.\preset' -Destination $target

# Linux/macOS
dsh_home="${DSH_HOME:-$HOME/.dsh}"
mkdir -p "$dsh_home/.agent-presets"
test ! -e "$dsh_home/.agent-presets/anchored-standard"
cp -R preset "$dsh_home/.agent-presets/anchored-standard"

# Other modes (self-contained, install alone or together)
cp -R zero-anchored-standard "$dsh_home/.agent-presets/zero-anchored-standard"
cp -R whoami-standard "$dsh_home/.agent-presets/whoami-standard"
cp -R prefab "$dsh_home/.agent-presets/prefab-anchored-standard"  # see prefab/README.md + prefab/AGENT_INSTALL.md
```

Restart DSH, create a blank session, and select **Anchored Standard (experimental)**. Do not switch an active session from a different preset.

For hub curators, the plugin-form verification (AGENTS.md:112) maps to:

```sh
# GitHub (source)
dsh plugin --profile tmp add github:xiaobright/dsh-anchored-standard
# pin to commit for trusted installs
dsh plugin --profile tmp add github:xiaobright/dsh-anchored-standard#<sha>

# npm (presets are filesystem copies — no dsh bundle publish; placeholder for verification)
dsh plugin --profile tmp add dsh-anchored-standard

# local (hub submodule)
dsh plugin --profile tmp add ./plugins/skill/dsh-anchored-standard
```

Verify via session JSONL `request/header`: first header `tools: ["bash","str_replace_editor"]`, no AGENTS.md/skills digest; second changed header contains resident catalog (`bash`+`str_replace_editor`+`dev_tool_search`/`skill_search`/`skill_load`+unlocked). `npm test` runs zero-dependency tests.

## Versions

- deepseek-harness `0.1.0-rc.5` (upstream `47f9438`, Harness is developer preview and permits breaking changes; review upstream changes before newer releases)
- Also validated at `adapterDefaults.maxTokens` interaction differences (`rc.5` source vs `rc.6` prebuilt overwrite)
- Node.js 24 on Windows (persistent shell `shellPath` adaptive: `/bin/bash` or `bash` PATH fallback for NixOS)
- No `@deepseek-ai/cordis` peer as a skill preset (plugin runtime is harness-native `agent.cordis.yml` rows + `shared/*.mjs`); tests are zero-dependency (`npm test`)

## Upstream tracker

- Upstream: `https://github.com/xiaobright/dsh-anchored-standard` (`main`, submodule `plugins/skill/dsh-anchored-standard` in `dsh-hub`, pinned commit in `dsh-hub/.gitmodules`).
- Companion research: `https://github.com/0liveiraaa/DeepseekCotexplorations` (tool-surface dose-response + anchor-mass quantification, Project2 replication, prefab template quality model).
- Harness upstream: `https://github.com/deepseek-ai/deepseek-harness` `branch = master` (preset is a full snapshot of the Standard composition, durable-event promotion, `shared/context-gate.mjs` unified injection control).
- Docs: upstream `README.md` (modes, terminology, how it works, results, compatibility, verification), `HANDOFF.md`/`HANDOFF-2.md` (development records), `prefab/README.md` + `prefab/AGENT_INSTALL.md` (prefab install), `ACKNOWLEDGEMENTS.md`/`FAREWELL.md`.

---

# Upstream README

See the full upstream README in the submodule for guided story, route probe, semantic lens, repository layout, and development conventions. This wrapper keeps the dsh-specific contract above; upstream content is preserved in the submodule at `README.md` and `prefab/README.md`. Community note: following price increases, active development has stopped (maintenance only) as of 2026-08-17; see `FAREWELL.md`. Consider `dsh-routing-suite` and `J-Space Cognition Suite` (referenced in upstream README) for alternative router/cognitive layers.
