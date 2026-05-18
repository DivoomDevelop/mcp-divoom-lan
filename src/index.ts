import { readFileSync } from "node:fs";
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

const PKG_VERSION = JSON.parse(readFileSync(path.join(__dirname, "../package.json"), "utf8")).version as string;

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
  {
    uri: "divoom://font/catalog",
    name: "Divoom Watchface Font Catalog",
    description:
      "Curated TTF and image-font catalog (id, type, name, charset, script, style tags, recommended scenarios) sourced from the visual editor's font_info.cfg. Use it to pick `ItemList[i].font` ids without guessing.",
    mimeType: "application/json",
    fileName: "font-catalog.json",
  },
  {
    uri: "divoom://disp/catalog",
    name: "Divoom Watchface Disp Catalog",
    description:
      "Catalog of every `disp` id supported by this firmware (194 entries) with English symbol, Chinese description, and heuristic hints for whether the slot expects an image asset or vector text. Use to pick `ItemList[i].disp` and to decide whether the slot needs an `image_addr` asset.",
    mimeType: "application/json",
    fileName: "disp-catalog.json",
  },
  {
    uri: "divoom://watchface/schema",
    name: "Divoom Watchface JSON Schema",
    description:
      "JSON Schema (draft 2020-12) for the editor's watchface config (`ItemList[]`, `ItemIdList`, `ClockId`, names). Validate generated payloads before sending them to PatchLocalClockInfo / CreateLocalClock.",
    mimeType: "application/schema+json",
    fileName: "watchface-config.schema.json",
  },
  {
    uri: "divoom://watchface/example-minimal",
    name: "Minimal Watchface Example",
    description:
      "Smallest valid watchface JSON (single time row at 800x1280). Use as a starting template before adding more `ItemList` rows.",
    mimeType: "application/json",
    fileName: "examples/ai-minimal-watchface.json",
  },
  {
    uri: "divoom://guide/ai-watchface",
    name: "AI Watchface Authoring Guide",
    description:
      "Editor-side narrative on AI-assisted watchface authoring: canvas conventions, font rules, where the catalogs come from, regeneration workflow.",
    mimeType: "text/markdown",
    fileName: "ai-watchface-guide.md",
  },
  {
    uri: "divoom://templates/curated",
    name: "Curated Watchface Templates",
    description:
      "~20 designer-made skeleton watchfaces mined from the HTML editor's bundled marketplace configs (`public/template/config`). Each entry lists tags (weather, lunar, pixel_theme, …), stats, and a stripped `watchface` JSON (ClockId, names, ItemIdList, ItemList) safe to clone before swapping fonts/colors. Does not include DeviceImageUrl.",
    mimeType: "application/json",
    fileName: "templates-curated.json",
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
      "Patch local dial via Device/PatchLocalClockInfo with precheck. Defaults to POST /divoom_api (JSON only) for pure metadata edits. Prefer ItemPatchList (per-index field diff) — DO NOT include item_id inside patch.* unless the user explicitly asks to rename a slot, since the firmware will overwrite the device-side item_id and break menu/config bindings. When dialAssetsPath is set, switches to multipart POST /patch_local_clock: first JSON part (Device/PatchLocalClockInfo, optional DialAssets), second part single JPEG/WebP dial backdrop or clock_bg.tar.gz bundle. Element slots inside the tarball must be JPEG, WebP, or PNG (validated by firmware wf_validate_bundle_slot_image_file). Use ItemPatchList[].patch.bundle_image=<leaf> to bind a tar leaf to that slot's img_addr; supplying ItemList alone is a full-table replace and should be avoided unless the row count actually changes.",
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
        dialAssetsPath: {
          type: "string",
          description:
            "Optional second multipart part. Either a single JPEG/WebP dial backdrop (`clock_bg.jpg|webp`, validated by divoom_watchface_replace_clock_dial_bg_validate_saved_file) or a `clock_bg.tar.gz` bundle. The tarball may contain `clock_bg.jpg|webp` plus the leaves listed by `ItemPatchList[].patch.bundle_image`. Element leaves inside the tar may be JPEG/WebP/PNG (PNG is element-only; backdrop must be JPEG/WebP). When set, the tool POSTs `/patch_local_clock` with the firmware-strict multipart layout.",
        },
        filePartName: {
          type: "string",
          description:
            "Multipart field name for dialAssetsPath part. Default is current UTC ms timestamp.",
        },
        fileName: {
          type: "string",
          description:
            "Multipart filename header for dialAssetsPath. Defaults to basename(dialAssetsPath).",
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
    name: "watchface_onoff_screen",
    description: "Call Channel/OnOffScreen with OnOff (1=on, 0=off).",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        onOff: {
          type: "integer",
          enum: [0, 1],
          description: "1 turns screen on, 0 turns screen off.",
        },
      },
      required: ["onOff"],
      additionalProperties: false,
    },
  },
  {
    name: "watchface_replace_dial_bg_file",
    description:
      "POST /replace_clock_dial_bg using multipart (Device/ReplaceClockDialBgFile). Replaces the cached dial bitmap only — does NOT modify cfg DeviceImageUrl, and does NOT accept tar.gz. Backdrop is validated by divoom_watchface_replace_clock_dial_bg_validate_saved_file: JPEG (FF D8) or WebP (RIFF…WEBP) only, ≤ 500 KiB (DIVOOM_REPLACE_DIAL_BG_MAX_FILE_BYTES), recommended 800x1280 portrait.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        imagePath: {
          type: "string",
          description:
            "Absolute or relative image file path. Backdrop must be JPEG (FF D8) or WebP (RIFF…WEBP); PNG/GIF are rejected. Recommended 800x1280, ≤ 500 KiB.",
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
      "POST /create_local_clock (multipart) — Device/CreateLocalClock. metadata.DialAssets accepts 'auto' (default; sniffs gzip magic on the file part), 'image' (single JPEG/WebP backdrop), or 'bundle' (clock_bg.tar.gz). Legacy UseDialAssetBundle (0=image, non-0=bundle) is honored when DialAssets is omitted. Backdrop is JPEG/WebP only; element slots inside the tarball accept JPEG/WebP/PNG (firmware wf_validate_bundle_slot_image_file). Each ItemList[i] needs disp/font/x/y/w/h/size/alig numbers and color_1/color_2/item_id non-empty strings; ItemIdList must be a parallel non-empty string array. alig: 3=center, 4=left, 5=right.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        imagePath: {
          type: "string",
          description:
            "Either a single JPEG/WebP dial backdrop (recommend 800x1280, ≤ 500 KiB) or a `clock_bg.tar.gz` USTAR+gzip archive. Tar contents: required `clock_bg.jpg|webp` at the root plus one file per local leaf referenced by `ItemList[i].image_addr` (no subdirs, leaf basenames ≤ 95 bytes). Leaves may be JPEG/WebP/PNG; non-supported sources should be transcoded client-side.",
        },
        metadata: {
          type: "object",
          description:
            "First multipart JSON: `ClockName`, `ItemList`, `ItemIdList`. Optional `DialAssets` (`auto`|`image`|`bundle`) or legacy `UseDialAssetBundle` (0/!=0). In bundle mode, `ItemList[i].bundle_image` is an alias for `image_addr` leaf and is also accepted. Tool minifies the JSON before sending.",
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
  {
    name: "watchface_disp_catalog",
    description:
      "Return the full `disp` id catalog (194 entries) that the firmware understands for `ItemList[i].disp` and `ItemPatchList[i].patch.disp`. Each entry includes English symbol, Chinese description, and heuristic hints (`likelyUsesRasterOrAssetLayer` for image/GIF slots; `oftenUsesVectorFontForText` for text slots). Use it together with `watchface_font_catalog`: text-leaning disps need a font id; raster-leaning disps need an `image_addr` asset.",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "integer" },
          description: "Return only the entries whose disp id is in this list.",
        },
        nameContains: {
          type: "string",
          description: "Case-insensitive substring filter on the English symbol (e.g., 'WEATHER').",
        },
        descriptionContains: {
          type: "string",
          description: "Case-insensitive substring filter on the Chinese description (e.g., '日历').",
        },
        expects: {
          type: "string",
          enum: ["any", "image", "text"],
          description:
            "'image' = only slots whose hints.likelyUsesRasterOrAssetLayer is true; 'text' = only slots whose hints.oftenUsesVectorFontForText is true.",
        },
        limit: {
          type: "integer",
          description: "Max entries to return (default 80, max 300).",
        },
        idsOnly: {
          type: "boolean",
          description: "If true, return only `[{disp, name, description_zh}]` rows for a compact summary.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_font_catalog",
    description:
      "Return a curated font catalog so agents can pick `ItemList[i].font` ids deterministically. Each entry includes id, type (1=TTF, 0=image-font), display name, original charset, derived script (digits / digits-extended / latin / cjk), style tags (sans/serif/pixel/digital/handwriting/display/decorative/bold/light/etc), and recommendedFor (scenario names like time_digits / temperature_digits / weather_text / user_text / lunar_text). The response also includes a `scenarios` map that lists which `disp` ids each scenario covers and which tags to prefer. Use the optional filters to narrow the result. Always cross-check with `watchface_get_fonts_local` before committing a font id to a real device, because the on-device font list may be a subset.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["all", "ttf", "image"],
          description: "Filter by font type. Default 'all'.",
        },
        script: {
          type: "string",
          enum: ["all", "digits", "digits-extended", "latin", "cjk"],
          description: "Filter by derived script. 'digits' = image fonts whose charset is exactly 0-9.",
        },
        tag: {
          type: "string",
          description:
            "Match a single style tag (e.g., 'pixel', 'digital', 'handwriting', 'sans', 'serif', 'cjk-capable').",
        },
        scenario: {
          type: "string",
          description:
            "Filter to fonts whose `recommendedFor` includes this scenario (see top-level `scenarios` map for the full list).",
        },
        ids: {
          type: "array",
          items: { type: "integer" },
          description: "Return only the entries whose id is in this list (useful after watchface_get_fonts_local).",
        },
        limit: {
          type: "integer",
          description: "Max number of font entries to return (default 50, max 200).",
        },
        idsOnly: {
          type: "boolean",
          description: "If true, return only `[{id, name, type_name, script}]` rows for a compact summary.",
        },
        includeScenarios: {
          type: "boolean",
          description:
            "If true (default), include the top-level `scenarios` map in the response so the agent can map disp ids → preferred tags.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_template_search",
    description:
      "Search the curated template library (`divoom://templates/curated`): ~20 marketplace-derived watchface skeletons with tags such as weather, lunar_calendar, split_time_digits, pixel_theme, asset_heavy. Prefer cloning an existing ItemList layout before inventing raw coordinates. Filters support tagsAll/tagsAny, bucket, clockIds, item-count bounds, and dispPresent (template must include that disp id). Set includeWatchface=false for a compact summary without the full ItemList payload.",
    inputSchema: {
      type: "object",
      properties: {
        tagsAll: {
          type: "array",
          items: { type: "string" },
          description: "Template must contain every listed tag (AND semantics).",
        },
        tagsAny: {
          type: "array",
          items: { type: "string" },
          description: "Template must contain at least one listed tag (OR semantics).",
        },
        bucket: {
          type: "string",
          description: "Pick list bucket label from the curated generator (e.g. split_time_digits, weather, pixel_theme).",
        },
        clockIds: {
          type: "array",
          items: { type: "integer" },
          description: "Restrict to explicit ClockId values.",
        },
        minItems: { type: "integer", description: "Minimum ItemList row count." },
        maxItems: { type: "integer", description: "Maximum ItemList row count." },
        dispPresent: {
          type: "integer",
          description: "Keep templates that already contain at least one row with this disp id.",
        },
        nameContains: {
          type: "string",
          description: "Case-insensitive substring match on NameCn or NameEn.",
        },
        limit: {
          type: "integer",
          description: "Max templates to return (default 8, max 25).",
        },
        includeWatchface: {
          type: "boolean",
          description: "If false, omit the nested watchface.ItemList payload (default true).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_layout_suggest",
    description:
      "Return layout hints for a single disp id by combining disp-catalog metadata with aggregated typography (median size/x/y/w/h, frequent colors, alignment mode) mined from bundled marketplace templates. Use before authoring a new ItemList row or ItemPatchList.patch fragment — values are soft guidance, not firmware-enforced. Always clamp boxes to the logical canvas (typically 800×1280).",
    inputSchema: {
      type: "object",
      properties: {
        disp: { type: "integer", description: "Target ItemList[i].disp." },
        canvasWidth: {
          type: "integer",
          description: "Logical canvas width for clamp reminders (default 800).",
        },
        canvasHeight: {
          type: "integer",
          description: "Logical canvas height for clamp reminders (default 1280).",
        },
      },
      required: ["disp"],
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

function requiredZeroOrOne(input: unknown, fieldName: string): 0 | 1 {
  const value = requiredInteger(input, fieldName);
  if (value !== 0 && value !== 1) {
    throw new Error(`${fieldName} must be 0 or 1.`);
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

function ensureArrayOfStrings(input: unknown, fieldName: string): string[] {
  if (!Array.isArray(input)) {
    throw new Error(`${fieldName} must be an array of strings.`);
  }
  const out: string[] = [];
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    if (typeof x !== "string") {
      throw new Error(`${fieldName}[${i}] must be a string.`);
    }
    out.push(x);
  }
  return out;
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

type FontCatalogEntry = {
  id: number;
  type: number;
  type_name: "ttf" | "image";
  name: string;
  charset: string;
  script: string;
  style_tags: string[];
  recommendedFor: string[];
  notes: string;
};

type FontCatalog = {
  schema: number;
  generatedAt: string;
  source: { file: string; basename: string; counts: Record<string, number> };
  notes: string[];
  scenarios: Record<
    string,
    {
      label: string;
      description: string;
      disp: number[];
      requiredScript: string[];
      preferTags: string[];
    }
  >;
  fonts: FontCatalogEntry[];
};

let cachedFontCatalog: FontCatalog | null = null;

async function loadFontCatalog(): Promise<FontCatalog> {
  if (cachedFontCatalog) return cachedFontCatalog;
  const absolutePath = path.join(resourceRoot, "font-catalog.json");
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as FontCatalog;
  cachedFontCatalog = parsed;
  return parsed;
}

type TypographyBlock = {
  sampleCount: number;
  size: { p10: number | null; p50: number | null; p90: number | null };
  box: {
    x: { p10: number | null; p50: number | null; p90: number | null };
    y: { p10: number | null; p50: number | null; p90: number | null };
    w: { p10: number | null; p50: number | null; p90: number | null };
    h: { p10: number | null; p50: number | null; p90: number | null };
  };
  alig?: { mode: number };
  colorHints: { color_1_common: string[]; color_2_common: string[] };
};

type DispCatalogEntry = {
  disp: number;
  name: string;
  description_zh: string;
  hints: {
    likelyUsesRasterOrAssetLayer?: boolean;
    oftenUsesVectorFontForText?: boolean;
    note?: string;
  } | null;
  typography?: TypographyBlock;
};

type DispCatalog = {
  schema: number;
  generatedAt: string;
  source: { editorRepo: string; base: string; generated: string | null; counts: Record<string, number> };
  notes: string[];
  displays: DispCatalogEntry[];
};

let cachedDispCatalog: DispCatalog | null = null;

async function loadDispCatalog(): Promise<DispCatalog> {
  if (cachedDispCatalog) return cachedDispCatalog;
  const absolutePath = path.join(resourceRoot, "disp-catalog.json");
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as DispCatalog;
  cachedDispCatalog = parsed;
  return parsed;
}

type CuratedTemplateRow = {
  bucket: string;
  clockId: number;
  nameCn: string;
  nameEn: string;
  tags: string[];
  stats: {
    itemCount: number;
    uniqueDisps: number;
    rasterSlotRatio: number;
    dominantFonts: { id: number; share: number }[];
  };
  watchface: JsonRecord;
};

type CuratedTemplatesFile = {
  schema: number;
  generatedAt: string;
  source: Record<string, unknown>;
  notes: string[];
  tagIndex: Record<string, number[]>;
  templates: CuratedTemplateRow[];
};

let cachedCuratedTemplates: CuratedTemplatesFile | null = null;

async function loadCuratedTemplates(): Promise<CuratedTemplatesFile> {
  if (cachedCuratedTemplates) return cachedCuratedTemplates;
  const absolutePath = path.join(resourceRoot, "templates-curated.json");
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as CuratedTemplatesFile;
  cachedCuratedTemplates = parsed;
  return parsed;
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
    const precheckBody: JsonRecord = {};

    const clockId = optionalInteger(args.clockId, "clockId");
    const useCurrentDisplayClock = optionalBoolean(
      args.useCurrentDisplayClock,
      "useCurrentDisplayClock",
    );

    if (clockId !== undefined) {
      body.ClockId = clockId;
      precheckBody.ClockId = clockId;
    }
    if (useCurrentDisplayClock !== undefined) {
      body.UseCurrentDisplayClock = toDeviceFlag(useCurrentDisplayClock);
      precheckBody.UseCurrentDisplayClock = toDeviceFlag(useCurrentDisplayClock);
    }
    if (clockId === undefined && useCurrentDisplayClock === undefined) {
      body.UseCurrentDisplayClock = 1;
      precheckBody.UseCurrentDisplayClock = 1;
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

    // Guard rail: do not patch when current/local clock payload is empty.
    // This avoids writing against a non-editable or incomplete dial context.
    const precheck = await callDivoomApi(
      target,
      "Device/GetLocalClockInfo",
      precheckBody,
    );
    const precheckJson =
      precheck.responseJson && typeof precheck.responseJson === "object"
        ? (precheck.responseJson as JsonRecord)
        : null;
    const precheckCode =
      precheckJson && typeof precheckJson.ReturnCode === "number"
        ? precheckJson.ReturnCode
        : null;
    const precheckItems =
      precheckJson && Array.isArray(precheckJson.ItemList)
        ? precheckJson.ItemList
        : null;
    if (precheckCode === 0 && precheckItems && precheckItems.length === 0) {
      throw new Error(
        "GetLocalClockInfo returned empty ItemList. Stop patching and switch to an editable clock first (watchface_set_clock_select). Do not auto-create a new clock unless explicitly requested.",
      );
    }

    const metadata: JsonRecord = {
      ...body,
      Command: "Device/PatchLocalClockInfo",
      ReturnCode: 0,
    };

    const dialAssetsPath = optionalString(args.dialAssetsPath, "dialAssetsPath");
    if (dialAssetsPath) {
      const fileBytes = await readFile(path.resolve(dialAssetsPath));
      const filePartName =
        optionalString(args.filePartName, "filePartName") ?? `${Date.now()}`;
      const fileName =
        optionalString(args.fileName, "fileName") ??
        path.basename(path.resolve(dialAssetsPath));
      const boundary = "----DivoomMcpPatchClockBoundary7YA4YWxkTrZu0gW";
      const multipartBody = buildMultipartTwoParts(
        metadata,
        fileBytes,
        filePartName,
        fileName,
        boundary,
      );
      const result = await postMultipart(target, "/patch_local_clock", multipartBody, boundary);
      return {
        ...result,
        requestMeta: metadata,
        filePartName,
        fileName,
        dialAssetsPath: path.resolve(dialAssetsPath),
        fileBytes: fileBytes.length,
        transport: "POST /patch_local_clock multipart",
      };
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

  if (name === "watchface_onoff_screen") {
    const target = resolveTarget(args.target);
    const onOff = requiredZeroOrOne(args.onOff ?? args.OnOff, "OnOff");
    return callDivoomApi(target, "Channel/OnOffScreen", { OnOff: onOff });
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

  if (name === "watchface_disp_catalog") {
    const catalog = await loadDispCatalog();
    const idList =
      args.ids === undefined
        ? null
        : ensureArray(args.ids, "ids").map((v) => requiredInteger(v, "ids[]"));
    const nameContains = optionalString(args.nameContains, "nameContains");
    const descriptionContains = optionalString(args.descriptionContains, "descriptionContains");
    const expects = (optionalString(args.expects, "expects") ?? "any").toLowerCase();
    const limitRaw = optionalInteger(args.limit, "limit");
    const limit = Math.max(1, Math.min(300, limitRaw ?? 80));
    const idsOnly = optionalBoolean(args.idsOnly, "idsOnly") ?? false;

    let filtered = catalog.displays;
    if (idList && idList.length > 0) {
      const idSet = new Set(idList);
      filtered = filtered.filter((entry) => idSet.has(entry.disp));
    }
    if (nameContains) {
      const needle = nameContains.toUpperCase();
      filtered = filtered.filter((entry) => entry.name.toUpperCase().includes(needle));
    }
    if (descriptionContains) {
      const needle = descriptionContains.toLowerCase();
      filtered = filtered.filter((entry) => entry.description_zh.toLowerCase().includes(needle));
    }
    if (expects === "image") {
      filtered = filtered.filter((entry) => entry.hints?.likelyUsesRasterOrAssetLayer === true);
    } else if (expects === "text") {
      filtered = filtered.filter((entry) => entry.hints?.oftenUsesVectorFontForText === true);
    } else if (expects !== "any") {
      throw new Error("expects must be 'any', 'image', or 'text'.");
    }

    const truncated = filtered.length > limit;
    const trimmed = filtered.slice(0, limit);
    const displays = idsOnly
      ? trimmed.map(({ disp, name, description_zh }) => ({ disp, name, description_zh }))
      : trimmed;

    return {
      schema: catalog.schema,
      generatedAt: catalog.generatedAt,
      source: catalog.source,
      counts: {
        totalInCatalog: catalog.displays.length,
        afterFilter: filtered.length,
        returned: displays.length,
        truncated,
      },
      notes: catalog.notes,
      displays,
    };
  }

  if (name === "watchface_font_catalog") {
    const catalog = await loadFontCatalog();
    const typeFilter = (optionalString(args.type, "type") ?? "all").toLowerCase();
    const scriptFilter = (optionalString(args.script, "script") ?? "all").toLowerCase();
    const tagFilter = optionalString(args.tag, "tag");
    const scenarioFilter = optionalString(args.scenario, "scenario");
    const limitRaw = optionalInteger(args.limit, "limit");
    const limit = Math.max(1, Math.min(200, limitRaw ?? 50));
    const idsOnly = optionalBoolean(args.idsOnly, "idsOnly") ?? false;
    const includeScenarios = optionalBoolean(args.includeScenarios, "includeScenarios") ?? true;
    const idList =
      args.ids === undefined
        ? null
        : ensureArray(args.ids, "ids").map((v) => requiredInteger(v, "ids[]"));

    let filtered = catalog.fonts;
    if (idList && idList.length > 0) {
      const idSet = new Set(idList);
      filtered = filtered.filter((font) => idSet.has(font.id));
    }
    if (typeFilter === "ttf") {
      filtered = filtered.filter((font) => font.type_name === "ttf");
    } else if (typeFilter === "image") {
      filtered = filtered.filter((font) => font.type_name === "image");
    } else if (typeFilter !== "all") {
      throw new Error("type must be 'all', 'ttf', or 'image'.");
    }
    if (scriptFilter !== "all") {
      filtered = filtered.filter((font) => font.script === scriptFilter);
    }
    if (tagFilter) {
      const wanted = tagFilter.toLowerCase();
      filtered = filtered.filter((font) =>
        font.style_tags.some((tag) => tag.toLowerCase() === wanted),
      );
    }
    if (scenarioFilter) {
      filtered = filtered.filter((font) => font.recommendedFor.includes(scenarioFilter));
    }

    const truncated = filtered.length > limit;
    const trimmed = filtered.slice(0, limit);

    const fonts = idsOnly
      ? trimmed.map(({ id, name, type_name, script }) => ({ id, name, type_name, script }))
      : trimmed;

    return {
      schema: catalog.schema,
      generatedAt: catalog.generatedAt,
      source: catalog.source,
      counts: {
        totalInCatalog: catalog.fonts.length,
        afterFilter: filtered.length,
        returned: fonts.length,
        truncated,
      },
      notes: catalog.notes,
      scenarios: includeScenarios ? catalog.scenarios : undefined,
      fonts,
    };
  }

  if (name === "watchface_template_search") {
    const curated = await loadCuratedTemplates();
    const tagsAll =
      args.tagsAll === undefined ? [] : ensureArrayOfStrings(args.tagsAll, "tagsAll");
    const tagsAny =
      args.tagsAny === undefined ? [] : ensureArrayOfStrings(args.tagsAny, "tagsAny");
    const bucketFilter =
      args.bucket === undefined || args.bucket === null
        ? undefined
        : String(args.bucket).trim();
    const clockIdFilter =
      args.clockIds === undefined
        ? null
        : ensureArray(args.clockIds, "clockIds").map((v) => requiredInteger(v, "clockIds[]"));
    const minItems = optionalInteger(args.minItems, "minItems");
    const maxItems = optionalInteger(args.maxItems, "maxItems");
    const dispPresent = optionalInteger(args.dispPresent, "dispPresent");
    const nameContainsRaw = args.nameContains;
    const nameContains =
      typeof nameContainsRaw === "string" && nameContainsRaw.trim().length > 0
        ? nameContainsRaw.trim().toLowerCase()
        : undefined;
    const limitRaw = optionalInteger(args.limit, "limit");
    const limit = Math.max(1, Math.min(25, limitRaw ?? 8));
    const includeWatchface = optionalBoolean(args.includeWatchface, "includeWatchface") ?? true;

    let filtered = curated.templates;
    if (bucketFilter) {
      filtered = filtered.filter((t) => t.bucket === bucketFilter);
    }
    if (clockIdFilter && clockIdFilter.length > 0) {
      const idSet = new Set(clockIdFilter);
      filtered = filtered.filter((t) => idSet.has(t.clockId));
    }
    if (tagsAll.length > 0) {
      filtered = filtered.filter((t) => tagsAll.every((tag) => t.tags.includes(tag)));
    }
    if (tagsAny.length > 0) {
      filtered = filtered.filter((t) => tagsAny.some((tag) => t.tags.includes(tag)));
    }
    if (minItems !== undefined) {
      filtered = filtered.filter((t) => t.stats.itemCount >= minItems);
    }
    if (maxItems !== undefined) {
      filtered = filtered.filter((t) => t.stats.itemCount <= maxItems);
    }
    if (dispPresent !== undefined) {
      filtered = filtered.filter((t) => {
        const items = t.watchface.ItemList;
        if (!Array.isArray(items)) return false;
        return items.some((row) => {
          const rec = row as JsonRecord;
          const d = rec.disp;
          return typeof d === "number" && Number.isInteger(d) && d === dispPresent;
        });
      });
    }
    if (nameContains) {
      filtered = filtered.filter(
        (t) =>
          t.nameCn.toLowerCase().includes(nameContains) ||
          t.nameEn.toLowerCase().includes(nameContains),
      );
    }

    const truncated = filtered.length > limit;
    const trimmed = filtered.slice(0, limit);
    const templates = trimmed.map((t) => {
      if (includeWatchface) return t;
      const { watchface: _wf, ...rest } = t;
      void _wf;
      return {
        ...rest,
        watchfaceMeta: {
          clockId: t.clockId,
          itemCount: t.stats.itemCount,
        },
      };
    });

    return {
      schema: curated.schema,
      generatedAt: curated.generatedAt,
      source: curated.source,
      counts: {
        totalCurated: curated.templates.length,
        afterFilter: filtered.length,
        returned: templates.length,
        truncated,
      },
      notes: curated.notes,
      tagIndex: curated.tagIndex,
      templates,
    };
  }

  if (name === "watchface_layout_suggest") {
    const dispId = requiredInteger(args.disp, "disp");
    const catalog = await loadDispCatalog();
    const entry = catalog.displays.find((d) => d.disp === dispId);
    if (!entry) {
      throw new Error(`disp ${dispId} not found in disp-catalog.`);
    }
    const canvasW = optionalInteger(args.canvasWidth, "canvasWidth") ?? 800;
    const canvasH = optionalInteger(args.canvasHeight, "canvasHeight") ?? 1280;
    const tw = entry.typography;
    let suggestedItemFields: JsonRecord | null = null;
    if (tw) {
      suggestedItemFields = {
        size: tw.size.p50,
        x: tw.box.x.p50,
        y: tw.box.y.p50,
        w: tw.box.w.p50,
        h: tw.box.h.p50,
        alig: tw.alig?.mode ?? 3,
      };
      const c1 = tw.colorHints.color_1_common[0];
      const c2 = tw.colorHints.color_2_common[0];
      if (c1) suggestedItemFields.color_1 = c1;
      if (c2) suggestedItemFields.color_2 = c2;
    }

    return {
      canvas: { width: canvasW, height: canvasH },
      disp: entry.disp,
      name: entry.name,
      description_zh: entry.description_zh,
      hints: entry.hints,
      typography: tw ?? null,
      suggestedItemFields,
      guidance: suggestedItemFields
        ? "Apply suggestedItemFields as the baseline geometry for this disp (medians from bundled marketplace templates). Clamp x/y/w/h inside the canvas and iterate after preview on hardware."
        : "No typography aggregate exists for this disp yet — copy a similar row from watchface_template_search or watchface_get_local instead.",
    };
  }

  if (name === "watchface_protocol_quick_reference") {
    const lines = [
      "1) Always POST JSON to /divoom_api (never GET). Root ReturnCode in the request must be 0.",
      "2) Read before write: Device/GetLocalClockInfo first; if ItemList is empty, stop and switch to an editable clock (Channel/SetClockSelectId) — do not auto-create.",
      "3) Patch minimally with ItemPatchList (per-index field diff) and ItemPatchByRoleList (semantic role). Do NOT include item_id inside patch.* unless explicitly renaming a slot — the device-side item_id is referenced by menus/config bindings.",
      "4) Only fall back to a full ItemList replacement when row count actually changes (rows added/removed). For pure metadata edits (size/x/y/font/color), POST /divoom_api JSON-only is enough.",
      "5) When new bytes need to land on the device, switch to multipart /patch_local_clock or /create_local_clock. JSON part first (name=\"json\"; filename=\"cmd.json\"), file part second (filename=\"clock_bg.jpg|webp|tar.gz\"); both parts carry per-part Content-Length; boundary is unquoted; CRLF; single file per request.",
      "6) DialAssets selection: 'image' = no local element leaves (or all http(s) URLs); 'bundle' = at least one ItemList[i].image_addr or ItemPatchList[i].patch.bundle_image is a local leaf — pack as clock_bg.tar.gz (USTAR + gzip).",
      "7) Image format rules: dial backdrop is JPEG (FF D8) or WebP (RIFF…WEBP) only, ≤ 500 KiB, recommended 800x1280 portrait. Element slots inside the tarball accept JPEG/WebP/PNG (89 50 4E 47 …). GIF/BMP/TIFF must be transcoded client-side before packing.",
      "8) Replace cached backdrop without changing cfg DeviceImageUrl: POST /replace_clock_dial_bg multipart (no tar.gz, JPEG/WebP only).",
      "9) Replace cfg DeviceImageUrl: POST /upload to obtain a FileId, then Device/PatchLocalClockInfo with the new URL; verify with GetLocalClockInfo.",
      "10) ItemList JSON requirements: numbers disp/font/x/y/w/h/size/alig; non-empty strings color_1/color_2/item_id (#RRGGBB hex). ItemIdList parallel non-empty strings. alig: 3=center, 4=left, 5=right (firmware-native).",
      "11) Channel/SetClockSelectId switches the active dial on screen — confirm user intent before running.",
      "12) Device/ResetLocalClockFromServer is destructive (deletes local sys-side files first).",
      "13) Pick `ItemList[i].font` ids from `watchface_font_catalog` (or the `divoom://font/catalog` resource) — never hard-code an unknown id. Match the slot's content: digit-only image fonts (charset 0123456789) for time/date/temperature digits; CJK-capable TTFs for Chinese strings; pixel/digital/handwriting tags for stylistic dials. Cross-check the chosen id against `watchface_get_fonts_local` before patching a real device.",
      "14) Pick `ItemList[i].disp` ids from `watchface_disp_catalog` (or the `divoom://disp/catalog` resource). Use `hints.likelyUsesRasterOrAssetLayer` to decide whether the slot expects an `image_addr` asset (image/GIF/PNG) and `hints.oftenUsesVectorFontForText` to decide whether to assign a font id.",
      "15) When generating a fresh watchface JSON, validate the output against `divoom://watchface/schema` and start from `divoom://watchface/example-minimal` — keep `ItemIdList` parallel to `item_id` and stay inside the 800x1280 logical canvas.",
      "16) Before inventing coordinates from scratch, query `watchface_template_search` or read `divoom://templates/curated`, then clone an ItemList skeleton whose tags match your target scenario (weather, lunar, pixel_theme, …).",
      "17) Call `watchface_layout_suggest` with `disp` to seed `size/x/y/w/h/alig` plus frequent `color_*` pairs using median statistics embedded in `disp-catalog.typography`.",
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
      version: PKG_VERSION,
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
