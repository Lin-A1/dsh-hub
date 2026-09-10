# mirage

[English](README.md) | 中文

面向 AI Agent 的统一虚拟文件系统 — 将 S3 / Drive / Slack / Gmail / Redis 等约 50 个后端挂载为单一文件系统。

> 高星精选 `dsh-hub/plugins/sandbox/mirage`（上游 `https://github.com/strukto-ai/mirage`）。

## 能力

- 单一文件系统语义替代多 SDK/MCP；跨后端 `grep -rln`、管道、脚本执行
- DSH 提供方 `@struktoai/mirage-dsh`：替换 `ctx.fs` / `ctx.shell`，支持 `mounts` 与 `runtimes`（`mounts: { /tmp: ram }`）

## 配置

见英文版 `Config`。关键 `mounts`（资源名/mode/config，`!!js` 取环境变量）与 `runtimes`、`cache`（index TTL 10m，file 512 MB，可 Redis）。

## 事件

- 消费 `fs`/`shell` 缝，产出走原有工具结果通道；`snapshot/load` 为 workspace 级

## 安装

使用全新 profile `tmp` 验证（AGENTS.md:112）。

```sh
# npm（DSH 适配器）
dsh plugin --profile tmp add @struktoai/mirage-dsh

# GitHub（monorepo 根）
dsh plugin --profile tmp add github:strukto-ai/mirage
dsh plugin --profile tmp add github:strukto-ai/mirage#<sha>

# 本地（从 dsh-hub 根）
dsh plugin --profile tmp add ./plugins/sandbox/mirage
dsh plugin --profile tmp add ./plugins/sandbox/mirage/typescript/packages/dsh
```

验证：

```sh
dsh --profile tmp --dump-config  # 须包含 mirage 层
```

## 版本

- 上游 `mirage` monorepo，`typescript/packages/dsh@0.0.1`
- deepseek-harness `0.1.0-rc.6`–`0.1.1-rc.2`，Node `>=20.10.0`

## 上游跟踪

- 上游：`https://github.com/strukto-ai/mirage`（`main`，`dsh-hub` 中 `plugins/sandbox/mirage` 子模块）
- DSH 适配器：`typescript/packages/dsh`
- Harness 上游：`https://github.com/deepseek-ai/deepseek-harness` `branch = master`
