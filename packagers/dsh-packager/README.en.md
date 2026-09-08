# dsh-packager — DeepSeek Harness Desktop Packager

English | [中文](README.md)

> One-click produces a ready-to-use desktop installer from an external `DSH_DIR` without patching `deepseek-harness` sources; the bundle keeps `dsh plugin add` hot-plug.

- **Zero intrusion**: read-only copy of built `apps/cli/lib` + `apps/web/dist` from external `DSH_DIR` into `resources/dsh` (`extraResources`, outside `asar`) `scripts/build.mjs:1`.
- **Hot-plug preserved**: `resources/dsh` outside `asar`, `DSH_HOME` stays `~/.dsh` `deepseek-harness/packages/util/home-paths/src/index.ts:87`, `healProfilesModuleFallback`/`reconcilePlugins` still resolve from `profile/node_modules`.
- **Frameless + tray**: `frame:false` `titleBarOverlay:#0f0f0f`, `Tray` double/single-click to show, `close` hides to tray `src/main.mjs:1`.
- **Native icons**: rendered from `deepseek-harness/apps/web/public/favicon.svg` via `sharp` to `build/icon.png/.ico/.icns` `scripts/generate-icons.mjs:1`.
- **Single window**: `createWindow` singleton, `did-fail-load` retry 30 times.

## Quick Start

```sh
# 1. Install packager deps (npm recommended to avoid pnpm electron placeholder)
npm install
# or pnpm install (needs node-linker=hoisted, see .npmrc)

# 2. Build dsh first (skip if lib/dist already built)
pnpm --dir <DSH_DIR> run build
# DSH_DIR is deepseek-harness checkout (dsh-hub's submodule or standalone)

# 3. Copy dsh artifacts into packager
npm run build -- --dsh-dir <DSH_DIR>
# equivalent DSH_DIR=<DSH_DIR> npm run build
# --skip-build to skip step 2 and only copy

# 4. Produce
npm run dist:win   # Windows NSIS, requires admin/developer mode
npm run dist       # current platform
# unpacked:
npx electron-packager . dsh-desktop --platform=win32 --arch=x64 --out=dist --overwrite --asar
# dist/dsh-desktop-win32-x64/dsh-desktop.exe or dist/*.exe
```

`--dsh-dir` accepts absolute/relative, default `../deepseek-harness`. `resources/dsh` is gitignored.

## Icons

```sh
node scripts/generate-icons.mjs
# deepseek-harness/apps/web/public/favicon.svg → build/icon.png(512) + icon.ico + icon.icns
```

## Tray & Window

- Close → hide to tray; tray double/single-click restores; menu `Show Window` / `Exit`.
- `frame:false` frameless, `titleBarOverlay` keeps Windows 11 controls; drag needs `-webkit-app-region: drag` (28px overlay).
- Singleton `BrowserWindow`, `app.on('activate')` only `show()`, `window-all-closed` does not quit.

## Different DSH Versions

Packager is not bound to a `deepseek-harness` version; `DSH_DIR` can point to any checkout, `scripts/build.mjs` prints `@deepseek-ai/dsh-root` version.

```sh
npm run build -- --dsh-dir ../deepseek-harness          # master HEAD (0.1.0-rc.8)
git clone https://github.com/deepseek-ai/deepseek-harness.git --branch v0.1.0-rc.7 /tmp/dsh-rc7
pnpm --dir /tmp/dsh-rc7 run build
npm run build -- --dsh-dir /tmp/dsh-rc7
```

`dsh-hub`'s `deepseek-harness` submodule tracks `master` `AGENTS.md:3`, `DSH_DIR` can override to any version.

## Principle

```
External DSH_DIR (any version)
  pnpm run build → apps/cli/lib + apps/web/dist
        ↓ scripts/build.mjs --dsh-dir
packagers/dsh-packager/resources/dsh (extraResources, outside asar)
        ↓ electron-builder / electron-packager
dist/win-unpacked or dist/dsh-desktop-win32-x64
```

## Requirements

- Node `^22.19 || >=24`, `pnpm@11.7.0` or `npm`
- `apps/cli/lib/bin.js` + `apps/web/dist` already built

## FAQ

- **electron-builder `Cannot create symbolic link` (winCodeSign)**: enable Developer Mode or run as admin.
- **`pnpm install` electron missing**: use `npm install` or `.npmrc: node-linker=hoisted`.
- **`Cannot compute electron version`**: pin `electron` to `32.2.0`, not `^`.
