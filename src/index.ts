import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
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

import { identify, serial, assertResponse, requireLocal, PRODUCTS, PROFILES, type Model, type Target, type IdentifiedTarget } from "./devices.js";
type JsonRecord = Record<string, unknown>;

type DeviceTarget = Target;

const DEFAULT_MODEL = process.env.DIVOOM_DEVICE_MODEL ?? "auto";
const DEFAULT_HOST = (process.env.DIVOOM_DEVICE_HOST ?? "").trim();
const DEFAULT_PORT = parseIntegerOrDefault(process.env.DIVOOM_DEVICE_PORT, 9000);
const DEFAULT_TIMEOUT_MS = parseIntegerOrDefault(process.env.DIVOOM_TIMEOUT_MS, 45_000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resourceRoot = path.resolve(__dirname, "../resources");

const PKG_VERSION = JSON.parse(readFileSync(path.join(__dirname, "../package.json"), "utf8")).version as string;

const RESOURCES = [
  {
    uri: "divoom://products/catalog",
    name: "Divoom Product Registry",
    description: "Registered products, Hardware versions, canvas sizes, and isolated resource directories.",
    mimeType: "application/json",
    fileName: "products.json",
  },
  {
    uri: "divoom://guide/quick-reference",
    name: "Divoom Watchface Guide Quick Reference",
    description:
      "Key LAN API constraints and command flow for watchface customization.",
    mimeType: "text/markdown",
    fileName: "common/guide-quick-reference.md",
  },
  {
    uri: "divoom://skill/watchface-customization",
    name: "Divoom Watchface Skill Prompt",
    description:
      "Compact prompt that teaches agents how to safely operate the Divoom LAN API.",
    mimeType: "text/markdown",
    fileName: "common/skill-quick-reference.md",
  },
  {
    uri: "divoom://font/catalog",
    name: "Divoom Watchface Font Catalog",
    description:
      "Curated TTF and image-font catalog (id, type, name, charset, script, style tags, recommended scenarios) sourced from the visual editor's font_info.cfg. Use it to pick `ItemList[i].font` ids without guessing.",
    mimeType: "application/json",
    fileName: "timesframe/font-catalog.json",
  },
  {
    uri: "divoom://font/guide",
    name: "Divoom Watchface Font AI Guide",
    description:
      "Human-readable guide for all 157 editor fonts: visual style, mood, recommended use cases, scenario index, TTF vs image_glyph styling rules, and per-id descriptions. Read this before `divoom://font/catalog` when choosing fonts for themed dials.",
    mimeType: "text/markdown",
    fileName: "timesframe/ai-font-guide.md",
  },
  {
    uri: "divoom://disp/catalog",
    name: "Divoom Watchface Disp Catalog",
    description:
      "Catalog of every `disp` id supported by this firmware (194 entries) with English symbol, Chinese description, and heuristic hints for whether the slot expects an image asset or vector text. Use to pick `ItemList[i].disp` and to decide whether the slot needs an `image_addr` asset.",
    mimeType: "application/json",
    fileName: "timesframe/disp-catalog.json",
  },
  {
    uri: "divoom://watchface/schema",
    name: "Divoom Watchface JSON Schema",
    description:
      "JSON Schema (draft 2020-12) for the editor's watchface config (`ItemList[]`, `ItemIdList`, `ClockId`, names). Validate generated payloads before sending them to PatchLocalClockInfo / CreateLocalClock.",
    mimeType: "application/schema+json",
    fileName: "timesframe/watchface-config.schema.json",
  },
  {
    uri: "divoom://watchface/example-minimal",
    name: "Minimal Watchface Example",
    description:
      "Smallest valid watchface JSON (single time row at 800x1280). Use as a starting template before adding more `ItemList` rows.",
    mimeType: "application/json",
    fileName: "timesframe/example-minimal.json",
  },
  {
    uri: "divoom://guide/ai-watchface",
    name: "AI Watchface Authoring Guide",
    description:
      "Editor-side narrative on AI-assisted watchface authoring: canvas conventions, font rules, where the catalogs come from, regeneration workflow.",
    mimeType: "text/markdown",
    fileName: "timesframe/ai-watchface-guide.md",
  },
  {
    uri: "divoom://templates/curated",
    name: "Curated Watchface Templates",
    description:
      "~20 designer-made skeleton watchfaces mined from the HTML editor's bundled marketplace configs (`public/template/config`). Each entry lists tags (weather, lunar, pixel_theme, …), stats, and a stripped `watchface` JSON (ClockId, names, ItemIdList, ItemList) safe to clone before swapping fonts/colors. Does not include DeviceImageUrl.",
    mimeType: "application/json",
    fileName: "timesframe/templates-curated.json",
  },
  ...[
    ["divoom://astrotoo/guide", "AstroToo LAN Guide", "guide.md", "text/markdown"],
    ["divoom://astrotoo/disp/catalog", "AstroToo Disp Catalog", "disp-catalog.json", "application/json"],
    ["divoom://astrotoo/font/catalog", "AstroToo Font Policy", "font-catalog.json", "application/json"],
    ["divoom://astrotoo/clocks/catalog", "AstroToo Clock Catalog", "clock-catalog.json", "application/json"],
    ["divoom://astrotoo/clocks/configs", "AstroToo Clock Configurations", "clock-configs.json", "application/json"],
    ["divoom://astrotoo/templates/curated", "AstroToo Templates", "templates-curated.json", "application/json"],
    ["divoom://astrotoo/watchface/example-minimal", "AstroToo Minimal Watchface", "example-minimal.json", "application/json"],
    ["divoom://astrotoo/watchface/schema", "AstroToo Watchface Schema", "watchface-config.schema.json", "application/schema+json"],
  ].map(([uri, name, file, mimeType]) => ({ uri, name, fileName: PRODUCTS.astrotoo.resourceDir + "/" + file, mimeType,
    description: "AstroToo Hardware 530 only; 480x480, local assets and on-device fonts." })),
] as const;

const targetSchema = {
  type: "object",
  description:
    "Optional per-call target override. If omitted, environment variables are used.",
  properties: {
    model: { type: "string", enum: ["auto", "timesframe", "astrotoo"], default: "auto",
      description: "Normally auto: query Hardware first. Explicit timesframe is only a legacy firmware fallback." },
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
      "Patch local dial via Device/PatchLocalClockInfo with precheck. Defaults to POST /divoom_api (JSON only) for pure metadata edits. Prefer ItemPatchList (per-index field diff) — DO NOT include item_id inside patch.* unless the user explicitly asks to rename a slot, since the firmware will overwrite the device-side item_id and break menu/config bindings. When dialAssetsPath is set, switches to multipart POST /patch_local_clock. TimesFrame accepts a single JPEG/WebP backdrop or clock_bg.tar.gz bundle. AstroToo accepts one JPEG/WebP backdrop only: upload every element separately with watchface_upload_file, bind its returned local:// FileId in image_addr, and never send TAR/TGZ/ZIP or bundle_image. Supplying ItemList alone is a full-table replace and should be avoided unless the row count actually changes. Pointer fixes (131/132/233 = DIVOOM_CLOCK_DISP_SUPPORT_*_POINT_IMAGE): shared square x/y/w/h, w×w PNGs, center rotation; transp 100; hier 0/1/2 only. Avoid duplicate image-backed disp rows (NET_PIC family); docs/disp-usage.md.",
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
          items: { type: "string" },
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
            "Optional second multipart part. AstroToo: one JPEG/WebP backdrop only; element files must already have been uploaded individually and referenced by local:// FileId. TimesFrame: either a single backdrop or clock_bg.tar.gz bundle. When set, the tool POSTs /patch_local_clock.",
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
    description:
      "Call Channel/SetClockSelectId with ClockId. TimesFrame queues a pair of identical requests in one serialized MCP operation so a manual selection suppresses an active traditional clock schedule for its current period; AstroToo sends it once.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        clockId: { type: "integer" },
        sysUpdateTime: {
          type: "integer",
          description: "Optional device clock revision. Omitted by default to preserve the original TimesFrame request shape.",
        },
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
      "POST /replace_clock_dial_bg using multipart (Device/ReplaceClockDialBgFile). Replaces the cached dial bitmap only and does not accept archives. Backdrop must be JPEG or WebP and less than 500 KiB. Required dimensions are selected from hardware: TimesFrame 800x1280, AstroToo 480x480.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        imagePath: {
          type: "string",
          description:
            "Absolute or relative JPEG/WebP path. Required size: TimesFrame 800x1280 or AstroToo 480x480; file must be less than 500 KiB.",
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
      "AstroToo-only POST /upload_local_asset with one multipart file. Assets must be sent serially, one file per call, using Device/UploadLocalAsset metadata. Each success returns a temporary local:// FileId which must be bound by a successful create or patch; firmware then atomically moves the staging file into durable watchface storage. Unbound uploads are cleared on reboot and are never uploaded outward. TAR/TGZ/ZIP are rejected. The product photo/pixel POST /upload route is kept separate. TimesFrame generic /upload is blocked in MCP local-only mode; use create/patch multipart assets instead.",
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
      "POST /create_local_clock (multipart) — Device/CreateLocalClock. TimesFrame accepts DialAssets image/auto/bundle and may use clock_bg.tar.gz. AstroToo accepts DialAssets=image only: upload every element separately with watchface_upload_file, put each returned local:// FileId in ItemList[i].image_addr, then call this tool with one 480x480 JPEG/WebP backdrop. AstroToo rejects TAR/TGZ/ZIP, UseDialAssetBundle!=0, and bundle_image. Each ItemList row needs numeric disp/font/x/y/w/h/size/alig and non-empty color_1/color_2/item_id; ItemIdList must be parallel. Pointer slots 131/132/233 use one shared square box and square upward-pointing images with center pivot; transp=100; hier is 0/1/2.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        imagePath: {
          type: "string",
          description:
            "Single JPEG/WebP backdrop (TimesFrame 800x1280; AstroToo 480x480; less than 500 KiB). TimesFrame also supports clock_bg.tar.gz. AstroToo never accepts an archive here.",
        },
        metadata: {
          type: "object",
          description:
            "First multipart JSON: ClockName, ItemList, ItemIdList. AstroToo requires DialAssets=image and local:// image_addr values from prior per-file uploads. TimesFrame may use auto/image/bundle and legacy UseDialAssetBundle.",
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
    name: "watchface_get_screen_snapshot",
    description:
      "Capture the rendered screen for visual verification after create/patch/switch. Sends Device/GetScreenSnapshot, then downloads and validates the exact snapShotPath returned by AstroToo (currently BMP); TimesFrame retains its WebP fallback paths. Optional savePath writes the image locally for review.",
    inputSchema: {
      type: "object",
      properties: {
        target: targetSchema,
        waitMs: {
          type: "integer",
          description:
            "Milliseconds to wait after Device/GetScreenSnapshot before HTTP GET (default 2000; mainly for asynchronous TimesFrame firmware).",
          default: 2000,
        },
        snapshotHttpPath: {
          type: "string",
          description:
            "TimesFrame fallback HTTP path. AstroToo always uses snapShotPath from the current response.",
          default: "/userdata/snapshot.webp",
        },
        savePath: {
          type: "string",
          description:
            "Optional local path to write the downloaded snapshot image.",
        },
      },
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
    name: "watchface_clock_catalog",
    description:
      "Query product-specific ClockId, Chinese/English names, font ids, disp ids, item ids, and optional source configuration. AstroToo data is generated from both simulator clocksys directories; its default set comes from Device/GetClockDefaultList with IsDefault=1. TimesFrame data remains independent.",
    inputSchema: {
      type: "object",
      properties: {
        clockIds: { type: "array", items: { type: "integer" }, description: "Restrict to ClockId values." },
        nameContains: { type: "string", description: "Case-insensitive substring in NameCn or NameEn." },
        defaultOnly: { type: "boolean", description: "AstroToo: return only IDs reported by the default-list command." },
        fonts: { type: "array", items: { type: "integer" }, description: "Require at least one of these product-specific font ids." },
        disps: { type: "array", items: { type: "integer" }, description: "Require at least one of these product-specific disp ids." },
        itemIdContains: { type: "string", description: "Substring match against product-specific item_id values." },
        tagsAny: { type: "array", items: { type: "string" }, description: "Require at least one generated tag." },
        limit: { type: "integer", description: "Max rows to return (default 50, max 200)." },
        includeConfig: { type: "boolean", description: "Include the native watchface configuration for each returned row." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "watchface_disp_catalog",
    description:
      "Return the selected product's `disp` catalog for `ItemList[i].disp` and `ItemPatchList[i].patch.disp`. TimesFrame and AstroToo use independent enums and renderer sources. Each entry includes the firmware symbol, Chinese description, and image/text hints.",
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
      "Return a curated font catalog so agents can pick `ItemList[i].font` ids deterministically. Each entry includes id, type (1=TTF, 0=image-font), display name, original charset, derived script (digits / digits-extended / latin / cjk), style tags (sans/serif/pixel/digital/handwriting/display/decorative/bold/light/etc), and recommendedFor (scenario names like time_digits / temperature_digits / weather_text / user_text / lunar_text). The response also includes a `scenarios` map that lists which `disp` ids each scenario covers and which tags to prefer. For visual style and mood per font id, read MCP resource `divoom://font/guide` first. Use the optional filters to narrow the result. Always cross-check with `watchface_get_fonts_local` before committing a font id to a real device, because the on-device font list may be a subset.",
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
          enum: ["all", "digits", "digits-extended", "latin", "cjk", "unicode"],
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
  if (input && typeof input === "object" && identifiedTargets.has(input)) return input as IdentifiedTarget;
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
  const model = source.model ?? DEFAULT_MODEL;
  if (!["auto", "timesframe", "astrotoo"].includes(String(model))) throw new Error("Invalid target.model");
  if (!Number.isInteger(port) || port > 65535) throw new Error("Invalid target.port");
  return { host, port, timeoutMs, model: model as Target["model"] };
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
  if (target.model === "astrotoo" && Buffer.byteLength(payloadText, "utf8") > 65536)
    throw new Error("AstroToo JSON exceeds 65536 UTF-8 bytes.");
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

  assertResponse(response.status, responseJson);
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

function containsBundleImage(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsBundleImage);
  if (!value || typeof value !== "object") return false;
  const record = value as JsonRecord;
  if (typeof record.bundle_image === "string" && record.bundle_image.length > 0) return true;
  return Object.values(record).some(containsBundleImage);
}

function assertAstroTooSequentialAsset(
  target: DeviceTarget,
  metadata: JsonRecord,
  fileBytes: Buffer,
  fileName: string,
) {
  if (target.model !== "astrotoo") return;
  const dialAssets = typeof metadata.DialAssets === "string" ? metadata.DialAssets.toLowerCase() : "";
  const legacyBundle = typeof metadata.UseDialAssetBundle === "number" && metadata.UseDialAssetBundle !== 0;
  const gzip = fileBytes.length >= 2 && fileBytes[0] === 0x1f && fileBytes[1] === 0x8b;
  const zip = fileBytes.length >= 4 && fileBytes[0] === 0x50 && fileBytes[1] === 0x4b &&
    fileBytes[2] === 0x03 && fileBytes[3] === 0x04;
  const archiveName = /\.(?:tar|tgz|tar\.gz|zip)$/i.test(fileName);
  if (dialAssets === "bundle" || legacyBundle || containsBundleImage(metadata) || gzip || zip || archiveName) {
    throw new Error(
      "AstroToo does not accept TAR/ZIP asset bundles. Upload each element with watchface_upload_file, bind its returned local:// FileId, then send one JPEG/WebP backdrop with DialAssets=image.",
    );
  }
}

async function postMultipart(
  target: DeviceTarget,
  endpoint: string,
  body: Buffer,
  boundary: string,
) {
  const url = `http://${target.host}:${target.port}${endpoint}`;
  if (target.model === "astrotoo") {
    const header = body.subarray(0, 512).toString("utf8");
    const firstSize = /Content-Length: (\d+)/i.exec(header);
    if (!firstSize || Number(firstSize[1]) > 65536) throw new Error("AstroToo multipart JSON exceeds 65536 bytes.");
    if (body.length > 6291456 + 65536 + 8192) throw new Error("AstroToo single-file upload exceeds 6 MiB.");
  }
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

  assertResponse(response.status, responseJson);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractSnapShotPath(responseJson: unknown): string | undefined {
  if (!responseJson || typeof responseJson !== "object" || Array.isArray(responseJson)) {
    return undefined;
  }
  const path = (responseJson as JsonRecord).snapShotPath;
  return typeof path === "string" && path.length > 0 ? path : undefined;
}

async function fetchDeviceSnapshotImage(
  target: DeviceTarget,
  httpPath: string,
): Promise<{ url: string; httpStatus: number; bytes: Buffer; contentType: string | null }> {
  const normalized = httpPath.startsWith("/") ? httpPath : `/${httpPath}`;
  const url = `http://${target.host}:${target.port}${normalized}`;
  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(target.timeoutMs),
  });
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    return { url, httpStatus: response.status, bytes: Buffer.alloc(0), contentType };
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    url,
    httpStatus: response.status,
    bytes: Buffer.from(arrayBuffer),
    contentType,
  };
}

function detectSnapshotFormat(bytes: Buffer): "webp" | "jpeg" | "png" | "bmp" | null {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) return "webp";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  return null;
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

const cachedFontCatalog = new Map<Model, FontCatalog>();

async function loadFontCatalog(model: Model = "timesframe"): Promise<FontCatalog> {
  const cached = cachedFontCatalog.get(model);
  if (cached) return cached;
  const absolutePath = path.join(resourceRoot, PRODUCTS[model].resourceDir, "font-catalog.json");
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as FontCatalog;
  cachedFontCatalog.set(model, parsed);
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

const cachedDispCatalog = new Map<Model, DispCatalog>();

async function loadDispCatalog(model: Model = "timesframe"): Promise<DispCatalog> {
  const cached = cachedDispCatalog.get(model);
  if (cached) return cached;
  const absolutePath = path.join(resourceRoot, PRODUCTS[model].resourceDir, "disp-catalog.json");
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as DispCatalog;
  cachedDispCatalog.set(model, parsed);
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

const cachedCuratedTemplates = new Map<Model, CuratedTemplatesFile>();

async function loadCuratedTemplates(model: Model = "timesframe"): Promise<CuratedTemplatesFile> {
  const cached = cachedCuratedTemplates.get(model);
  if (cached) return cached;
  const absolutePath = path.join(resourceRoot, PRODUCTS[model].resourceDir, "templates-curated.json");
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as CuratedTemplatesFile;
  cachedCuratedTemplates.set(model, parsed);
  return parsed;
}

type ClockCatalogRow = {
  clockId: number;
  nameCn: string;
  nameEn: string;
  isDefault: boolean;
  sources: string[];
  itemIds: string[];
  disps: number[];
  fonts: number[];
  tags: string[];
  [key: string]: unknown;
};

type ClockCatalogFile = {
  schema: number;
  model: Model;
  generatedAt: string;
  source: Record<string, unknown>;
  counts: Record<string, number>;
  notes: string[];
  defaultClockIds: number[];
  clocks: ClockCatalogRow[];
};

const cachedClockCatalog = new Map<Model, ClockCatalogFile>();
const cachedClockConfigs = new Map<Model, Record<string, JsonRecord>>();

async function loadClockCatalog(model: Model): Promise<ClockCatalogFile> {
  const cached = cachedClockCatalog.get(model);
  if (cached) return cached;
  const parsed = JSON.parse(await readFile(
    path.join(resourceRoot, PRODUCTS[model].resourceDir, "clock-catalog.json"), "utf8",
  )) as ClockCatalogFile;
  cachedClockCatalog.set(model, parsed);
  return parsed;
}

async function loadClockConfigs(model: Model): Promise<Record<string, JsonRecord>> {
  const cached = cachedClockConfigs.get(model);
  if (cached) return cached;
  const parsed = JSON.parse(await readFile(
    path.join(resourceRoot, PRODUCTS[model].resourceDir, "clock-configs.json"), "utf8",
  )) as { configurations: Record<string, JsonRecord> };
  cachedClockConfigs.set(model, parsed.configurations);
  return parsed.configurations;
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

    if (target.model === "astrotoo" && args.deviceImageUrl !== undefined) {
      throw new Error(
        "AstroToo does not bind a background through DeviceImageUrl. Send the 480x480 JPEG/WebP as dialAssetsPath so firmware can validate it before the transaction.",
      );
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
    if (precheckCode !== 0 || !precheckItems) throw new Error("Cannot patch: valid GetLocalClockInfo response with ItemList is required.");
    if (precheckItems.length === 0) {
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
      assertAstroTooSequentialAsset(target, metadata, fileBytes, fileName);
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
    const payload: JsonRecord = { ClockId: clockId };
    const sysUpdateTime = optionalInteger(args.sysUpdateTime, "sysUpdateTime");
    if (sysUpdateTime !== undefined) payload.SysUpdateTime = sysUpdateTime;
    if (target.model !== "timesframe")
      return callDivoomApi(target, "Channel/SetClockSelectId", payload);

    const [, second] = await Promise.all([
      callDivoomApi(target, "Channel/SetClockSelectId", payload),
      callDivoomApi(target, "Channel/SetClockSelectId", payload),
    ]);
    return {
      ...second,
      compatibility: {
        model: "timesframe",
        clockSelectRequests: 2,
        delivery: "paired",
        activeScheduleSuppressedForCurrentPeriod: true,
      },
    };
  }

  if (name === "watchface_get_brightness") {
    const target = resolveTarget(args.target);
    return callDivoomApi(target, "Sys/GetBrightness");
  }

  if (name === "watchface_set_brightness") {
    const target = resolveTarget(args.target);
    const brightness = requiredInteger(args.brightness, "brightness");
    if (target.model === "astrotoo" && (brightness < 0 || brightness > 100)) throw new Error("Brightness must be 0–100.");
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
    if (target.model !== "astrotoo") {
      throw new Error(
        "TimesFrame generic /upload is disabled in MCP local-only mode because it dispatches the upload command to the device network task. Send assets through watchface_create_local_clock or watchface_patch_local instead.",
      );
    }
    const metadata: JsonRecord = { Command: "Device/UploadLocalAsset", ReturnCode: 0 };

    const fileBytes = await readFile(path.resolve(filePath));
    const filePartName =
      optionalString(args.filePartName, "filePartName") ?? `${Date.now()}`;
    const fileName =
      optionalString(args.fileName, "fileName") ?? path.basename(path.resolve(filePath));
    assertAstroTooSequentialAsset(target, metadataInput, fileBytes, fileName);
    const boundary = "----DivoomMcpUploadBoundary7YA4YWxkTrZu0gW";
    const body = buildMultipartTwoParts(metadata, fileBytes, filePartName, fileName, boundary);
    const result = await postMultipart(target, "/upload_local_asset", body, boundary);
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
    assertAstroTooSequentialAsset(target, metadata, imageBytes, fileName);
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

  if (name === "watchface_get_screen_snapshot") {
    const target = resolveTarget(args.target);
    const waitMsRaw = optionalInteger(args.waitMs, "waitMs");
    const waitMs = Math.max(0, waitMsRaw ?? 2000);
    const snapshotHttpPath =
      optionalString(args.snapshotHttpPath, "snapshotHttpPath") ?? "/userdata/snapshot.webp";
    const savePath = optionalString(args.savePath, "savePath");

    const apiResult = await callDivoomApi(target, "Device/GetScreenSnapshot");
    const snapShotPath = extractSnapShotPath(apiResult.responseJson);
    if (target.model === "astrotoo" && !snapShotPath)
      throw new Error("AstroToo did not return a path for this capture; no old snapshot was fetched.");
    await sleep(waitMs);

    const candidatePaths: string[] = target.model === "astrotoo" && snapShotPath ? [snapShotPath] : [snapshotHttpPath];
    if (snapShotPath && !candidatePaths.includes(snapShotPath)) {
      candidatePaths.push(snapShotPath);
    }
    if (
      target.model !== "astrotoo" &&
      !candidatePaths.includes("/userdata/app_pic/snapshot.webp") &&
      snapshotHttpPath !== "/userdata/app_pic/snapshot.webp"
    ) {
      candidatePaths.push("/userdata/app_pic/snapshot.webp");
    }

    let fetchResult: Awaited<ReturnType<typeof fetchDeviceSnapshotImage>> | null = null;
    let snapshotFormat: ReturnType<typeof detectSnapshotFormat> = null;
    const attempts: Array<{ httpPath: string; httpStatus: number; byteLength: number }> = [];
    for (const httpPath of candidatePaths) {
      const attempt = await fetchDeviceSnapshotImage(target, httpPath);
      attempts.push({
        httpPath,
        httpStatus: attempt.httpStatus,
        byteLength: attempt.bytes.length,
      });
      const format = detectSnapshotFormat(attempt.bytes);
      if (attempt.httpStatus === 200 && format) {
        fetchResult = attempt;
        snapshotFormat = format;
        break;
      }
    }

    if (!fetchResult) {
      if (target.model === "astrotoo") throw new Error("Failed to download the new AstroToo snapshot.");
      return {
        ok: false,
        command: "Device/GetScreenSnapshot",
        firmwareCommand: "DIVOOM_NET_COMM_GET_SCREEN_SNAPSHOT",
        waitMs,
        snapShotPath: snapShotPath ?? "/userdata/app_pic/snapshot.webp",
        snapshotHttpUrl: `http://${target.host}:${target.port}${snapshotHttpPath.startsWith("/") ? snapshotHttpPath : `/${snapshotHttpPath}`}`,
        apiResult,
        attempts,
        guidance:
          "After create/patch/switch, call this tool to capture the dial. Retry once if the returned image is still empty.",
      };
    }

    let savedTo: string | undefined;
    if (savePath) {
      await writeFile(savePath, fetchResult.bytes);
      savedTo = savePath;
    }

    return {
      ok: true,
      command: "Device/GetScreenSnapshot",
      firmwareCommand: "DIVOOM_NET_COMM_GET_SCREEN_SNAPSHOT",
      waitMs,
      snapShotPath: snapShotPath ?? "/userdata/app_pic/snapshot.webp",
      snapshotHttpUrl: fetchResult.url,
      byteLength: fetchResult.bytes.length,
      contentType: fetchResult.contentType,
      format: snapshotFormat,
      savedTo,
      apiResult,
      attempts,
      usageNotes: [
        "Use after Device/CreateLocalClock, Device/PatchLocalClockInfo, or Channel/SetClockSelectId when you need a visual ground truth.",
        "AstroToo downloads the exact snapShotPath from this capture; TimesFrame may use the configured WebP fallback path.",
        "Compare the downloaded image with mockups or a prior snapshot to validate layout, colors, and asset binding.",
      ],
    };
  }

  if (name === "watchface_raw_command") {
    const target = resolveTarget(args.target);
    const command = requiredString(args.command, "command");
    const payload =
      args.payload === undefined ? {} : ensureRecord(args.payload, "payload");
    if (target.model === "astrotoo" && command === "Device/PatchLocalClockInfo") {
      const selection: JsonRecord = {};
      for (const key of ["ClockId", "UseCurrentDisplayClock", "ParentClockId", "ParentItemId"])
        if (payload[key] !== undefined) selection[key] = payload[key];
      if (selection.ClockId === undefined) selection.UseCurrentDisplayClock = 1;
      const precheck = await callDivoomApi(target, "Device/GetLocalClockInfo", selection);
      const before = precheck.responseJson as JsonRecord;
      if (!Array.isArray(before.ItemList) || before.ItemList.length === 0)
        throw new Error("Cannot patch: non-empty GetLocalClockInfo ItemList is required.");
    }
    return callDivoomApi(target, command, payload);
  }

  if (name === "watchface_clock_catalog") {
    const model = authoringModel(args);
    const catalog = await loadClockCatalog(model);
    const clockIds = args.clockIds === undefined ? null
      : ensureArray(args.clockIds, "clockIds").map((value) => requiredInteger(value, "clockIds[]"));
    const fonts = args.fonts === undefined ? []
      : ensureArray(args.fonts, "fonts").map((value) => requiredInteger(value, "fonts[]"));
    const disps = args.disps === undefined ? []
      : ensureArray(args.disps, "disps").map((value) => requiredInteger(value, "disps[]"));
    const tagsAny = args.tagsAny === undefined ? [] : ensureArrayOfStrings(args.tagsAny, "tagsAny");
    const nameContains = optionalString(args.nameContains, "nameContains")?.toLowerCase();
    const itemIdContains = optionalString(args.itemIdContains, "itemIdContains")?.toLowerCase();
    const defaultOnly = optionalBoolean(args.defaultOnly, "defaultOnly") ?? false;
    const includeConfig = optionalBoolean(args.includeConfig, "includeConfig") ?? false;
    const limit = Math.max(1, Math.min(200, optionalInteger(args.limit, "limit") ?? 50));
    let filtered = catalog.clocks;
    if (clockIds?.length) {
      const wanted = new Set(clockIds);
      filtered = filtered.filter((clock) => wanted.has(clock.clockId));
    }
    if (nameContains) filtered = filtered.filter((clock) =>
      clock.nameCn.toLowerCase().includes(nameContains) || clock.nameEn.toLowerCase().includes(nameContains));
    if (defaultOnly) filtered = filtered.filter((clock) => clock.isDefault);
    if (fonts.length) filtered = filtered.filter((clock) => fonts.some((id) => clock.fonts.includes(id)));
    if (disps.length) filtered = filtered.filter((clock) => disps.some((id) => clock.disps.includes(id)));
    if (itemIdContains) filtered = filtered.filter((clock) =>
      clock.itemIds.some((id) => id.toLowerCase().includes(itemIdContains)));
    if (tagsAny.length) filtered = filtered.filter((clock) => tagsAny.some((tag) => clock.tags.includes(tag)));
    const truncated = filtered.length > limit;
    const selected = filtered.slice(0, limit);
    let clocks: Array<ClockCatalogRow & { config?: JsonRecord }> = selected;
    if (includeConfig) {
      const configs = await loadClockConfigs(model);
      clocks = selected.map((clock) => ({ ...clock, config: configs[String(clock.clockId)] }));
    }
    return { schema: catalog.schema, model, generatedAt: catalog.generatedAt, source: catalog.source,
      counts: { ...catalog.counts, afterFilter: filtered.length, returned: clocks.length, truncated },
      notes: catalog.notes, clocks };
  }

  if (name === "watchface_disp_catalog") {
    const catalog = await loadDispCatalog(authoringModel(args));
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
    const model = authoringModel(args);
    const catalog = await loadFontCatalog(model);
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

    let filtered: Array<FontCatalogEntry & { AvailableLocally?: boolean }> = catalog.fonts;
    let liveFontCount: number | undefined;
    if (model === "astrotoo" && args.target) {
      const result = await callDivoomApi(resolveTarget(args.target), "Device/GetLocalFontList");
      const response = ensureRecord(result.responseJson, "font response");
      const liveRows = ensureArray(response.FontList, "FontList").map((value) => ensureRecord(value, "FontList[]"));
      const availability = new Map(liveRows.map((row) => [
        requiredInteger(row.id ?? row.ID, "FontList[].id"), row.AvailableLocally !== false,
      ]));
      liveFontCount = availability.size;
      filtered = catalog.fonts.map((font) => ({ ...font, AvailableLocally: availability.get(font.id) === true }));
      const known = new Set(filtered.map((font) => font.id));
      for (const [id, available] of availability) if (!known.has(id)) filtered.push({
        id, type: -1, type_name: "image", name: `Font ${id}`, charset: "", script: "unknown",
        style_tags: [], recommendedFor: [], notes: "Reported by this device but absent from the bundled AstroToo font_list.cfg.",
        AvailableLocally: available,
      });
    }
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
      ? trimmed.map(({ id, name, type_name, script, AvailableLocally }) => ({ id, name, type_name, script, AvailableLocally }))
      : trimmed;

    return {
      schema: catalog.schema,
      generatedAt: catalog.generatedAt,
      source: catalog.source,
      counts: {
        totalInCatalog: catalog.fonts.length,
        liveFontCount,
        afterFilter: filtered.length,
        returned: fonts.length,
        truncated,
      },
      notes: model === "astrotoo" && args.target
        ? [...catalog.notes, "AvailableLocally is merged from Device/GetLocalFontList for this target."]
        : catalog.notes,
      scenarios: includeScenarios ? catalog.scenarios : undefined,
      fonts,
    };
  }

  if (name === "watchface_template_search") {
    const curated = await loadCuratedTemplates(authoringModel(args));
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
    const catalog = await loadDispCatalog(authoringModel(args));
    const entry = catalog.displays.find((d) => d.disp === dispId);
    if (!entry) {
      throw new Error(`disp ${dispId} not found in disp-catalog.`);
    }
    const canvasW = optionalInteger(args.canvasWidth, "canvasWidth") ?? PROFILES[authoringModel(args)].width;
    const canvasH = optionalInteger(args.canvasHeight, "canvasHeight") ?? PROFILES[authoringModel(args)].height;
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

  if (name === "watchface_protocol_quick_reference" && authoringModel(args) === "astrotoo") {
    return { model: "astrotoo", guide: await readFile(path.join(resourceRoot, PRODUCTS.astrotoo.resourceDir, "guide.md"), "utf8") };
  }
  if (name === "watchface_protocol_quick_reference") {
    const lines = [
      "1) Always POST JSON to /divoom_api (never GET). Root ReturnCode in the request must be 0.",
      "2) Read before write: Device/GetLocalClockInfo first; if ItemList is empty, stop and switch to an editable clock (Channel/SetClockSelectId) — do not auto-create.",
      "3) Patch minimally with ItemPatchList (per-index field diff) and ItemPatchByRoleList (semantic role). Do NOT include item_id inside patch.* unless explicitly renaming a slot — the device-side item_id is referenced by menus/config bindings.",
      "4) Only fall back to a full ItemList replacement when row count actually changes (rows added/removed). For pure metadata edits (size/x/y/font/color), POST /divoom_api JSON-only is enough.",
      "5) When new bytes need to land on the device, switch to multipart /patch_local_clock or /create_local_clock. JSON part first (name=\"json\"; filename=\"cmd.json\"), file part second (filename=\"clock_bg.jpg|webp|tar.gz\"); both parts carry per-part Content-Length; boundary is unquoted; CRLF; single file per request.",
      "5a) Multipart packaging (divoom_http_server_upload_get_file_info): firmware expects per-part Content-Length on each segment; browser FormData often uses boundary-only framing without per-part lengths. Firmware adds boundary-terminated parsing when lengths are absent and fixes JSON→file pointer math; still prefer explicit per-part Content-Length (this server's multipart builders do so).",
      "6) DialAssets selection: 'image' = no local element leaves (or all http(s) URLs); 'bundle' = at least one ItemList[i].image_addr or ItemPatchList[i].patch.bundle_image is a local leaf — pack as clock_bg.tar.gz (USTAR + gzip).",
      "7) Image format rules: dial backdrop is JPEG (FF D8) or WebP (RIFF…WEBP) only, ≤ 500 KiB, recommended 800x1280 portrait. Element slots inside the tarball accept JPEG/WebP/PNG (89 50 4E 47 …). GIF/BMP/TIFF must be transcoded client-side before packing.",
      "8) Replace cached backdrop without changing cfg DeviceImageUrl: POST /replace_clock_dial_bg multipart (no tar.gz, JPEG/WebP only).",
      "9) Generic /upload is disabled for TimesFrame in MCP local-only mode. Send received files only through /create_local_clock or /patch_local_clock; they are device-side staging inputs for that operation and are never uploaded outward. Verify the committed result with GetLocalClockInfo.",
      "10) ItemList JSON requirements: numbers disp/font/x/y/w/h/size/alig; non-empty strings color_1/color_2/item_id (#RRGGBB hex). ItemIdList parallel non-empty strings. alig: 3=center, 4=left, 5=right (firmware-native).",
      "11) Channel/SetClockSelectId switches the active dial on screen — confirm user intent before running.",
      "12) Device/ResetLocalClockFromServer is destructive (deletes local sys-side files first).",
      "13) Pick `ItemList[i].font` ids from `watchface_font_catalog` (or `divoom://font/catalog`). Read `divoom://font/guide` first for visual style, mood, and scenario-based recommendations per font id. Never hard-code an unknown id. Match the slot's content: digit-only image fonts (charset 0123456789) for time/date/temperature digits; CJK-capable TTFs for Chinese strings; pixel/digital/handwriting tags for stylistic dials. Cross-check the chosen id against `watchface_get_fonts_local` before patching a real device.",
      "14) Pick `ItemList[i].disp` ids from `watchface_disp_catalog` (or the `divoom://disp/catalog` resource). Use `hints.likelyUsesRasterOrAssetLayer` to decide whether the slot expects an `image_addr` asset (image/GIF/PNG) and `hints.oftenUsesVectorFontForText` to decide whether to assign a font id.",
      "15) When generating a fresh watchface JSON, validate the output against `divoom://watchface/schema` and start from `divoom://watchface/example-minimal` — keep `ItemIdList` parallel to `item_id` and stay inside the 800x1280 logical canvas.",
      "16) Before inventing coordinates from scratch, query `watchface_template_search` or read `divoom://templates/curated`, then clone an ItemList skeleton whose tags match your target scenario (weather, lunar, pixel_theme, …).",
      "17) Call `watchface_layout_suggest` with `disp` to seed `size/x/y/w/h/alig` plus frequent `color_*` pairs using median statistics embedded in `disp-catalog.typography`.",
      "18) Visual verification: after create/patch/switch, call `watchface_get_screen_snapshot` (Device/GetScreenSnapshot / DIVOOM_NET_COMM_GET_SCREEN_SNAPSHOT). Wait 2s, then GET http://<host>:9000/userdata/snapshot.webp (firmware may also report snapShotPath `/userdata/app_pic/snapshot.webp`). Compare the WebP against your design or a prior snapshot.",
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


const deviceTools = new Set([
  "watchface_get_device_info", "watchface_get_local", "watchface_patch_local",
  "watchface_get_fonts_local", "watchface_get_store_market_list", "watchface_set_clock_select",
  "watchface_get_brightness", "watchface_set_brightness", "watchface_onoff_screen",
  "watchface_replace_dial_bg_file", "watchface_upload_file", "watchface_create_local_clock",
  "watchface_reset_local_then_cloud", "watchface_get_screen_snapshot", "watchface_raw_command",
]);
const offlineTools = new Set([
  "watchface_clock_catalog", "watchface_disp_catalog", "watchface_font_catalog", "watchface_template_search",
  "watchface_layout_suggest", "watchface_protocol_quick_reference",
]);
const identifiedTargets = new WeakSet<object>();
tools.unshift({
  name: "watchface_get_device_info",
  description: "Query this device's Hardware version first, then return its product profile and LAN capabilities. Each target is identified independently.",
  inputSchema: { type: "object", properties: { target: targetSchema }, additionalProperties: false },
});
for (const tool of tools) {
  if (offlineTools.has(tool.name)) {
    tool.inputSchema.properties = {
      ...tool.inputSchema.properties,
      target: targetSchema,
      model: { type: "string", enum: ["timesframe", "astrotoo"], description: "For offline authoring only. A connected target's hardware determines its model." },
    };
  }
  tool.description = (tool.description ?? "") +
    " For AstroToo, first query hardware/capabilities; use the 480x480 AstroToo resources. Legacy 800x1280 examples and typography apply only to TimesFrame.";
}
function authoringModel(args: JsonRecord): Model {
  const value = args.model ?? "timesframe";
  if (value !== "timesframe" && value !== "astrotoo") throw new Error("Invalid authoring model.");
  return value;
}
async function dispatchTool(name: string, rawArgs: unknown) {
  const args = rawArgs === undefined ? {} : ensureRecord(rawArgs, "arguments");
  const needsDevice = deviceTools.has(name) || (offlineTools.has(name) && (args.target !== undefined || DEFAULT_HOST !== ""));
  if (!needsDevice) return handleToolCall(name, args);
  const unresolved = resolveTarget(args.target);
  return serial(unresolved, async () => {
    const target = await identify(unresolved);
    identifiedTargets.add(target);
    if (args.model !== undefined && args.model !== target.model)
      throw new Error("Authoring model conflicts with the connected device.");
    if (target.model === "astrotoo") {
      if (name === "watchface_reset_local_then_cloud") throw new Error("Cloud reset is disabled for AstroToo.");
      if (name === "watchface_upload_file" &&
          target.capabilities.LocalAssetUploadPath !== "/upload_local_asset")
        throw new Error("AstroToo firmware does not provide the dedicated local asset upload route; upgrade before uploading watchface assets.");
      if (["watchface_patch_local", "watchface_create_local_clock", "watchface_replace_dial_bg_file",
        "watchface_upload_file", "watchface_set_clock_select", "watchface_set_brightness", "watchface_onoff_screen",
        "watchface_raw_command"].includes(name)) requireLocal(target);
    }
    if (name === "watchface_get_device_info") return {
      host: target.host, port: target.port, model: target.model, hardware: target.hardware,
      identification: target.identification, canvas: PROFILES[target.model],
      resourceDirectory: PRODUCTS[target.model].resourceDir, capabilities: target.capabilities,
      mcpFilePolicy: target.model === "astrotoo"
        ? { localAssetUploadPath: target.capabilities.LocalAssetUploadPath, genericUpload: "temporary-until-bound", createPatchUpload: "temporary-until-processed", outboundFileUpload: false }
        : { genericUpload: "disabled", createPatchUpload: "temporary-until-processed", outboundFileUpload: false },
    };
    return handleToolCall(name, { ...args, target, model: target.model });
  });
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
      const result = await dispatchTool(
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
