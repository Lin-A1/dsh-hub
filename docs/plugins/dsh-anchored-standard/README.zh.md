# dsh-anchored-standard

[English](README.md) | 中文

面向 DeepSeek Harness 的实验性 Agent 预设族 — 基于 Minimal 条件锚定轨迹，首个持久信号后提升至驻留目录，按需解锁更重的 Standard 工具。

> 高星精选 `dsh-hub/plugins/skill/dsh-anchored-standard`（上游 `https://github.com/xiaobright/dsh-anchored-standard`）。社区项目，非 DeepSeek 官方。

## 能力

见英文版 `Capability` 表。`preset/` 为基座（Minimal 对 + 发现工具），`zero-anchored-standard` / `whoami-standard` / `prefab` / `eternal-minimal` / `wire-think-standard` / `combo-anchored` 为变体。

## 配置

所有旋钮为各模式 `agent.cordis.yml` 行。`context-gate` 首行、`tool-bootstrap` 次行，详见英文版 `Config` 表。

## 事件

- 提升由持久会话事件（`tool/call` / `assistant/message`）派生，`compaction/end` 重关门
- Waterfall：`systemPrompt/assemble`、`agent/pre-step`、`tools/pre-execute` 等

## 安装

预设通过复制目录安装，非 npm `dsh plugin`。

```sh
git clone --recursive https://github.com/Lin-A1/dsh-hub.git
# 或
git clone https://github.com/xiaobright/dsh-anchored-standard.git

# 安装 preset 到 DSH 预设根
cp -R preset ~/.dsh/.agent-presets/anchored-standard
```

重启 DSH，创建空白会话并选择 **Anchored Standard (experimental)**。

Hub 侧三路径映射（AGENTS.md:112）：

```sh
# GitHub（源码）
dsh plugin --profile tmp add github:xiaobright/dsh-anchored-standard
dsh plugin --profile tmp add github:xiaobright/dsh-anchored-standard#<sha>

# npm（预设为文件复制，无 bundle 发布；占位验证）
dsh plugin --profile tmp add dsh-anchored-standard

# 本地（hub 子模块）
dsh plugin --profile tmp add ./plugins/skill/dsh-anchored-standard
```

验证：导出会话 JSONL，`request/header` 首条 `tools: ["bash","str_replace_editor"]` 且无 AGENTS.md 注入，第二条为驻留目录。

## 版本

- deepseek-harness `0.1.0-rc.5`，Node 24
- 预设为 Standard 组合快照，破坏性变更需重新审查上游

## 上游跟踪

- 上游：`https://github.com/xiaobright/dsh-anchored-standard`（`main`，`dsh-hub` 中 `plugins/skill/dsh-anchored-standard` 子模块）
- 伴生研究：`https://github.com/0liveiraaa/DeepseekCotexplorations`
- Harness 上游：`https://github.com/deepseek-ai/deepseek-harness` `branch = master`
