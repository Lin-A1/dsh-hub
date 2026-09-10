# memos

English | [中文](README.zh.md)

MemOS v2 Stardust — Memory Operating System for LLMs & AI Agents. Unifies store/retrieve/manage for long-term memory, enabling context-aware personalized interactions with multi-cube KB, multi-modal, tool memory, and enterprise optimizations. The DSH adapter (`@memtensor/memos-local-plugin` + `apps/memos-local-plugin/adapters/deepseek-harness`) gives DSH persistent memory: bounded automatic recall, background capture, hybrid retrieval, and a local Memory Viewer.

> Curated high-star complement in `dsh-hub/plugins/memory/memos` (upstream `https://github.com/MemTensor/MemOS`, ★ 10k+, Apache-2.0). Independent project. This wrapper documents the DSH integration; see upstream README and `apps/memos-local-plugin/adapters/deepseek-harness/README.md` for full contract.

## Capability

- **Unified Memory API**: `add`/`retrieve`/`edit`/`delete` over a graph-structured store (inspectable, not black-box embeddings).
- **Multi-Modal / Multi-Cube**: text/images/tool traces/personas; multiple knowledge bases as composable memory cubes (isolation + sharing + dynamic composition).
- **DSH adapter behavior** (`memos-local-plugin` Cordis row `memos-local-memory`):
  - **Bounded automatic recall**: one retrieval per accepted direct-user turn (including greetings, no Greeting exception, de-duplicated on `agent/pre-step` re-entry), `min(recallTimeoutMs, 3000)` ms, `safeCutoff` fallback, injected as `<memos_context>` after the query (source `plugin/memos-local-memory/recall`).
  - **Background capture**: aggregates `session/event` (assistant/tool/code-dispatch) at `turn/end`, enqueues relation/intent/episode routing + `MemoryCore.onTurnEnd()` in per-session serial queue; next turn never waits for prior queue.
  - **Host LLM delegation**: when `hostLlmEnabled` and MemOS `llm.provider` empty, auxiliary summary/reflection/evolution calls reuse DSH's `llm` service via `prepareCall()` with branded `off` effort (captured per-turn, async-local scoped).
  - **Memory Viewer**: in-process HTTP/SSE at `http://127.0.0.1:18801` (configurable `viewerPort`, `viewerEnabled`), shares the same `MemoryCore`; `localhost`/`127.*` bind only (`viewer.bindHost: 127.0.0.1`).
  - **Six model-facing tools** (when `toolsEnabled`): `memos_search` / `memos_get` / `memos_timeline` / `memos_environment` / `memos_skill_list` / `memos_skill_get`, with `agentPreset`-aware namespace (`profileId` fallback).

## Config

DSH Cordis row (`apps/memos-local-plugin/adapters/deepseek-harness/cordis.patch.yml`):

```yaml
- insert:
    - id: memos-local-memory
      name: '@memtensor/memos-local-plugin/dist/adapters/deepseek-harness/index.js'
      config:
        enabled: true
        profileId: default
        home: ''
        recallEnabled: true
        captureEnabled: true
        toolsEnabled: true
        hostLlmEnabled: true
        viewerEnabled: true
        viewerPort: 18801
        recallTimeoutMs: 3000
        contextMaxChars: 6000
        toolResultMaxChars: 1200
        failOnStartupError: false
```

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Mount or disable the adapter |
| `profileId` | `default` | Fallback namespace; non-empty `agentPreset` overrides |
| `home` | `''` | Runtime root: `MEMOS_HOME` → `MEMOS_CONFIG_FILE` parent → Cordis `home` → `$DSH_HOME/memos-plugin` → `~/.dsh/memos-plugin` |
| `recallEnabled` | `true` | One automatic recall per accepted non-empty direct-user turn |
| `captureEnabled` | `true` | Capture completed turns |
| `toolsEnabled` | `true` | Register six `memos_*` tools |
| `hostLlmEnabled` | `true` | Reuse DSH provider/model/credentials for MemOS LLM work when `llm.provider` empty |
| `viewerEnabled` / `viewerPort` | `true` / `18801` | Serve Viewer and HTTP/SSE API in-process |
| `recallTimeoutMs` | `3000` | Requested deadline (`min(x,3000)` effective) |
| `contextMaxChars` / `toolResultMaxChars` | `6000` / `1200` | Caps |
| `failOnStartupError` | `false` | When `true`, startup failure fails DSH profile boot |

Core MemOS config (`$home/config.yaml`) is shared with OpenClaw/Hermes adapters (see `apps/memos-local-plugin/core/config/README.md`). DSH patch layers replace the whole row config, so keep every field when overriding one.

## Events

- **Consumes**: `agent/pre-step` (bounded recall, host `agent/pre-step` is awaited before canonical user event), `turn/end` (capture enqueue), `session/flush` (explicitly not a capture barrier), `session/disposed` (detach without joining), Cordis dispose (bounded best-effort drain).
- **Emits**: `plugin/memos-local-memory/recall` labeled `memos_context` (user message) for automatic recall; tool results via the six `memos_*` tools. No custom durable `SessionEventMap` entries beyond the adapter's own `cordis.patch.yml` row.
- **Lifecycle**: `enable` check in `apply()` — bootstrap failure with `failOnStartupError: false` logs and leaves DSH running without memory; Viewer bind failure does not kill recall/capture/tools unless `failOnStartupError: true`.

## Install

This is a **high-star curated** complement. The DSH adapter is the out-of-tree Cordis bundle `@memtensor/memos-local-plugin` (local-first SQLite, `2.0.16-beta.1` validated). Verification uses a fresh profile `tmp` (AGENTS.md:112).

```sh
# Recommended one-command installer (macOS/Linux, Node + DSH required)
curl -fsSL https://raw.githubusercontent.com/MemTensor/MemOS/main/apps/memos-local-plugin/install.sh \
  | bash -s -- --agent dsh --profile tmp --version 2.0.16

# npm (lower-level, requires pnpm on PATH)
dsh plugin --profile tmp add @memtensor/memos-local-plugin
dsh plugin --profile tmp add @memtensor/memos-local-plugin@2.0.16
dsh plugin --profile tmp add @memtensor/memos-local-plugin@2.0.16-beta.1

# GitHub (adapter source within the monorepo)
dsh plugin --profile tmp add github:MemTensor/MemOS
dsh plugin --profile tmp add github:MemTensor/MemOS#<sha>

# local (from dsh-hub root)
# hub submodule pointer:
dsh plugin --profile tmp add ./plugins/memory/memos
# actual DSH adapter package:
dsh plugin --profile tmp add ./plugins/memory/memos/apps/memos-local-plugin
# after building from checkout:
# cd plugins/memory/memos/apps/memos-local-plugin && npm run build:package && dsh plugin --profile tmp add .
```

The one-command installer prepares an isolated `pnpm@11.7.0` when absent, handles the reviewed `allowBuilds` set (`better-sqlite3`, `esbuild`, `onnxruntime-node`, `sharp` approved; `protobufjs` + hint disabled), retries the same spec, and verifies the `memos-local-memory` row. Direct `dsh plugin add` users must manually `dsh plugin --profile tmp approve-builds` and re-run the `add`.

Verify:

```sh
dsh --profile tmp --dump-config  # must contain "@memtensor/memos-local-plugin" layer and id: memos-local-memory
# Viewer at http://127.0.0.1:18801 (configurable) when viewerEnabled
```

Cloud alternative (no local DB): `npx @deepseek-ai/dsh plugin --profile tmp add @memtensor/memos-cloud-dsh-plugin` (see upstream `apps/MemOS-Cloud-OpenClaw-Plugin`).

## Versions

- Upstream: `MemOS@2.0` Stardust, `apps/memos-local-plugin@2.0.16-beta.1` (validated for DSH `0.1.0-rc.5`–`0.1.0-rc.6`, peer `>=0.1.0-rc.5 <0.2.0`)
- deepseek-harness `0.1.0-rc.6` (`master` HEAD, also `0.1.0-rc.5` initial target, Node `^22.19.0 || >=24.0.0`)
- Node.js `>=20.0.0` (Viewer needs `>=20`, DSH host requires `^22.19.0 || >=24.0.0`)
- Peers: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/dsh-agent|llm|session|system-prompt|timeout|tools ^0.1.0-rc.5`, `@deepseek-ai/schemastery ^3.18.1`
- Runtime home: `$DSH_HOME/memos-plugin/` (`~/.dsh/memos-plugin/` default, `config.yaml`/`data/memos.db`/`skills/`)

## Upstream tracker

- Upstream: `https://github.com/MemTensor/MemOS` (`main`, submodule `plugins/memory/memos` in `dsh-hub`, pinned commit in `dsh-hub/.gitmodules`).
- DSH adapter: `apps/memos-local-plugin` (`@memtensor/memos-local-plugin`, `adapters/deepseek-harness/cordis.patch.yml` `memos-local-memory` row, Viewer at `127.0.0.1:18801`).
- Harness upstream: `https://github.com/deepseek-ai/deepseek-harness` `branch = master` (DSH `0.1.0-rc.5`/`rc.6` compatibility, see adapter `apps/memos-local-plugin/adapters/deepseek-harness/README.md`).
- Docs: `https://memos-docs.openmem.net/` · `apps/memos-local-plugin/adapters/deepseek-harness/README.md` · `apps/memos-local-plugin/README.md` · Viewer `apps/memos-local-plugin/viewer/`

---

# Upstream README excerpt

MemOS is a Memory Operating System for LLMs and AI agents that unifies store/retrieve/manage for long-term memory. See the full upstream README in the submodule for Cloud API, self-host Docker, OpenClaw/Hermes adapters, and performance benchmarks (LoCoMo 88.83, LongMemEval 89.20, etc.). This wrapper keeps the dsh-specific contract above; upstream content is preserved in the submodule at `README.md` and `apps/memos-local-plugin/README.md`.
