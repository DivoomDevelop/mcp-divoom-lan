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
const client = new Client({ name: "astrotoo-dog-watchface-test", version: "1.0.0" });

function unwrap(result, name) {
  if (result.isError) throw new Error(`${name}: ${result.content?.map((part) => part.text ?? "").join("\n")}`);
  const text = result.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error(`${name}: missing text result`);
  return JSON.parse(text);
}
const call = async (name, args) => unwrap(await client.callTool({ name, arguments: args }), name);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function item(item_id, disp, font, x, y, w, h, size, color_1, color_2 = "#18334A") {
  return {
    item_id, disp, font, x, y, w, h, size, alig: 4, sep: 0, angle: 0,
    hier: 2, transp: 100, animation: 0, image_id: 0, image_addr: "",
    color_1, color_2,
  };
}

function localFontIds(response) {
  const body = response.responseJson ?? response;
  const rows = body.FontList ?? body.font_list ?? [];
  return rows.map((row) => Number(row?.id ?? row?.ID ?? row?.FontId ?? row)).filter(Number.isInteger);
}

const result = { startedAt: new Date().toISOString(), target };
try {
  await client.connect(transport);
  const device = await call("watchface_get_device_info", { target });
  result.device = device;
  if (device.model !== "astrotoo" || device.hardware !== 530) {
    throw new Error(`Expected AstroToo Hardware 530, got ${JSON.stringify(device)}`);
  }
  if (!device.capabilities?.LocalOnly) throw new Error("Device did not declare LocalOnly persistence");

  let fontQuery;
  let fontIds = [];
  try {
    fontQuery = await call("watchface_get_fonts_local", { target });
    fontIds = localFontIds(fontQuery);
  } catch (error) {
    fontQuery = { warning: String(error) };
  }
  const textFont = fontIds.includes(6) ? 6 : (fontIds[0] ?? 6);
  const timeFont = fontIds.includes(28) ? 28 : textFont;
  result.fonts = { availableIds: fontIds, timeFont, textFont, query: fontQuery };

  const itemList = [
    item("time", 4, timeFont, 22, 24, 270, 86, 72, "#FFF8E8"),
    item("date", 39, textFont, 26, 118, 230, 38, 28, "#FFF8E8"),
    item("weekday", 37, textFont, 26, 154, 180, 32, 23, "#DDF4FF"),
    item("weather", 54, textFont, 24, 334, 190, 34, 23, "#FFFFFF", "#234A37"),
    item("temperature", 254, timeFont, 24, 374, 105, 52, 38, "#FFF3C4", "#234A37"),
    item("temperature_range", 157, textFont, 126, 388, 165, 34, 20, "#FFFFFF", "#234A37"),
  ];
  const itemIdList = itemList.map((row) => row.item_id);
  const metadata = {
    ClockName: "春日柴犬天气",
    NameCn: "春日柴犬天气",
    NameEn: "Spring Shiba Weather",
    DialAssets: "image",
    ItemIdList: itemIdList,
    ItemList: itemList,
    SetColorList: [0, 0, 0, 0],
  };
  result.request = { metadata, backgroundPath, backgroundBytes: fs.statSync(backgroundPath).size };

  const written = await call("watchface_create_local_clock", {
    target,
    imagePath: backgroundPath,
    fileName: "clock_bg.webp",
    metadata,
  });
  result.write = written;
  const clockId = Number(written.clockId ?? written.ClockId ?? written.responseJson?.ClockId ?? 60000);
  if (clockId !== 60000) throw new Error(`Unexpected managed ClockId ${clockId}`);

  result.select = await call("watchface_set_clock_select", { target, clockId: 60000, sysUpdateTime: 0 });
  await sleep(2500);
  result.readback = await call("watchface_get_local", { target, clockId: 60000 });
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
    model: device.model,
    hardware: device.hardware,
    firmware: device.capabilities?.FirmwareVersion,
    operation: written.operation,
    clockId,
    fonts: { timeFont, textFont, reportedCount: fontIds.length },
    itemCount: itemList.length,
    snapshot: result.snapshotFile,
    resultPath,
  }, null, 2) + "\n");
} finally {
  await client.close();
}
