import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { timegateRoute, PRODUCTS, type IdentifiedTarget } from "./devices.js";

type ObjectValue = Record<string, unknown>;
const integer = (minimum: number, maximum: number) => ({ type: "integer", minimum, maximum });
const colorSchema = { type: "string", pattern: "^#[0-9a-fA-F]{6}$" };
const itemProperties = {
  TextId: integer(0, 39), type: integer(1, 23), x: integer(0, 127), y: integer(0, 127),
  dir: integer(0, 1), font: integer(0, 65535), TextWidth: integer(1, 128), Textheight: integer(1, 128),
  speed: integer(0, 100), align: integer(0, 5), color: colorSchema,
  TextString: { type: "string", description: "Fewer than 512 UTF-8 bytes. Required for type 22 text and type 23 HTTP URL." },
  update_time: integer(1, 86400),
};
const textProperties = { ...itemProperties, TextId: integer(0, 19), x: integer(0, 63), y: integer(0, 48),
  font: integer(0, 7), TextWidth: integer(16, 64) };
const { type: _type, Textheight: _height, update_time: _interval, ...singleTextProperties } = textProperties;
const lcdArraySchema = { type: "array", minItems: 5, maxItems: 5, items: integer(0, 1), description: "Exactly five 0/1 entries; at least one screen must be selected." };

export function timegateTools(targetSchema: ObjectValue): Tool[] {
  const make = (name: string, description: string, properties: ObjectValue = {}, required: string[] = [], authenticated = true): Tool => ({
    name: `timegate_${name}`, description: `${description} TimeGate Hardware 400/402 only; five independent 128×128 screens. Read divoom://timegate/guide.`,
    inputSchema: { type: "object", properties: { target: targetSchema,
      ...(authenticated ? { localToken: { type: "integer", minimum: 1, maximum: 2147483647,
        description: "LocalToken from the device settings. Required unless DIVOOM_TIMEGATE_LOCAL_TOKEN is set for the matching default host. Never guessed or fetched automatically." } } : {}),
      ...properties }, required, additionalProperties: false },
  });
  return [
    make("get_device_info", "Report the selected hardware profile, endpoint and per-screen canvas; explicit hardware is a caller override, not a queried device identity.", {}, [], false),
    make("send_items", "Create or update one screen with Draw/SendHttpItemList. mode=replace sends NewFlag=1; append sends 0. On first use of a 402 screen, supply backgroundGif with replace to initialize its background; missing background data can prevent visible rendering despite a success acknowledgement. 400 documentation says background is ignored on replace. MCP does not download the background itself.", {
      lcdIndex: integer(0, 4), mode: { type: "string", enum: ["replace", "append"], default: "replace" },
      backgroundGif: { type: "string", description: "Device-accessible HTTP GIF URL, fewer than 256 UTF-8 bytes. Required to initialize a 402 screen with no existing background; otherwise optional. Native field spelling is BackgroudGif." },
      items: { type: "array", minItems: 1, maxItems: 40, items: { type: "object", properties: itemProperties,
        required: ["TextId", "type", "x", "y", "font", "TextWidth", "Textheight", "color"], additionalProperties: false } },
    }, ["lcdIndex", "items"]),
    make("send_text", "Add text to an already active HTTP animation. lcdIndex must be the animation's first selected screen. 400 sends LcdIndex; 402 source reads LcdId. Text uses animation fonts 0–7 and a 16-pixel height, independently of display-list fonts. For regular custom dials use send_items type 22.", {
      lcdIndex: integer(0, 4), text: { type: "object", properties: singleTextProperties,
        required: ["TextId", "x", "y", "font", "TextWidth", "TextString", "color"], additionalProperties: false },
    }, ["lcdIndex", "text"]),
    make("clear_text", "Clear animation text using Draw/ClearHttpText and LcdId. textId=-1 clears all text on the selected animation. This does not delete display-list custom dials.", {
      lcdIndex: integer(0, 4), textId: integer(-1, 19),
    }, ["lcdIndex", "textId"]),
    make("set_brightness", "Set global LCD brightness, 0–100.", { brightness: integer(0, 100) }, ["brightness"]),
    make("get_brightness", "Read brightness: 400 uses Channel/GetAllConf; 402 reads effective brightness through Channel/GetClockInfo on LCD 0. The reference 402 Sys/GetBrightness returns a hardcoded 100 and is not used. Effective brightness is 0 when the screen is off."),
    make("onoff_screen", "Switch all screens, onOff=1 on and 0 off.", { onOff: integer(0, 1) }, ["onOff"]),
    make("select_clock", "Select a whole-device clock when lcdIndex is omitted. For one screen, provide lcdIndex and lcdIndependence from the device's existing configuration; no default independence ID is assumed.", {
      clockId: integer(1, 2147483647), lcdIndex: integer(0, 4), lcdIndependence: integer(1, 2147483647),
    }, ["clockId"]),
    make("play_gif", "Play 1–9 HTTP GIF URLs on the selected screens using Device/PlayGif. GIF dimensions must be square 16/32/64/128. URLs are downloaded by the device; an acknowledgement does not verify rendering.", {
      lcdArray: lcdArraySchema, urls: { type: "array", minItems: 1, maxItems: 9, items: { type: "string" } },
    }, ["lcdArray", "urls"]),
    make("command_list", "Validate the complete whitelist batch before writing. 400 uses native Draw/CommandList; 402 executes commands sequentially in MCP because the reference firmware has no list handler. No nested lists, token overrides or unsupported commands. Stops on failure without retry or rollback; earlier commands may have run.", {
      commands: { type: "array", minItems: 1, maxItems: 40, items: { type: "object",
        description: "Native Command plus fields. Whitelist: Draw/SendHttpItemList, Draw/SendHttpText, Draw/ClearHttpText, Channel/SetBrightness, Channel/OnOffScreen, Channel/Set5LcdWholeClockId, Channel/SetClockSelectId, Device/PlayGif. LocalToken is provided only at the MCP argument level." } },
    }, ["commands"]),
  ];
}
function object(value: unknown, field: string): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  return value as ObjectValue;
}
function keys(value: ObjectValue, allowed: string[]) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unsupported TimeGate field: ${key}`);
}
function int(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max)
    throw new Error(`${field} must be an integer between ${min} and ${max}.`);
  return value as number;
}
function string(value: unknown, field: string, maxBytes = 511): string {
  if (typeof value !== "string" || value.includes("\0") || Buffer.byteLength(value, "utf8") > maxBytes)
    throw new Error(`${field} must be a UTF-8 string of at most ${maxBytes} bytes without NUL.`);
  return value;
}
function url(value: unknown): string {
  const text = string(value, "device URL", 255), parsed = new URL(text);
  if (parsed.protocol !== "http:" || !parsed.hostname || parsed.username || parsed.password)
    throw new Error("TimeGate device URLs must use http:// without credentials.");
  return text;
}
function overlay(input: unknown, hardware: number, isItem: boolean): ObjectValue {
  const row = object(input, "overlay");
  keys(row, Object.keys(isItem ? itemProperties : singleTextProperties));
  const width = int(row.TextWidth, "TextWidth", isItem ? 1 : 16, isItem ? 128 : 64);
  const height = isItem ? int(row.Textheight, "Textheight", 1, 128) : 16;
  const x = int(row.x, "x", 0, isItem ? 127 : 63), y = int(row.y, "y", 0, isItem ? 127 : 48);
  const boundary = isItem ? 128 : 64;
  if (x + width > boundary || y + height > boundary) throw new Error(`Overlay exceeds its ${boundary}×${boundary} canvas.`);
  const color = string(row.color, "color");
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("color must be #RRGGBB.");
  const alignMin = hardware === 400 || !isItem ? 1 : 0;
  const alignMax = hardware === 400 || !isItem ? 3 : 5;
  // Legacy standalone text has its own documented 0–5 alignment values.
  const align = int(row.align ?? 1, "align", hardware === 400 && !isItem ? 0 : alignMin,
    hardware === 400 && !isItem ? 5 : alignMax);
  const result: ObjectValue = { TextId: int(row.TextId, "TextId", 0, isItem ? 39 : 19), x, y,
    dir: int(row.dir ?? 0, "dir", 0, 1), font: int(row.font, "font", 0, isItem ? 65535 : 7),
    TextWidth: width, speed: int(row.speed ?? 100, "speed", 0, 100), align, color,
    TextString: row.TextString === undefined && isItem ? "" : string(row.TextString, "TextString") };
  if (isItem) {
    result.type = int(row.type, "type", 1, 23); result.Textheight = height;
    if (result.type === 22 || result.type === 23) result.TextString = string(row.TextString, "TextString");
    if (result.type === 23) {
      result.TextString = url(result.TextString); result.update_time = int(row.update_time ?? 60, "update_time", 1, 86400);
    } else if (row.update_time !== undefined) throw new Error("update_time requires type 23.");
  }
  return result;
}
function itemList(value: unknown, hardware: number) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40) throw new Error("ItemList must contain 1–40 elements.");
  const rows = value.map(row => overlay(row, hardware, true));
  if (new Set(rows.map(row => row.TextId)).size !== rows.length) throw new Error("Duplicate TextId in ItemList.");
  return rows;
}
function nativeCommand(input: unknown, hardware: number): ObjectValue {
  const { Command, ...body } = object(input, "command");
  switch (Command) {
    case "Draw/SendHttpItemList":
      keys(body, ["LcdIndex", "NewFlag", "BackgroudGif", "ItemList"]);
      return { Command, LcdIndex: int(body.LcdIndex, "LcdIndex", 0, 4), NewFlag: int(body.NewFlag, "NewFlag", 0, 1),
        BackgroudGif: body.BackgroudGif === undefined || body.BackgroudGif === "" ? "" : url(body.BackgroudGif), ItemList: itemList(body.ItemList, hardware) };
    case "Draw/SendHttpText": {
      const lcdField = hardware === 400 ? "LcdIndex" : "LcdId";
      const lcd = int(body[lcdField], lcdField, 0, 4);
      const { [lcdField]: _lcd, ...text } = body;
      return { Command, [lcdField]: lcd, ...overlay(text, hardware, false) };
    }
    case "Draw/ClearHttpText": keys(body, ["LcdId", "TextId"]); return { Command, LcdId: int(body.LcdId, "LcdId", 0, 4), TextId: int(body.TextId, "TextId", -1, 19) };
    case "Channel/SetBrightness": keys(body, ["Brightness"]); return { Command, Brightness: int(body.Brightness, "Brightness", 0, 100) };
    case "Channel/OnOffScreen": keys(body, ["OnOff"]); return { Command, OnOff: int(body.OnOff, "OnOff", 0, 1) };
    case "Channel/Set5LcdWholeClockId": keys(body, ["ClockId"]); return { Command, ClockId: int(body.ClockId, "ClockId", 1, 2147483647) };
    case "Channel/SetClockSelectId": keys(body, ["ClockId", "LcdIndex", "LcdIndependence"]); return { Command,
      ClockId: int(body.ClockId, "ClockId", 1, 2147483647), LcdIndex: int(body.LcdIndex, "LcdIndex", 0, 4),
      LcdIndependence: int(body.LcdIndependence, "LcdIndependence", 1, 2147483647) };
    case "Device/PlayGif": {
      keys(body, ["LcdArray", "FileName"]);
      if (!Array.isArray(body.LcdArray) || body.LcdArray.length !== 5) throw new Error("LcdArray requires exactly five 0/1 entries.");
      const lcds = body.LcdArray.map(flag => int(flag, "LcdArray entry", 0, 1));
      if (!lcds.includes(1)) throw new Error("LcdArray must select at least one screen.");
      if (!Array.isArray(body.FileName) || body.FileName.length < 1 || body.FileName.length > 9) throw new Error("FileName requires 1–9 GIF URLs.");
      return { Command, LcdArray: lcds, FileName: body.FileName.map(url) };
    }
    default: throw new Error(`Unsupported TimeGate command: ${String(Command)}`);
  }
}
function tokenFor(args: ObjectValue, target: IdentifiedTarget): number {
  const sameDefaultHost = target.host === (process.env.DIVOOM_DEVICE_HOST ?? "").trim();
  const configured = sameDefaultHost ? (process.env.DIVOOM_TIMEGATE_LOCAL_TOKEN ?? "").trim() : "";
  return int(args.localToken ?? (configured ? Number(configured) : undefined), "localToken from device settings", 1, 2147483647);
}
function redact(value: unknown, token: number): unknown {
  if (typeof value === "string") return value.replace(new RegExp(`\\b${token}\\b`, "g"), "[redacted]");
  if (Array.isArray(value)) return value.map(entry => redact(entry, token));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
    [key, key.toLowerCase() === "localtoken" ? "[redacted]" : redact(entry, token)]));
  return value;
}
async function post(target: IdentifiedTarget, command: ObjectValue, token: number): Promise<ObjectValue> {
  const payload = JSON.stringify({ ...command, LocalToken: token, ...(target.hardware === 402 ? { ReturnCode: 0 } : {}) });
  const response = await fetch(`http://${target.host}:${target.port}${timegateRoute(target.hardware!).endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8", "Content-Length": String(Buffer.byteLength(payload, "utf8")) },
    body: payload, signal: AbortSignal.timeout(target.timeoutMs),
  });
  if (!response.ok) throw new Error(`TimeGate HTTP error ${response.status}.`);
  const body = object(await response.json(), "TimeGate response");
  const codes = ["ReturnCode", "error_code"].filter(key => Object.hasOwn(body, key));
  if (!codes.length || codes.some(key => body[key] !== 0)) throw new Error(`TimeGate command failed or missing success code: ${JSON.stringify(redact(body, token))}`);
  return redact(body, token) as ObjectValue;
}
export async function handleTimeGate(name: string, args: ObjectValue, target: IdentifiedTarget) {
  if (target.model !== "timegate") throw new Error("TimeGate tools only support Hardware 400/402.");
  if (name === "timegate_get_device_info") return { model: "timegate", hardware: target.hardware, host: target.host, port: target.port,
    endpoint: timegateRoute(target.hardware!).endpoint, identification: target.identification,
    canvas: PRODUCTS.timegate.canvas, screenCount: 5, resourceDirectory: "timegate", capabilities: target.capabilities };
  const token = tokenFor(args, target), hardware = target.hardware!;
  try {
    if (name === "timegate_get_brightness") {
      const response = await post(target, hardware === 400 ? { Command: "Channel/GetAllConf" }
        : { Command: "Channel/GetClockInfo", LcdIndex: 0, LcdIndependence: 0 }, token);
      return { hardware, brightness: int(response.Brightness, "response.Brightness", 0, 100), response };
    }
    let commands: ObjectValue[];
    switch (name) {
      case "timegate_send_items": {
        const mode = args.mode ?? "replace";
        if (mode !== "replace" && mode !== "append") throw new Error("mode must be replace or append.");
        commands = [nativeCommand({ Command: "Draw/SendHttpItemList", LcdIndex: args.lcdIndex, NewFlag: mode === "replace" ? 1 : 0,
          BackgroudGif: args.backgroundGif, ItemList: args.items }, hardware)]; break;
      }
      case "timegate_send_text": {
        const text = object(args.text, "text"); keys(text, Object.keys(singleTextProperties));
        commands = [nativeCommand({ ...text, Command: "Draw/SendHttpText",
          [hardware === 400 ? "LcdIndex" : "LcdId"]: args.lcdIndex }, hardware)]; break;
      }
      case "timegate_clear_text": commands = [nativeCommand({ Command: "Draw/ClearHttpText", LcdId: args.lcdIndex, TextId: args.textId }, hardware)]; break;
      case "timegate_set_brightness": commands = [nativeCommand({ Command: "Channel/SetBrightness", Brightness: args.brightness }, hardware)]; break;
      case "timegate_onoff_screen": commands = [nativeCommand({ Command: "Channel/OnOffScreen", OnOff: args.onOff }, hardware)]; break;
      case "timegate_select_clock": {
        if (args.lcdIndex === undefined && args.lcdIndependence !== undefined) throw new Error("lcdIndependence requires lcdIndex.");
        commands = [nativeCommand(args.lcdIndex === undefined
          ? { Command: "Channel/Set5LcdWholeClockId", ClockId: args.clockId }
          : { Command: "Channel/SetClockSelectId", ClockId: args.clockId, LcdIndex: args.lcdIndex, LcdIndependence: args.lcdIndependence }, hardware)]; break;
      }
      case "timegate_play_gif": commands = [nativeCommand({ Command: "Device/PlayGif", LcdArray: args.lcdArray, FileName: args.urls }, hardware)]; break;
      case "timegate_command_list":
        if (!Array.isArray(args.commands) || args.commands.length < 1 || args.commands.length > 40) throw new Error("commands must contain 1–40 commands.");
        commands = args.commands.map(value => nativeCommand(value, hardware));
        if (hardware === 400) return { hardware, mode: "native", atomic: false,
          response: await post(target, { Command: "Draw/CommandList", CommandList: commands }, token) };
        break;
      default: throw new Error(`Unknown TimeGate tool: ${name}`);
    }
    const responses: ObjectValue[] = [];
    for (const [index, command] of commands.entries()) {
      try { responses.push(await post(target, command, token)); }
      catch (error) { throw new Error(`TimeGate sequence stopped at index ${index} (${command.Command}); ${responses.length} commands acknowledged. Failed command effect is unknown; do not blindly retry. ${String(error)}`); }
    }
    return { hardware, mode: "sequential", atomic: false, completed: responses.length, responses };
  } catch (error) { throw new Error(String(redact(error instanceof Error ? error.message : String(error), token))); }
}
