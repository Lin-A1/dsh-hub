# dsh-packager — DeepSeek Harness 桌面打包器

[English](README.en.md) | 中文

> 指定 `DSH_DIR` 一键产出开箱即用的桌面安装包，不侵入 `deepseek-harness` 源码；打包后仍保留 `dsh plugin add` 热插拔。

- **零侵入**：只读外部 `DSH_DIR` 的已构建产物 `apps/cli/lib` + `apps/web/dist`，拷贝到 `resources/dsh`（`extraResources`，`asar` 外）`scripts/build.mjs:1`。
- **插件热插拔保留**：`resources/dsh` 在 `asar` 外，`DSH_HOME` 仍走默认 `~/.dsh` `deepseek-harness/packages/util/home-paths/src/index.ts:87`，`healProfilesModuleFallback`/`reconcilePlugins` `deepseek-harness/apps/cli/src/profile-boot.ts:99` `plugin.ts:59` 仍从 `profile/node_modules` 解析。
- **无边框 + 托盘常驻**：`frame:false` `titleBarOverlay:#0f0f0f` 去边框，`Tray` 双击/单击显示，`close` 隐藏到托盘而非退出 `src/main.mjs:1`；`退出` 菜单才真正 `app.quit()` 并 `kill dsh`。
- **原生图标**：由 `deepseek-harness/apps/web/public/favicon.svg` 经 `sharp` 渲染 `build/icon.png/.ico/.icns` `scripts/generate-icons.mjs:1`，`BrowserWindow`/`Tray`/`electron-builder.yml:18` 共用。
- **单窗口防抖**：`createWindow` 单例，`did-fail-load` 重试 30 次而非 `data:text/html` 无限刷新 `src/main.mjs:1`。

## 快速开始

```sh
# 1. 安装打包器依赖（建议 npm，避免 pnpm 的 electron 占位）
npm install
# 或 pnpm install（需 node-linker=hoisted，已配 .npmrc）

# 2. 先构建 dsh（若已有 lib/dist 可跳过）
pnpm --dir <DSH_DIR> run build
# DSH_DIR 为 deepseek-harness 检出（dsh-hub 的 deepseek-harness submodule 或独立检出）

# 3. 拷贝 dsh 产物到打包器
npm run build -- --dsh-dir <DSH_DIR>
# 等价 DSH_DIR=<DSH_DIR> npm run build
# --skip-build 跳过上一步的 pnpm build，仅拷贝

# 4. 产出
npm run dist:win   # Windows NSIS，需管理员/开发者模式（winCodeSign symlink）
npm run dist       # 当前平台
# 解压即用（免安装）：
npx electron-packager . dsh-desktop --platform=win32 --arch=x64 --out=dist --overwrite --asar
# 产物 dist/dsh-desktop-win32-x64/dsh-desktop.exe 或 dist/*.exe
```

`--dsh-dir` 支持绝对/相对路径，默认 `../deepseek-harness`。`resources/dsh` 在 `.gitignore`，不提交。

## 图标

```sh
node scripts/generate-icons.mjs
# 输入 deepseek-harness/apps/web/public/favicon.svg → build/icon.png(512) + icon.ico(16-512) + icon.icns
```

`build/` 为 `electron-builder.yml:3` 的 `buildResources`，`win/mac/linux` 的 `icon` 均指向它。

## 托盘与窗口

- 关闭按钮 → 隐藏到托盘，`Tray` 常驻；双击/单击托盘恢复，右键菜单 `显示窗口` / `退出`。
- `frame:false` 去边框，`titleBarOverlay` 在 Windows 11 保留窗口控制按钮；拖动需 `-webkit-app-region: drag`（已在 overlay 高度 28px 内）。
- 单例 `BrowserWindow`，`app.on('activate')` 仅 `show()`，`window-all-closed` 不退出，`before-quit` 才 `kill dsh`。

## 不同版本 DSH

打包器不绑定 `deepseek-harness` 版本，`DSH_DIR` 指向任意检出即可，`scripts/build.mjs` 会读取并打印 `@deepseek-ai/dsh-root` 版本 `scripts/build.mjs:1`，拷贝的 `resources/dsh/package.json` 即该版本。

```sh
# 用 dsh-hub 自带的 deepseek-harness（跟随 master，当前 0.1.0-rc.8）
npm run build -- --dsh-dir ../deepseek-harness

# 用指定 tag / 分支 / commit
git clone https://github.com/deepseek-ai/deepseek-harness.git --branch v0.1.0-rc.7 /tmp/dsh-rc7
pnpm --dir /tmp/dsh-rc7 run build
npm run build -- --dsh-dir /tmp/dsh-rc7
# 产物的 resources/dsh/package.json 即 0.1.0-rc.7，安装包文件名仍为 packager 的 0.1.0（可在 electron-builder.yml 改 productName/version 区分）

# 用本地开发版
npm run build -- --dsh-dir G:\Code\Agents\Custom\dsh-hub\deepseek-harness --skip-build
```

`dsh-hub` 的 `deepseek-harness` submodule 跟踪 `master` `AGENTS.md:3`，`packagers/dsh-packager` 的 `DSH_DIR` 可覆盖为任意版本，互不侵入。

| DSH 版本 | DSH_DIR 示例 | 说明 |
|---|---|---|
| `master HEAD` (`0.1.0-rc.8`) | `../deepseek-harness` | dsh-hub 自带，默认 |
| `v0.1.0-rc.7` | `/tmp/dsh-rc7` | 旧 tag 验证 |
| 本地改动 | `G:\path\to\dsh` | 开发版，`--skip-build` 仅拷 `lib/dist` |

## 原理

```
外部 DSH_DIR (deepseek-harness, 任意版本)
  pnpm run build → apps/cli/lib + apps/web/dist
        ↓ scripts/build.mjs --dsh-dir（读取并打印 dsh 版本）
packagers/dsh-packager/resources/dsh (extraResources, asar 外)
        ↓ electron-builder / electron-packager
dist/win-unpacked 或 dist/dsh-desktop-win32-x64
```

`DSH_HOME` 默认 `~/.dsh`，已装 `dsh` 的用户无感；隔离用 `DSH_HOME=%APPDATA%\dsh-desktop` 启动。不同 `DSH` 版本的 `profile` 兼容由 `deepseek-harness` 自身保证（`SESSION_FORMAT_VERSION` 未变则直接共享 `~/.dsh`）。

## 下载

- **dsh-packager**：https://github.com/Lin-A1/dsh-packager/releases
  - `dsh-desktop-win32-x64.zip` 解压即用（`dsh-desktop.exe`，含当前 `DSH` 版本的 `resources/dsh`）
  - `dsh-desktop Setup 0.1.0.exe` NSIS 安装包（需管理员/开发者模式，`winCodeSign`）
  - 各 `Release` 的 `Notes` 标注 `DSH` 版本（`@deepseek-ai/dsh-root@x.y.z`）
- **dsh-hub** 复导出：https://github.com/Lin-A1/dsh-hub/releases（同上，顶层 `packagers/dsh-packager` 指针）

## 要求

- Node `^22.19 || >=24`，`pnpm@11.7.0`（与 harness 一致）或 `npm`（推荐，避免 pnpm 的 `electron` 占位）
- `pnpm --dir <DSH_DIR> run build` 已产 `apps/cli/lib/bin.js` + `apps/web/dist`（`electron-builder` 需 `build/icon.*`，已生成）

## 常见问题

- **electron-builder 报 `Cannot create symbolic link`（winCodeSign）**：Windows 需管理员或开启 `设置 > 系统 > 开发者选项 > 开发人员模式`。
- **`pnpm install` 后 `electron` 找不到**：`pnpm` 的 `electron` 在 `node_modules/electron` 为占位，改用 `npm install` 或已配 `.npmrc: node-linker=hoisted` 后重装。
- **`electron-builder` 报 `Cannot compute electron version`**：`package.json` 的 `electron` 需固定版本 `32.2.0`（已 fix），勿用 `^`。
