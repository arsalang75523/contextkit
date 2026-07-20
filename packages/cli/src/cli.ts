#!/usr/bin/env node

import { ContextKit, ContextKitError } from "@basedchef/contextkit";
import { collectSkillFiles, materializeSkillBundle } from "./files.js";
import { initSkillProject, readSkillProject } from "./project.js";
import { repositoryClient, type RepositoryPurchaseResponse } from "./wire.js";

type ParsedArgs = {
  positionals: string[];
  flags: Map<string, string | true>;
};

async function main(argv = process.argv.slice(2)) {
  const [namespace, command, ...rest] = argv;
  if (namespace === "--help" || namespace === "-h" || !namespace) return printHelp();
  if (namespace === "--version" || namespace === "-v") return printJson({ version: "0.1.0" });
  if (namespace !== "skill" || !command) throw new Error("Use `contextkit skill <command>`. Run with --help for examples.");

  const args = parseArgs(rest);
  if (command === "init") {
    const result = await initSkillProject(args.positionals[0] || ".", {
      name: stringFlag(args, "name"),
      version: stringFlag(args, "version")
    });
    return printJson({ ...result, next: "Replace scaffold evidence, compile the skill, set skillId in skill.json, then run contextkit skill validate." });
  }

  const client = createClient(args);
  if (command === "validate" || command === "push") {
    const project = await readSkillProject(args.positionals[0] || ".", {
      skillId: stringFlag(args, "skill-id"),
      repository: stringFlag(args, "repository"),
      version: stringFlag(args, "version")
    });
    const request = {
      skillId: project.skillId,
      publishToken: stringFlag(args, "publish-token") || process.env.CONTEXTKIT_PUBLISH_TOKEN,
      repository: project.repository,
      version: project.version,
      files: await collectSkillFiles(project.root)
    };
    return printJson(command === "validate" ? await client.validateSkillBundle(request) : await client.pushSkillBundle(request));
  }

  if (command === "publish") {
    const target = args.positionals[0] || ".";
    const skillId = looksLikeSkillId(target)
      ? target
      : (await readSkillProject(target, { skillId: stringFlag(args, "skill-id") })).skillId;
    return printJson(await client.publishSkillVersion({
      skillId,
      publishToken: stringFlag(args, "publish-token") || process.env.CONTEXTKIT_PUBLISH_TOKEN,
      userApproved: true,
      priceUsd: 0.05
    }));
  }

  if (command === "search") {
    const result = await client.searchSkillRepositories({
      query: args.positionals.join(" ") || undefined,
      tags: csvFlag(args, "tags"),
      ecosystems: csvFlag(args, "ecosystems") as never,
      compatibility: csvFlag(args, "compatibility"),
      includePrivate: booleanFlag(args, "include-private"),
      limit: numberFlag(args, "limit")
    });
    return printJson(result);
  }

  if (command === "inspect") {
    return printJson(await client.inspectSkillRepository({ skillId: requiredPositional(args, "skill ID") }));
  }

  if (command === "buy") {
    const result = await client.buySkillVersion({ skillId: requiredPositional(args, "skill ID") });
    return printJson(purchaseSummary(result));
  }

  if (command === "clone") {
    const skillId = requiredPositional(args, "skill ID");
    const result = await client.cloneSkillVersion({ skillId });
    if (result.installBundle.format !== "contextkit-skill-repository/v1") {
      throw new Error("This purchase is a legacy SKILL.md record and cannot be cloned as a repository.");
    }
    const destination = args.positionals[1] || result.installBundle.repository;
    const materialized = await materializeSkillBundle(destination, result.installBundle, {
      overwrite: booleanFlag(args, "force")
    });
    return printJson({ ...purchaseSummary(result), clone: materialized });
  }

  throw new Error(`Unknown skill command: ${command}`);
}

function createClient(args: ParsedArgs) {
  const apiKey = process.env.CONTEXTKIT_API_KEY?.trim();
  if (!apiKey) throw new Error("CONTEXTKIT_API_KEY is required for remote ContextKit commands.");
  return repositoryClient(new ContextKit({
    apiKey,
    baseUrl: stringFlag(args, "base-url") || process.env.CONTEXTKIT_BASE_URL || "https://contextkit.pro"
  }));
}

function parseArgs(values: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | true>();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }
    const [rawName, inlineValue] = value.slice(2).split("=", 2);
    if (!rawName) throw new Error(`Invalid option: ${value}`);
    if (inlineValue !== undefined) {
      flags.set(rawName, inlineValue);
      continue;
    }
    const next = values[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(rawName, next);
      index += 1;
    } else {
      flags.set(rawName, true);
    }
  }
  return { positionals, flags };
}

function stringFlag(args: ParsedArgs, name: string) {
  const value = args.flags.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function csvFlag(args: ParsedArgs, name: string) {
  const value = stringFlag(args, name);
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
}

function numberFlag(args: ParsedArgs, name: string) {
  const value = stringFlag(args, name);
  if (!value) return undefined;
  const number = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`--${name} must be a positive integer.`);
  return number;
}

function booleanFlag(args: ParsedArgs, name: string) {
  const value = args.flags.get(name);
  if (value === true) return true;
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`--${name} must be true or false.`);
}

function requiredPositional(args: ParsedArgs, label: string) {
  const value = args.positionals[0]?.trim();
  if (!value) throw new Error(`Missing ${label}.`);
  return value;
}

function looksLikeSkillId(value: string) {
  return /^(?:exp|skill)_[A-Za-z0-9_-]+$/.test(value);
}

function purchaseSummary(result: RepositoryPurchaseResponse) {
  const installBundle = result.installBundle;
  return {
    purchase: result.purchase,
    skill: { name: result.skill.name, version: result.skill.version, license: result.skill.license },
    repository: installBundle.format === "contextkit-skill-repository/v1"
      ? { name: installBundle.repository, version: installBundle.version, digest: installBundle.digest, files: installBundle.files.length }
      : { format: installBundle.format, fileName: installBundle.fileName },
    license: result.license
  };
}

function printJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp() {
  process.stdout.write(`ContextKit skill repository CLI

Usage:
  contextkit skill init [directory] [--name NAME] [--version X.Y.Z]
  contextkit skill validate [directory] [--skill-id exp_...] [--publish-token TOKEN]
  contextkit skill push [directory] [--skill-id exp_...] [--publish-token TOKEN]
  contextkit skill publish [directory|skill-id] [--publish-token TOKEN]
  contextkit skill search [query] [--tags a,b] [--limit 10]
  contextkit skill inspect <skill-id>
  contextkit skill buy <skill-id>
  contextkit skill clone <skill-id> [directory] [--force]

Environment:
  CONTEXTKIT_API_KEY       Required for remote commands
  CONTEXTKIT_BASE_URL      Optional; defaults to https://contextkit.pro
  CONTEXTKIT_PUBLISH_TOKEN Optional private publish approval token
`);
}

main().catch((error: unknown) => {
  const payload = error instanceof ContextKitError
    ? { error: error.message, status: error.status, response: error.body }
    : { error: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
});
