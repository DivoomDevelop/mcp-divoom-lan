#!/usr/bin/env node
// Regenerate resources/astrotoo from the AstroToo simulator and Divoom command API.
import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const input = process.argv[2] ?? process.env.DIVOOM_ASTROTOO_SIMULATOR_ROOT ?? process.env.DIVOOM_ASTROTOO_SRC;
if (!input) throw new Error("Pass the LvglAstroTooSimulator root or set DIVOOM_ASTROTOO_SIMULATOR_ROOT.");
const supplied = path.resolve(input);
const simulatorRoot = fs.existsSync(path.join(supplied, "resource")) ? supplied : path.dirname(supplied);
const sourceRoot = fs.existsSync(path.join(simulatorRoot, "src")) ? path.join(simulatorRoot, "src") : supplied;
const deviceId = Number(process.env.DIVOOM_ASTROTOO_DEVICE_ID ?? "300400436");
const serverBase = (process.env.DIVOOM_SERVER_BASE_URL ?? "https://appchina.divoom-gz.com/").replace(/\/?$/, "/");

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function cSources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? cSources(path.join(dir, entry.name)) :
    entry.name.endsWith(".c") ? [fs.readFileSync(path.join(dir, entry.name), "utf8")] : []);
}
function requestCommand(command, extra = {}) {
  const body = JSON.stringify({
    Command: command,
    DeviceId: deviceId,
    PacketFlag: Math.floor(Date.now() / 1000),
    DeviceType: "AstroToo",
    ReturnCode: 0,
    ReturnMessage: "",
    ...extra,
  });
  const url = new URL(command, serverBase);
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (response.statusCode < 200 || response.statusCode >= 300)
          return reject(new Error(`${command}: HTTP ${response.statusCode}: ${text}`));
        try {
          const result = JSON.parse(text);
          if (result.ReturnCode !== 0) throw new Error(`ReturnCode=${result.ReturnCode}: ${result.ReturnMessage ?? ""}`);
          resolve(result);
        } catch (error) { reject(new Error(`${command}: invalid response: ${error}`)); }
      });
    });
    request.on("error", reject);
    request.setTimeout(30_000, () => request.destroy(new Error(`${command}: timeout`)));
    request.end(body);
  });
}

const header = fs.readFileSync(path.join(sourceRoot, "divoom_light/include/divoom_disp_clock.h"), "utf8");
const implementation = cSources(path.join(sourceRoot, "divoom_light")).join("\n");

function displayCategory(name, id) {
  if (id === 1000 || /_END_ID$|END_NUM_INFO/.test(name)) return "system_control";
  if ((id >= 261 && id <= 280) || /COMPONET|COMPONENT|DIAL_SPECIAL_ITEM|SET_COMPLEX/.test(name)) return "component";
  if (/POINT_IMAGE|WORLD_(HOUR|MIN)_POINT/.test(name)) return "analog";
  if (/MUSIC|SPOTIFY|LYRICS|SINGER|EQ_/.test(name)) return "music";
  if (/STOCK|FINANCE|EXCHANGE/.test(name)) return "finance";
  if (/CALENDAR|EVENT|SCHEDULE|TODO|DIALY|TODAY_ACTIVITIES/.test(name)) return "calendar";
  if (/CHINA_|LUNAR|SOLAR_TERM|FESTIVAL|POETRY/.test(name)) return "lunar_culture";
  if (/WEATHER|TEMP|HUMI|WIND|VISIBILITY|ATMOSPHERIC|AIR_|SUNRISE|SUNSET|PHASE_MOON|TIDAL/.test(name)) return "weather";
  if (/NOISE/.test(name)) return "environment";
  if (/AI_|DYNAMIC/.test(name)) return "ai_dynamic";
  if (/APP_|GAME_LEVEL/.test(name)) return "app_data";
  if (/NET\d|NET_PIC|RSS|WEB_CONTENT/.test(name)) return "network";
  if (/COUNT_?DOWN|CONTDOWN|TIMER|PASSED|DAYS_OF_LOVE|SEC_OF_LOVE|HALLOW_DAY|CHRISTMAS_DAY/.test(name)) return "countdown";
  if (/PHOTO|VIDEO|PICTRUE|PIXEL_|ANIMATION|GIF|WEBP|HOT_IMAGE|DIVOOM_HOT|MARBLE/.test(name)) return "photo_video";
  if (/TEXT|MESSAGE|DAILY_SENTENCE|WORD_OF_THE_DAY|AUTHOR_NICK_NAME/.test(name)) return "text";
  if (/DATE|WEEK|MONTH|YEAR|(^|_)DAY($|_)|(^|_)MON($|_)/.test(name)) return "date";
  if (/HOUR|MIN|SECOND|(^|_)SEC($|_)|TIME|AM_PM|AMPM|NOW_DISP/.test(name)) return "time";
  if (/WIFI|BATTERY|VOLUME|WORK_MODE|ALARM|UPLOAD_PROGRESS/.test(name)) return "system_status";
  if (/IMAGE|PIC|IMG|BACKGROUND|BACKGROUD|FLAG|MARK/.test(name)) return "image";
  return "other";
}

function renderKind(name, id) {
  if (id === 1000 || /_END_ID$|END_NUM_INFO/.test(name)) return "system";
  if (/POINT_IMAGE|WORLD_(HOUR|MIN)_POINT/.test(name)) return "analog_hand";
  if (/GIF|ANIMATION|VIDEO|EQ_|MARBLE/.test(name)) return "animation";
  if ((id >= 261 && id <= 280) || /COMPONET|COMPONENT|CALENDAR_WATCH|DIAL|FULL_SCREEN_LYRICS|SPECIAL_ITEM/.test(name)) return "composite";
  if (/IMAGE|PIC|IMG|PICTRUE|PHOTO|WEBP|EMOJI|FLAG|BACKGROUND|BACKGROUD|HEATMAP|MARK|DIVOOM_HOT/.test(name)) return "image";
  return "text";
}

function dataSource(category) {
  return ({
    time: "device_time", date: "device_time", countdown: "device_time", environment: "device_sensor",
    weather: "weather_service", calendar: "calendar_service", lunar_culture: "firmware_calendar",
    music: "audio_service", finance: "finance_service", ai_dynamic: "ai_service",
    app_data: "app_payload", network: "network_content", photo_video: "local_or_cached_media",
    image: "local_or_firmware_asset", text: "configuration_or_service",
    analog: "device_time", component: "linked_watchface", system_status: "device_state",
    system_control: "firmware_internal", other: "firmware_service",
  })[category];
}

function displayMetadata(name, id) {
  const category = displayCategory(name, id);
  const kind = renderKind(name, id);
  const internal = category === "system_control" || id === 280;
  const component = id >= 261 && id < 280;
  const localAsset = kind === "analog_hand" ||
    (/CUSTOM|USER_DEFINE/.test(name) && ["image", "animation", "composite"].includes(kind));
  const serviceAsset = ["image", "animation"].includes(kind) && !localAsset;
  return {
    category,
    renderKind: kind,
    dataSource: dataSource(category),
    assetRequirement: internal ? "none" : localAsset ? "local_asset" :
      serviceAsset ? "service_or_firmware_asset" : kind === "text" ? "font" : "firmware_managed",
    authoringMode: internal ? "firmware_internal" : component ? "component_reference" : "direct",
  };
}

const aliasByTarget = new Map();
for (const [, alias, target] of header.matchAll(/^\s*(DIVOOM_CLOCK_DISP_[A-Z0-9_]+)\s*=\s*(DIVOOM_CLOCK_DISP_[A-Z0-9_]+)\s*,/gm)) {
  const aliases = aliasByTarget.get(target) ?? [];
  aliases.push(alias);
  aliasByTarget.set(target, aliases);
}
const shortName = (symbol) => symbol.replace(/^DIVOOM_CLOCK_DISP_(?:SUPPORT_)?/, "");
const displays = [...header.matchAll(/^\s*(DIVOOM_CLOCK_DISP_[A-Z0-9_]+)\s*=\s*(\d+)\s*,\s*(?:\/\/([^\r\n]*))?/gm)]
  .filter(([, , id]) => Number(id) > 0)
  .map(([, symbol, id, comment]) => {
    const disp = Number(id);
    const aliases = aliasByTarget.get(symbol) ?? [];
    const referencedAlias = aliases.find((alias) => implementation.includes(alias));
    const implementationEvidence = implementation.includes(symbol) ? "direct_symbol" :
      referencedAlias ? "alias_symbol" : "declaration_only";
    const name = shortName(referencedAlias ?? symbol);
    const metadata = displayMetadata(name, disp);
    if (implementationEvidence === "declaration_only") metadata.authoringMode = "declared_only";
    const raster = ["image", "animation", "analog_hand"].includes(metadata.renderKind);
    return { disp, name, description_en: name.toLowerCase().replaceAll("_", " "),
      description_zh: comment?.trim() ?? "",
      ...metadata,
      implementationEvidence,
      aliases: [symbol, ...aliases].map(shortName).filter((value) => value !== name),
      hints: { likelyUsesRasterOrAssetLayer: raster, oftenUsesVectorFontForText: metadata.renderKind === "text",
        note: implementationEvidence === "declaration_only" ?
          "Declared by the AstroToo header but not directly referenced by current renderer C sources; do not author without hardware proof." :
          "Derived from the AstroToo renderer symbol; service-backed data and assets require the matching runtime provider." } };
  });
// The firmware treats 261 <= disp < 280 as 19 component positions. Only the
// first position has an enum symbol, but native configurations use the rest.
for (let disp = 262; disp < 280; disp++) {
  const name = `DAIL_COMPONENT_ID${disp - 260}`;
  displays.push({ disp, name, description_en: `dial component position ${disp - 260}`,
    description_zh: "", ...displayMetadata(name, disp), implementationEvidence: "renderer_range", aliases: [],
    hints: { likelyUsesRasterOrAssetLayer: false, oftenUsesVectorFontForText: false,
      note: "Implicit AstroToo component position accepted by the renderer range 261 <= disp < 280." } });
}
displays.sort((a, b) => a.disp - b.disp);
const displayById = new Map(displays.map((entry) => [entry.disp, entry]));

const clockDirectories = [
  ["userdata", path.join(simulatorRoot, "resource/userdata/system/clocksys")],
  ["packaged", path.join(simulatorRoot, "resource/usr/share/divoom_app/clocksys")],
];
const configurations = new Map();
const configurationSources = new Map();
for (const [kind, directory] of clockDirectories) {
  for (const name of fs.readdirSync(directory).filter((value) => /^clock\d+\.cfg$/i.test(value))) {
    const config = readJson(path.join(directory, name));
    const clockId = Number(config.ClockId ?? name.match(/\d+/)?.[0]);
    if (!Number.isInteger(clockId)) throw new Error(`Invalid ClockId in ${path.join(directory, name)}`);
    if (!configurations.has(clockId) || kind === "userdata") configurations.set(clockId, config);
    const sources = configurationSources.get(clockId) ?? [];
    sources.push(kind);
    configurationSources.set(clockId, sources);
  }
}

const [defaultResponse, fontNameResponse] = await Promise.all([
  requestCommand("Device/GetClockDefaultList", { IsDefault: 1 }),
  requestCommand("Device/GetFontForAI"),
]);
const defaultClockIds = [...new Set((defaultResponse.ClockList ?? []).map((row) => Number(row.ClockId)))]
  .filter(Number.isInteger).sort((a, b) => a - b);
for (const clockId of defaultClockIds.filter((id) => !configurations.has(id))) {
  const config = await requestCommand("Device/GetClockInfoV3", { ClockId: clockId });
  configurations.set(clockId, config);
  configurationSources.set(clockId, ["server-fallback"]);
}
const defaultSet = new Set(defaultClockIds);

function tagsFor(config) {
  const disps = (config.ItemList ?? []).map((item) => Number(item.disp));
  const symbols = disps.map((id) => displayById.get(id)?.name ?? "").join(" ");
  const names = `${config.NameCn ?? ""} ${config.NameEn ?? ""}`.toLowerCase();
  const tags = [];
  if (disps.includes(131) || disps.includes(132) || disps.includes(233) || /analog|pointer|指针/.test(names)) tags.push("analog");
  if (/WEATHER|TEMP|HUMIDITY|AIR_/.test(symbols) || /weather|天气|温度|湿度/.test(names)) tags.push("weather");
  if (/DATE|DAY|MONTH|WEEK|CALENDAR/.test(symbols) || /date|calendar|日期|日历|星期/.test(names)) tags.push("date");
  if (/TIME|HOUR|MIN|SECOND/.test(symbols) || /clock|time|时钟|时间/.test(names)) tags.push("time");
  if ((config.ItemList ?? []).some((item) => typeof item.image_addr === "string" && item.image_addr.length > 0)) tags.push("asset_heavy");
  if (Number(config.IsComponent) === 1) tags.push("component");
  if (defaultSet.has(Number(config.ClockId))) tags.push("default");
  return tags.length > 0 ? [...new Set(tags)] : ["other"];
}
function clockMetadata(clockId, config) {
  const items = Array.isArray(config.ItemList) ? config.ItemList : [];
  const fontCounts = new Map();
  for (const item of items) {
    const id = Number(item.font);
    if (Number.isInteger(id)) fontCounts.set(id, (fontCounts.get(id) ?? 0) + 1);
  }
  const dominantFonts = [...fontCounts].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, count]) => ({ id, share: Number((count / Math.max(items.length, 1)).toFixed(3)) }));
  const disps = [...new Set(items.map((item) => Number(item.disp)).filter(Number.isInteger))].sort((a, b) => a - b);
  const fonts = [...new Set(items.map((item) => Number(item.font)).filter(Number.isInteger))].sort((a, b) => a - b);
  const itemIds = [...new Set(items.map((item) => String(item.item_id ?? "")).filter(Boolean))];
  const assetCount = items.filter((item) => typeof item.image_addr === "string" && item.image_addr.length > 0).length;
  return {
    clockId, nameCn: String(config.NameCn ?? ""), nameEn: String(config.NameEn ?? ""),
    isDefault: defaultSet.has(clockId), sources: configurationSources.get(clockId) ?? [],
    sysUpdateTime: Number(config.SysUpdateTime ?? 0), itemCount: items.length,
    itemIds, disps, fonts, assetCount, tags: tagsFor(config),
    stats: { itemCount: items.length, uniqueDisps: disps.length,
      rasterSlotRatio: Number((assetCount / Math.max(items.length, 1)).toFixed(3)), dominantFonts },
  };
}
const clocks = [...configurations].sort((a, b) => a[0] - b[0]).map(([id, config]) => clockMetadata(id, config));

const displayUsage = new Map();
for (const [clockId, config] of configurations) {
  for (const disp of new Set((config.ItemList ?? []).map((item) => Number(item.disp)).filter(Number.isInteger))) {
    const row = displayUsage.get(disp) ?? { referenceConfigCount: 0, exampleClockIds: [] };
    row.referenceConfigCount++;
    if (row.exampleClockIds.length < 8) row.exampleClockIds.push(clockId);
    displayUsage.set(disp, row);
  }
}
for (const display of displays) {
  const usage = displayUsage.get(display.disp) ?? { referenceConfigCount: 0, exampleClockIds: [] };
  display.usage = { ...usage, usedInReferenceConfigs: usage.referenceConfigCount > 0 };
}

function countBy(rows, field) {
  return Object.fromEntries([...rows.reduce((counts, row) =>
    counts.set(row[field], (counts.get(row[field]) ?? 0) + 1), new Map())].sort((a, b) => a[0].localeCompare(b[0])));
}
const usedDisplays = displays.filter((entry) => entry.usage.usedInReferenceConfigs);
const displaySummary = {
  total: displays.length,
  usedInReferenceConfigs: usedDisplays.length,
  unusedInReferenceConfigs: displays.length - usedDisplays.length,
  categories: countBy(displays, "category"),
  renderKinds: countBy(displays, "renderKind"),
  assetRequirements: countBy(displays, "assetRequirement"),
  implementationEvidence: countBy(displays, "implementationEvidence"),
  topUsed: [...displays].sort((a, b) => b.usage.referenceConfigCount - a.usage.referenceConfigCount || a.disp - b.disp)
    .slice(0, 30).map(({ disp, name, category, renderKind, usage }) => ({ disp, name, category, renderKind, ...usage })),
  authoringRequirements: [
    "Select AstroToo by detected Hardware 530 before using these ids; never reuse TimesFrame disp semantics.",
    "Prefer elements with usedInReferenceConfigs=true and copy a native configuration with matching dataSource and renderKind.",
    "Elements backed by weather, calendar, music, finance, AI, app, or network services require that provider at runtime.",
    "Upload each local element asset separately, bind its local:// reference, and then commit fixed ClockId 60000.",
    "Use analog hand ids 131, 132, and 233 together with centered square upward-pointing images.",
    "Ids 261-279 reference linked component watchfaces; id 280 and id 1000 are firmware-internal and must not be authored.",
    "authoringMode=declared_only means the id exists in the current header but has no direct renderer-symbol evidence; do not generate it without hardware proof.",
    "An implemented entry with no reference configuration has renderer evidence but no validated authoring recipe; verify it on hardware.",
  ],
};

const fontFile = path.join(simulatorRoot, "resource/usr/share/divoom_app/system/font_list.cfg");
const fontNameFile = path.join(simulatorRoot, "resource/usr/share/divoom_app/system/font_name.cfg");
const localFontConfig = readJson(fontFile);
const cachedFontNames = fs.existsSync(fontNameFile) ? readJson(fontNameFile).font_list ?? [] : [];
const fontNames = new Map(cachedFontNames.map((entry) => [Number(entry.id), String(entry.name ?? "")]));
for (const entry of fontNameResponse.FontList ?? []) fontNames.set(Number(entry.ID), String(entry.NameEn ?? ""));
function fontScript(entry) {
  if (Number(entry.type) === 1) return "unicode";
  const chars = String(entry.charset ?? "");
  if (/^[0-9.:+\-$%°CFKM\s]*$/i.test(chars)) return "digits";
  return "latin";
}
const fonts = (localFontConfig.font_list ?? []).map((entry) => ({
  id: Number(entry.id), type: Number(entry.type), type_name: Number(entry.type) === 1 ? "ttf" : "image",
  name: fontNames.get(Number(entry.id)) ?? `Font ${entry.id}`,
  charset: String(entry.charset ?? ""), script: fontScript(entry), style_tags: [], recommendedFor: [],
  notes: `AstroToo local font; source asset ${entry.url ?? ""}`,
})).sort((a, b) => a.id - b.id);

const outputRoot = path.resolve("resources/astrotoo");
fs.mkdirSync(outputRoot, { recursive: true });
function write(name, value) {
  const file = path.join(outputRoot, name);
  const previous = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const next = JSON.stringify(value, null, 2) + "\n";
  if (previous !== null && fs.readFileSync(file, "utf8") !== previous) throw new Error("Concurrent edit: " + file);
  fs.writeFileSync(file, next);
}
const generatedAt = new Date().toISOString();
const source = {
  simulator: "LvglAstroTooSimulator",
  clockDirectories: ["resource/userdata/system/clocksys", "resource/usr/share/divoom_app/clocksys"],
  defaultList: { command: "Device/GetClockDefaultList", isDefault: 1, deviceId },
  missingConfigFallback: { command: "Device/GetClockInfoV3", deviceId },
};
write("disp-catalog.json", { schema: 2, model: "astrotoo", generatedAt, source: {
  base: "AstroToo simulator src/divoom_light/include/divoom_disp_clock.h + divoom_light/*.c",
  counts: { total: displays.length } }, notes: ["Hardware 530; 480x480.", "No TimesFrame typography is used.",
    "Classification fields are generated from header declarations and renderer symbols; usage fields are measured from bundled and server-fallback AstroToo configurations."],
  summary: displaySummary, displays });
write("disp-summary.json", { schema: 1, model: "astrotoo", generatedAt, source: {
  catalog: "divoom://astrotoo/disp/catalog", referenceConfigurations: configurations.size }, ...displaySummary });
write("font-catalog.json", { schema: 1, model: "astrotoo", generatedAt, source: {
  file: "resource/usr/share/divoom_app/system/font_list.cfg",
  nameCache: "resource/usr/share/divoom_app/system/font_name.cfg",
  nameCommand: "Device/GetFontForAI", deviceId, counts: { local: fonts.length, named: fonts.filter((font) => !font.name.startsWith("Font ")).length },
}, notes: ["Only IDs present in the AstroToo font_list.cfg are included.", "With a live target, MCP merges Device/GetLocalFontList availability into these names."], scenarios: {}, fonts });
write("clock-catalog.json", { schema: 1, model: "astrotoo", generatedAt, source,
  counts: { configurations: clocks.length, defaults: defaultClockIds.length,
    userdata: clocks.filter((clock) => clock.sources.includes("userdata")).length,
    packaged: clocks.filter((clock) => clock.sources.includes("packaged")).length,
    serverFallback: clocks.filter((clock) => clock.sources.includes("server-fallback")).length },
  notes: ["Clock IDs, names, fonts, disp IDs, and item IDs are AstroToo-specific.", "Default IDs come from Device/GetClockDefaultList with IsDefault=1."],
  defaultClockIds, clocks });
write("clock-configs.json", { schema: 1, model: "astrotoo", generatedAt, source,
  configurations: Object.fromEntries([...configurations].sort((a, b) => a[0] - b[0]).map(([id, config]) => [id, config])) });
const byId = new Map(clocks.map((clock) => [clock.clockId, clock]));
const templates = [...configurations].sort((a, b) => a[0] - b[0]).map(([id, config]) => {
  const meta = byId.get(id);
  return { bucket: meta.tags[0], clockId: id, nameCn: meta.nameCn, nameEn: meta.nameEn,
    tags: meta.tags, requiresFontSelection: false,
    requiredAssets: (config.ItemList ?? []).map((item) => item.image_addr).filter((value) => typeof value === "string" && value.length > 0),
    stats: meta.stats, watchface: config };
});
write("templates-curated.json", { schema: 1, model: "astrotoo", generatedAt, source,
  tagIndex: {}, notes: ["Native AstroToo 480x480 configurations; do not reuse their IDs, fonts, disp meanings, or coordinates for TimesFrame."], templates });
const example = templates.find((template) => template.tags.includes("time") && template.watchface.ItemList?.length > 0)?.watchface ?? templates[0].watchface;
write("example-minimal.json", example);
const schema = readJson("resources/timesframe/watchface-config.schema.json");
schema.title = "AstroToo 480x480 watchface";
schema.$id = "divoom://astrotoo/watchface/schema";
schema.$defs.item.properties.x = { type: "integer", minimum: 0, maximum: 479 };
schema.$defs.item.properties.y = { type: "integer", minimum: 0, maximum: 479 };
schema.$defs.item.properties.w = { type: "integer", minimum: 0, maximum: 480 };
schema.$defs.item.properties.h = { type: "integer", minimum: 0, maximum: 480 };
schema.$defs.item.properties.hier = { type: "integer", enum: [0, 1, 2] };
schema.$defs.item.properties.disp = { type: "integer", enum: displays
  .filter((entry) => !["declared_only", "firmware_internal"].includes(entry.authoringMode))
  .map((entry) => entry.disp) };
write("watchface-config.schema.json", schema);
console.log(JSON.stringify({ displays: displays.length, fonts: fonts.length, clocks: clocks.length,
  defaults: defaultClockIds.length, serverFallback: clocks.filter((clock) => clock.sources.includes("server-fallback")).length }));
