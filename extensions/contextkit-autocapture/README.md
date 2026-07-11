# ContextKit Auto-Capture for VS Code-compatible IDEs

Supported hosts include VS Code, Cursor, Windsurf, and VSCodium. The guaranteed runner can launch Cursor Agent, Claude Code, or Codex CLI.

This extension creates a controlled task lifecycle that the IDE can observe end to end:

1. Run **ContextKit: Run Agent with Guaranteed Auto-Capture**.
2. Choose Cursor Agent, Claude Code, or Codex CLI.
3. Enter the task once.
4. The extension captures structured agent output and submits the completed task to ContextKit.
5. ContextKit saves only a qualified private draft.
6. Publishing happens only when you click the explicit publish action.

## Why the runner is required

VS Code-compatible extensions cannot read every native Cursor, Claude, or third-party chat transcript. ContextKit therefore does not infer experiences from file-save activity. Guaranteed capture applies to tasks launched through the ContextKit command, while native chats remain MCP-policy best effort unless that agent supports a completion hook.

## Setup

Install the VSIX, open the command palette, and run **ContextKit: Configure API Key**. Use a dedicated key with only `context:write`. The key is stored in VS Code SecretStorage.

Cursor requires `cursor-agent` on `PATH`, Claude requires `claude`, and Codex requires `codex`. Custom executable paths are available under **ContextKit Auto-Capture** settings.

## Security

- Common secrets are redacted locally before upload.
- Source-file contents from write tools are not included in capture records.
- Duplicate completed tasks are skipped.
- Failed agent runs are never submitted.
- Sanitized completed tasks are queued locally with restricted permissions until ContextKit accepts them.
- Drafts are private by default; publishing requires a user click.
