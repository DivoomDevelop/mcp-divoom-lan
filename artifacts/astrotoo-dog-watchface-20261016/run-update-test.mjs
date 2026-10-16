import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const target = { host: "192.168.13.142", port: 9000, timeoutMs: 45000 };
const snapshotPath = path.join(here, "device-snapshot-updated.bmp");
const resultPath = path.join(here, "update-test-result.json");

for (const output of [snapshotPath, resultPath]) {
  if (fs.existsSync(output)) throw new Error(`Refusing to overwrite ${output}`);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(repoRoot, "dist/index.js")],
  cwd: repoRoot,
  env: { ...process.env, DIVOOM_DEVICE_HOST: "", DIVOOM_DEVICE_MODEL: "auto" },
  stderr: "pipe",
});
transport.stderr?.on("data", (data) => process.stderr.write(data));
const client = new Client({ name: "astrotoo-dog-watchface-update-test", version: "1.0.0" });

function unwrap(result, name) {
  if (result.isError) throw new Error(`${name}: ${result.content?.map((part) => part.text ?? "").join("\n")}`);
  const text = result.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error(`${name}: missing text result`);
  return JSON.parse(text);
}

const call = async (name, args) => unwrap(await client.callTool({ name, arguments: args }), name);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const responseBody = (value) => value.responseJson ?? value;

const itemPatchList = [
  { index: 0, patch: { x: 18, y: 18, w: 292, h: 94, size: 78, color_1: "#D7FBFF", color_2: "#163B46" } },
  { index: 1, patch: { x: 24, y: 112, w: 230, h: 38, size: 27, color_1: "#FFE39A", color_2: "#3C4426" } },
  { index: 2, patch: { x: 24, y: 148, w: 180, h: 32, size: 24, color_1: "#B9F4E5", color_2: "#21473D" } },
  { index: 3, patch: { x: 24, y: 316, w: 200, h: 36, size: 24, color_1: "#FFFFFF", color_2: "#264B3B" } },
  { index: 4, patch: { x: 22, y: 354, w: 118, h: 60, size: 46, color_1: "#FFE79B", color_2: "#4F4020" } },
  { index: 5, patch: { x: 142, y: 374, w: 170, h: 36, size: 22, color_1: "#E7FFF8", color_2: "#264B3B" } },
];

const result = { startedAt: new Date().toISOString(), target, itemPatchList };
try {
  await client.connect(transport);
  result.device = await call("watchface_get_device_info", { target });
  result.before = await call("watchface_get_local", { target, clockId: 60000 });
  result.patch = await call("watchface_patch_local", { target, itemPatchList });
  result.select = await call("watchface_set_clock_select", { target, clockId: 60000, sysUpdateTime: 0 });
  await sleep(2500);
  result.after = await call("watchface_get_local", { target, clockId: 60000 });
  const afterItems = responseBody(result.after).ItemList ?? [];
  for (const { index, patch } of itemPatchList) {
    for (const [key, expected] of Object.entries(patch)) {
      const actual = afterItems[index]?.[key];
      if (typeof expected === "string") {
        if (String(actual).toLowerCase() !== expected.toLowerCase()) {
          throw new Error(`Readback mismatch at ItemList[${index}].${key}: ${actual} !== ${expected}`);
        }
      } else if (actual !== expected) {
        throw new Error(`Readback mismatch at ItemList[${index}].${key}: ${actual} !== ${expected}`);
      }
    }
  }
  result.snapshot = await call("watchface_get_screen_snapshot", {
    target, waitMs: 1000, savePath: snapshotPath,
  });
  result.snapshotFile = {
    path: snapshotPath,
    bytes: fs.statSync(snapshotPath).size,
    sha256: sha256(snapshotPath),
  };
  result.completedAt = new Date().toISOString();
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  process.stdout.write(JSON.stringify({
    ok: true,
    model: result.device.model,
    hardware: result.device.hardware,
    clockId: 60000,
    patchedItems: itemPatchList.length,
    readbackVerified: true,
    snapshot: result.snapshotFile,
    resultPath,
  }, null, 2) + "\n");
} finally {
  await client.close();
}
