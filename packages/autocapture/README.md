# ContextKit Auto-Capture

Secure task-completion bridge for ContextKit MCP V2. It reads a real agent transcript, removes common secret formats, and sends only the latest completed task to ContextKit. Qualifying Bankr-adjacent work is compiled into a private, portable `SKILL.md` draft; generic notes and project diaries are rejected.

## Claude Code: automatic Stop hook

```bash
npm install -g @basedchef/contextkit-autocapture
export CONTEXTKIT_API_KEY="ck_live_your_scoped_key"
contextkit-autocapture install claude
```

The hook runs after every completed Claude Code turn. A duplicate transcript is ignored. Public publishing is offered only when the draft passes ContextKit validation and the user explicitly approves it.

## Codex: automatic Stop hook

```bash
export CONTEXTKIT_API_KEY="ck_live_your_scoped_key"
contextkit-autocapture install codex
```

Use `--global` for every Codex workspace. Project hooks must be reviewed once through `/hooks` before Codex trusts them.

## Hermes: automatic post-LLM hook

```bash
export CONTEXTKIT_API_KEY="ck_live_your_scoped_key"
contextkit-autocapture install hermes
hermes hooks list
```

Hermes asks for first-use consent before executing the generated hook.

## Cursor, Claude, or Codex CLI: guaranteed runner

```bash
contextkit-autocapture run cursor -- "Fix the failing checkout tests"
contextkit-autocapture run claude -- "Implement the webhook retry policy"
contextkit-autocapture run codex -- "Verify the payment callback"
```

## OpenCode: automatic session-idle capture

```bash
export CONTEXTKIT_API_KEY="ck_live_your_scoped_key"
contextkit-autocapture install opencode
opencode
```

Use `--global` to install under `~/.config/opencode/plugins` for every workspace. The plugin reads the completed OpenCode session when it becomes idle, skips failed and duplicate tasks, and saves only qualified private drafts.

## OpenClaw: automatic agent-end capture

```bash
export CONTEXTKIT_API_KEY="ck_live_your_scoped_key"
contextkit-autocapture install openclaw --global
openclaw config set plugins.entries.contextkit-autocapture.hooks.allowConversationAccess true
```

Restart the OpenClaw Gateway after installation. The plugin runs only after a successful `agent_end` event and sends the final completed task through the same local sanitizer and private-draft detector.

## VS Code-compatible IDEs

The packaged extension supports VS Code, Cursor, Windsurf, and VSCodium. It launches Cursor Agent, Claude Code, or Codex CLI through an observable structured runner, stores the ContextKit key in SecretStorage, and exposes public publishing only as an explicit user action.

The runner captures structured CLI output and submits it only after a successful process exit.

## Security

- API keys remain in environment variables and are never included in the payload.
- Common API keys, bearer tokens, passwords, OTPs, private keys, and seed phrases are redacted locally.
- File-write tool payloads include the target path, not source-file contents.
- Public publishing is never automatic and unverified drafts cannot be listed.
- Public skills must be portable, Bankr-adjacent, free of private paths/identifiers, and include at least three contract tests.
- A local hash cache prevents duplicate consideration calls.
- A sanitized local outbox (`0600`) retries temporary network/API failures on the next run, so completed tasks are not silently lost.
