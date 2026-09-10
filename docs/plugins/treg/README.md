# treg

English | [中文](README.zh.md)

OpenRouter for Tools — point an agent at one base URL with one token and call **~2,800 catalogued endpoints across ~56 providers** (SEO, backlinks, social, enrichment, ads, scraping) — priced per call, plus your own team's keys/skills/CLIs callable by every teammate without the credential ever leaving the server.

> Curated high-star complement in `dsh-hub/plugins/web/treg` (upstream `https://github.com/superdesigndev/treg`, ★ 400+, Apache-2.0 + additional terms). Independent project (Superdesign, `https://treg.to`). This wrapper documents the DSH integration (`treg-dsh`); see upstream README and `docs/DSH-PLUGIN.md` for full product docs.

## Capability

- **Catalog** (treg's key, metered): ~2,800 endpoints across ~56 providers, grouped by capability (keyword/rank, backlinks/authority, AI visibility, trending, social publishing, people/company enrichment, ads). No provider account needed; `$1.00 free` per new team; `402` with `balance_micro`/`estimated_cost_micro`/`topup_url` when out of balance.
- **Your own tools** (your key wins, never metered): any teammate-registered endpoint/CLI/skill. Vocabulary: **tool** = endpoint (upstream `base_url` + credential bindings, each binding injects one secret via `env`/`cli_auth`/`secret_file`/`oauth`) or **CLI** (`stripe`/`gh`/`vercel` run with injected credential); **skill/bundle** = recipe (`SKILL.md`) + secrets + tool(s).
- **One proxy rule**: `relay()` in `src/treg/proxy.py` — faithful streaming proxy that alters only hop-by-hop headers, treg control/edge headers (`x-treg-token`, `x-treg-org`, `via`, …) + session cookie (all stripped), and the injected credential; everything else is verbatim. Credential ladder: 1) your team's registered tool for that provider → that key; 2) your team's stored secret → virtual tool; 3) neither → treg's key (billed).
- **DSH integration** (`treg-dsh` bundle `dsh/cordis.patch.yml`): two rows — `treg-skill` (always on, publishes packaged `SKILL.md` on `ctx.skills`) + `treg-mcp` (disabled until `TREG_TOKEN` in env, connects `https://treg.to/mcp/` via `streamable-http` as `mcp__treg__*` tools, `Authorization: Bearer ${TREG_TOKEN}`). Install as DSH plugin, set token, restart profile and tools appear; skill walks human through obtaining a token. Same source as Claude Code/Cursor/Codex plugins (`scripts/build_plugin.py` from `src/treg/web/skill.md`), `MCP` row disabled mirrors Claude Code manifest rationale.

## Config

DSH bundle (`dsh/cordis.patch.yml`):

```yaml
- insert:
    - id: treg-skill
      name: treg-dsh
    - id: treg-mcp
      name: '@deepseek-ai/dsh-mcp-client'
      disabled: !!js (process.env.TREG_TOKEN ?? '') === ''
      config:
        serverName: treg
        transport: streamable-http
        url: https://treg.to/mcp/
        headers:
          Authorization: !!js '`Bearer ${process.env.TREG_TOKEN}`'
```

| key | type | default | description |
|---|---|---|---|
| `TREG_TOKEN` | `env` | unset | DSH profile env: when set, enables `treg-mcp` row and registers `mcp__treg__*` tools; when empty, row stays disabled (no 401 noise) |
| `treg-skill` | `bundle row` | always on | Publishes `SKILL.md` on `ctx.skills`; no credential handling, no `prepare`/`install` hooks |

Server-side env (self-host, prefix `TREG_`, from `.env`): `TREG_DATABASE_URL` (`sqlite+aiosqlite:///./treg.db` default), `TREG_SECRET_KEY` (Fernet, ephemeral if empty → secrets not surviving restart), `TREG_PUBLIC_URL` (`https://treg.to`), `TREG_SESSION_SECRET`, `TREG_GITHUB_CLIENT_ID/_SECRET`, `TREG_GOOGLE_CLIENT_ID/_SECRET`, `TREG_RESEND_API_KEY`/`TREG_EMAIL_FROM`, `TREG_ADMIN_TOKEN`, `TREG_EMAIL_DEV_MODE` (`false`).

## Events

- **Consumes**: no harness event bus for the proxy itself; DSH `treg-mcp` consumes `TREG_TOKEN` env at profile boot (`disabled: !!js ...`).
- **Emits**: audit `CallRecord` (fire-and-forget deferred writer) for every `/call` relay; credential health probe (optional `health.py` periodic run, refresh OAuth, webhook owner on failure).
- **DSH lifecycle**: `treg-skill` skill publication is `ctx.skills` registry (`Skills`); `treg-mcp` tool registration is via `dsh-mcp-client` (MCP client seam). Profile restart required after setting `TREG_TOKEN` to enable the MCP row; no telemetry or background service in the bundle beyond the MCP client.

## Install

This is a **high-star curated** complement. The DSH bundle is `treg-dsh` (two rows, `treg-skill` always on, `treg-mcp` gated on `TREG_TOKEN`). Verification uses a fresh profile `tmp` (AGENTS.md:112).

```sh
# npm (DSH bundle, prebuilt)
dsh plugin --profile tmp add treg-dsh
# or scoped CLI package (also hosts the DSH bundle via dsh/ dir)
dsh plugin --profile tmp add @superdesign/treg

# GitHub (source, needs allowBuilds on first install — pnpm prints the exact key)
dsh plugin --profile tmp add github:superdesigndev/treg
# pin to a commit for trusted installs
dsh plugin --profile tmp add github:superdesigndev/treg#<sha>

# local (from dsh-hub root)
# hub submodule pointer:
dsh plugin --profile tmp add ./plugins/web/treg
# actual DSH bundle within the submodule:
# (package.json dsh.bundle.patch: ./dsh/cordis.patch.yml)
dsh plugin --profile tmp add ./plugins/web/treg
```

Obtain a token: `treg login` (GitHub default, `--email` OTP, `--token` for agents/CI) or via `https://treg.to` dashboard (sign-in, `treg catalog`, `treg call`, `treg balance`/`topup`, `treg scan`/`upload`, `treg org`). After `dsh plugin add`, set `TREG_TOKEN` in the profile env and restart: `dsh --profile tmp` (the `treg-mcp` row enables and tools appear as `mcp__treg__*`).

Verify:

```sh
dsh --profile tmp --dump-config  # must contain "# == treg-skill" and conditional treg-mcp layers
```

Non-DSH installs (CLI only): `pip install "tools-registry[server]"` vs `pip install tools-registry` (CLI only); `uv sync && uv run python -m treg --reload` for dev (`scripts/dev-local.sh up` on `:18790`).

## Versions

- Upstream: `treg` (`tools-registry`) `0.12.0` (see `package.json` `treg-dsh@0.12.0`, `USAGE.md` full CLI reference)
- deepseek-harness: DSH bundle via `dsh/cordis.patch.yml` (`treg-skill` + `treg-mcp`); verified against Harness `master` (`0.1.0-rc.8`–`0.1.1-rc.2`, Node `>=20`)
- Node.js `>=20` (Python `>=3.11` for `mirage` comparison; treg server needs `uv` + `tmux` for `dev-local.sh`)
- Runtime: hosted at `https://treg.to` (Render web + Postgres) and self-hostable (`src/treg/` `proxy.py` + `injectors.py` + `oauth.py` + `health.py` + `api.py` + `cli.py` + `models.py`; 521 tests `uv run pytest -q`).

## Upstream tracker

- Upstream: `https://github.com/superdesigndev/treg` (`main`, submodule `plugins/web/treg` in `dsh-hub`, pinned commit in `dsh-hub/.gitmodules`).
- DSH bundle: `dsh/cordis.patch.yml` (`treg-skill` + `treg-mcp` `https://treg.to/mcp/`), `package.json` `treg-dsh@0.12.0` (`dsh.bundle.patch: ./dsh/cordis.patch.yml`).
- Harness upstream: `https://github.com/deepseek-ai/deepseek-harness` `branch = master`.
- Docs: `https://treg.to/llms.txt` (agent onboarding: call protocol/discovery/auth/CLI/skills), `https://treg.to/docs` (OpenAPI at `/docs`), `USAGE.md` (CLI), `docs/DSH-PLUGIN.md` (DSH-specific), `docs/CLAUDE-PLUGIN.md`, `docs/context/README.md` (per-subsystem fragments).

---

# Upstream README excerpt

OpenRouter, but for agent tools instead of models. ~2,800 endpoints across ~56 providers — priced per call, from a cent, with no provider signup. Plus your own team's keys, skills and CLIs, callable by every teammate's agent without the credential ever leaving the server. See the full upstream README in the submodule for `treg catalog`/`call`/`scan`/`upload`, teams/orgs, self-hosting (`TREG_*` env), architecture (`proxy.py` faithful-relay contract), and tests. This wrapper keeps the dsh-specific contract above; upstream product docs remain in the submodule at `README.md` and `USAGE.md`.
