import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

type JsonRecord = Record<string, unknown>;

type DeviceTarget = {
  host: string;
  port: number;
  timeoutMs: number;
};

const DEFAULT_HOST = (process.env.DIVOOM_DEVICE_HOST ?? "").trim();
const DEFAULT_PORT = parseIntegerOrDefault(process.env.DIVOOM_DEVICE_PORT, 9000);
const DEFAULT_TIMEOUT_MS = parseIntegerOrDefault(process.env.DIVOOM_TIMEOUT_MS, 45_000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resourceRoot = path.resolve(__dirname, "../resources");

const RESOURCES = [
  {
    uri: "divoom://guide/quick-reference",
    name: "Divoom Watchface Guide Quick Reference",
    description:
      "Key LAN API constraints and command flow for watchface customization.",
    mimeType: "text/markdown",
    fileName: "guide-quick-reference.md",
  },
  {
    uri: "divoom://skill/watchface-customization",
    name: "Divoom Watchface Skill Prompt",
    description:
      "Compact prompt that teaches agents how to safely operate the Divoom LAN API.",
    mimeType: "text/markdown",
    fileName: "skill-quick-reference.md",
  },
] as const;

const targetSchema = {
  type: "object",
  description:
    "Optional per-call target override. If omitted, environment variables are used.",
  properties: {
    host: {
      type: "string",
      description: "Device LAN IP. Example: 192.168.1.120",
    },
    port: {
      type: "integer",
      description: "Device HTTP port, commonly 9000.",
      default: 9000,
    },
    timeoutMs: {
      type: "integer",
      description: "HTTP timeout in milliseconds.",
      default: 45000,
    },
  },
  additionalProperties: false,
};

const tools: Tool[] = [
  {
    name: "watchface_get_local",
    description:
      "Call Device/GetLocalClockInfo for current or explicit clock id.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        clockId: { type: "integer" },
        useCurrentDisplayClock: { type: "boolean" },
        parentClockId: { type: "integer" },
        parentItemId: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_patch_local",
    description:
      "Call Device/PatchLocalClockInfo. Supports ItemPatchList, ItemPatchByRoleList, and image URLs.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        clockId: { type: "integer" },
        useCurrentDisplayClock: { type: "boolean" },
        deviceImageUrl: { type: "string" },
        devicePreviewImageUrl: { type: "string" },
        devicePreviewImageUrl2: { type: "string" },
        setColorList: {
          type: "array",
          items: { type: "integer" },
        },
        itemList: {
          type: "array",
          items: { type: "object" },
        },
        itemIdList: {
          type: "array",
          items: { type: "integer" },
        },
        itemPatchList: {
          type: "array",
          items: { type: "object" },
        },
        itemPatchByRoleList: {
          type: "array",
          items: { type: "object" },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_get_fonts_local",
    description: "Call Device/GetLocalFontList.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_get_store_market_list",
    description:
      "Call Device/GetStoreClockMarketList after device prefetch has populated in-memory store data.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_set_clock_select",
    description: "Call Channel/SetClockSelectId with ClockId.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        clockId: { type: "integer" },
      },
      required: ["clockId"],
      additionalProperties: false,
    },
  },
  {
    name: "watchface_get_brightness",
    description: "Call Sys/GetBrightness.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_set_brightness",
    description: "Call Channel/SetBrightness with Brightness.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        brightness: { type: "integer" },
      },
      required: ["brightness"],
      additionalProperties: false,
    },
  },
  {
    name: "watchface_replace_dial_bg_file",
    description:
      "POST /replace_clock_dial_bg using multipart (Device/ReplaceClockDialBgFile). Does not modify DeviceImageUrl.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        imagePath: {
          type: "string",
          description: "Absolute or relative image file path (JPEG/WebP, 800x1280 recommended).",
        },
        clockId: { type: "integer" },
        useCurrentDisplayClock: { type: "boolean" },
        filePartName: {
          type: "string",
          description: "Second multipart part name. Default is current UTC ms timestamp.",
        },
        fileName: {
          type: "string",
          description: "Filename in multipart header. Defaults to basename(imagePath).",
        },
      },
      required: ["imagePath"],
      additionalProperties: false,
    },
  },
  {
    name: "watchface_upload_file",
    description:
      "POST /upload with multipart. First JSON part is caller-provided metadata (product-specific Command).",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        filePath: { type: "string" },
        metadata: { type: "object" },
        filePartName: {
          type: "string",
          description: "Second multipart part name. Default is current UTC ms timestamp.",
        },
        fileName: {
          type: "string",
          description: "Filename in multipart header. Defaults to basename(filePath).",
        },
      },
      required: ["filePath", "metadata"],
      additionalProperties: false,
    },
  },
  {
    name: "watchface_create_local_clock",
    description:
      "POST /create_local_clock with multipart. Auto-enforces Command=Device/CreateLocalClock and ReturnCode=0 in first part JSON.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        imagePath: { type: "string" },
        metadata: {
          type: "object",
          description:
            "First multipart JSON body. Include ClockName and ItemList. Tool will minify JSON automatically.",
        },
        filePartName: {
          type: "string",
          description: "Second multipart part name. Default is current UTC ms timestamp.",
        },
        fileName: {
          type: "string",
          description: "Filename in multipart header. Defaults to basename(imagePath).",
        },
      },
      required: ["imagePath", "metadata"],
      additionalProperties: false,
    },
  },
  {
    name: "watchface_reset_local_then_cloud",
    description:
      "Call Device/ResetLocalClockFromServer. This deletes local sys-side files before optional cloud refresh.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        clockId: { type: "integer" },
        parentClockId: { type: "integer" },
        parentItemId: { type: "integer" },
      },
      required: ["clockId"],
      additionalProperties: false,
    },
  },
  {
    name: "watchface_raw_command",
    description:
      "Raw POST /divoom_api command wrapper. Command is required; payload object is merged with enforced ReturnCode=0.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        command: { type: "string" },
        payload: { type: "object" },
      },
      required: ["command"],
      additionalProperties: false,
    },
  },
  {
    name: "watchface_protocol_quick_reference",
    description:
      "Return concise operational constraints extracted from the public guide and skill.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

function parseIntegerOrDefault(input: string | undefined, fallback: number): number {
  if (!input) {
    return fallback;
  }
  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureRecord(input: unknown, fieldName: string): JsonRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${fieldName} must be an object.`);
  }
  return input as JsonRecord;
}

function optionalInteger(input: unknown, fieldName: string): number | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (typeof input !== "number" || !Number.isInteger(input)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
  return input;
}

function requiredInteger(input: unknown, fieldName: string): number {
  const value = optionalInteger(input, fieldName);
  if (value === undefined) {
    throw new Error(`${fieldName} is required.`);
  }
  return value;
}

function optionalString(input: unknown, fieldName: string): string | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return input;
}

function requiredString(input: unknown, fieldName: string): string {
  const value = optionalString(input, fieldName);
  if (!value) {
    throw new Error(`${fieldName} is required.`);
  }
  return value;
}

function optionalBoolean(input: unknown, fieldName: string): boolean | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (typeof input !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }
  return input;
}

function ensureArray(input: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(input)) {
    throw new Error(`${fieldName} must be an array.`);
  }
  return input;
}

function resolveTarget(input: unknown): DeviceTarget {
  const source = input === undefined ? {} : ensureRecord(input, "target");
  const host = optionalString(source.host, "target.host") ?? DEFAULT_HOST;
  if (!host) {
    throw new Error(
      "Missing target host. Provide target.host in tool arguments, or set DIVOOM_DEVICE_HOST.",
    );
  }

  const port = optionalInteger(source.port, "target.port") ?? DEFAULT_PORT;
  const timeoutMs = optionalInteger(source.timeoutMs, "target.timeoutMs") ?? DEFAULT_TIMEOUT_MS;
  if (port <= 0) {
    throw new Error("target.port must be > 0.");
  }
  if (timeoutMs <= 0) {
    throw new Error("target.timeoutMs must be > 0.");
  }
  return { host, port, timeoutMs };
}

function toDeviceFlag(value: boolean | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? 1 : 0;
}

async function postJson(target: DeviceTarget, endpoint: string, payload: JsonRecord) {
  const url = `http://${target.host}:${target.port}${endpoint}`;
  const payloadText = JSON.stringify(payload);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Content-Length": Buffer.byteLength(payloadText, "utf8").toString(),
    },
    body: payloadText,
    signal: AbortSignal.timeout(target.timeoutMs),
  });
  const responseText = await response.text();

  let responseJson: unknown = null;
  if (responseText.trim().length > 0) {
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }
  }

  return {
    url,
    endpoint,
    httpStatus: response.status,
    request: payload,
    responseJson,
    responseText,
  };
}

function buildMultipartTwoParts(
  meta: JsonRecord,
  fileBytes: Buffer,
  filePartName: string,
  fileName: string,
  boundary: string,
): Buffer {
  const crlf = "\r\n";
  const metaBytes = Buffer.from(JSON.stringify(meta), "utf8");
  const safePartName = filePartName.replace(/"/g, "");
  const safeFileName = fileName.replace(/"/g, "");

  const part1Header = Buffer.from(
    `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="json"; filename="cmd.json"${crlf}` +
      `Content-Type: application/json${crlf}` +
      `Content-Length: ${metaBytes.length}${crlf}${crlf}`,
    "utf8",
  );

  const part2Header = Buffer.from(
    `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="${safePartName}"; filename="${safeFileName}"${crlf}` +
      `Content-Type: application/octet-stream${crlf}` +
      `Content-Length: ${fileBytes.length}${crlf}${crlf}`,
    "utf8",
  );

  const ending = Buffer.from(`${crlf}--${boundary}--${crlf}`, "utf8");
  return Buffer.concat([part1Header, metaBytes, Buffer.from(crlf), part2Header, fileBytes, ending]);
}

async function postMultipart(
  target: DeviceTarget,
  endpoint: string,
  body: Buffer,
  boundary: string,
) {
  const url = `http://${target.host}:${target.port}${endpoint}`;
  const payload = new Uint8Array(body);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": body.length.toString(),
    },
    body: payload,
    signal: AbortSignal.timeout(target.timeoutMs),
  });
  const responseText = await response.text();

  let responseJson: unknown = null;
  if (responseText.trim().length > 0) {
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }
  }

  return {
    url,
    endpoint,
    httpStatus: response.status,
    responseJson,
    responseText,
  };
}

async function callDivoomApi(
  target: DeviceTarget,
  command: string,
  payload: JsonRecord = {},
) {
  const request = { ...payload, Command: command, ReturnCode: 0 };
  return postJson(target, "/divoom_api", request);
}

function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function readResource(uri: string) {
  const descriptor = RESOURCES.find((item) => item.uri === uri);
  if (!descriptor) {
    throw new Error(`Unknown resource URI: ${uri}`);
  }
  const absolutePath = path.join(resourceRoot, descriptor.fileName);
  const content = await readFile(absolutePath, "utf8");
  return {
    contents: [
      {
        uri: descriptor.uri,
        mimeType: descriptor.mimeType,
        text: content,
      },
    ],
  };
}

async function handleToolCall(name: string, rawArgs: unknown) {
  const args = rawArgs === undefined ? {} : ensureRecord(rawArgs, "arguments");

  if (name === "watchface_get_local") {
    const target = resolveTarget(args.target);
    const body: JsonRecord = {};
    const clockId = optionalInteger(args.clockId, "clockId");
    const useCurrentDisplayClock = optionalBoolean(
      args.useCurrentDisplayClock,
      "useCurrentDisplayClock",
    );
    const parentClockId = optionalInteger(args.parentClockId, "parentClockId");
    const parentItemId = optionalInteger(args.parentItemId, "parentItemId");

    if (clockId !== undefined) {
      body.ClockId = clockId;
    }
    if (useCurrentDisplayClock !== undefined) {
      body.UseCurrentDisplayClock = toDeviceFlag(useCurrentDisplayClock);
    }
    if (clockId === undefined && useCurrentDisplayClock === undefined) {
      body.UseCurrentDisplayClock = 1;
    }
    if (parentClockId !== undefined) {
      body.ParentClockId = parentClockId;
    }
    if (parentItemId !== undefined) {
      body.ParentItemId = parentItemId;
    }

    return callDivoomApi(target, "Device/GetLocalClockInfo", body);
  }

  if (name === "watchface_patch_local") {
    const target = resolveTarget(args.target);
    const body: JsonRecord = {};

    const clockId = optionalInteger(args.clockId, "clockId");
    const useCurrentDisplayClock = optionalBoolean(
      args.useCurrentDisplayClock,
      "useCurrentDisplayClock",
    );

    if (clockId !== undefined) {
      body.ClockId = clockId;
    }
    if (useCurrentDisplayClock !== undefined) {
      body.UseCurrentDisplayClock = toDeviceFlag(useCurrentDisplayClock);
    }
    if (clockId === undefined && useCurrentDisplayClock === undefined) {
      body.UseCurrentDisplayClock = 1;
    }

    if (args.deviceImageUrl !== undefined) {
      body.DeviceImageUrl = requiredString(args.deviceImageUrl, "deviceImageUrl");
    }
    if (args.devicePreviewImageUrl !== undefined) {
      body.DevicePreviewImageUrl = requiredString(
        args.devicePreviewImageUrl,
        "devicePreviewImageUrl",
      );
    }
    if (args.devicePreviewImageUrl2 !== undefined) {
      body.DevicePreviewImageUrl2 = requiredString(
        args.devicePreviewImageUrl2,
        "devicePreviewImageUrl2",
      );
    }
    if (args.setColorList !== undefined) {
      body.SetColorList = ensureArray(args.setColorList, "setColorList");
    }
    if (args.itemList !== undefined) {
      body.ItemList = ensureArray(args.itemList, "itemList");
    }
    if (args.itemIdList !== undefined) {
      body.ItemIdList = ensureArray(args.itemIdList, "itemIdList");
    }
    if (args.itemPatchList !== undefined) {
      body.ItemPatchList = ensureArray(args.itemPatchList, "itemPatchList");
    }
    if (args.itemPatchByRoleList !== undefined) {
      body.ItemPatchByRoleList = ensureArray(
        args.itemPatchByRoleList,
        "itemPatchByRoleList",
      );
    }

    return callDivoomApi(target, "Device/PatchLocalClockInfo", body);
  }

  if (name === "watchface_get_fonts_local") {
    const target = resolveTarget(args.target);
    return callDivoomApi(target, "Device/GetLocalFontList");
  }

  if (name === "watchface_get_store_market_list") {
    const target = resolveTarget(args.target);
    return callDivoomApi(target, "Device/GetStoreClockMarketList");
  }

  if (name === "watchface_set_clock_select") {
    const target = resolveTarget(args.target);
    const clockId = requiredInteger(args.clockId, "clockId");
    return callDivoomApi(target, "Channel/SetClockSelectId", { ClockId: clockId });
  }

  if (name === "watchface_get_brightness") {
    const target = resolveTarget(args.target);
    return callDivoomApi(target, "Sys/GetBrightness");
  }

  if (name === "watchface_set_brightness") {
    const target = resolveTarget(args.target);
    const brightness = requiredInteger(args.brightness, "brightness");
    return callDivoomApi(target, "Channel/SetBrightness", { Brightness: brightness });
  }

  if (name === "watchface_replace_dial_bg_file") {
    const target = resolveTarget(args.target);
    const imagePath = requiredString(args.imagePath, "imagePath");
    const imageBytes = await readFile(path.resolve(imagePath));
    const clockId = optionalInteger(args.clockId, "clockId");
    const useCurrentDisplayClock = optionalBoolean(
      args.useCurrentDisplayClock,
      "useCurrentDisplayClock",
    );

    const metadata: JsonRecord = {
      Command: "Device/ReplaceClockDialBgFile",
      ReturnCode: 0,
    };

    if (clockId !== undefined) {
      metadata.ClockId = clockId;
    }
    if (useCurrentDisplayClock !== undefined) {
      metadata.UseCurrentDisplayClock = toDeviceFlag(useCurrentDisplayClock);
    }
    if (clockId === undefined && useCurrentDisplayClock === undefined) {
      metadata.UseCurrentDisplayClock = 1;
    }

    const filePartName =
      optionalString(args.filePartName, "filePartName") ?? `${Date.now()}`;
    const fileName =
      optionalString(args.fileName, "fileName") ?? path.basename(path.resolve(imagePath));
    const boundary = "----DivoomMcpReplaceBgBoundary7YA4YWxkTrZu0gW";
    const body = buildMultipartTwoParts(metadata, imageBytes, filePartName, fileName, boundary);
    const result = await postMultipart(target, "/replace_clock_dial_bg", body, boundary);
    return {
      ...result,
      requestMeta: metadata,
      filePartName,
      fileName,
      imagePath: path.resolve(imagePath),
      imageBytes: imageBytes.length,
    };
  }

  if (name === "watchface_upload_file") {
    const target = resolveTarget(args.target);
    const filePath = requiredString(args.filePath, "filePath");
    const metadataInput = ensureRecord(args.metadata, "metadata");
    const metadata: JsonRecord = { ...metadataInput, ReturnCode: 0 };

    const fileBytes = await readFile(path.resolve(filePath));
    const filePartName =
      optionalString(args.filePartName, "filePartName") ?? `${Date.now()}`;
    const fileName =
      optionalString(args.fileName, "fileName") ?? path.basename(path.resolve(filePath));
    const boundary = "----DivoomMcpUploadBoundary7YA4YWxkTrZu0gW";
    const body = buildMultipartTwoParts(metadata, fileBytes, filePartName, fileName, boundary);
    const result = await postMultipart(target, "/upload", body, boundary);
    return {
      ...result,
      requestMeta: metadata,
      filePartName,
      fileName,
      filePath: path.resolve(filePath),
      fileBytes: fileBytes.length,
    };
  }

  if (name === "watchface_create_local_clock") {
    const target = resolveTarget(args.target);
    const imagePath = requiredString(args.imagePath, "imagePath");
    const metadataInput = ensureRecord(args.metadata, "metadata");
    const metadata: JsonRecord = {
      ...metadataInput,
      Command: "Device/CreateLocalClock",
      ReturnCode: 0,
    };

    const imageBytes = await readFile(path.resolve(imagePath));
    const filePartName =
      optionalString(args.filePartName, "filePartName") ?? `${Date.now()}`;
    const fileName =
      optionalString(args.fileName, "fileName") ?? path.basename(path.resolve(imagePath));
    const boundary = "----DivoomMcpCreateClockBoundary7YA4YWxkTrZu0gW";
    const body = buildMultipartTwoParts(metadata, imageBytes, filePartName, fileName, boundary);
    const result = await postMultipart(target, "/create_local_clock", body, boundary);
    return {
      ...result,
      requestMeta: metadata,
      filePartName,
      fileName,
      imagePath: path.resolve(imagePath),
      imageBytes: imageBytes.length,
    };
  }

  if (name === "watchface_reset_local_then_cloud") {
    const target = resolveTarget(args.target);
    const clockId = requiredInteger(args.clockId, "clockId");
    const parentClockId = optionalInteger(args.parentClockId, "parentClockId");
    const parentItemId = optionalInteger(args.parentItemId, "parentItemId");
    const payload: JsonRecord = {
      ClockId: clockId,
    };
    if (parentClockId !== undefined) {
      payload.ParentClockId = parentClockId;
    }
    if (parentItemId !== undefined) {
      payload.ParentItemId = parentItemId;
    }
    return callDivoomApi(target, "Device/ResetLocalClockFromServer", payload);
  }

  if (name === "watchface_raw_command") {
    const target = resolveTarget(args.target);
    const command = requiredString(args.command, "command");
    const payload =
      args.payload === undefined ? {} : ensureRecord(args.payload, "payload");
    return callDivoomApi(target, command, payload);
  }

  if (name === "watchface_protocol_quick_reference") {
    const lines = [
      "1) Always POST JSON to /divoom_api (never GET).",
      "2) Root ReturnCode in request must be 0.",
      "3) Read before write: GET current clock, then patch minimal fields.",
      "4) For background cache replacement without URL change: POST /replace_clock_dial_bg.",
      "5) For URL change workflow: POST /upload, then Device/PatchLocalClockInfo, then verify by GET.",
      "6) Multipart parts must include filename=\"...\" and per-part Content-Length.",
      "7) Typical image constraints: JPEG/WebP, exactly 800x1280, and below 512000 bytes.",
      "8) ResetLocalClockFromServer is destructive (deletes local sys files first).",
    ];
    return {
      rules: lines,
      resources: RESOURCES.map((item) => ({
        uri: item.uri,
        name: item.name,
      })),
    };
  }

  throw new Error(`Unsupported tool: ${name}`);
}

async function main() {
  const server = new Server(
    {
      name: "mcp-divoom-lan",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await handleToolCall(
        request.params.name,
        request.params.arguments,
      );
      return textResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Tool error: ${message}`,
          },
        ],
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    })),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    return readResource(request.params.uri);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[mcp-divoom-lan] running via stdio transport");
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
