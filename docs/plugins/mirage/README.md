# mirage

English | [中文](README.zh.md)

A Unified Virtual File System for AI Agents — mount S3, Google Drive, Slack, Gmail, Redis, GitHub, Notion, and ~50 backends as one filesystem. Any LLM that knows bash can read/grep/pipe across every backend with zero new vocabulary.

> Curated high-star complement in `dsh-hub/plugins/sandbox/mirage` (upstream `https://github.com/strukto-ai/mirage`, ★ 3k+). Independent project (Apache-2.0). This wrapper documents the DSH integration (`@struktoai/mirage-dsh`); see upstream README and `docs.mirage.strukto.ai` for full SDK and CLI docs.

## Capability

- **One interface instead of N SDKs and M MCPs**: every service speaks filesystem semantics; pipelines compose across services as on a local disk.
- **~50 built-in backends**: RAM, Disk, Redis, S3/R2/OCI/Supabase/GCS, Gmail/GDrive/GDocs/GSheets/GSlides, GitHub/Linear/Notion/Trello, Slack/Discord/Email, MongoDB/GridFS/Postgres/LanceDB/Qdrant, SSH, etc., mounted side-by-side under a single workspace root.
- **Portable workspaces**: clone/snapshot/version a workspace; agent runs move between machines without restart.
- **Embeddable SDKs**: Python (`mirage-ai`) and TypeScript (`@struktoai/mirage-node` / `-browser` / `-agents`) run in-process (FastAPI, Express, browser), plus FUSE and MCP adapters.
- **DSH providers** (`@struktoai/mirage-dsh`): swaps `ctx.fs` and `ctx.shell` seams. Bundle patch disables host `fs-sandbox`/`bash-sandbox`/`pwsh-sandbox`/`tool-pwsh`/`tool-fs-search` rows and inserts `mirage` (service) + `mirage-fs` + `mirage-shell`. Example:

  ```yaml
  mounts:
    /tmp: { resource: ram, mode: exec }
    /slack: { resource: slack, mode: read, config: { token: !!js process.env.SLACK_BOT_TOKEN } }
  runtimes: [{ name: monty, captures: [python, python3] }]
  ```

  File-policy `read-only` is enforced (mount grants are narrowed), `workspaceRoot` is ignored (mounts are the boundary), and unresolved workdirs fall back to workspace default. Two-layer cache (index TTL 10m, file 512 MB, Redis shareable) is built into `Workspace`.

## Config

DSH bundle (`typescript/packages/dsh/cordis.patch.yml`) exposes `mirage` service config:

| key | type | default | description |
|---|---|---|---|
| `mounts` | `Record<string, {resource, mode, config}>` | `{ /tmp: {resource: ram, mode: exec} }` | Mount table: path → resource registry name, `mode: read|write|exec`, per-resource `config` (env via `!!js`) |
| `runtimes` | `array` | `[{name: monty, captures:[python,python3]}]` | Runtimes: `vfs` and `monty` (captures python) |
| `cache` | `object` | RAM 512 MB / index RAM | Two-layer cache: `cache` (file bytes) + `index` (listings), Redis shareable (`RedisFileCacheStore`, `index: {type: redis}`) |

Host `mirage` mounts are the boundary; host FS `workspaceRoot` and `DSH_PERMISSION_MODE` are reinterpreted as mount modes, not ignored.

Python/TS SDK construction is `Workspace(mounts, { cache, index, runtimes })` — see upstream `python/quickstart` and `typescript/quickstart`.

## Events

- **Consumes**: `fs` and `shell` seams (`ctx.fs` / `ctx.shell`). The mirage providers implement the same seam contracts, so dsh file tools and bash tool operate on the workspace.
- **Emits**: no new harness session events; workspace execution results flow through the existing `fs`/`shell` tool results.
- **Lifecycle**: provider swap is a Cordis layer; disabling the host rows and inserting `mirage*` rows is atomic at profile boot. Snapshot/load (`ws.snapshot` / `ws.load`) is workspace-level, not a harness event.

## Install

This is a **high-star curated** complement. The DSH adapter is `@struktoai/mirage-dsh` (separate from the Python `mirage-ai` PyPI and the `mirage` CLI). Verification uses a fresh profile `tmp` (AGENTS.md:112).

```sh
# npm (DSH adapter, prebuilt)
dsh plugin --profile tmp add @struktoai/mirage-dsh
# or exact version pinned in pnpm-workspace
dsh plugin --profile tmp add @struktoai/mirage-dsh@0.0.1

# GitHub (adapter source within the monorepo)
dsh plugin --profile tmp add github:strukto-ai/mirage
# the DSH adapter lives at typescript/packages/dsh; hub pointer is the monorepo root
dsh plugin --profile tmp add github:strukto-ai/mirage#<sha>

# local (from dsh-hub root)
# hub submodule pointer:
dsh plugin --profile tmp add ./plugins/sandbox/mirage
# actual DSH adapter package:
dsh plugin --profile tmp add ./plugins/sandbox/mirage/typescript/packages/dsh
```

Upstream SDK installs (non-DSH):

```sh
uv add mirage-ai                          # Python + CLI
npm install @struktoai/mirage-node         # Node.js servers/CLIs
npm install @struktoai/mirage-browser      # browser/edge
npm install @struktoai/mirage-agents       # framework adapters
curl -fsSL https://strukto.ai/mirage/install.sh | sh  # CLI binary
```

First GitHub source install may require allow-listing in `$DSH_HOME/profiles/tmp/pnpm-workspace.yaml` (monorepo `prepare` builds `dist`), then re-run the `add`.

Verify:

```sh
dsh --profile tmp --dump-config  # must contain "# == mirage" / mirage-fs / mirage-shell layers, and fs-sandbox disabled
```

## Versions

- Upstream: `mirage` monorepo (Python `mirage-ai`, TS `0.x`, `typescript/packages/dsh@0.0.1`)
- deepseek-harness `0.1.0-rc.6`–`0.1.1-rc.2` (peer `@deepseek-ai/dsh-fs 0.1.0-rc.6`, `@deepseek-ai/dsh-shell 0.1.0-rc.6`, `@deepseek-ai/cordis ^4.0.1`)
- Node.js `>=20.10.0` (Python `>=3.11`)
- Platform: macOS or Linux (FUSE mounts require platform support)

## Upstream tracker

- Upstream: `https://github.com/strukto-ai/mirage` (`main`, submodule `plugins/sandbox/mirage` in `dsh-hub`, pinned commit in `dsh-hub/.gitmodules`).
- DSH adapter: `typescript/packages/dsh` (`@struktoai/mirage-dsh/service|fs|shell`, `cordis.patch.yml` `mirage` + `mirage-fs`/`mirage-shell` rows, disables `fs-sandbox`/`bash-sandbox`).
- Harness upstream: `https://github.com/deepseek-ai/deepseek-harness` `branch = master`.
- Docs: `https://docs.mirage.strukto.ai` (Python `python/quickstart`, TypeScript `typescript/quickstart`, [DSH](https://docs.mirage.strukto.ai/typescript/agents/dsh), cache `home/cache`).

---

# Upstream README excerpt

Mirage is a Unified Virtual File System for AI Agents: it mounts services and data sources like S3, Google Drive, Slack, Gmail, and Redis side-by-side as one filesystem. See the full upstream README in the submodule for architecture, installation, quickstart, agent frameworks, and cache docs. This wrapper keeps the dsh-specific contract above; upstream content is preserved in the submodule at `README.md` and `typescript/packages/dsh/README.md` (if present).
