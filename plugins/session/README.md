# session

Session-scoped plugins: conversation-history manipulation and durable session
behaviors, aligned with the upstream `deepseek-harness/packages/session` group.

| Plugin | Capability |
|---|---|
| [`dsh-session-rewind`](https://github.com/Lin-A1/dsh-session-rewind) | One-click rewind to the previous message: a web-client button (in ui-conversation's assistant-actions slot) that forks a child session cut to just before the addressed turn — the only append-only-compatible way to clip history |
