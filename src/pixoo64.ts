import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { pixoo64Route, type IdentifiedTarget } from "./devices.js";

type RecordValue = Record<string, unknown>;
const integer = (minimum: number, maximum: number, description?: string) => ({ type: "integer", minimum, maximum, ...(description ? { description } : {}) });
const colorSchema = { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" };
const textProperties = {
  TextId: integer(0, 19), x: integer(0, 63), y: integer(0, 63), dir: integer(0, 1),
  font: integer(0, 7), TextWidth: integer(16, 64), speed: integer(0, 100),
  TextString: { type: "string", description: "UTF-8 text, fewer than 512 bytes." },
  color: colorSchema, align: integer(1, 3),
};
const itemProperties = { ...textProperties, TextId: integer(0, 39), type: integer(1, 23),
  font: integer(0, 65535, "PIXOO64 display-list font ID from GetTimeDialFontList; distinct from SendHttpText fonts 0–7. Type=0 supports scrolling."),
  TextWidth: integer(1, 64), Textheight: integer(1, 64), update_time: integer(1, 86400) };
const textSchema = { type: "object", properties: textProperties,
  required: ["TextId", "x", "y", "font", "TextWidth", "TextString", "color"], additionalProperties: false };
const itemSchema = { type: "object", properties: itemProperties,
  required: ["TextId", "type", "x", "y", "font", "TextWidth", "Textheight", "color"], additionalProperties: false };

export function pixoo64Tools(targetSchema: RecordValue): Tool[] {
  const make = (name: string, description: string, properties: RecordValue = {}, required: string[] = []): Tool => ({
    name: `pixoo64_${name}`, description: `${description} PIXOO64 Hardware 90/92/96 only. Provide target.hardware for direct LAN use, or resolve it using device discovery.`,
    inputSchema: { type: "object", properties: { target: targetSchema, ...properties }, required, additionalProperties: false },
  });
  return [
    make("get_device_info", "Report the 64×64 profile, version-specific route and declared MCP support. Explicit Hardware is a caller override, not a device query."),
    make("send_animation", "Send 1–59 RGB888 frames in order; reset the HTTP GIF ID then use PicID=1. Frames are row-major RGB base64, not PNG/JPEG/GIF bytes. Stops on first failure; never retries a partially sent animation.", {
      frames: { type: "array", minItems: 1, maxItems: 59, items: { type: "string" } },
      width: { type: "integer", enum: [16, 32, 64], default: 64 }, speed: integer(1, 65535),
    }, ["frames"]),
    make("send_text", "Add or replace a text overlay using Draw/SendHttpText. Requires a previously sent animation; backgroundColor optionally starts a solid 64×64 background first. Text fonts are 0–7. Legacy firmware requires 90102+.", {
      text: textSchema, backgroundColor: colorSchema,
    }, ["text"]),
    make("send_items", "Send time/date/weather/text elements using Draw/SendHttpItemList. Requires a previously sent animation; backgroundColor optionally starts a solid 64×64 background first. IDs 0–39 replace matching overlays. Read divoom://pixoo64/guide for types 1–23 and font policy.", {
      items: { type: "array", minItems: 1, maxItems: 40, items: itemSchema }, backgroundColor: colorSchema,
    }, ["items"]),
    make("clear_text", "Clear all HTTP text and display-list overlays using Draw/ClearHttpText."),
    make("set_brightness", "Set Channel/SetBrightness, 0–100.", { brightness: integer(0, 100) }, ["brightness"]),
    make("onoff_screen", "Set Channel/OnOffScreen, 1=on, 0=off.", { onOff: integer(0, 1) }, ["onOff"]),
    make("set_channel", "Set Channel/SetIndex, 0=faces, 1=cloud, 2=visualizer, 3=custom, 4=black screen.", { index: integer(0, 4) }, ["index"]),
    make("play_gif", "Play a device-accessible HTTP GIF URL using Device/PlayTFGif (16×16, 32×32 or 64×64). The device downloads the URL. Legacy firmware requires 90096+.", { url: { type: "string" } }, ["url"]),
    make("command_list", "Validate all commands before sending. Hardware 90/92 uses native Draw/CommandList (firmware 90102+); Hardware 96 sends the supported commands sequentially because the reference firmware has no native list handler. Stops on first failure; earlier commands may already have run. Nested lists and unsupported commands are rejected.", {
      commands: { type: "array", minItems: 1, maxItems: 40, items: { type: "object",
        description: "Command plus native fields. Allowed: Draw/SendHttpItemList, Draw/SendHttpText, Draw/ClearHttpText, Draw/ResetHttpGifId, Draw/SendHttpGif, Channel/SetBrightness, Channel/OnOffScreen, Channel/SetIndex, Device/PlayTFGif." } },
    }, ["commands"]),
  ];
}

function record(value: unknown, field: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  return value as RecordValue;
}
function keys(value: RecordValue, allowed: string[]) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unsupported PIXOO64 field: ${key}`);
}
function int(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max)
    throw new Error(`${field} must be an integer between ${min} and ${max}.`);
  return value as number;
}
function color(value: unknown): string {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error("color must be #RRGGBB.");
  return value;
}
function text(value: unknown): string {
  if (typeof value !== "string" || value.includes("\0") || Buffer.byteLength(value, "utf8") >= 512)
    throw new Error("TextString must be a UTF-8 string of fewer than 512 bytes without NUL.");
  return value;
}
function httpUrl(value: unknown): string {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") >= 256) throw new Error("URL must be a string shorter than 256 UTF-8 bytes.");
  const url = new URL(value);
  // The reference 96 firmware disables TLS in the device downloader.
  if (url.protocol !== "http:" || !url.hostname || url.username || url.password)
    throw new Error("PIXOO64 device URLs must use http:// without credentials.");
  return value;
}
function overlay(input: unknown, isItem: boolean): RecordValue {
  const row = record(input, isItem ? "item" : "text");
  keys(row, Object.keys(isItem ? itemProperties : textProperties));
  const x = int(row.x, "x", 0, 63), y = int(row.y, "y", 0, 63);
  const result: RecordValue = {
    TextId: int(row.TextId, "TextId", 0, isItem ? 39 : 19), x, y,
    dir: int(row.dir ?? 0, "dir", 0, 1), font: int(row.font, "font", 0, isItem ? 65535 : 7),
    TextWidth: int(row.TextWidth, "TextWidth", isItem ? 1 : 16, 64),
    speed: int(row.speed ?? 100, "speed", 0, 100), align: int(row.align ?? 1, "align", 1, 3), color: color(row.color),
  };
  if (x + Number(result.TextWidth) > 64) throw new Error("TextWidth exceeds the 64-pixel canvas at x.");
  if (isItem) {
    result.type = int(row.type, "type", 1, 23);
    result.Textheight = int(row.Textheight, "Textheight", 1, 64);
    if (y + Number(result.Textheight) > 64) throw new Error("Textheight exceeds the 64-pixel canvas at y.");
    if (row.TextString !== undefined) result.TextString = text(row.TextString);
    if (result.type === 22 || result.type === 23) result.TextString = text(row.TextString);
    if (result.type === 23) {
      result.TextString = httpUrl(result.TextString);
      result.update_time = int(row.update_time ?? 60, "update_time", 1, 86400);
    } else if (row.update_time !== undefined) throw new Error("update_time is only supported for type 23.");
  } else {
    if (y + 16 > 64) throw new Error("SendHttpText has a fixed height of 16 pixels.");
    result.TextString = text(row.TextString);
  }
  return result;
}
function items(input: unknown): RecordValue[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 40) throw new Error("ItemList must contain 1–40 items.");
  const rows = input.map(row => overlay(row, true));
  if (new Set(rows.map(row => row.TextId)).size !== rows.length) throw new Error("Duplicate TextId in ItemList.");
  return rows;
}
function rgb(input: unknown, width: number): string {
  if (typeof input !== "string" || input.length !== width * width * 4 || !/^[A-Za-z0-9+/]+$/.test(input))
    throw new Error(`PicData must be canonical base64 for exactly ${width * width * 3} RGB888 bytes.`);
  const bytes = Buffer.from(input, "base64");
  if (bytes.length !== width * width * 3 || bytes.toString("base64") !== input) throw new Error("Invalid RGB888 base64 frame.");
  return input;
}
function frame(input: RecordValue): RecordValue {
  const width = int(input.PicWidth, "PicWidth", 16, 64);
  if (![16, 32, 64].includes(width)) throw new Error("PicWidth must be 16, 32 or 64.");
  const count = int(input.PicNum, "PicNum", 1, 59);
  return { Command: "Draw/SendHttpGif", PicWidth: width, PicNum: count,
    PicOffset: int(input.PicOffset, "PicOffset", 0, count - 1), PicID: int(input.PicID, "PicID", 1, 2147483647),
    PicSpeed: int(input.PicSpeed, "PicSpeed", 1, 65535), PicData: rgb(input.PicData, width) };
}
function command(input: unknown): RecordValue {
  const cmd = record(input, "command");
  const { Command, ...body } = cmd;
  switch (Command) {
    case "Draw/SendHttpItemList": keys(body, ["ItemList"]); return { Command, ItemList: items(body.ItemList) };
    case "Draw/SendHttpText": return { Command, ...overlay(body, false) };
    case "Draw/ClearHttpText": case "Draw/ResetHttpGifId": keys(body, []); return { Command };
    case "Draw/SendHttpGif": keys(body, ["PicWidth", "PicNum", "PicOffset", "PicID", "PicSpeed", "PicData"]); return frame(body);
    case "Channel/SetBrightness": keys(body, ["Brightness"]); return { Command, Brightness: int(body.Brightness, "Brightness", 0, 100) };
    case "Channel/OnOffScreen": keys(body, ["OnOff"]); return { Command, OnOff: int(body.OnOff, "OnOff", 0, 1) };
    case "Channel/SetIndex": keys(body, ["SelectIndex"]); return { Command, SelectIndex: int(body.SelectIndex, "SelectIndex", 0, 4) };
    case "Device/PlayTFGif": keys(body, ["FileType", "FileName"]); int(body.FileType, "FileType", 2, 2); return { Command, FileType: 2, FileName: httpUrl(body.FileName) };
    default: throw new Error(`Unsupported PIXOO64 command: ${String(Command)}`);
  }
}
export function assertPixoo64Response(status: number, value: unknown): RecordValue {
  if (status < 200 || status >= 300) throw new Error(`PIXOO64 HTTP error ${status}.`);
  const body = record(value, "PIXOO64 response");
  const codes = ["error_code", "ReturnCode"].filter(key => Object.hasOwn(body, key));
  if (!codes.length || codes.some(key => body[key] !== 0))
    throw new Error(`PIXOO64 command failed or missing success code: ${JSON.stringify(body)}`);
  return body;
}
async function post(target: IdentifiedTarget, payload: RecordValue) {
  const endpoint = pixoo64Route(target.hardware!).endpoint;
  const body = JSON.stringify({ ...payload, ...(target.hardware === 96 ? { ReturnCode: 0 } : {}) });
  const response = await fetch(`http://${target.host}:${target.port}${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8", "Content-Length": String(Buffer.byteLength(body, "utf8")) },
    body, signal: AbortSignal.timeout(target.timeoutMs),
  });
  return assertPixoo64Response(response.status, await response.json());
}
async function sequence(target: IdentifiedTarget, commands: RecordValue[]) {
  const responses: RecordValue[] = [];
  for (const [index, cmd] of commands.entries()) {
    try { responses.push(await post(target, cmd)); }
    catch (error) {
      throw new Error(`PIXOO64 sequence stopped at index ${index} (${cmd.Command}); ${responses.length} commands acknowledged. The failed command's effect is unknown; do not blindly retry. ${String(error)}`);
    }
  }
  return responses;
}
function animation(frames: string[], width: number, speed: number) {
  return [{ Command: "Draw/ResetHttpGifId" }, ...frames.map((data, offset) => frame({
    PicNum: frames.length, PicWidth: width, PicOffset: offset, PicID: 1, PicSpeed: speed, PicData: data,
  }))];
}
export async function handlePixoo64(name: string, args: RecordValue, target: IdentifiedTarget) {
  if (target.model !== "pixoo64") throw new Error("PIXOO64 tools only support Hardware 90/92/96.");
  if (name === "pixoo64_get_device_info") return { model: target.model, hardware: target.hardware,
    host: target.host, port: target.port, endpoint: pixoo64Route(target.hardware!).endpoint,
    identification: target.identification, canvas: { width: 64, height: 64 }, capabilities: target.capabilities };
  let commands: RecordValue[];
  switch (name) {
    case "pixoo64_send_animation": {
      if (!Array.isArray(args.frames) || args.frames.length < 1 || args.frames.length > 59) throw new Error("frames must contain 1–59 RGB888 frames.");
      const width = int(args.width ?? 64, "width", 16, 64);
      if (![16, 32, 64].includes(width)) throw new Error("width must be 16, 32 or 64.");
      commands = animation(args.frames.map(data => rgb(data, width)), width, int(args.speed ?? 100, "speed", 1, 65535));
      break;
    }
    case "pixoo64_send_items": commands = [{ Command: "Draw/SendHttpItemList", ItemList: items(args.items) }]; break;
    case "pixoo64_send_text": commands = [{ Command: "Draw/SendHttpText", ...overlay(args.text, false) }]; break;
    case "pixoo64_clear_text": commands = [{ Command: "Draw/ClearHttpText" }]; break;
    case "pixoo64_set_brightness": commands = [command({ Command: "Channel/SetBrightness", Brightness: args.brightness })]; break;
    case "pixoo64_onoff_screen": commands = [command({ Command: "Channel/OnOffScreen", OnOff: args.onOff })]; break;
    case "pixoo64_set_channel": commands = [command({ Command: "Channel/SetIndex", SelectIndex: args.index })]; break;
    case "pixoo64_play_gif": commands = [command({ Command: "Device/PlayTFGif", FileType: 2, FileName: args.url })]; break;
    case "pixoo64_command_list": {
      if (!Array.isArray(args.commands) || args.commands.length < 1 || args.commands.length > 40) throw new Error("commands must contain 1–40 commands.");
      commands = args.commands.map(command);
      if (target.hardware !== 96) return { model: target.model, hardware: target.hardware, mode: "native", atomic: false,
        response: await post(target, { Command: "Draw/CommandList", CommandList: commands }) };
      break;
    }
    default: throw new Error(`Unknown PIXOO64 tool: ${name}`);
  }
  if (args.backgroundColor !== undefined) {
    if (!["pixoo64_send_items", "pixoo64_send_text"].includes(name)) throw new Error("backgroundColor is only supported for overlays.");
    const hex = color(args.backgroundColor).slice(1);
    const bytes = Buffer.alloc(64 * 64 * 3);
    for (let i = 0; i < bytes.length; i += 3) bytes.set(Buffer.from(hex, "hex"), i);
    commands.unshift(...animation([bytes.toString("base64")], 64, 100));
  }
  return { model: target.model, hardware: target.hardware, mode: "sequential", atomic: false,
    completed: commands.length, responses: await sequence(target, commands) };
}
