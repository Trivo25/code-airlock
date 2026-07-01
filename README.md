# code-airlock

Run Claude Code, Codex, OpenCode, or another coding agent inside a disposable microVM, with its work committed to git so you can review everything from your host.

This is a thin wrapper around [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Docker Sandboxes already provides the hard part: each sandbox runs in its own lightweight virtual machine with its own kernel and Docker daemon, so an agent running with permissions disabled can install packages, run commands, and spin up containers without touching your host. This script makes the secure setup the default and reduces it to a handful of commands.

## Why a microVM and not just a container

A coding agent with permissions disabled will, if a task calls for it, reason its way around application-level guardrails. There are documented cases of an agent bypassing a denylist and then disabling the OS sandbox that caught it, purely to finish the job. OS-level sandboxes (Seatbelt, bubblewrap) and deny rules are useful for reducing prompts, but the boundary an agent inside cannot open is the hypervisor. Docker Sandboxes puts that boundary between the agent and your machine, which is why it's the right base for fully unattended runs.

Code Airlock adds three things on top:

- **Clone mode by default**, so the agent commits to a private clone and your repo stays mounted read-only. You review its work with a normal `git fetch`.
- **A network allowlist**, so under lockdown the sandbox can reach only the hosts you name (your model API, GitHub, your package registries) and nothing else.
- **Short verbs** for the daily loop: start, shell in, fetch, diff, merge, tear down.

## Requirements

- **macOS**: Apple Silicon.
- **Linux**: KVM enabled (`lsmod | grep kvm` should show output).
- **Windows**: Windows 11 with the Hypervisor Platform feature enabled; run under WSL2.
- Git, and the `sbx` CLI (installed below).

## Install

Install the Docker Sandboxes CLI. On Linux:

```bash
curl -fsSL https://get.docker.com | sudo REPO_ONLY=1 sh
sudo apt-get install docker-sbx
sudo usermod -aG kvm $USER
newgrp kvm
sbx login
```

On macOS and Windows, follow the [official install guide](https://docs.docker.com/ai/sandboxes/get-started/). At first login `sbx` asks you to pick a default network policy; **Balanced** or **Locked Down** is a good starting point for this workflow.

If the global network policy has not been initialized yet, Code Airlock runs `sbx policy init balanced` before starting the sandbox. Override this with `GLOBAL_NETWORK_POLICY=deny-all` or `GLOBAL_NETWORK_POLICY=allow-all`. Per-sandbox allowlists are applied by `lockdown` after the global policy exists.

Then grab this tool:

```bash
git clone https://github.com/Trivo25/code-airlock.git
cd code-airlock
# optional: put it on your PATH
ln -s "$PWD/code-airlock" ~/.local/bin/code-airlock
```

## Quick start

Run it from inside the repo you want the agent to work on. It works on both a fresh repo and an existing one; for a fresh directory it offers to `git init` for you, since clone mode needs a repo.

```bash
cd ~/code/my-project
code-airlock lockdown     # one-time: deny-all network + apply the allowlist
code-airlock up           # start Claude Code in the sandbox
```

Claude Code remains the default because it is the most common unattended workflow today. Pick another supported agent with `AGENT`:

```bash
AGENT=codex code-airlock up
AGENT=opencode code-airlock up
```

On the first run, authenticate the selected agent as described below. Give it a goal, and it works inside the microVM instead of on your host.

While it runs, from your host:

```bash
code-airlock fetch        # pull its commits into the sandbox-<name> remote
code-airlock diff         # fetch, then show the diff against your branch
code-airlock shell        # drop into a shell inside the sandbox to look around
code-airlock net          # see which hosts it reached or was blocked from
```

When you're happy with the work:

```bash
code-airlock merge        # merge the agent's branch into yours
# or handle the sandbox-<name> remote manually with your usual git tools
```

When you're done:

```bash
code-airlock stop         # keep the VM and its commits for later
code-airlock rm           # delete the sandbox (offers to fetch first)
```

## Unattended / headless runs

Pass agent arguments after `--`. Agent CLIs differ, so use the flags for the agent you selected.

For Claude Code, `-p` runs a single headless task:

```bash
code-airlock up -- -p "add pagination to the users endpoint and run the test suite"
```

For Codex, Docker Sandboxes starts Codex with its bypass flags by default. When passing a prompt, lead with the flag if you want to preserve that mode:

```bash
AGENT=codex code-airlock up -- --dangerously-bypass-approvals-and-sandbox "fix the build"
```

OpenCode defaults to a TUI. Use OpenCode's own flags after `--` for session-specific behavior.

## Authentication

Credentials should go through Docker Sandboxes' secret manager or host-side auth flow rather than being copied into the VM.

- **Claude Code**: run `code-airlock up` and use `/login` inside the sandbox, or store an Anthropic key with `sbx secret set -g anthropic`.
- **Codex**: authenticate on the host with `sbx secret set -g openai --oauth`, store an API key with `sbx secret set -g openai`, or export `OPENAI_API_KEY` before launching.
- **OpenCode**: store keys for the providers you use, for example `sbx secret set -g openai`, `sbx secret set -g anthropic`, `sbx secret set -g google`, `sbx secret set -g xai`, `sbx secret set -g groq`, `sbx secret set -g aws`, or `sbx secret set -g openrouter`.

Sandboxes do not carry user-level config such as `~/.claude` or `~/.codex` into the VM by design. Put project-level config in the repo if the agent needs it.

### GitHub credentials

Code Airlock does not need GitHub credentials for the normal review loop. In clone mode, the agent commits inside the sandbox, then your host pulls those commits with:

```bash
code-airlock fetch
code-airlock diff
code-airlock merge
```

Give the sandbox GitHub access only if you want the agent to use `gh`, open pull requests, create issues, or push directly from inside the VM:

```bash
echo "$(gh auth token)" | sbx secret set -g github
```

Global secrets apply when a sandbox is created. For an existing sandbox, either recreate it or scope the token to that sandbox:

```bash
echo "$(gh auth token)" | sbx secret set sandbox-sbx-claude-sbx github
```

If you use SSH remotes, Docker Sandboxes can forward your host SSH agent into the sandbox when `SSH_AUTH_SOCK` is set. The private key stays on the host; sandboxed processes can request signatures but cannot read the key.

## Configuration

Copy `sandbox.conf.example` to `sandbox.conf` and edit. You can set the sandbox name, the agent, the target repo, and the network allowlist. `sandbox.conf` is git-ignored.

The default allowlist covers Anthropic, OpenAI, GitHub, and npm. Add your model provider hosts and package registries (`*.pypi.org`, `static.crates.io`, and so on) as your projects need them. If a download fails, `code-airlock net` shows exactly which host was blocked so you can add it.

```bash
# sandbox.conf
AGENT=codex
ALLOW=api.openai.com,*.openai.com,github.com,*.github.com,registry.npmjs.org,*.npmjs.org
```

## Security notes

- The `lockdown` command sets `deny-all` as the default policy for **all** your sandboxes, then re-adds the allowlist. Revert with `sbx policy reset`.
- Keep the allowlist as narrow as the task allows. The proxy filters on the hostname the client presents and does not inspect TLS, so a broad entry (for example a wildcard you don't need) widens the only remaining exfiltration path. Isolation here is about your machine, not a guarantee against data egress over an allowed host.
- Don't feed the sandbox host credentials you don't want it to have. Give it a repo-scoped token for pushing, not your full SSH agent.
- `code-airlock rm` deletes the clone. Fetch or push anything you want to keep first; the command offers to fetch for you.

## Commands

| Command              | What it does                                                         |
| -------------------- | -------------------------------------------------------------------- |
| `up [-- agent-args]` | Create and start the sandbox in clone mode with the selected agent       |
| `shell`              | Open a shell inside the running sandbox                              |
| `fetch`              | `git fetch` the agent's commits                                      |
| `diff [base]`        | Fetch, then diff `base..sandbox-<name>/base`                         |
| `merge [base]`       | Fetch, then merge the agent's branch into `base`                     |
| `net`                | Show the network log for allowed and blocked hosts                   |
| `stop`               | Stop the sandbox, keeping its VM and commits                         |
| `rm`                 | Remove the sandbox (offers to fetch first)                           |
| `lockdown`           | Set `deny-all` default policy and apply the allowlist                |

## License

MIT. See [LICENSE](LICENSE).
