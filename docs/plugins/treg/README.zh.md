# treg

[English](README.md) | 中文

OpenRouter for Tools — 为 Agent 提供统一工具网关，约 2,800 个端点跨 56 家提供方，按次计费，外加团队自有密钥/Skill/CLI 的无感共享。

> 高星精选 `dsh-hub/plugins/web/treg`（上游 `https://github.com/superdesigndev/treg`）。

## 能力

- **目录**（平台密钥，按次计费）：~2,800 端点，`402` 带余额/预估/充值链接
- **自有工具**（团队密钥优先，永不计费）：`endpoint`（含多绑定注入）/ `CLI` / `Skill`，代理仅中继并服务端注入凭据
- **DSH 集成**（`treg-dsh`）：`treg-skill`（`ctx.skills` 发布 `SKILL.md`，常开）+ `treg-mcp`（`TREG_TOKEN` 为空时禁用，`https://treg.to/mcp/`，`mcp__treg__*`）

## 配置

见英文版 `Config`。关键 `TREG_TOKEN` 环境变量控制 `treg-mcp` 启用；服务端 `TREG_*`（DB `TREG_DATABASE_URL`、Fernet `TREG_SECRET_KEY` 等）见英文版表。

`dsh/cordis.patch.yml` 含两行：`treg-skill` 与 `treg-mcp`（`disabled: !!js (process.env.TREG_TOKEN ?? '') === ''`）。

## 事件

- `CallRecord` 审计（fire-and-forget）；健康检查（OAuth 刷新、webhook）
- DSH 侧 `ctx.skills` 与 MCP client 缝

## 安装

使用全新 profile `tmp` 验证（AGENTS.md:112）。

```sh
# npm（DSH bundle）
dsh plugin --profile tmp add treg-dsh
dsh plugin --profile tmp add @superdesign/treg

# GitHub（需首次 allowBuilds）
dsh plugin --profile tmp add github:superdesigndev/treg
dsh plugin --profile tmp add github:superdesigndev/treg#<sha>

# 本地（从 dsh-hub 根）
dsh plugin --profile tmp add ./plugins/web/treg
```

`dsh plugin add` 后在 profile 环境设置 `TREG_TOKEN` 并重启，工具以 `mcp__treg__*` 出现。

验证：

```sh
dsh --profile tmp --dump-config  # 须包含 treg-skill / treg-mcp
```

## 版本

- 上游 `treg-dsh@0.12.0`，`USAGE.md` 为 CLI 全表
- deepseek-harness `master`，Node `>=20`，Python `>=3.11`（服务端）

## 上游跟踪

- 上游：`https://github.com/superdesigndev/treg`（`main`，`dsh-hub` 中 `plugins/web/treg` 子模块）
- DSH bundle：`dsh/cordis.patch.yml`（`treg-skill` + `treg-mcp`）
- Harness 上游：`https://github.com/deepseek-ai/deepseek-harness` `branch = master`
