# modlens

English | [中文](README.zh.md)

Vision bridge for text-only models in DeepSeek Harness — paste an image, get structured evidence (transcription, layout regions, entities, relations) that the model can quote.

> Curated high-star complement in `dsh-hub/plugins/vision/modlens` (upstream `https://github.com/liustack/modlens`, ★ 3k+). Independent repository, not affiliated with DeepSeek. This wrapper documents the dsh integration; see upstream README for full marketing and CLI manual.

## Capability

- **Text-only model sight**: on a text-only DeepSeek/GLM route, pasted images are recovered from session storage and converted to structured evidence at request time via the same underlying route; vision models keep native paste.
- **Six built-in providers + four reusable CLIs** behind one interface (`src/providers/index.ts`): `gemini-api` (5-10s, recommended free Gemini key), `openai` (any OpenAI-compatible `baseUrl` + `model`, 5-10s), `anthropic` (5-10s), `antigravity-cli` (zero-config free, 15-45s), `claude-cli` (rides Claude Code subscription), `kimi-cli` (named) — plus reuse of local Codex/OpenCode/Pi/Grok CLIs via `reuse.*` consent flags. One failover chain, first good result wins, `meta.attempts` records every attempt.
- **Paste recovery**: `modlens recover-paste` pulls pasted image bytes from local session storage (Claude Code JSONL, Pi JSONL, OpenCode SQLite), scoped via process ancestry; Codex defers to its on-disk temp files.
- **Evidence, not imagination**: schema-enforced JSON output wherever backend allows (`--json-schema` on CLIs, `responseJsonSchema` on Gemini, forced tool call on Anthropic, template-instance validation on openai). `openai.extraBody` deep-merges vendor knobs; image/prompt/schema fields are reserved.

## Config

Layered config: CLI flags > `~/.modlens/config.json` (0600, masked) > built-ins. Since 3.17.0 a provider's settings are whole-source (file when mentioned, bound env vars `GEMINI_API_KEY`/`OPENAI_API_KEY`/`OPENAI_BASE_URL`/`ANTHROPIC_API_KEY`/`ANTHROPIC_BASE_URL` otherwise). `MODLENS_MODEL`/`MODLENS_HARNESS` and proxy conventions unaffected. See `skills/modlens/references/configure.md`.

`cordis.patch.yml` (dsh bundle):

```yaml
- insert:
    - id: modlens
      name: '@liustack/modlens'
```

No Harness-side config surface beyond the bundle row; provider credentials live in `~/.modlens/config.json` or env (see CLI manual `docs/cli.md` and `skills/modlens/references/configure.md`).

Common CLI knobs:

```sh
modlens -i screenshot.png                     # default provider (antigravity-cli)
modlens -i screenshot.png -p gemini-api       # fastest free route (5-10s)
modlens config set openai.baseUrl https://dashscope.aliyuncs.com/compatible-mode/v1
modlens recover-paste --session <uuid>
modlens doctor --json
```

## Events

- **Consumes**: no harness event bus; image bytes arrive via paste-recovery adapters (`src/recoverPaste/adapters/*`) or direct CLI `-i` path.
- **Emits**: no Harness session events; the `modlens_read_image` tool (and `(modlens vision)` model-variant routing) injects structured evidence as model-visible context. Tool disposal is process-scoped, not Cordis-fiber.
- **DSH integration**: the `dsh` export (`./dsh`) mounts the vision bridge as a Harness plugin (`dsh/index.js` + `cordis.patch.yml` + `dsh/client.js` web immediately); see `dsh/README.md` in the upstream repo.

## Install

This is a **high-star curated** plugin. The upstream package is already a dsh plugin (`dsh.bundle.patch: ./cordis.patch.yml`), so the same three verification paths as every hub plugin apply, using a fresh profile `tmp` (AGENTS.md:112).

```sh
# GitHub (source, needs allowBuilds on first install — pnpm prints the exact key)
dsh plugin --profile tmp add github:liustack/modlens
# pin to a commit for trusted installs
dsh plugin --profile tmp add github:liustack/modlens#<sha>

# npm (prebuilt, no allowBuilds — modifier mirrors `npx -y @deepseek-ai/dsh plugin --profile web add @liustack/modlens@3.22.1`)
dsh plugin --profile tmp add @liustack/modlens
dsh plugin --profile tmp add @liustack/modlens@3.22.1

# local (from dsh-hub root after submodule clone)
dsh plugin --profile tmp add ./plugins/vision/modlens
```

First GitHub install may require allow-listing in `$DSH_HOME/profiles/tmp/pnpm-workspace.yaml`:

```yaml
allowBuilds:
  '@liustack/modlens': true
```

then re-run the `add`. The DSH `(modlens vision)` model variant auto-discovers text-only DeepSeek/GLM routes and is remembered per-model-selector.

Verify:

```sh
dsh --profile tmp --dump-config  # must contain "# == modlens" layer
modlens doctor --json            # offline provider readiness
```

Upstream install via skill (other harnesses): `npx skills add liustack/modlens -g` or paste-to-agent `Install and configure the modlens skill following https://github.com/liustack/modlens/blob/main/INSTALL.md`.

## Versions

- Upstream: `modlens@3.22.1` (see `CHANGELOG.md` in the submodule)
- deepseek-harness `0.1.0-rc.8`–`0.1.1-rc.2` (Harness `master` HEAD, Node `>=22.19`)
- Node.js `>=22.19`
- Providers: Gemini (free key, 5-10s), any OpenAI-compatible endpoint, Anthropic, Antigravity CLI (`agy`), Claude Code / Kimi Code CLIs; reuse flags `reuse.codex/opencode/pi/grok` via `modlens config set`.

## Upstream tracker

- Upstream: `https://github.com/liustack/modlens` (`main`, submodule `plugins/vision/modlens` in `dsh-hub`, currently pinned commit in `dsh-hub/.gitmodules`).
- Harness upstream: `https://github.com/deepseek-ai/deepseek-harness` `branch = master`.
- Docs: [Install guide](https://github.com/liustack/modlens/blob/main/INSTALL.md) · [CLI manual](https://github.com/liustack/modlens/blob/main/docs/cli.md) · [Configuration](https://github.com/liustack/modlens/blob/main/skills/modlens/references/configure.md) · [Output contract](https://github.com/liustack/modlens/blob/main/docs/output-schema.md) · [Troubleshooting](https://github.com/liustack/modlens/blob/main/docs/troubleshooting.md) · [Security](https://github.com/liustack/modlens/blob/main/docs/security.md)
- Companion: `https://github.com/liustack/modsearch` (best free web search plugin for DSH) and `https://github.com/liustack/aimanager` (desktop wrapper).

---

# Upstream README excerpt

The flagship DeepSeek and GLM chat models are text-only and cannot read images. ModLens reads images pasted straight into the chat, no saving to a file and passing a path first. See the full upstream README in the submodule for demos, highlights, and provider tables. This wrapper keeps the dsh-specific contract above; upstream marketing content is preserved in the submodule at `plugins/vision/modlens/README.md` (original commit) and linked via the URLs above.
