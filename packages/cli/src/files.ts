import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import type { RepositoryFile, RepositoryInstallBundle } from "./wire.js";

const MAX_FILES = 128;
const MAX_FILE_BYTES = 240_000;
const MAX_BUNDLE_BYTES = 320_000;
const IGNORED_DIRECTORIES = new Set([".git", ".hg", ".svn", ".next", "coverage", "dist", "node_modules"]);
const FORBIDDEN_CLONE_SEGMENTS = new Set([".git", ".hg", ".svn", "node_modules"]);
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export type CollectSkillFilesOptions = {
  maxFiles?: number;
  maxFileBytes?: number;
  maxBundleBytes?: number;
};

export type MaterializeOptions = {
  overwrite?: boolean;
};

export async function collectSkillFiles(root: string, options: CollectSkillFilesOptions = {}): Promise<RepositoryFile[]> {
  const limits = {
    maxFiles: options.maxFiles ?? MAX_FILES,
    maxFileBytes: options.maxFileBytes ?? MAX_FILE_BYTES,
    maxBundleBytes: options.maxBundleBytes ?? MAX_BUNDLE_BYTES
  };
  const absoluteRoot = path.resolve(root);
  const rootStat = await lstat(absoluteRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`Skill root must be a real directory: ${absoluteRoot}`);
  }

  const files: RepositoryFile[] = [];
  let totalBytes = 0;

  async function visit(directory: string, relativeDirectory = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      if (isIgnoredEnvironmentFile(entry.name)) continue;

      const absolutePath = path.join(directory, entry.name);
      const stat = await lstat(absolutePath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Symbolic links are not allowed in skill bundles: ${relativePath}`);
      }
      if (stat.isDirectory()) {
        await visit(absolutePath, relativePath);
        continue;
      }
      if (!stat.isFile()) continue;
      if (files.length >= limits.maxFiles) throw new Error(`Skill bundle exceeds ${limits.maxFiles} files.`);
      if (stat.size > limits.maxFileBytes) throw new Error(`${relativePath} exceeds ${limits.maxFileBytes} bytes.`);

      const bytes = await readFile(absolutePath);
      totalBytes += bytes.byteLength;
      if (totalBytes > limits.maxBundleBytes) throw new Error(`Skill bundle exceeds ${limits.maxBundleBytes} bytes.`);

      const encoding = detectEncoding(bytes);
      files.push({
        path: toPosixPath(relativePath),
        content: encoding === "utf8" ? bytes.toString("utf8") : bytes.toString("base64"),
        encoding,
        mode: stat.mode & 0o111 ? 493 : 420,
        size: bytes.byteLength,
        sha256: sha256(bytes)
      });
    }
  }

  await visit(absoluteRoot);
  return files;
}

export async function materializeSkillBundle(
  destination: string,
  bundle: RepositoryInstallBundle,
  options: MaterializeOptions = {}
) {
  verifyInstallBundle(bundle);
  const root = path.resolve(destination);

  const existingRoot = await optionalLstat(root);
  if (existingRoot?.isSymbolicLink()) throw new Error(`Clone destination cannot be a symbolic link: ${root}`);
  if (existingRoot && !existingRoot.isDirectory()) throw new Error(`Clone destination is not a directory: ${root}`);

  const targets = bundle.files.map((file) => {
    const safePath = normalizeRelativePath(file.path);
    const target = path.resolve(root, ...safePath.split("/"));
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Unsafe clone path: ${file.path}`);
    }
    return { file, target };
  });

  if (!options.overwrite) {
    for (const { target } of targets) {
      if (await optionalLstat(target)) throw new Error(`Refusing to overwrite existing file: ${target}`);
    }
  }

  await mkdir(root, { recursive: true });
  for (const { file, target } of targets) {
    await assertNoSymlinkPath(root, target);
    await mkdir(path.dirname(target), { recursive: true });
    const bytes = decodeFile(file);
    await writeFile(target, bytes, { flag: options.overwrite ? "w" : "wx", mode: file.mode });
  }

  return { destination: root, filesWritten: targets.length, digest: bundle.digest };
}

export function verifyInstallBundle(bundle: RepositoryInstallBundle) {
  if (bundle.format !== "contextkit-skill-repository/v1") throw new Error(`Unsupported bundle format: ${bundle.format}`);
  if (!/^sha256:[a-f0-9]{64}$/.test(bundle.digest)) throw new Error("Bundle digest is malformed.");
  if (bundle.digest !== bundle.manifest.digest) throw new Error("Bundle and manifest digests do not match.");

  const manifestFiles = new Map(bundle.manifest.files.map((file) => [file.path, file]));
  if (manifestFiles.size !== bundle.files.length) throw new Error("Manifest file count does not match clone payload.");

  const digestFiles: Array<{ path: string; sha256: string; size: number; encoding: "utf8" | "base64"; mode: 420 | 493 }> = [];
  for (const file of bundle.files) {
    const safePath = normalizeRelativePath(file.path);
    const bytes = decodeFile(file);
    const actualHash = sha256(bytes);
    if (actualHash !== file.sha256) throw new Error(`Checksum mismatch for ${safePath}.`);
    if (bytes.byteLength !== file.size) throw new Error(`Size mismatch for ${safePath}.`);

    const manifestFile = manifestFiles.get(safePath);
    if (!manifestFile || manifestFile.sha256 !== file.sha256 || manifestFile.size !== file.size || manifestFile.encoding !== file.encoding || manifestFile.mode !== file.mode) {
      throw new Error(`Manifest mismatch for ${safePath}.`);
    }
    if (file.mode !== 420 && file.mode !== 493) throw new Error(`Unsupported file mode for ${safePath}.`);
    if (safePath !== "checksums.json") digestFiles.push({ path: safePath, sha256: file.sha256, size: file.size, encoding: file.encoding, mode: file.mode });
  }

  digestFiles.sort((a, b) => a.path.localeCompare(b.path));
  const actualDigest = `sha256:${sha256(Buffer.from(JSON.stringify(digestFiles)))}`;
  if (actualDigest !== bundle.digest) throw new Error("Repository digest verification failed.");

  const checksumsFile = bundle.files.find((file) => file.path === "checksums.json");
  if (!checksumsFile || checksumsFile.encoding !== "utf8") throw new Error("checksums.json is missing or is not UTF-8 JSON.");
  let checksums: { format?: unknown; digest?: unknown; files?: unknown };
  try {
    checksums = JSON.parse(checksumsFile.content) as typeof checksums;
  } catch {
    throw new Error("checksums.json is malformed.");
  }
  if (checksums.format !== bundle.format || checksums.digest !== bundle.digest || JSON.stringify(checksums.files) !== JSON.stringify(digestFiles)) {
    throw new Error("checksums.json does not match the verified repository manifest.");
  }
}

export function sha256(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function detectEncoding(bytes: Buffer): "utf8" | "base64" {
  if (bytes.includes(0)) return "base64";
  try {
    textDecoder.decode(bytes);
    return "utf8";
  } catch {
    return "base64";
  }
}

function decodeFile(file: RepositoryInstallBundle["files"][number]) {
  if (file.encoding !== "utf8" && file.encoding !== "base64") throw new Error(`Unsupported encoding for ${file.path}.`);
  return Buffer.from(file.content, file.encoding === "utf8" ? "utf8" : "base64");
}

function normalizeRelativePath(value: string) {
  if (!value || value.includes("\\") || value.includes("\0") || value.startsWith("/") || /^[A-Za-z]:/.test(value)) {
    throw new Error(`Unsafe clone path: ${value}`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || FORBIDDEN_CLONE_SEGMENTS.has(segment))) {
    throw new Error(`Unsafe clone path: ${value}`);
  }
  return segments.join("/");
}

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

function isIgnoredEnvironmentFile(name: string) {
  return name === ".env" || (name.startsWith(".env.") && name !== ".env.example");
}

async function optionalLstat(target: string) {
  try {
    return await lstat(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function assertNoSymlinkPath(root: string, target: string) {
  let cursor = root;
  const relative = path.relative(root, path.dirname(target));
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const stat = await optionalLstat(cursor);
    if (stat?.isSymbolicLink()) throw new Error(`Symbolic link in clone path: ${cursor}`);
  }
}
