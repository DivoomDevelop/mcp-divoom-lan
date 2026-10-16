import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const target = { host: "192.168.13.142", port: 9000, timeoutMs: 45000 };
const backgroundPath = path.join(here, "clock_bg.webp");
const snapshotPath = path.join(here, "device-snapshot.bmp");
const resultPath = path.join(here, "test-result.json");

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
const client = new Client({ name: "astrotoo-cat-background-update", version: "1.0.0" });

function unwrap(value, name) {
  if (value.isError) throw new Error(`${name}: ${value.content?.map((part) => part.text ?? "").join("\n")}`);
  const text = value.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error(`${name}: missing text result`);
  return JSON.parse(text);
}

const call = async (name, args) => unwrap(await client.callTool({ name, arguments: args }), name);
const responseBody = (value) => value.responseJson ?? value;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const result = { startedAt: new Date().toISOString(), target };
try {
  await client.connect(transport);
  result.device = await call("watchface_get_device_info", { target });
  result.before = await call("watchface_get_local", { target, clockId: 60000 });
  const before = responseBody(result.before);
  const itemList = before.ItemList;
  const itemIdList = before.ItemIdList;
  if (!Array.isArray(itemList) || itemList.length === 0 || !Array.isArray(itemIdList)) {
    throw new Error("ClockId 60000 does not have a reusable ItemList and ItemIdList");
  }

  const metadata = {
    ClockName: "春日猫咪天气",
    NameCn: "春日猫咪天气",
    NameEn: "Spring Cat Weather",
    DialAssets: "image",
    ItemList: itemList,
    ItemIdList: itemIdList,
    SetColorList: Array.isArray(before.SetColorList) ? before.SetColorList : [0, 0, 0, 0],
  };
  result.request = {
    metadata,
    backgroundPath,
    backgroundBytes: fs.statSync(backgroundPath).size,
    backgroundSha256: sha256(backgroundPath),
  };
  result.write = await call("watchface_create_local_clock", {
    target,
    imagePath: backgroundPath,
    fileName: "clock_bg.webp",
    metadata,
  });
  if (result.write.operation !== "updated" || Number(result.write.clockId) !== 60000) {
    throw new Error(`Expected ClockId 60000 update, got ${JSON.stringify(result.write)}`);
  }

  result.select = await call("watchface_set_clock_select", { target, clockId: 60000, sysUpdateTime: 0 });
  await sleep(2500);
  result.after = await call("watchface_get_local", { target, clockId: 60000 });
  const after = responseBody(result.after);
  if (Number(after.ClockId) !== 60000 || after.ItemList?.length !== itemList.length) {
    throw new Error("Updated watchface readback did not preserve the managed clock configuration");
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
    operation: result.write.operation,
    clockId: 60000,
    itemCount: after.ItemList.length,
    backgroundBytes: result.request.backgroundBytes,
    snapshot: result.snapshotFile,
    resultPath,
  }, null, 2) + "\n");
} finally {
  await client.close();
}
