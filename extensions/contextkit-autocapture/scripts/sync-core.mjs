import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(extensionRoot, "../../packages/autocapture/src/core.mjs");
const target = resolve(extensionRoot, "dist/src/core.mjs");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
