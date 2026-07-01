# Agent Instructions

This repo is `code-airlock`: a small Bash wrapper around Docker Sandboxes for running coding agents in disposable microVMs.

## Working Rules

- Keep the tool dependency-light. Do not add package managers, build systems, or new runtime dependencies unless explicitly requested.
- Prefer small, reviewable Bash changes in `code-airlock`.
- Keep docs in `README.md` aligned with script behavior.
- Do not change security defaults casually. Explain any change to network policy, credential handling, clone mode, or sandbox deletion behavior.
- Do not push to GitHub or publish releases unless explicitly asked.

## Verification

After editing the wrapper, run:

```bash
bash -n code-airlock
shellcheck code-airlock
./code-airlock help
```

For docs-only changes, at least check for stale command names:

```bash
rg -n "claude-sbx|code-airlock|sbx " README.md code-airlock sandbox.conf.example AGENTS.md
```

## Sandbox Workflow

The agent works in Docker Sandboxes clone mode. Commit any finished edits inside the sandbox so the host can retrieve them with:

```bash
code-airlock fetch
code-airlock diff
code-airlock merge
```

If work is not committed in the sandbox, it will not come back through the normal fetch/diff/merge workflow.
