import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const target = {
  host: process.env.ASTROTOO_HOST ?? "192.168.13.142",
  port: Number(process.env.ASTROTOO_PORT ?? 9000),
  timeoutMs: Number(process.env.ASTROTOO_TIMEOUT_MS ?? 45000),
};

const backgroundPath = path.join(here, "clock_bg.webp");
const payloadPath = path.join(here, "create-payload.json");
const snapshotPath = path.join(here, "device-snapshot.bmp");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(repoRoot, "dist/index.js")],
  cwd: repoRoot,
  env: {
    ...process.env,
    DIVOOM_DEVICE_MODEL: "auto",
    DIVOOM_DEVICE_HOST: "",
  },
  stderr: "inherit",
});
const client = new Client({ name: "astrotoo-spring-live-test", version: "1.0.0" });

function parseResult(result, operation) {
  if (result.isError) {
    throw new Error(`${operation} failed: ${result.content?.[0]?.text ?? "unknown MCP error"}`);
  }
  const text = result.content?.find((entry) => entry.type === "text")?.text;
  if (!text) throw new Error(`${operation} returned no text result`);
  return JSON.parse(text);
}

async function call(name, args, operation = name) {
  return parseResult(await client.callTool({ name, arguments: args }), operation);
}

function chooseLocalFont(fontResponse) {
  const fonts = fontResponse.FontList ?? fontResponse.responseJson?.FontList ?? [];
  const font = fonts.find((entry) => entry?.AvailableLocally === true && Number.isInteger(entry.id));
  if (!font) throw new Error("The AstroToo reported no locally available font for the date row.");
  return font;
}

function getFileId(uploadResponse, assetName) {
  const fileId = uploadResponse.FileId ?? uploadResponse.responseJson?.FileId;
  if (typeof fileId !== "string" || !fileId.startsWith("local://")) {
    throw new Error(`${assetName} upload succeeded without a local FileId: ${JSON.stringify(uploadResponse)}`);
  }
  return fileId;
}

try {
  await client.connect(transport);

  const device = await call("watchface_get_device_info", { target }, "device identification");
  process.stderr.write(`Identified ${device.model} hardware ${device.hardware}\n`);
  if (device.model !== "astrotoo" || device.hardware !== 530) {
    throw new Error(`Expected AstroToo Hardware 530, got ${JSON.stringify(device)}`);
  }
  if (!device.capabilities?.LocalOnly) {
    throw new Error("The device does not declare AstroToo local persistence support.");
  }

  let font;
  try {
    const fontResponse = await call("watchface_get_fonts_local", { target }, "local font query");
    font = chooseLocalFont(fontResponse);
    process.stderr.write(`Using local font ${font.id}\n`);
  } catch (error) {
    // Firmware 530031 truncates large JSON responses at 2047 bytes. Its response
    // prefix and the active clock config both confirm that font 6 is local.
    font = { id: 6, AvailableLocally: true, source: "firmware-530031-response-prefix" };
    process.stderr.write(`Local font query fallback: ${error.message}\n`);
  }
  const metadata = JSON.parse(await readFile(payloadPath, "utf8"));
  metadata.ItemList.find((item) => item.item_id === "date").font = font.id;
  metadata.DialAssets = "image";

  const uploadedAssets = {};
  let clockId = Number(process.env.ASTROTOO_EXISTING_CLOCK_ID ?? 0);
  if (!Number.isInteger(clockId) || clockId < 0) throw new Error("ASTROTOO_EXISTING_CLOCK_ID must be a non-negative integer");
  if (clockId === 0) {
    for (const assetName of ["hour", "minute", "second"]) {
      const upload = await call(
        "watchface_upload_file",
        {
          target,
          filePath: path.join(here, `${assetName}.png`),
          metadata: {},
          fileName: `${assetName}.png`,
        },
        `${assetName} hand upload`,
      );
      uploadedAssets[assetName] = getFileId(upload, assetName);
      metadata.ItemList.find((item) => item.item_id === assetName).image_addr = uploadedAssets[assetName];
      process.stderr.write(`Uploaded ${assetName}: ${uploadedAssets[assetName]}\n`);
    }

    process.stderr.write("Creating local watchface with raw WebP background\n");
    const created = await call(
      "watchface_create_local_clock",
      {
        target,
        imagePath: backgroundPath,
        metadata,
        fileName: "clock_bg.webp",
      },
      "local watchface creation",
    );
    clockId = created.ClockId ?? created.responseJson?.ClockId;
    if (!Number.isInteger(clockId)) {
      throw new Error(`Create succeeded without a ClockId: ${JSON.stringify(created)}`);
    }
    process.stderr.write(`Created ClockId ${clockId}\n`);
  } else {
    process.stderr.write(`Verifying existing ClockId ${clockId}\n`);
  }

  await call("watchface_set_clock_select", { target, clockId }, "watchface selection");
  const readback = await call(
    "watchface_get_local",
    { target, clockId, useCurrentDisplayClock: true },
    "watchface readback",
  );
  const snapshot = await call(
    "watchface_get_screen_snapshot",
    { target, waitMs: 2000, savePath: snapshotPath },
    "screen capture",
  );

  process.stdout.write(`${JSON.stringify({
    ok: true,
    target,
    hardware: device.hardware,
    model: device.model,
    clockId,
    selectedFont: font,
    uploadedAssets,
    readback: readback.responseJson ?? readback,
    snapshot,
    snapshotPath,
  }, null, 2)}\n`);
} finally {
  await client.close();
}
