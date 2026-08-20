# plugins

Plugin collections grouped by capability family. Categories mirror the official
deepseek-harness package groups ([packages/README.md](../../packages/README.md)).

Each directory holds one git submodule per plugin — your own and third-party
plugins sit side by side under the category their capability belongs to.

| Category | What belongs here |
|---|---|
| `llm/` | LLM adapters, model providers, retry/token-meter |
| `shell/` | Bash/PowerShell executors, shell model-facing tools |
| `fs/` | Filesystem providers, file tools, search/editor tools |
| `sandbox/` | Process-confinement backends, approval/permission policy |
| `subprocess/` | Subprocess providers, process-tree execution |
| `terminal/` | Persistent PTY sessions and tools |
| `lsp/` | Language-server seam, stdio providers, lsp tool |
| `web/` | Search/fetch providers and model-facing web tools |
| `browser/` | Browser automation: page control, snapshots, interaction, screenshots |
| `subagent/` | Sub-agent provider registry and delegation tools |
| `workflow/` | Workflow seam, worker-thread engines, workflow/ralph tools |
| `jobs/` | Background-job runtime and job_* tools |
| `skill/` | Skill provider registry, catalog/loader tools |
| `compaction/` | Compaction seam and providers |
| `guard/` | Loop-hygiene: repeat-call reminders, tool deadlines |
| `todo/` | todo_write tool |
| `plan/` | Plan-mode state and commands |
| `goal/` | Same-session goal persistence |
| `hooks/` | Claude Code / Codex hook bridges |
| `settings/` | User-settings providers |
| `credentials/` | Credential-reference providers |
