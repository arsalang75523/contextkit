import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SkillProject = {
  root: string;
  skillId: string;
  repository: string;
  version: string;
};

type SkillDescriptor = {
  name?: unknown;
  version?: unknown;
  skillId?: unknown;
};

export async function readSkillProject(root: string, overrides: Partial<Omit<SkillProject, "root">> = {}): Promise<SkillProject> {
  const absoluteRoot = path.resolve(root);
  const descriptor = JSON.parse(await readFile(path.join(absoluteRoot, "skill.json"), "utf8")) as SkillDescriptor;
  const repository = overrides.repository || stringField(descriptor.name, "skill.json name");
  const version = overrides.version || stringField(descriptor.version, "skill.json version");
  const skillId = overrides.skillId || (typeof descriptor.skillId === "string" ? descriptor.skillId.trim() : "");
  if (!skillId) throw new Error("A compiled skill ID is required. Pass --skill-id exp_... or set skillId in skill.json.");
  return { root: absoluteRoot, skillId, repository, version };
}

export async function initSkillProject(directory: string, options: { name?: string; version?: string } = {}) {
  const root = path.resolve(directory);
  const name = normalizePackageName(options.name || path.basename(root));
  const version = options.version || "1.0.0";
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`Invalid semantic version: ${version}`);

  const files: Record<string, string> = {
    "skill.json": `${JSON.stringify({ schemaVersion: 1, name, version, skillId: "", runtime: "node>=20", entrypoint: "src/index.mjs", testCommand: "npm test" }, null, 2)}\n`,
    "SKILL.md": skillMarkdown(name),
    "LICENSE": mitLicense(),
    ".gitignore": "node_modules\n.env\n.env.*\n!.env.example\ndist\ncoverage\n",
    ".env.example": "# Declare non-secret runtime configuration names here.\n",
    "config.schema.json": `${JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", additionalProperties: false, properties: {} }, null, 2)}\n`,
    "package.json": `${JSON.stringify({ name, version, private: true, type: "module", scripts: { test: "node --test" } }, null, 2)}\n`,
    "package-lock.json": `${JSON.stringify({ name, version, lockfileVersion: 3, requires: true, packages: { "": { name, version } } }, null, 2)}\n`,
    "src/index.mjs": "export function run(input) {\n  return { ok: true, input };\n}\n",
    "tests/skill.test.mjs": "import assert from 'node:assert/strict';\nimport test from 'node:test';\nimport { run } from '../src/index.mjs';\n\ntest('runs with a verified result', () => {\n  assert.deepEqual(run('example'), { ok: true, input: 'example' });\n});\n",
    "examples/basic.mjs": "import { run } from '../src/index.mjs';\n\nconsole.log(run('replace-with-real-input'));\n"
  };

  await mkdir(root, { recursive: true });
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx", mode: 0o600 });
  }
  return { root, name, version, filesCreated: Object.keys(files).length };
}

function normalizePackageName(value: string) {
  const name = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!name || name.length > 100) throw new Error("Skill name must contain 1-100 URL-safe characters.");
  return name;
}

function stringField(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function skillMarkdown(name: string) {
  return `# ${name}

## When to use
Describe the verified trigger for this skill.

## Prerequisites
- List concrete runtime and access requirements.

## Inputs
- Define accepted input and validation rules.

## Workflow
1. Replace this scaffold with the tested method.
2. Record deterministic execution steps.
3. Verify the observed result.

## Outputs
- Define the reusable output contract.

## Verification
- Run \`npm test\` and include exact evidence from real execution.

## Failure handling
- Stop safely and report failed checks.

## Safety and boundaries
Do not use this skill with secrets committed to the repository.

Rollback:
- Restore the last verified immutable version.

## Test evidence
- Replace this scaffold text with real command, expected result, observed result, and evidence excerpt before publishing.
`;
}

function mitLicense() {
  return `MIT License

Copyright (c) ${new Date().getUTCFullYear()} Skill Author

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}
