# ContextKit CLI

Secure command-line client for ContextKit's immutable, content-addressed skill repository.

## Install

```bash
npm install --global @basedchef/contextkit-cli
export CONTEXTKIT_API_KEY="ck_live_replace_me"
```

Use `CONTEXTKIT_BASE_URL` only when targeting a self-hosted ContextKit deployment.

## Creator workflow

```bash
contextkit skill init ./my-skill --name my-skill --version 1.0.0
cd my-skill
npm test
```

Replace the scaffold with real source, tests, examples, and evidence. Compile the skill through ContextKit, then either put the returned `exp_...` ID in the `skillId` field of `skill.json` or pass it explicitly:

```bash
contextkit skill validate . --skill-id exp_REPLACE_ME
contextkit skill push . --skill-id exp_REPLACE_ME --publish-token TOKEN
contextkit skill publish . --publish-token TOKEN
```

`validate` does not store files. `push` stores an immutable SHA-256 version. `publish` lists only an eligible executable bundle after explicit approval.

## Discovery and installation

```bash
contextkit skill search "x402 timeout"
contextkit skill inspect exp_REPLACE_ME
contextkit skill buy exp_REPLACE_ME
contextkit skill clone exp_REPLACE_ME ./installed-skill
```

`buy` returns a receipt and repository metadata without dumping source to the terminal. `clone` purchases the version, verifies every file and the repository digest, then materializes the complete repository.

Existing files are never overwritten unless `--force` is explicitly supplied.

## Bundle safety

- `.git`, `node_modules`, build output, `.env`, and environment-specific `.env.*` files are ignored.
- `.env.example` is allowed because it must contain names and placeholders, never credentials.
- Symlinks are rejected so files outside the repository cannot be uploaded accidentally.
- Clone paths must be relative POSIX paths; absolute paths, `..`, backslashes, and path traversal are rejected.
- SHA-256, decoded size, manifest membership, and the repository digest are verified before any file is written.
- Clone refuses existing file collisions by default.

Run `contextkit --help` for the complete command list.
