import { createHash } from "node:crypto";
import { posix } from "node:path";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import type { SkillBundleFileInput } from "@/types/api";
import type { VerifiedSkillDraft } from "@/services/skill-validation";

const MAX_BUNDLE_BYTES = 320_000;
const MAX_FILE_BYTES = 240_000;
const ARTIFACT_FORMAT = "contextkit-skill-repository/v1" as const;
const FORBIDDEN_SEGMENTS = new Set([".git", ".hg", ".svn", "node_modules", ".next", "dist", "coverage"]);
const FORBIDDEN_FILE_NAMES = new Set([".env", ".npmrc", ".pypirc", "id_rsa", "id_ed25519"]);
const TOKEN_LIKE_PATTERN = /(?:\b(?:sk|bk|ck|re)_[A-Za-z0-9_-]{12,}\b|\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const SECRET_ASSIGNMENT_PATTERN = /\b(?:api[_-]?key|private[_-]?key|client[_-]?secret|password|access[_-]?token)\s*[:=]\s*["']?([^\s,"'}]{8,})/gi;
const SAFE_PLACEHOLDER_PATTERN = /^(?:replace(?:[_-]?me)?|example|placeholder|changeme|your[_-].*|<[^>]+>|\$\{[^}]+\})$/i;

export type SkillBundleFile = {
  path: string;
  content: string;
  encoding: "utf8" | "base64";
  sha256: string;
  size: number;
  mode: 420 | 493;
};

export type SkillBundleManifest = {
  format: typeof ARTIFACT_FORMAT;
  repository: string;
  version: string;
  digest: string;
  fileCount: number;
  totalBytes: number;
  createdAt: string;
  skillId?: string;
  skill: {
    name: string;
    version: string;
    license: string;
    ecosystem: string;
  };
  runtime?: string;
  entrypoint?: string;
  testCommand?: string;
  files: Array<{ path: string; sha256: string; size: number; encoding: "utf8" | "base64"; mode: 420 | 493 }>;
};

export type SkillBundleValidation = {
  valid: boolean;
  writeEligible: boolean;
  publishEligible: boolean;
  policyVersion: "skill-repository-v1";
  findings: string[];
  warnings: string[];
  limits: { maxFiles: number; maxFileBytes: number; maxBundleBytes: number };
  checks: {
    safePaths: boolean;
    secretScan: boolean;
    requiredFiles: boolean;
    executableContract: boolean;
    identityMatch: boolean;
    immutableVersion: boolean;
  };
};

export type StoredSkillBundle = {
  manifest: SkillBundleManifest;
  files: SkillBundleFile[];
  validation: SkillBundleValidation;
};

type BuildBundleInput = {
  repository: string;
  version: string;
  files: Array<Omit<SkillBundleFileInput, "mode"> & { mode?: 420 | 493 }>;
  skill: VerifiedSkillDraft;
  skillId?: string;
  immutableVersion?: boolean;
};

export class SkillBundleService {
  private readonly kv: AppKV;

  constructor(private readonly env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  build(input: BuildBundleInput): StoredSkillBundle {
    return buildSkillBundle(input);
  }

  async put(bundle: StoredSkillBundle) {
    const artifactKey = bundleArtifactKey(bundle.manifest.digest);
    const serialized = JSON.stringify(bundle);
    if (this.env.CONTEXTKIT_FILES) {
      await this.env.CONTEXTKIT_FILES.put(artifactKey, serialized, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: {
          format: ARTIFACT_FORMAT,
          digest: bundle.manifest.digest,
          repository: bundle.manifest.repository,
          version: bundle.manifest.version
        }
      });
    } else {
      await this.kv.set(`skill-bundle:${bundle.manifest.digest}`, bundle);
    }
  }

  async get(digest: string): Promise<StoredSkillBundle | null> {
    if (!/^sha256:[a-f0-9]{64}$/.test(digest)) return null;
    if (this.env.CONTEXTKIT_FILES) {
      const object = await this.env.CONTEXTKIT_FILES.get(bundleArtifactKey(digest));
      if (!object) return null;
      return JSON.parse(await object.text()) as StoredSkillBundle;
    }
    return this.kv.get<StoredSkillBundle>(`skill-bundle:${digest}`);
  }
}

export function buildSkillBundle(input: BuildBundleInput): StoredSkillBundle {
  const findings: string[] = [];
  const warnings: string[] = [];
  const paths = new Set<string>();
  let safePaths = true;
  let secretScan = true;

  const files = input.files.map((source): SkillBundleFile => {
    const path = normalizeBundlePath(source.path);
    if (!path || paths.has(path.toLowerCase())) {
      safePaths = false;
      findings.push(path ? `Duplicate file path: ${path}.` : `Unsafe file path: ${source.path}.`);
    }
    if (path) paths.add(path.toLowerCase());

    const bytes = decodeContent(source.content, source.encoding, source.path, findings);
    if (bytes.byteLength > MAX_FILE_BYTES) findings.push(`${path || source.path} exceeds ${MAX_FILE_BYTES} bytes.`);
    if (source.encoding === "utf8" && containsCredentialLikeMaterial(source.content)) {
      secretScan = false;
      findings.push(`${path || source.path} contains credential-like material.`);
    }

    return {
      path: path || source.path,
      content: source.content,
      encoding: source.encoding,
      sha256: sha256(bytes),
      size: bytes.byteLength,
      mode: source.mode === 493 ? 493 : 420
    };
  }).filter((file) => file.path !== "checksums.json");

  files.sort((a, b) => a.path.localeCompare(b.path));
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_BUNDLE_BYTES) findings.push(`Bundle exceeds ${MAX_BUNDLE_BYTES} decoded bytes.`);

  const fileMap = new Map(files.map((file) => [file.path, file]));
  const required = ["SKILL.md", "skill.json", "LICENSE"];
  const missingRequired = required.filter((path) => !fileMap.has(path));
  const requiredFiles = missingRequired.length === 0;
  if (missingRequired.length) findings.push(`Missing required files: ${missingRequired.join(", ")}.`);

  const executable = fileMap.has("package.json") || files.some((file) => file.path.startsWith("src/"));
  const executableRequired = ["package.json", "package-lock.json", "config.schema.json"];
  const missingExecutable = executable
    ? executableRequired.filter((path) => !fileMap.has(path)).concat(
        files.some((file) => file.path.startsWith("src/")) ? [] : ["src/"],
        files.some((file) => file.path.startsWith("tests/") || file.path.startsWith("test/")) ? [] : ["tests/"],
        files.some((file) => file.path.startsWith("examples/")) ? [] : ["examples/"]
      )
    : [];
  let executableContract = missingExecutable.length === 0;
  if (missingExecutable.length) findings.push(`Executable bundle is incomplete: ${missingExecutable.join(", ")}.`);

  const descriptor = parseJsonFile(fileMap.get("skill.json"), "skill.json", findings);
  const identityMatch = Boolean(descriptor) &&
    descriptor?.name === input.skill.name &&
    descriptor?.version === input.version &&
    input.repository === input.skill.name &&
    input.version === input.skill.version;
  if (descriptor && !identityMatch) {
    findings.push("repository, skill.json, and compiled skill name/version must match exactly.");
  }

  let runtime: string | undefined;
  let entrypoint: string | undefined;
  let testCommand: string | undefined;
  if (descriptor) {
    runtime = stringValue(descriptor.runtime);
    entrypoint = stringValue(descriptor.entrypoint);
    testCommand = stringValue(descriptor.testCommand);
    if (descriptor.schemaVersion !== 1) findings.push("skill.json schemaVersion must be 1.");
    if (executable && (!runtime || !entrypoint || !testCommand)) {
      executableContract = false;
      findings.push("Executable skill.json requires runtime, entrypoint, and testCommand.");
    }
    if (entrypoint && !fileMap.has(entrypoint)) {
      executableContract = false;
      findings.push(`Declared entrypoint ${entrypoint} is missing.`);
    }
  }

  const packageJson = parseJsonFile(fileMap.get("package.json"), "package.json", findings);
  if (packageJson) {
    const scripts = objectValue(packageJson.scripts);
    if (packageJson.name !== input.repository || packageJson.version !== input.version) {
      executableContract = false;
      findings.push("package.json name/version must match the immutable repository version.");
    }
    if (typeof scripts.test !== "string" || !scripts.test.trim()) {
      executableContract = false;
      findings.push("package.json must define a non-empty test script.");
    }
    const lifecycleScripts = ["preinstall", "install", "postinstall"].filter((name) => typeof scripts[name] === "string");
    if (lifecycleScripts.length) {
      executableContract = false;
      findings.push(`Install lifecycle scripts are forbidden: ${lifecycleScripts.join(", ")}.`);
    }
  }

  const lockfile = parseJsonFile(fileMap.get("package-lock.json"), "package-lock.json", findings);
  if (lockfile && (lockfile.name !== input.repository || lockfile.version !== input.version || typeof lockfile.lockfileVersion !== "number")) {
    executableContract = false;
    findings.push("package-lock.json must identify the same repository version and declare lockfileVersion.");
  }
  parseJsonFile(fileMap.get("config.schema.json"), "config.schema.json", findings);

  if (executable) {
    const sourceFiles = files.filter((file) => file.path.startsWith("src/") && file.encoding === "utf8");
    const testFiles = files.filter((file) => (file.path.startsWith("tests/") || file.path.startsWith("test/")) && file.encoding === "utf8");
    const exampleFiles = files.filter((file) => file.path.startsWith("examples/") && file.encoding === "utf8");
    if (!sourceFiles.some((file) => meaningfulCode(file.content))) {
      executableContract = false;
      findings.push("src/ must contain non-placeholder executable source code.");
    }
    if (!testFiles.some(hasExecutableTest)) {
      executableContract = false;
      findings.push("tests/ must contain executable assertions, not evidence labels or empty placeholders.");
    }
    if (!exampleFiles.some((file) => meaningfulCode(file.content))) {
      executableContract = false;
      findings.push("examples/ must contain a runnable non-placeholder usage example.");
    }
  }

  const skillMarkdown = textContent(fileMap.get("SKILL.md"));
  if (skillMarkdown && (!skillMarkdown.includes(input.skill.name) || !skillMarkdown.includes("## Test evidence"))) {
    findings.push("SKILL.md must identify the compiled skill and include Test evidence.");
  }
  if (!executable) warnings.push("Instruction-only bundle: no executable source tree declared.");

  const digestPayload = files.map(({ path, sha256: fileSha, size, encoding, mode }) => ({ path, sha256: fileSha, size, encoding, mode }));
  const digest = `sha256:${sha256(Buffer.from(JSON.stringify(digestPayload)))}`;
  const checksumsContent = JSON.stringify({ format: ARTIFACT_FORMAT, digest, files: digestPayload }, null, 2) + "\n";
  const checksumsBytes = Buffer.from(checksumsContent, "utf8");
  if (totalBytes + checksumsBytes.byteLength > MAX_BUNDLE_BYTES) {
    findings.push(`Bundle plus generated checksums exceeds ${MAX_BUNDLE_BYTES} decoded bytes.`);
  }
  files.push({
    path: "checksums.json",
    content: checksumsContent,
    encoding: "utf8",
    sha256: sha256(checksumsBytes),
    size: checksumsBytes.byteLength,
    mode: 420
  });

  const uniqueFindings = Array.from(new Set(findings));
  const validation: SkillBundleValidation = {
    valid: uniqueFindings.length === 0,
    writeEligible: uniqueFindings.length === 0,
    publishEligible: uniqueFindings.length === 0 && executable,
    policyVersion: "skill-repository-v1",
    findings: uniqueFindings,
    warnings,
    limits: { maxFiles: 128, maxFileBytes: MAX_FILE_BYTES, maxBundleBytes: MAX_BUNDLE_BYTES },
    checks: {
      safePaths,
      secretScan,
      requiredFiles,
      executableContract,
      identityMatch,
      immutableVersion: input.immutableVersion !== false
    }
  };

  const manifest: SkillBundleManifest = {
    format: ARTIFACT_FORMAT,
    repository: input.repository,
    version: input.version,
    digest,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    createdAt: new Date().toISOString(),
    skillId: input.skillId,
    skill: {
      name: input.skill.name,
      version: input.skill.version,
      license: input.skill.license,
      ecosystem: input.skill.ecosystem
    },
    runtime,
    entrypoint,
    testCommand,
    files: files.map(({ path, sha256: fileSha, size, encoding, mode }) => ({ path, sha256: fileSha, size, encoding, mode }))
  };

  return { manifest, files, validation };
}

function normalizeBundlePath(value: string) {
  if (!value || value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/.test(value) || value.includes("\0")) return "";
  if (value.split("/").some((segment) => segment === "..")) return "";
  const normalized = posix.normalize(value.replace(/^\.\//, ""));
  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) return "";
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === ".." || FORBIDDEN_SEGMENTS.has(segment))) return "";
  if (FORBIDDEN_FILE_NAMES.has(segments.at(-1) ?? "")) return "";
  if (/\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(normalized)) return "";
  return normalized;
}

function meaningfulCode(value: string) {
  const compact = value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trim();
  return compact.length >= 20 && !/^(?:todo|tbd|placeholder|example only)$/i.test(compact);
}

function hasExecutableTest(file: SkillBundleFile) {
  const content = file.content;
  const extension = posix.extname(file.path).toLowerCase();

  if ([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"].includes(extension)) {
    const declaresTest = /\b(?:test|it)\s*\(/.test(content);
    const assertsOutcome = /\b(?:assert(?:\.|\s*\()|expect\s*\()/.test(content);
    return declaresTest && assertsOutcome;
  }

  if (extension === ".py") {
    const declaresTest = /^(?:\s*@[\w.()]+\s*\n)*\s*(?:async\s+)?def\s+test_[A-Za-z0-9_]*\s*\(/m.test(content) ||
      /^\s*class\s+Test[A-Za-z0-9_]*\s*(?:\([^)]*\))?\s*:/m.test(content);
    const assertsOutcome = /^\s*assert(?:\s|\()/m.test(content) ||
      /\b(?:self\.)?assert[A-Z][A-Za-z0-9_]*\s*\(/.test(content) ||
      /\bpytest\.(?:raises|warns|approx)\s*\(/.test(content);
    return declaresTest && assertsOutcome;
  }

  if (extension === ".go") {
    return /\bfunc\s+Test[A-Za-z0-9_]*\s*\(\s*t\s+\*testing\.T\s*\)/.test(content) &&
      /\bt\.(?:Error|Errorf|Fatal|Fatalf|Fail|FailNow)\s*\(/.test(content);
  }

  if (extension === ".rs") {
    return /#\s*\[\s*test\s*\]/.test(content) &&
      /\b(?:assert|assert_eq|assert_ne|debug_assert|debug_assert_eq|debug_assert_ne)!\s*\(/.test(content);
  }

  if (extension === ".php") {
    const declaresTest = /\b(?:test|it)\s*\(/.test(content) ||
      /\bfunction\s+test[A-Za-z0-9_]*\s*\(/i.test(content);
    const assertsOutcome = /\b(?:assert[A-Z][A-Za-z0-9_]*|expect)\s*\(/.test(content);
    return declaresTest && assertsOutcome;
  }

  if (extension === ".rb") {
    const declaresTest = /\b(?:describe|context|it)\s+(?:["':]|do\b)/.test(content) ||
      /^\s*def\s+test_[A-Za-z0-9_]*\b/m.test(content);
    const assertsOutcome = /\b(?:assert|refute)(?:_[a-z_]+)?\b/.test(content) ||
      /\bexpect\s*\(/.test(content);
    return declaresTest && assertsOutcome;
  }

  if ([".java", ".kt", ".kts"].includes(extension)) {
    return /@Test\b/.test(content) &&
      /\b(?:assert[A-Z][A-Za-z0-9_]*|expect)\s*\(/.test(content);
  }

  if (extension === ".cs") {
    return /\[(?:Fact|Theory|Test|TestMethod)\b[^\]]*\]/.test(content) &&
      /\bAssert\.[A-Za-z0-9_]+\s*\(/.test(content);
  }

  return false;
}

function containsCredentialLikeMaterial(value: string) {
  if (TOKEN_LIKE_PATTERN.test(value)) return true;
  SECRET_ASSIGNMENT_PATTERN.lastIndex = 0;
  for (const match of value.matchAll(SECRET_ASSIGNMENT_PATTERN)) {
    if (!SAFE_PLACEHOLDER_PATTERN.test(match[1])) return true;
  }
  return false;
}

function decodeContent(content: string, encoding: "utf8" | "base64", path: string, findings: string[]) {
  if (encoding === "utf8") return Buffer.from(content, "utf8");
  const compact = content.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    findings.push(`${path} contains invalid base64 content.`);
    return Buffer.alloc(0);
  }
  return Buffer.from(compact, "base64");
}

function parseJsonFile(file: SkillBundleFile | undefined, label: string, findings: string[]) {
  if (!file) return null;
  if (file.encoding !== "utf8") {
    findings.push(`${label} must use utf8 encoding.`);
    return null;
  }
  try {
    const value = JSON.parse(file.content);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not_object");
    return value as Record<string, unknown>;
  } catch {
    findings.push(`${label} must contain valid JSON object content.`);
    return null;
  }
}

function textContent(file?: SkillBundleFile) {
  return file?.encoding === "utf8" ? file.content : "";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sha256(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function bundleArtifactKey(digest: string) {
  return `skill-bundles/${digest.replace(":", "/")}.json`;
}
