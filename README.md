# dsh-hub

A plugin hub for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

This repository pins the official harness as a git submodule and groups our
plugins (and selectively curated third-party plugins) by capability family.
Each plugin lives as its own submodule under `plugins/<category>/<name>`, so
each plugin stays an independent versionable unit.

## Layout

```
dsh-hub/
鈹溾攢鈹€ deepseek-harness/   # Official harness, tracked on master (see Submodules)
鈹溾攢鈹€ packagers/dsh-packager # Desktop packager 鈥?specify DSH_DIR, out-of-box installer (see Releases)
鈹斺攢鈹€ plugins/
    鈹溾攢鈹€ llm/ shell/ fs/ sandbox/ subprocess/ terminal/ lsp/
    鈹溾攢鈹€ web/ subagent/ workflow/ jobs/ skill/ compaction/
    鈹斺攢鈹€ guard/ todo/ plan/ goal/ hooks/ settings/ credentials/
```

## Desktop packager (out-of-box, multi-DSH)

`packagers/dsh-packager` is a non-invasive packager: point `DSH_DIR` at **any** `deepseek-harness` checkout/tag and get a desktop installer without patching `dsh`. Plugin hot-plug (`dsh plugin add`) stays via `~/.dsh`.

```sh
npm --prefix packagers/dsh-packager install
npm --prefix packagers/dsh-packager run build -- --dsh-dir deepseek-harness          # master HEAD, e.g. 0.1.0-rc.8
npm --prefix packagers/dsh-packager run build -- --dsh-dir /tmp/dsh-rc7              # specific tag
npm --prefix packagers/dsh-packager run dist:win  # or dist / npx electron-packager
```

Icons from `deepseek-harness/apps/web/public/favicon.svg` 鈫?`packagers/dsh-packager/build/icon.*`, frameless `frame:false` + `Tray` (close hides to tray, double-click restores).

Different `DSH` versions are supported: `scripts/build.mjs` prints `@deepseek-ai/dsh-root@x.y.z` and copies that version's `resources/dsh/package.json` into the app. `dsh-hub`'s `deepseek-harness` tracks `master`, but `DSH_DIR` can override to any tag/commit.

**Downloads (with DSH version in Notes)**

- dsh-packager: https://github.com/Lin-A1/dsh-packager/releases 鈥?`dsh-desktop-win32-x64.zip` (portable, `dsh-desktop.exe`) + `dsh-desktop Setup 0.1.0.exe` (NSIS, needs admin/Developer Mode for `winCodeSign`)
- dsh-hub re-export: https://github.com/Lin-A1/dsh-hub/releases 鈥?same artifacts, `packagers/dsh-packager` pointer

Each `Release` notes the bundled `DSH` version, e.g. `DSH @deepseek-ai/dsh-root@0.1.0-rc.8`.

A plugin goes under the category its capability belongs to, regardless of who
maintains it. Categories mirror the official
[packages/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/README.md)
group list.

## Submodules

`deepseek-harness` tracks the upstream `master` branch. The current pointer is
pinned to whatever master HEAD is at clone time; bump it by:

```sh
git submodule update --remote deepseek-harness
git add deepseek-harness
git commit -m "chore: bump deepseek-harness"
```

Plugins are independent submodules pinned to their own default branches (or a
specific commit/tag at your discretion).

## Cloning

```sh
git clone --recursive https://github.com/Lin-A1/dsh-hub.git
```

If you already cloned without `--recursive`:

```sh
git submodule update --init --recursive
```

## Adding a plugin

For a plugin you maintain:

```sh
# inside the harness submodule, if your plugin depends on packages/
git submodule add https://github.com/<your-org>/<your-plugin>.git \
  plugins/<category>/<your-plugin>
git commit -m "feat: add <your-plugin> under plugins/<category>/"
```

For a third-party plugin:

```sh
git submodule add https://github.com/<owner>/<plugin>.git \
  plugins/<category>/<plugin>
```

The category is determined by what the plugin provides 鈥?for example, an LLM
adapter goes under `plugins/llm/`, a shell executor under `plugins/shell/`.
See [plugins/README.md](plugins/README.md) for the full category table.

## Using the plugins

The plugins in this repo are meant to be installed into a
[profile](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md#profiles-and-bundles)
on a real dsh deployment:

```sh
dsh plugin --profile <name> add ./deepseek-harness/plugins/<category>/<plugin>
```

(or `add github:<owner>/<plugin>` for a direct-from-GitHub install).

## Building the harness from source

```sh
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

See the official
[README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)
for the full toolchain and test commands.

## Updating everything

```sh
git submodule update --remote --recursive
```

Then commit any pointer bumps.

## Conventions

- Each plugin is its own npm package with its own `dsh` manifest, not a
  monorepo addition to `deepseek-harness/`.
- Plugin READMEs declare their capability, config schema, and the events they
  emit or listen to.
- This repository itself ships no code 鈥?it is a pointer index.

## Learning wiki (dsh internals & LLM knowledge)

A step-by-step technical wiki explaining how dsh is built and the LLM
knowledge behind it, aimed at AI application developers. First installment —
**how images reach the model** (normalization, deterministic projection cache,
Files API vs base64, budget gates, history context management), with a
four-way comparison against opencode, OpenAI Codex, and Claude Code:

- [docs/dsh-image-pipeline-wiki.md](docs/dsh-image-pipeline-wiki.md) (Markdown)
- [docs/dsh-image-pipeline-wiki.html](docs/dsh-image-pipeline-wiki.html) (HTML)
- [docs/dsh-image-pipeline-wiki.pdf](docs/dsh-image-pipeline-wiki.pdf) (PDF)

## License

Plugins retain their own licenses. See each plugin's repository.