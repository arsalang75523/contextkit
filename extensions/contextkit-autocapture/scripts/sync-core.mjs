import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sources = [
  ["core.mjs", "core.mjs"],
  ["contextkit-autocapture-auth.mjs", "contextkit-autocapture-auth.mjs"]
];
const targetDirectory = resolve(extensionRoot, "dist/src");

await mkdir(targetDirectory, { recursive: true });
await Promise.all(sources.map(([source, target]) => copyFile(
  resolve(extensionRoot, "../../packages/autocapture/src", source),
  resolve(targetDirectory, target)
)));
