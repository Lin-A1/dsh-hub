# memory

Long-term memory and context bundles for agent sessions — recall that survives
the turn, and the capture that fills it.

| Plugin | Capability |
|---|---|
| [`memos`](https://github.com/MemTensor/MemOS) | MemOS v2 Stardust (★ 10k+, Apache-2.0): a graph-structured memory store with multi-cube KBs, multi-modal and tool memory. The DSH adapter gives a session bounded automatic recall per accepted user turn, background capture at turn end, hybrid retrieval, host-LLM delegation when no MemOS provider is configured, and an in-process Memory Viewer on `127.0.0.1:18801`; six model-facing `memos_*` tools. Hub-side entry: [docs/plugins/memos/README.md](../../docs/plugins/memos/README.md) |

Upstream tracker: [MemTensor/MemOS](https://github.com/MemTensor/MemOS). Third-party; curated here, maintained upstream.
