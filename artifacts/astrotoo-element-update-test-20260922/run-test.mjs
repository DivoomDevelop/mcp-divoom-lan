import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const base = path.resolve("artifacts/astrotoo-element-update-test-20260922");
const beforePath = path.join(base, "before-update.bmp");
const afterPath = path.join(base, "after-update.bmp");
for (const output of [beforePath, afterPath, path.join(base, "test-result.json")]) {
  if (fs.existsSync(output)) throw new Error(`Refusing to overwrite ${output}`);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/index.js"],
  env: {
    ...process.env,
    DIVOOM_DEVICE_HOST: "192.168.13.142",
    DIVOOM_DEVICE_PORT: "9000",
    DIVOOM_DEVICE_MODEL: "auto",
    DIVOOM_TIMEOUT_MS: "45000",
  },
  stderr: "pipe",
});
transport.stderr?.on("data", (data) => process.stderr.write(data));

const client = new Client({ name: "astrotoo-multifile-update-test", version: "1.0.0" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const unwrap = (result) => {
  if (result.isError) {
    throw new Error(result.content?.map((part) => part.text || "").join("\n") || "MCP tool failed");
  }
  const text = result.content?.find((part) => part.type === "text")?.text;
  return text ? JSON.parse(text) : result;
};
const call = async (name, args) => unwrap(await client.callTool({ name, arguments: args }));
const upload = async (file) => {
  const fullPath = path.join(base, file);
  const result = await call("watchface_upload_file", {
    filePath: fullPath,
    fileName: file,
    metadata: {},
  });
  const fileId = result.responseJson?.FileId;
  if (typeof fileId !== "string" || !fileId.startsWith("local://")) {
    throw new Error(`Missing FileId for ${file}: ${JSON.stringify(result)}`);
  }
  return { file, bytes: fs.statSync(fullPath).size, fileId };
};
const item = (item_id, disp, font, x, y, w, h, size, alig, hier, color_1, image_addr = "") => ({
  item_id, disp, font, x, y, w, h, size, alig, sep: 0, angle: 0, hier,
  transp: 100, animation: 0, image_id: 0, image_addr, color_1, color_2: "#000000",
});
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const result = { startedAt: new Date().toISOString(), initialUploads: [], updateUploads: [] };
try {
  await client.connect(transport);
  const info = await call("watchface_get_device_info", {});
  result.device = {
    model: info.model,
    hardware: info.hardware,
    firmware: info.capabilities?.FirmwareVersion,
    canvas: info.canvas,
    transfer: info.capabilities?.AssetTransfer,
  };
  console.log("DEVICE=" + JSON.stringify(result.device));

  for (const file of ["hour-initial.png", "minute-initial.png", "second-initial.png"]) {
    const uploaded = await upload(file);
    result.initialUploads.push(uploaded);
    console.log("INITIAL_UPLOAD=" + JSON.stringify(uploaded));
  }

  const initialRefs = Object.fromEntries(result.initialUploads.map((entry) => [entry.file, entry.fileId]));
  const itemIdList = ["hour", "minute", "second", "date", "weekday", "weather_range", "temperature"];
  const itemList = [
    item("hour", 131, 6, 40, 20, 400, 400, 0, 3, 1, "#FFFFFF", initialRefs["hour-initial.png"]),
    item("minute", 132, 6, 40, 20, 400, 400, 0, 3, 1, "#FFFFFF", initialRefs["minute-initial.png"]),
    item("second", 233, 6, 40, 20, 400, 400, 0, 3, 2, "#FFFFFF", initialRefs["second-initial.png"]),
    item("date", 156, 36, 18, 422, 122, 42, 26, 4, 2, "#FFFFFF"),
    item("weekday", 37, 36, 142, 422, 88, 42, 24, 3, 2, "#FFFFFF"),
    item("weather_range", 157, 36, 215, 422, 145, 42, 16, 3, 2, "#FFFFFF"),
    item("temperature", 339, 36, 368, 422, 94, 42, 22, 4, 2, "#FFFFFF"),
  ];
  const background = path.join(base, "background.jpg");
  const created = await call("watchface_create_local_clock", {
    imagePath: background,
    metadata: { ClockName: "多文件元素更新测试", DialAssets: "image", ItemIdList: itemIdList, ItemList: itemList },
  });
  result.create = {
    response: created.responseJson,
    background: { file: "background.jpg", bytes: fs.statSync(background).size },
    totalFiles: 1 + result.initialUploads.length,
  };
  result.clockId = created.responseJson?.ClockId;
  if (!Number.isInteger(result.clockId)) throw new Error(`Missing ClockId: ${JSON.stringify(created)}`);
  console.log("CREATE=" + JSON.stringify(result.create));

  await call("watchface_set_clock_select", { clockId: result.clockId, sysUpdateTime: 0 });
  await sleep(2500);
  const before = await call("watchface_get_screen_snapshot", { waitMs: 500, savePath: beforePath });
  result.before = { format: before.format, bytes: before.byteLength, sha256: sha256(beforePath) };
  console.log("BEFORE=" + JSON.stringify(result.before));

  for (const file of ["minute-updated.png", "second-updated.png"]) {
    const uploaded = await upload(file);
    result.updateUploads.push(uploaded);
    console.log("UPDATE_UPLOAD=" + JSON.stringify(uploaded));
  }
  const updateRefs = Object.fromEntries(result.updateUploads.map((entry) => [entry.file, entry.fileId]));
  const patch = await call("watchface_patch_local", {
    clockId: result.clockId,
    itemPatchList: [
      { index: 1, patch: { image_addr: updateRefs["minute-updated.png"] } },
      { index: 2, patch: { image_addr: updateRefs["second-updated.png"] } },
      { index: 3, patch: { color_1: "#FFD54F", size: 28, y: 414 } },
      { index: 4, patch: { color_1: "#80DEEA", size: 26, y: 414 } },
    ],
  });
  result.patch = {
    response: patch.responseJson,
    updatedImageFiles: result.updateUploads.length,
    changedIndexes: [1, 2, 3, 4],
  };
  console.log("PATCH=" + JSON.stringify({
    ReturnCode: patch.responseJson?.ReturnCode,
    ClockId: patch.responseJson?.ClockId,
    updatedImageFiles: result.patch.updatedImageFiles,
  }));

  await call("watchface_set_clock_select", { clockId: result.clockId, sysUpdateTime: 0 });
  await sleep(2500);
  const after = await call("watchface_get_screen_snapshot", { waitMs: 500, savePath: afterPath });
  result.after = { format: after.format, bytes: after.byteLength, sha256: sha256(afterPath) };
  const readback = await call("watchface_get_local", { clockId: result.clockId });
  const body = readback.responseJson ?? readback;
  result.readback = {
    ReturnCode: body.ReturnCode,
    ClockId: body.ClockId,
    name: body.NameCn ?? body.ClockName,
    itemCount: Array.isArray(body.ItemList) ? body.ItemList.length : null,
    minuteImage: body.ItemList?.[1]?.image_addr,
    secondImage: body.ItemList?.[2]?.image_addr,
    dateColor: body.ItemList?.[3]?.color_1,
    weekdayColor: body.ItemList?.[4]?.color_1,
  };
  result.changedPixels = result.before.sha256 !== result.after.sha256;
  result.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(base, "test-result.json"), JSON.stringify(result, null, 2));
  console.log("AFTER=" + JSON.stringify(result.after));
  console.log("READBACK=" + JSON.stringify(result.readback));
  console.log("CHANGED=" + result.changedPixels);
} finally {
  await client.close();
}
