# dsh-hub

DeepSeek Harness plugin hub — the official harness plus capability-family plugin collections.

## Structure

```
dsh-hub/
├── deepseek-harness/   # Official harness (git submodule, pinned to a release tag)
└── plugins/            # Plugin collections, grouped by capability family
    ├── llm/            #   LLM adapters and related tools
    ├── shell/          #   Bash/PowerShell executors and tools
    ├── fs/             #   Filesystem providers and read/write/search/edit tools
    ├── sandbox/        #   Sandbox backends and approval/permission policy
    ├── subprocess/     #   Subprocess execution providers
    ├── terminal/       #   Persistent PTY
    ├── lsp/            #   Language-server tools
    ├── web/            #   Search/fetch providers and tools
    ├── subagent/       #   Sub-agent providers and delegation tools
    ├── workflow/       #   Workflow engines and tools
    ├── jobs/           #   Background jobs and job_* tools
    ├── skill/          #   Skill providers and tools
    ├── compaction/     #   Context compaction
    ├── guard/          #   Loop hygiene and timeout policy
    ├── todo/           #   todo_write tool family
    ├── plan/           #   Plan-mode
    ├── goal/           #   Same-session goal persistence
    ├── hooks/          #   Claude Code / Codex hook bridges
    ├── settings/       #   User-settings providers
    └── credentials/    #   Credential-reference providers
```

A plugin goes under the category its capability belongs to, regardless of who maintains it.

## Getting started

```sh
git clone --recursive https://github.com/Lin-A1/dsh-hub.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## Adding a plugin

Each plugin is a git submodule inside its category directory:

```sh
git submodule add https://github.com/<owner>/<plugin>.git plugins/<category>/<plugin>
```

Pin the official harness to a release: `cd deepseek-harness && git checkout <tag> && cd .. && git add deepseek-harness`.

## Updating everything

```sh
git submodule update --remote --recursive
```
