/**
 * Assembles mcpb/staging/ with dist/, resources/, production node_modules, and manifest.json
 * for `mcpb pack`. Run from repo root after `npm run build`.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const staging = path.join(root, "mcpb", "staging");
const manifestSrc = path.join(root, "mcpb", "manifest.json");

function main() {
  console.log("MCPB staging: preparing directory...");
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

  if (!existsSync(path.join(root, "dist", "index.js"))) {
    console.error("dist/index.js missing; run: npm run build");
    process.exit(1);
  }

  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  const manifest = JSON.parse(readFileSync(manifestSrc, "utf8"));
  manifest.version = pkg.version;
  writeFileSync(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  cpSync(path.join(root, "dist"), path.join(staging, "dist"), { recursive: true });
  cpSync(path.join(root, "resources"), path.join(staging, "resources"), { recursive: true });
  if (existsSync(path.join(root, "LICENSE"))) {
    cpSync(path.join(root, "LICENSE"), path.join(staging, "LICENSE"));
  }

  const prodPkg = {
    name: pkg.name,
    version: pkg.version,
    type: "module",
    private: true,
    dependencies: { ...pkg.dependencies },
  };
  writeFileSync(path.join(staging, "package.json"), `${JSON.stringify(prodPkg, null, 2)}\n`, "utf8");

  console.log("Running npm install --omit=dev in staging (may take several minutes on network drives)...");
  console.log("Staging path:", staging);
  const r = spawnSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--loglevel", "warn"], {
    cwd: staging,
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }

  console.log("MCPB staging ready:", staging);
}

main();
