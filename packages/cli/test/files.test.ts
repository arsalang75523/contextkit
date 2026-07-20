import assert from "node:assert/strict";
import { chmod, lstat, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { collectSkillFiles, materializeSkillBundle, sha256, verifyInstallBundle } from "../src/files.js";
import type { RepositoryInstallBundle } from "../src/wire.js";

test("collects relative text and binary files while ignoring local secrets and build directories", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "contextkit-cli-collect-"));
  await mkdir(path.join(root, "src"));
  await mkdir(path.join(root, ".git"));
  await mkdir(path.join(root, "node_modules", "ignored"), { recursive: true });
  await writeFile(path.join(root, "SKILL.md"), "# verified\n");
  await writeFile(path.join(root, "src", "index.mjs"), "export const ok = true;\n");
  await chmod(path.join(root, "src", "index.mjs"), 0o755);
  await writeFile(path.join(root, "asset.bin"), Buffer.from([0, 255, 1]));
  await writeFile(path.join(root, ".env"), "API_KEY=secret\n");
  await writeFile(path.join(root, ".env.local"), "TOKEN=secret\n");
  await writeFile(path.join(root, ".env.example"), "API_KEY=replace_me\n");
  await writeFile(path.join(root, ".git", "config"), "ignored\n");
  await writeFile(path.join(root, "node_modules", "ignored", "index.js"), "ignored\n");

  const files = await collectSkillFiles(root);
  assert.deepEqual(files.map((file) => file.path), [".env.example", "asset.bin", "SKILL.md", "src/index.mjs"]);
  assert.equal(files.find((file) => file.path === "asset.bin")?.encoding, "base64");
  assert.equal(files.find((file) => file.path === "SKILL.md")?.encoding, "utf8");
  assert.equal(files.find((file) => file.path === "src/index.mjs")?.mode, 493);
  assert.ok(files.every((file) => file.sha256 && file.size !== undefined));
});

test("rejects symbolic links during collection", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "contextkit-cli-symlink-"));
  const external = path.join(root, "outside.txt");
  await writeFile(external, "outside");
  await symlink(external, path.join(root, "linked.txt"));

  await assert.rejects(() => collectSkillFiles(root), /Symbolic links are not allowed/);
});

test("verifies and materializes a complete bundle", async () => {
  const destination = path.join(await mkdtemp(path.join(tmpdir(), "contextkit-cli-clone-")), "repository");
  const bundle = fixtureBundle();
  const result = await materializeSkillBundle(destination, bundle);

  assert.equal(result.filesWritten, bundle.files.length);
  assert.equal(await readFile(path.join(destination, "src", "index.mjs"), "utf8"), "export const ok = true;\n");
  assert.equal((await lstat(path.join(destination, "src", "index.mjs"))).mode & 0o777, 0o755);
});

test("refuses overwrite unless explicitly enabled", async () => {
  const destination = path.join(await mkdtemp(path.join(tmpdir(), "contextkit-cli-overwrite-")), "repository");
  const bundle = fixtureBundle();
  await materializeSkillBundle(destination, bundle);

  await assert.rejects(() => materializeSkillBundle(destination, bundle), /Refusing to overwrite existing file/);
  await materializeSkillBundle(destination, bundle, { overwrite: true });
});

test("rejects traversal and checksum corruption before writing", async () => {
  const destination = path.join(await mkdtemp(path.join(tmpdir(), "contextkit-cli-unsafe-")), "repository");
  const traversal = fixtureBundle();
  traversal.files[0].path = "../outside.txt";
  traversal.manifest.files[0].path = "../outside.txt";
  await assert.rejects(() => materializeSkillBundle(destination, traversal), /Unsafe clone path/);

  const corrupt = fixtureBundle();
  corrupt.files[0].content = "changed";
  await assert.rejects(() => materializeSkillBundle(destination, corrupt), /Checksum mismatch/);
});

test("rejects checksums.json that disagrees with the repository digest", () => {
  const bundle = fixtureBundle();
  const checksums = bundle.files.find((file) => file.path === "checksums.json");
  assert.ok(checksums);
  checksums.content = JSON.stringify({ format: bundle.format, digest: bundle.digest, files: [] });
  checksums.size = Buffer.byteLength(checksums.content);
  checksums.sha256 = sha256(Buffer.from(checksums.content));
  const manifestChecksums = bundle.manifest.files.find((file) => file.path === "checksums.json");
  assert.ok(manifestChecksums);
  manifestChecksums.size = checksums.size;
  manifestChecksums.sha256 = checksums.sha256;

  assert.throws(() => verifyInstallBundle(bundle), /checksums.json does not match/);
});

function fixtureBundle(): RepositoryInstallBundle {
  const rawFiles = [
    { path: "SKILL.md", content: "# example\n", encoding: "utf8" as const, mode: 420 as const },
    { path: "src/index.mjs", content: "export const ok = true;\n", encoding: "utf8" as const, mode: 493 as const }
  ];
  const files = rawFiles.map((file) => {
    const bytes = Buffer.from(file.content, "utf8");
    return { ...file, size: bytes.byteLength, sha256: sha256(bytes) };
  });
  const digestFiles = files.map(({ path: filePath, sha256: fileSha, size, encoding, mode }) => ({ path: filePath, sha256: fileSha, size, encoding, mode }));
  const digest = `sha256:${sha256(Buffer.from(JSON.stringify(digestFiles)))}`;
  const checksumsContent = `${JSON.stringify({ format: "contextkit-skill-repository/v1", digest, files: digestFiles }, null, 2)}\n`;
  const checksumsBytes = Buffer.from(checksumsContent);
  const checksums = { path: "checksums.json", content: checksumsContent, encoding: "utf8" as const, mode: 420 as const, size: checksumsBytes.byteLength, sha256: sha256(checksumsBytes) };
  const allFiles = [...files, checksums];

  return {
    format: "contextkit-skill-repository/v1",
    repository: "example-skill",
    version: "1.0.0",
    digest,
    manifest: {
      format: "contextkit-skill-repository/v1",
      repository: "example-skill",
      version: "1.0.0",
      digest,
      fileCount: allFiles.length,
      totalBytes: allFiles.reduce((sum, file) => sum + file.size, 0),
      createdAt: "2026-07-19T00:00:00.000Z",
      skill: { name: "example-skill", version: "1.0.0", license: "MIT", ecosystem: "x402" },
      files: allFiles.map(({ path: filePath, sha256: fileSha, size, encoding, mode }) => ({ path: filePath, sha256: fileSha, size, encoding, mode }))
    },
    files: allFiles,
    validation: {
      valid: true,
      writeEligible: true,
      publishEligible: true,
      policyVersion: "skill-repository-v1",
      findings: [],
      warnings: [],
      limits: { maxFiles: 128, maxFileBytes: 240_000, maxBundleBytes: 320_000 },
      checks: { safePaths: true, secretScan: true, requiredFiles: true, executableContract: true, identityMatch: true, immutableVersion: true }
    },
    materialize: { root: "example-skill", overwrite: false, verifyChecksums: true }
  };
}
