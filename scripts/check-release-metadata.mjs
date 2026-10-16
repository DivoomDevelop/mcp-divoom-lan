import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));

const pkg = readJson("package.json");
const lock = readJson("package-lock.json");
const registry = readJson("server.json");
const mcpb = readJson("mcpb/manifest.json");

const versions = new Map([
  ["package.json", pkg.version],
  ["package-lock.json", lock.version],
  ["package-lock.json packages['']", lock.packages?.[""]?.version],
  ["server.json", registry.version],
  ["server.json npm package", registry.packages?.[0]?.version],
  ["mcpb/manifest.json", mcpb.version],
]);

const mismatches = [...versions].filter(([, version]) => version !== pkg.version);
if (mismatches.length > 0) {
  const details = [...versions]
    .map(([file, version]) => `  ${file}: ${version ?? "missing"}`)
    .join("\n");
  throw new Error(`Release metadata versions must match ${pkg.version}:\n${details}`);
}

const registryEnvironment = registry.packages?.[0]?.environmentVariables ?? [];
for (const name of ["DIVOOM_DEVICE_HOST", "DIVOOM_DEVICE_PORT", "DIVOOM_DEVICE_MODEL", "DIVOOM_TIMEOUT_MS"]) {
  if (!registryEnvironment.some((entry) => entry.name === name)) {
    throw new Error(`server.json is missing ${name}`);
  }
}

process.stdout.write(`Release metadata is aligned at ${pkg.version}.\n`);
