# AGENTS.md

dsh-hub is a pointer-only repository: no first-party source code, no plugins
in-tree. Its substance is a curated set of git submodules under
`plugins/<category>/<name>` and a pinned `deepseek-harness/` submodule. Every
change is a pointer bump, a new submodule, or documentation.

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
- The new module's repository must declare `dsh` manifest fields the same way
  any installable dsh bundle does. Bare imports without a `dsh.bundle` patch
  load as a plain dependency and warn at install time; that is a deliberate
  fallback, not a normal state for a hub plugin.
- Adding the submodule does not install the plugin into any profile. Users
  install via `dsh plugin add <path-or-github-spec>`.
- Every plugin needs a short README entry in `plugins/<category>/` (or the
  plugin's own README linked from the root index) declaring: capability,
  config schema, events emitted or consumed, and the upstream tracker.

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