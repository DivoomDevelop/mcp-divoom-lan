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
const displays = [...header.matchAll(/^\s*(DIVOOM_CLOCK_DISP_SUPPORT_[A-Z0-9_]+)\s*=\s*(\d+)\s*,\s*(?:\/\/([^\r\n]*))?/gm)]
  .filter(([, symbol, id]) => Number(id) > 0 && implementation.includes(symbol))
  .map(([, symbol, id, comment]) => {
    const raster = /IMAGE|GIF|PIC|PNG/.test(symbol);
    return { disp: Number(id), name: symbol.replace("DIVOOM_CLOCK_DISP_SUPPORT_", ""),
      description_zh: comment?.trim() ?? "",
      hints: { likelyUsesRasterOrAssetLayer: raster, oftenUsesVectorFontForText: !raster,
        note: "AstroToo renderer symbol; dynamic data may require a corresponding device service." } };
  }).sort((a, b) => a.disp - b.disp);
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
write("disp-catalog.json", { schema: 1, model: "astrotoo", generatedAt, source: {
  base: "AstroToo simulator src/divoom_light/include/divoom_disp_clock.h + divoom_light/*.c",
  counts: { total: displays.length } }, notes: ["Hardware 530; 480x480.", "No TimesFrame typography is used."], displays });
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
schema.$defs.item.properties.disp = { type: "integer", enum: displays.map((entry) => entry.disp) };
write("watchface-config.schema.json", schema);
console.log(JSON.stringify({ displays: displays.length, fonts: fonts.length, clocks: clocks.length,
  defaults: defaultClockIds.length, serverFallback: clocks.filter((clock) => clock.sources.includes("server-fallback")).length }));
