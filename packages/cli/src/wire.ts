import type { ContextKit } from "@basedchef/contextkit";

export type RepositoryFile = {
  path: string;
  content: string;
  encoding: "utf8" | "base64";
  mode: 420 | 493;
  size: number;
  sha256: string;
};

export type RepositoryManifest = {
  format: "contextkit-skill-repository/v1";
  repository: string;
  version: string;
  digest: string;
  fileCount: number;
  totalBytes: number;
  createdAt: string;
  skillId?: string;
  skill: { name: string; version: string; license: string; ecosystem: string };
  runtime?: string;
  entrypoint?: string;
  testCommand?: string;
  files: Array<Pick<RepositoryFile, "path" | "sha256" | "size" | "encoding" | "mode">>;
};

export type RepositoryValidation = {
  valid: boolean;
  writeEligible: boolean;
  publishEligible: boolean;
  policyVersion: "skill-repository-v1";
  findings: string[];
  warnings: string[];
  limits: { maxFiles: number; maxFileBytes: number; maxBundleBytes: number };
  checks: Record<string, boolean>;
};

export type RepositoryInstallBundle = {
  format: "contextkit-skill-repository/v1";
  repository: string;
  version: string;
  digest: string;
  manifest: RepositoryManifest;
  files: RepositoryFile[];
  validation: RepositoryValidation;
  materialize: { root: string; overwrite: false; verifyChecksums: true };
};

export type RepositoryPurchaseResponse = {
  purchase: { id: string; experienceId: string; amountUsd: number; createdAt: string };
  skill: { name: string; version: string; license: string };
  installBundle: RepositoryInstallBundle | {
    format: "contextkit-verified-skill/v1";
    fileName: string;
    skillMarkdown: string;
    manifest: Record<string, unknown>;
  };
  license: { use: string; resale: false; attribution: string };
};

export type RepositoryRequest = {
  skillId: string;
  publishToken?: string;
  repository: string;
  version: string;
  files: RepositoryFile[];
};

export type RepositoryClient = {
  validateSkillBundle(request: RepositoryRequest): Promise<unknown>;
  pushSkillBundle(request: RepositoryRequest): Promise<unknown>;
  publishSkillVersion(request: { skillId: string; publishToken?: string; userApproved: true; priceUsd: 0.05 }): Promise<unknown>;
  inspectSkillRepository(request: { skillId: string }): Promise<unknown>;
  searchSkillRepositories(request: Record<string, unknown>): Promise<unknown>;
  buySkillVersion(request: { skillId: string }): Promise<RepositoryPurchaseResponse>;
  cloneSkillVersion(request: { skillId: string }): Promise<RepositoryPurchaseResponse>;
};

// The SDK runtime forwards these wire objects unchanged. This local interface keeps
// the CLI compatible while the separately published SDK declarations catch up.
export function repositoryClient(client: ContextKit) {
  return client as unknown as RepositoryClient;
}
