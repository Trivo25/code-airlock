# claude-sbx

Run Claude Code (or another coding agent) unattended, inside a disposable microVM, with its work committed to git so you can review everything from your host.

This is a thin wrapper around [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Docker Sandboxes already provides the hard part: each sandbox runs in its own lightweight virtual machine with its own kernel and Docker daemon, so an agent running with permissions disabled can install packages, run commands, and spin up containers without touching your host. This script makes the secure setup the default and reduces it to a handful of commands.

## Why a microVM and not just a container

A coding agent with permissions disabled will, if a task calls for it, reason its way around application-level guardrails. There are documented cases of an agent bypassing a denylist and then disabling the OS sandbox that caught it, purely to finish the job. OS-level sandboxes (Seatbelt, bubblewrap) and deny rules are useful for reducing prompts, but the boundary an agent inside cannot open is the hypervisor. Docker Sandboxes puts that boundary between the agent and your machine, which is why it's the right base for fully unattended runs.

This wrapper adds three things on top:

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

Then grab this tool:

```bash
git clone https://github.com/Trivo25/claude-sbx.git
cd claude-sbx
# optional: put it on your PATH
ln -s "$PWD/claude-sbx" ~/.local/bin/claude-sbx
```

## Quick start

Run it from inside the repo you want the agent to work on. It works on both a fresh repo and an existing one; for a fresh directory it offers to `git init` for you, since clone mode needs a repo.

```bash
cd ~/code/my-project
claude-sbx lockdown     # one-time: deny-all network + apply the allowlist
claude-sbx up           # start Claude Code in the sandbox, unattended
```

On the first `up`, Claude Code prompts for authentication inside the sandbox. Run `/login` there to sign in with your Claude subscription, or provide an API key (see Authentication below). Give it a goal, and it works without stopping for permission on each command.

While it runs, from your host:

```bash
claude-sbx fetch        # pull its commits into the sandbox-<name> remote
claude-sbx diff         # fetch, then show the diff against your branch
claude-sbx shell        # drop into a shell inside the sandbox to look around
claude-sbx net          # see which hosts it reached or was blocked from
```

When you're happy with the work:

```bash
claude-sbx merge        # merge the agent's branch into yours
# or handle the sandbox-<name> remote manually with your usual git tools
```

When you're done:

```bash
claude-sbx stop         # keep the VM and its commits for later
claude-sbx rm           # delete the sandbox (offers to fetch first)
```

## Unattended / headless runs

Pass agent arguments after `--` to run without attaching. For Claude Code, `-p` runs a single headless task and keeps permissions disabled:

```bash
claude-sbx up -- -p "add pagination to the users endpoint and run the test suite"
```

Headless runs can't do interactive `/login`, so set an API key first (see below).

## Authentication

Two options:

- **Subscription (interactive)**: run `claude-sbx up` and use `/login` inside the sandbox.
- **API key**: store it with the sandbox secret manager so it goes through the host proxy instead of living in the VM. See `sbx secret` in the [Docker docs](https://docs.docker.com/ai/sandboxes/). Host `~/.claude` config is not carried into the sandbox by design; put any project config you need inside the repo itself.

## Configuration

Copy `sandbox.conf.example` to `sandbox.conf` and edit. You can set the sandbox name, the agent, the target repo, and the network allowlist. `sandbox.conf` is git-ignored.

The default allowlist covers the Anthropic API, GitHub, and npm. Add your registries (`*.pypi.org`, `static.crates.io`, and so on) as your projects need them. If a download fails, `claude-sbx net` shows exactly which host was blocked so you can add it.

## Security notes

- The `lockdown` command sets `deny-all` as the default policy for **all** your sandboxes, then re-adds the allowlist. Revert with `sbx policy reset`.
- Keep the allowlist as narrow as the task allows. The proxy filters on the hostname the client presents and does not inspect TLS, so a broad entry (for example a wildcard you don't need) widens the only remaining exfiltration path. Isolation here is about your machine, not a guarantee against data egress over an allowed host.
- Don't feed the sandbox host credentials you don't want it to have. Give it a repo-scoped token for pushing, not your full SSH agent.
- `claude-sbx rm` deletes the clone. Fetch or push anything you want to keep first; the command offers to fetch for you.

## Commands

| Command              | What it does                                                         |
| -------------------- | -------------------------------------------------------------------- |
| `up [-- agent-args]` | Create and start the sandbox in clone mode with permissions disabled |
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
