# modlens

[English](README.md) | 中文

面向文本模型的视觉桥接插件 — 在 DeepSeek Harness 中直接粘贴图片，返回结构化证据。

> 高星精选插件 `dsh-hub/plugins/vision/modlens`（上游 `https://github.com/liustack/modlens`）。独立仓库，与 DeepSeek 无官方关系。

## 能力

- 为纯文本 DeepSeek/GLM 路由提供“看图”能力：粘贴即通过 `modlens_read_image` 工具转为结构化证据
- 六内置提供方 + 四可复用 CLI（`gemini-api` / `openai` / `anthropic` / `antigravity-cli` / `claude-cli` / `kimi-cli` + Codex/OpenCode/Pi/Grok 复用），单链 failover
- `modlens recover-paste` 从会话存储恢复粘贴图片字节

## 配置

分层配置：CLI 旗标 > `~/.modlens/config.json` > 内置。`cordis.patch.yml` 仅注册 `modlens`。

```yaml
- insert:
    - id: modlens
      name: '@liustack/modlens'
```

常用命令见英文版 `Config` 与上游 `skills/modlens/references/configure.md`。

## 事件

- 不消费/产生 Harness 会话事件；图像通过 `recoverPaste` 适配器到达，`dsh/client.js` 注入上下文

## 安装

使用全新 profile `tmp` 验证（AGENTS.md:112）。

```sh
# GitHub（拉源码，需首次 allowBuilds）
dsh plugin --profile tmp add github:liustack/modlens
# 可信安装 pin commit
dsh plugin --profile tmp add github:liustack/modlens#<sha>

# npm（已含构建产物）
dsh plugin --profile tmp add @liustack/modlens
dsh plugin --profile tmp add @liustack/modlens@3.22.1

# 本地（从 dsh-hub 根）
dsh plugin --profile tmp add ./plugins/vision/modlens
```

验证：

```sh
dsh --profile tmp --dump-config  # 须包含 "# == modlens"
modlens doctor --json
```

上游 skill 安装：`npx skills add liustack/modlens -g`

## 版本

- 上游 `modlens@3.22.1`
- deepseek-harness `0.1.0-rc.8`–`0.1.1-rc.2`，Node `>=22.19`

## 上游跟踪

- 上游：`https://github.com/liustack/modlens`（`main`，`dsh-hub` 中 `plugins/vision/modlens` 子模块）
- Harness 上游：`https://github.com/deepseek-ai/deepseek-harness` `branch = master`
