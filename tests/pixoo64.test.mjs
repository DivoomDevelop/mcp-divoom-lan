import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { hardwareModel, identifyPixoo64, pixoo64Route } from "../dist/devices.js";
import { assertPixoo64Response } from "../dist/pixoo64.js";

let server, client, transport, port;
const state = { calls: [], rows: [], fail: null, delay: 0, discoveryFail: false, responseMode: null };
const target = hardware => ({ host: "127.0.0.1", port, model: "pixoo64", hardware, timeoutMs: 1000 });
const item = extra => ({ TextId: 1, type: 22, x: 0, y: 0, font: 2, TextWidth: 64,
  Textheight: 16, color: "#FFFFFF", TextString: "你好, Divoom", ...extra });
const text = extra => ({ TextId: 1, x: 0, y: 40, font: 4, TextWidth: 64, color: "#FFFF00", TextString: "Hello", ...extra });
const call = (name, args = {}) => client.callTool({ name, arguments: args });
function data(result) { assert.ok(!result.isError, result.content?.[0]?.text); return JSON.parse(result.content[0].text); }
function error(result, pattern) { assert.equal(result.isError, true); assert.match(result.content[0].text, pattern); }

before(async () => {
  server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") {
      res.statusCode = state.discoveryFail ? 503 : 200;
      res.end(JSON.stringify({ ReturnCode: 0, DeviceList: state.rows })); return;
    }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const bytes = Buffer.concat(chunks), body = JSON.parse(bytes);
    state.calls.push({ path: req.url, body, length: Number(req.headers["content-length"]), actualLength: bytes.length });
    if (body.Command === "Device/GetHardwareVersion") {
      res.end(JSON.stringify({ ReturnCode: 1, ReturnMessage: "unsupported command" })); return;
    }
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    if (state.responseMode === "invalid") { res.end("{truncated"); return; }
    if (state.responseMode === "missing") { res.end("{}"); return; }
    if (state.responseMode === "http") res.statusCode = 503;
    if (state.fail === body.Command) { res.end(JSON.stringify({ error_code: 1, ReturnMessage: "fixture failure" })); return; }
    res.end(JSON.stringify(req.url === "/post" ? { error_code: 0 } : { ReturnCode: 0 }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  state.rows = [{ DeviceName: "PIXOO64", DeviceId: 1, DevicePrivateIP: "127.0.0.1", Hardware: 90 }];
  transport = new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"],
    env: { ...process.env, DIVOOM_DEVICE_HOST: "", DIVOOM_DEVICE_PORT: "", DIVOOM_DEVICE_HARDWARE: "",
      DIVOOM_DEVICE_MODEL: "auto", DIVOOM_DISCOVERY_URL: `http://127.0.0.1:${port}/discovery` }, stderr: "pipe" });
  client = new Client({ name: "pixoo64-tests", version: "1" }); await client.connect(transport);
});
after(async () => { await client?.close(); server?.close(); });

test("90/92/96 have independent hardware profiles and default routes", async () => {
  for (const hardware of [90, 92, 96]) {
    assert.equal(hardwareModel(hardware), "pixoo64");
    const route = pixoo64Route(hardware);
    const info = data(await call("pixoo64_get_device_info", { target: { host: "device.invalid", hardware } }));
    assert.equal(info.port, hardware === 96 ? 9000 : 80);
    assert.equal(info.endpoint, route.endpoint);
    assert.equal(info.identification, "hardware-override");
    assert.deepEqual(info.canvas, { width: 64, height: 64 });
  }
  assert.throws(() => pixoo64Route(400), /90, 92 or 96/);
});
test("all versions post to their own endpoint and preserve explicit proxy ports", async () => {
  for (const hardware of [90, 92, 96]) {
    state.calls = [];
    data(await call("pixoo64_set_brightness", { target: target(hardware), brightness: 50 }));
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].path, hardware === 96 ? "/divoom_api" : "/post");
    assert.equal(state.calls[0].body.Command, "Channel/SetBrightness");
    assert.equal(state.calls[0].body.Brightness, 50);
    assert.equal(Object.hasOwn(state.calls[0].body, "ReturnCode"), hardware === 96);
  }
});
test("discovery is refreshed, rejects other products, missing, malformed and ambiguous hardware", async () => {
  const auto = { host: "127.0.0.1", port, model: "pixoo64" };
  for (const hardware of [90, 92, 96]) {
    state.rows[0].Hardware = hardware;
    const info = data(await call("pixoo64_get_device_info", { target: auto }));
    assert.equal(info.hardware, hardware); assert.equal(info.identification, "discovery");
  }
  for (const hardware of [530, 400, 999, null, "90"]) {
    state.rows[0].Hardware = hardware;
    error(await call("pixoo64_set_brightness", { target: auto, brightness: 30 }), /Hardware/);
  }
  state.rows[0].Hardware = 90;
  state.rows.push({ ...state.rows[0] });
  error(await call("pixoo64_get_device_info", { target: auto }), /Ambiguous/);
  state.rows.pop();
  error(await call("pixoo64_get_device_info", { target: { host: "missing.invalid" } }), /not found/);
  state.discoveryFail = true;
  error(await call("pixoo64_get_device_info", { target: auto }), /HTTP error/);
  // Explicit hardware profiles support offline LAN operation.
  data(await call("pixoo64_set_brightness", { target: target(92), brightness: 30 }));
  state.discoveryFail = false;
});
test("generic info discovers PIXOO64 after unsupported hardware query and blocks watchface writes", async () => {
  state.rows[0].Hardware = 96;
  const auto = { host: "127.0.0.1", port, timeoutMs: 1000 };
  assert.equal(data(await call("watchface_get_device_info", { target: auto })).model, "pixoo64");
  state.calls = [];
  error(await call("watchface_patch_local", { target: auto, itemPatchList: [] }), /PIXOO64 uses/);
  assert.deepEqual(state.calls.map(row => row.body.Command), ["Device/GetHardwareVersion"]);
  for (const name of ["watchface_raw_command", "watchface_upload_file", "watchface_create_local_clock", "watchface_font_catalog", "watchface_get_screen_snapshot"]) {
    state.calls = [];
    error(await call(name, { target: target(96) }), /PIXOO64 uses/);
    assert.equal(state.calls.length, 0);
  }
  for (const hardware of [89, 93, 97, 400]) error(await call("pixoo64_get_device_info", { target: target(hardware) }), /90, 92 or 96/);
  error(await call("pixoo64_set_brightness", { target: { ...target(90), model: "astrotoo" }, brightness: 50 }), /require model/);
  state.rows[0].Hardware = 90;
});
test("overlay background, UTF-8, native field casing and defaults reach device in order", async () => {
  state.calls = [];
  data(await call("pixoo64_send_items", { target: target(96), backgroundColor: "#123456", items: [item()] }));
  assert.deepEqual(state.calls.map(row => row.body.Command), ["Draw/ResetHttpGifId", "Draw/SendHttpGif", "Draw/SendHttpItemList"]);
  const frame = state.calls[1].body;
  assert.deepEqual([...Buffer.from(frame.PicData, "base64").subarray(0, 6)], [18, 52, 86, 18, 52, 86]);
  assert.equal(frame.PicWidth, 64); assert.equal(frame.PicID, 1);
  const sent = state.calls[2].body.ItemList[0];
  assert.equal(sent.TextString, "你好, Divoom"); assert.equal(sent.Textheight, 16);
  assert.equal(sent.speed, 100); assert.equal(sent.align, 1); assert.equal(sent.dir, 0);
  for (const row of state.calls) assert.equal(row.length, row.actualLength);
});
test("invalid overlays never initialize a background or send a partial list", async () => {
  for (const change of [{ TextId: 40 }, { type: 24 }, { TextString: "中".repeat(171) }, { color: "red" },
    { x: 63 }, { y: 63 }, { speed: 101 }, { font: -1 }, { align: 0 }, { TextString: undefined },
    { type: 23, TextString: "https://example.com" }, { type: 23, TextString: "http://example.com", update_time: 0 }]) {
    state.calls = [];
    assert.equal((await call("pixoo64_send_items", { target: target(90), backgroundColor: "#000000", items: [item(), item({ TextId: 2, ...change })] })).isError, true);
    assert.equal(state.calls.length, 0);
  }
  error(await call("pixoo64_send_items", { target: target(90), items: [item(), item()] }), /Duplicate/);
  data(await call("pixoo64_send_items", { target: target(90), items: [item({ type: 23, TextString: "http://example.com" })] }));
  assert.equal(state.calls.at(-1).body.ItemList[0].update_time, 60);
});
test("text fonts are isolated from display-list fonts and fixed 16-pixel height is enforced", async () => {
  state.calls = [];
  data(await call("pixoo64_send_text", { target: target(92), text: text() }));
  assert.equal(state.calls[0].body.Command, "Draw/SendHttpText");
  assert.equal(state.calls[0].body.font, 4);
  for (const change of [{ font: 18 }, { TextId: 20 }, { y: 49 }, { TextWidth: 15 }]) {
    const n = state.calls.length;
    assert.equal((await call("pixoo64_send_text", { target: target(92), text: text(change) })).isError, true);
    assert.equal(state.calls.length, n);
  }
});
test("animation validates all RGB888 frames then sends offsets sequentially", async () => {
  for (const hardware of [90, 92, 96]) {
    state.calls = [];
    const frames = [Buffer.alloc(16 * 16 * 3, 1).toString("base64"), Buffer.alloc(16 * 16 * 3, 2).toString("base64")];
    data(await call("pixoo64_send_animation", { target: target(hardware), width: 16, frames, speed: 120 }));
    assert.deepEqual(state.calls.map(row => row.body.Command), ["Draw/ResetHttpGifId", "Draw/SendHttpGif", "Draw/SendHttpGif"]);
    assert.deepEqual(state.calls.slice(1).map(row => row.body.PicOffset), [0, 1]);
    assert.ok(state.calls.slice(1).every(row => row.body.PicNum === 2 && row.body.PicID === 1 && row.body.PicSpeed === 120));
  }
  for (const frames of [[], ["bad"], [Buffer.alloc(768).toString("base64"), "bad"], Array(60).fill("bad")]) {
    state.calls = [];
    assert.equal((await call("pixoo64_send_animation", { target: target(96), width: 16, frames })).isError, true);
    assert.equal(state.calls.length, 0);
  }
});
test("90/92 command lists are native; 96 lists run sequentially without an unsupported wrapper", async () => {
  const commands = [{ Command: "Channel/SetBrightness", Brightness: 50 }, { Command: "Draw/ClearHttpText" }];
  for (const hardware of [90, 92, 96]) {
    state.calls = [];
    const result = data(await call("pixoo64_command_list", { target: target(hardware), commands }));
    if (hardware === 96) {
      assert.equal(result.mode, "sequential");
      assert.deepEqual(state.calls.map(row => row.body.Command), commands.map(row => row.Command));
    } else {
      assert.equal(result.mode, "native"); assert.equal(state.calls.length, 1);
      assert.deepEqual(state.calls[0].body, { Command: "Draw/CommandList", CommandList: commands });
    }
  }
  for (const bad of [{ Command: "Device/CreateLocalClock" }, { Command: "Draw/CommandList", CommandList: commands },
    { Command: "Channel/SetBrightness", Brightness: 101 }, { Command: "Draw/ClearHttpText", extra: true }]) {
    state.calls = [];
    assert.equal((await call("pixoo64_command_list", { target: target(90), commands: [commands[0], bad] })).isError, true);
    assert.equal(state.calls.length, 0);
  }
});
test("sequence failures stop without retries and report acknowledged count", async () => {
  state.calls = []; state.fail = "Channel/OnOffScreen";
  error(await call("pixoo64_command_list", { target: target(96), commands: [
    { Command: "Channel/SetBrightness", Brightness: 50 }, { Command: "Channel/OnOffScreen", OnOff: 1 }, { Command: "Draw/ClearHttpText" },
  ] }), /index 1.*1 commands acknowledged/);
  assert.equal(state.calls.length, 2); state.fail = null;
  state.calls = []; state.delay = 100;
  error(await call("pixoo64_command_list", { target: { ...target(96), timeoutMs: 20 }, commands: [
    { Command: "Channel/SetBrightness", Brightness: 50 }, { Command: "Draw/ClearHttpText" },
  ] }), /index 0.*0 commands acknowledged/);
  assert.equal(state.calls.length, 1); state.delay = 0;
});
test("all response codes are strict and HTTP/JSON errors cannot look successful", () => {
  for (const body of [{ error_code: 0 }, { ReturnCode: 0 }, { ReturnCode: 0, error_code: 0 }]) assert.deepEqual(assertPixoo64Response(200, body), body);
  for (const body of [null, [], {}, { error_code: "0" }, { ReturnCode: 1 }, { error_code: 0, ReturnCode: 1 }])
    assert.throws(() => assertPixoo64Response(200, body));
  assert.throws(() => assertPixoo64Response(503, { error_code: 0 }), /HTTP error/);
});
test("invalid JSON, missing success codes and HTTP failures stop the actual sequence", async () => {
  for (const mode of ["invalid", "missing", "http"]) {
    state.calls = []; state.responseMode = mode;
    error(await call("pixoo64_command_list", { target: target(96), commands: [
      { Command: "Draw/ClearHttpText" }, { Command: "Channel/SetBrightness", Brightness: 20 },
    ] }), /index 0.*0 commands acknowledged/);
    assert.equal(state.calls.length, 1);
  }
  state.responseMode = null;
});
test("default hardware environment stays on the default host and blank hardware selects discovery", async () => {
  for (const hardware of ["90", ""]) {
    state.rows[0].Hardware = 92;
    const configuredTransport = new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"], env: {
      ...process.env, DIVOOM_DEVICE_HOST: hardware ? "default-device.invalid" : "127.0.0.1",
      DIVOOM_DEVICE_MODEL: "pixoo64", DIVOOM_DEVICE_HARDWARE: hardware, DIVOOM_DEVICE_PORT: "",
      DIVOOM_DISCOVERY_URL: `http://127.0.0.1:${port}/discovery`,
    }, stderr: "pipe" });
    const configured = new Client({ name: "configured-pixoo64", version: "1" });
    try {
      await configured.connect(configuredTransport);
      const invoke = args => configured.callTool({ name: "pixoo64_get_device_info", arguments: args });
      const info = data(await invoke({}));
      assert.equal(info.hardware, hardware ? 90 : 92); assert.equal(info.port, 80);
      const other = data(await invoke({ target: { host: "127.0.0.1", port, model: "auto" } }));
      assert.equal(other.hardware, 92); assert.equal(other.identification, "discovery");
    } finally { await configured.close(); }
  }
  state.rows[0].Hardware = 90;
});
test("complete same-device operations do not interleave", async () => {
  state.calls = []; state.delay = 5;
  const frames = [Buffer.alloc(768).toString("base64"), Buffer.alloc(768, 1).toString("base64")];
  await Promise.all([
    call("pixoo64_send_animation", { target: target(90), frames, width: 16 }).then(data),
    call("pixoo64_set_brightness", { target: target(90), brightness: 50 }).then(data),
  ]);
  const list = state.calls.map(row => row.body.Command);
  const first = list.indexOf("Draw/ResetHttpGifId");
  assert.deepEqual(list.slice(first, first + 3), ["Draw/ResetHttpGifId", "Draw/SendHttpGif", "Draw/SendHttpGif"]);
  state.delay = 0;
});
test("public tools and bundled example are usable through MCP resources", async () => {
  const listed = await client.listTools();
  assert.equal(listed.tools.filter(row => row.name.startsWith("pixoo64_")).length, 10);
  const guide = await client.readResource({ uri: "divoom://pixoo64/guide" });
  assert.match(guide.contents[0].text, /90102/);
  const resource = await client.readResource({ uri: "divoom://pixoo64/example" });
  const example = JSON.parse(resource.contents[0].text);
  example.arguments.target = target(96);
  data(await call(example.tool, example.arguments));
  const registry = JSON.parse(await readFile("resources/products.json", "utf8"));
  assert.deepEqual(registry.products.pixoo64.hardware, [90, 92, 96]);
  assert.equal((await identifyPixoo64({ ...target(90), portExplicit: false })).port, 80);
});
