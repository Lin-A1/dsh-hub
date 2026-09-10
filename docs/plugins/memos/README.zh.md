# memos

[English](README.md) | 中文

MemOS v2 星尘 — 面向 LLM 与 AI Agent 的记忆操作系统。DSH 适配器（`@memtensor/memos-local-plugin`）提供有界主动召回、后台捕获、混合检索与本地记忆面板。

> 高星精选 `dsh-hub/plugins/memory/memos`（上游 `https://github.com/MemTensor/MemOS`）。

## 能力

- 统一记忆 API（图结构，可检视）
- DSH 侧：每轮用户直发消息的一次有界召回（`min(recallTimeoutMs,3000)`）、后台捕获、复用 DSH 的 `llm` 服务、本地 Viewer `127.0.0.1:18801`、六个 `memos_*` 工具

## 配置

见英文版 `Config`。关键 `recallEnabled/captureEnabled/toolsEnabled/hostLlmEnabled/viewerEnabled/recallTimeoutMs/contextMaxChars` 等，`home` 解析优先级见英文版。

## 事件

- 消费 `agent/pre-step`、`turn/end`、`session/flush`（非屏障）、Cordis dispose
- 产出 `plugin/memos-local-memory/recall` 的 `memos_context`

## 安装

使用全新 profile `tmp` 验证（AGENTS.md:112）。

```sh
# 一键安装（推荐，macOS/Linux）
curl -fsSL https://raw.githubusercontent.com/MemTensor/MemOS/main/apps/memos-local-plugin/install.sh \
  | bash -s -- --agent dsh --profile tmp --version 2.0.16

# npm
dsh plugin --profile tmp add @memtensor/memos-local-plugin
dsh plugin --profile tmp add @memtensor/memos-local-plugin@2.0.16

# GitHub
dsh plugin --profile tmp add github:MemTensor/MemOS
dsh plugin --profile tmp add github:MemTensor/MemOS#<sha>

# 本地（从 dsh-hub 根）
dsh plugin --profile tmp add ./plugins/memory/memos
dsh plugin --profile tmp add ./plugins/memory/memos/apps/memos-local-plugin
```

验证：

```sh
dsh --profile tmp --dump-config  # 须包含 memos-local-memory
```

## 版本

- 上游 `MemOS@2.0`，`apps/memos-local-plugin@2.0.16-beta.1`
- deepseek-harness `0.1.0-rc.5`/`0.1.0-rc.6`，Node `^22.19.0 || >=24.0.0`

## 上游跟踪

- 上游：`https://github.com/MemTensor/MemOS`（`main`，`dsh-hub` 中 `plugins/memory/memos` 子模块）
- DSH 适配器：`apps/memos-local-plugin/adapters/deepseek-harness`
- Harness 上游：`https://github.com/deepseek-ai/deepseek-harness` `branch = master`
