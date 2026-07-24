# ContextKit Auto-Capture

Secure task-completion bridge for ContextKit MCP V2. It reads a real agent transcript, removes common secret formats, and sends only the latest completed task to ContextKit. Qualifying, reusable work from any legitimate domain is compiled into a private, portable `SKILL.md` draft; generic notes and project diaries are rejected.

## One-command setup

```bash
npx @basedchef/contextkit-autocapture setup
```

This opens ContextKit sign-in in the browser, installs a persistent runner, detects Claude Code, Codex, Hermes, OpenCode, and OpenClaw, installs the detected global adapters, stores a refreshable OAuth credential at `~/.contextkit/autocapture-credentials.json` with `0600` permissions, and verifies the MCP connection. It does not edit `.zshrc` or require the user to paste an API key.

Install only selected hosts:

```bash
npx @basedchef/contextkit-autocapture setup --agents claude,opencode
```

Connection maintenance:

```bash
contextkit-autocapture doctor
contextkit-autocapture logout
```

The hooks run after completed turns. Duplicate, failed, and incomplete tasks are ignored. Public publishing is offered only when the private draft passes ContextKit validation and the user explicitly approves it.

## Advanced manual installation

OAuth setup is recommended. Existing API-key deployments remain supported through `CONTEXTKIT_API_KEY`.

```bash
contextkit-autocapture install claude --global
contextkit-autocapture install codex --global
contextkit-autocapture install hermes
contextkit-autocapture install opencode --global
contextkit-autocapture install openclaw --global
```

Codex or Hermes may ask for one host-native hook trust review. OpenClaw must permit final conversation access for the installed plugin.

## Cursor, Claude, or Codex CLI: guaranteed runner

```bash
contextkit-autocapture run cursor -- "Fix the failing checkout tests"
contextkit-autocapture run claude -- "Implement the webhook retry policy"
contextkit-autocapture run codex -- "Verify the payment callback"
```

## VS Code-compatible IDEs

The packaged extension supports VS Code, Cursor, Windsurf, and VSCodium. It launches Cursor Agent, Claude Code, or Codex CLI through an observable structured runner, stores the ContextKit key in SecretStorage, and exposes public publishing only as an explicit user action.

The runner captures structured CLI output and submits it only after a successful process exit.

## Security

- Browser setup uses a short-lived PKCE authorization code. Refreshable OAuth credentials are stored in a user-owned `0600` file and never included in captured payloads.
- Existing API-key users can keep using environment variables as an explicit override.
- Common API keys, bearer tokens, passwords, OTPs, private keys, and seed phrases are redacted locally.
- File-write tool payloads include the target path, not source-file contents.
- Public publishing is never automatic and unverified drafts cannot be listed.
- Generic notes, plans, placeholders, project diaries, and plain assertions are rejected. Private skill writes require a complete reusable workflow and one source-grounded hard-evidence PASS. Public skills require three independent grounded PASS results, score 75+, a valid discovery category, and no private paths or identifiers. Test proof is included in `SKILL.md`; Bankr and crypto relevance are not required.
- A local hash cache prevents duplicate consideration calls.
- A sanitized local outbox (`0600`) retries temporary network/API failures on the next run, so completed tasks are not silently lost.
