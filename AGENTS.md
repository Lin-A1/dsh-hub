# AGENTS.md

dsh-hub is a pointer-only repository: no first-party source code, no plugins
in-tree. Its substance is a curated set of git submodules under
`plugins/<category>/<name>` and a pinned `deepseek-harness/` submodule. Every
change is a pointer bump, a new submodule, or documentation.

## Plugin spec: what a plugin repo must look like

Every plugin repo indexed by dsh-hub must install cleanly via
`dsh plugin add <github-spec>` or `dsh plugin add <npm-spec>`. The full
contract is at
[docs/user/develop/basic/publish.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md);
the non-negotiable subset is below.

### Repository shape

```
my-plugin/
├── package.json          # declares dsh.bundle, peerDependencies, files
├── cordis.patch.yml      # the layer applied when a profile lists this bundle
├── src/
│   ├── index.ts          # plugin entry: named exports name/inject/Config/apply
│   └── ...
├── tsdown.config.ts      # or rollup/esbuild: emit lib/index.js for runtime
├── README.md
├── AGENTS.md             # plugin-local conventions
└── pnpm-workspace.yaml   # plugin-local only — NEVER merged with deepseek-harness
```

### `package.json` invariants

- `name` follows the dsh scope, typically `dsh-<scope>-<name>`.
- `private: true` (no upstream publish) **or** a real SemVer version on npm.
- `type: "module"`, `main: "lib/index.js"`,
  `exports["."] = { types, default }`.
- `files` lists `lib/`, `cordis.patch.yml`, and any runtime assets. Never
  publish `src/`, `tsconfig.tsbuildinfo`, or sourcemaps.
- Scripts: `build` (emits `lib/`), `prepare` (runs `build` so a GitHub install
  produces artifacts), `typecheck`, `lint`.
- `@deepseek-ai/cordis` belongs in **both** `peerDependencies` and
  `devDependencies` with the same range. Out-of-tree plugins must share the
  install's single Cordis instance — declaring it only in `dependencies` yields
  a duplicate runtime and a broken `ctx` (see deepseek-harness
  `packages/AGENTS.md`).
- `@deepseek-ai/schemastery` lives in `dependencies` (runtime validator).
- `dsh.bundle.patch` points at `./cordis.patch.yml`. Without this declaration
  the package still installs as a plain dependency but `dsh plugin` warns and
  no layer activates — that is the library-import case, not the plugin case.

### `cordis.patch.yml`

```yaml
- insert:
    - id: <unique-plugin-id>      # id space is global across the profile
      name: <bare-package-name>   # resolves from the profile's node_modules
      config:
        # plugin config matching the Config schema
```

Every plugin row gets a stable id. Use a capability-style prefix (e.g.
`my-bash-sandbox`) so later patches can target it.

### Plugin module shape

Service packages default-export their class; function plugins named-export
`name` / `inject` / `Config` / `apply` and have no default export. Mixing the
two makes the Loader discard the function plugin's namespace
(`docs/postmortem/0001-…`). Registrations are effects: `ctx.effect()`,
`ctx.on()`, `ctx.waterfall()` — disposing the plugin fiber unregisters
everything.

### Install paths a hub plugin must support

- **GitHub**: `dsh plugin add github:<owner>/<plugin>`. Requires `prepare`
  to build `lib/` from source. First-time users must allow-build this package
  in their profile's `pnpm-workspace.yaml` (see publish.md). Pin to a commit
  for trusted installs: `github:owner/repo#<sha>`.
- **npm**: `dsh plugin add <package-name>`. Requires publishing with `lib/`
  already built. No allow-build needed.
- **local**: `dsh plugin add ./path` for development.

### Workspace isolation

The plugin repo's `pnpm-workspace.yaml` is plugin-local. Do not lift it into
dsh-hub or deepseek-harness. dsh-hub itself has no `pnpm-workspace.yaml`; it
is a pure pointer repo. The official harness's profile installation
(`$DSH_HOME/profiles/<name>/pnpm-workspace.yaml`) is the only place that
combines plugin manifests.

## Submodules

- `deepseek-harness/` tracks upstream `master` (`branch = master` in
  `.gitmodules`). Bump it with
  `git submodule update --remote deepseek-harness && git add deepseek-harness`.
  Do not switch it to a fixed tag — staying on master is the chosen model.
- Plugin submodules are independent. Pin to a default branch, a release tag,
  or a commit at your discretion; record the choice in the plugin's own
  documentation.
- Cloning without `--recursive` leaves submodules empty. Always document the
  full clone in user-facing instructions.

## Adding a plugin

- Pick the category that matches the plugin's capability, not its author's
  identity — a third-party sandbox goes under `plugins/sandbox/` next to ours.
  See [plugins/README.md](plugins/README.md) for the full category table.
- Before adding the submodule, verify the repo above satisfies the
  [plugin spec](#plugin-spec-what-a-plugin-repo-must-look-like). A hub entry
  is a publication signal: do not index a repo that would fail
  `dsh plugin add` against a fresh profile.
- **Verification is mandatory**: create a fresh profile and run `dsh plugin --profile <tmp> add` for every supported path — `github:<owner>/<repo>`, `npm:<pkg>`, and `local: ./plugins/<category>/<name>` — confirm `lib/` builds via `prepare`, no `dsh plugin` warning, and `dsh --dump-config` shows the layer active. Record the verification command and output in the PR.
- Use a stable submodule pointer: default branch HEAD, or a release tag if
  the plugin author publishes them.
- Adding the submodule does not install the plugin into any profile. Users
  install via `dsh plugin add <path-or-github-spec>`.
- Each plugin needs a short README entry in `plugins/<category>/` (or the
  plugin's own README linked from the root index) declaring: capability,
  config schema, events emitted or consumed, and the upstream tracker. The README's install snippet (`dsh plugin add ...`) must be copy-paste runnable and match the verification above.

## Removing a plugin

`git submodule deinit -f plugins/<category>/<name> && git rm -f plugins/<category>/<name>`
and push. The plugin's own repository stays; we only drop the pointer.

## Documentation

- The root `README.md` is the user-facing entry. Keep it short; link to the
  official deepseek-harness docs rather than restating them.
- `plugins/README.md` is the category index. Update it when categories are
  added or renamed.
- No bilingual pairing machinery here — this repo is English-only. The
  `i18n` policies in `deepseek-harness/docs/AGENTS.md` apply to the official
  docs, not to this pointer repo.

## What this repository does not own

- Plugin source code, tests, releases, or version policy. Those live in the
  plugin's own repository.
- Toolchain, type checking, lint, build. There is nothing to build here.
- Anything inside `deepseek-harness/`. The submodule is read-only from this
  side; changes go upstream.
- Per-plugin dependencies or peer ranges. Those are declared in the plugin
  repo's `package.json`; dsh-hub never aggregates them.
