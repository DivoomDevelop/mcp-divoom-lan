import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { hardwareModel, timegateRoute } from "../dist/devices.js";

let server, client, port;
const state = { calls: [], hardware: 400, rows: [], fail: null, responseMode: null, delay: 0, discoveryFail: false };
const token = 864213; // Fixture, never a real device credential.
const target = hardware => ({ host: "127.0.0.1", port, model: "timegate", hardware, timeoutMs: 1000 });
const item = extra => ({ TextId: 1, type: 22, x: 8, y: 72, font: 2, TextWidth: 112, Textheight: 24,
  color: "#00FFFF", TextString: "你好 TimeGate", ...extra });
const call = (name, args = {}) => client.callTool({ name, arguments: args });
function data(result) { assert.ok(!result.isError, result.content?.[0]?.text); return JSON.parse(result.content[0].text); }
function error(result, pattern) { assert.equal(result.isError, true); assert.match(result.content[0].text, pattern); }
before(async () => {
  server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") { res.statusCode = state.discoveryFail ? 503 : 200; res.end(JSON.stringify({ ReturnCode: 0, DeviceList: state.rows })); return; }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const bytes = Buffer.concat(chunks), body = JSON.parse(bytes);
    state.calls.push({ path: req.url, body, length: Number(req.headers["content-length"]), actualLength: bytes.length });
    if (body.Command === "Device/GetHardwareVersion") { res.end(JSON.stringify({ ReturnCode: 1 })); return; }
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    if (state.responseMode === "invalid") { res.end("{truncated"); return; }
    if (state.responseMode === "missing") { res.end("{}"); return; }
    if (state.responseMode === "http") res.statusCode = 503;
    let result = req.url === "/post" ? { error_code: 0 } : { ReturnCode: 0 };
    if (["Channel/GetAllConf", "Channel/GetClockInfo"].includes(body.Command)) result.Brightness = 50;
    if (body.Command === "Sys/GetBrightness") result.Brightness = 100;
    if (state.fail === body.Command) result = { error_code: 1, ReturnMessage: `fixture denied token ${body.LocalToken}`, LocalToken: body.LocalToken };
    if (state.responseMode === "conflict") result = { error_code: 0, ReturnCode: 1 };
    if (state.responseMode === "echo") result = { ...result, LocalToken: body.LocalToken, nested: { localToken: body.LocalToken }, message: `token ${body.LocalToken}` };
    res.end(JSON.stringify(result));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); port = server.address().port;
  state.rows = [{ DeviceName: "TimeGate", DeviceId: 1, DevicePrivateIP: "127.0.0.1", Hardware: 400 }];
  const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"], env: {
    ...process.env, DIVOOM_DEVICE_HOST: "", DIVOOM_DEVICE_PORT: "", DIVOOM_DEVICE_HARDWARE: "", DIVOOM_DEVICE_MODEL: "auto",
    DIVOOM_TIMEGATE_LOCAL_TOKEN: "", DIVOOM_DISCOVERY_URL: `http://127.0.0.1:${port}/discovery`,
  }, stderr: "pipe" });
  client = new Client({ name: "timegate-tests", version: "1" }); await client.connect(transport);
});
after(async () => { await client?.close(); server?.close(); });

test("TimeGate 400/402 have distinct routes and five independent 128×128 screens", async () => {
  for (const hardware of [400, 402]) {
    assert.equal(hardwareModel(hardware), "timegate");
    const info = data(await call("timegate_get_device_info", { target: { host: "device.invalid", hardware } }));
    assert.equal(info.port, hardware === 400 ? 80 : 9000); assert.equal(info.endpoint, timegateRoute(hardware).endpoint);
    assert.equal(info.screenCount, 5); assert.deepEqual(info.canvas, { width: 128, height: 128 });
    assert.equal(info.capabilities.LocalTokenRequired, true); assert.equal(info.identification, "hardware-override");
  }
  assert.throws(() => timegateRoute(401), /400 or 402/);
});
test("TimeGate discovery refreshes Hardware and rejects other products and ambiguity", async () => {
  const auto = { host: "127.0.0.1", port, model: "timegate" };
  for (const hardware of [400, 402]) {
    state.rows[0].Hardware = hardware;
    const info = data(await call("timegate_get_device_info", { target: auto }));
    assert.equal(info.hardware, hardware); assert.equal(info.identification, "discovery");
  }
  for (const hardware of [90, 96, 530, 999, null, "400"]) {
    state.rows[0].Hardware = hardware;
    error(await call("timegate_set_brightness", { target: auto, localToken: token, brightness: 30 }), /Hardware/);
  }
  state.rows[0].Hardware = 400; state.rows.push({ ...state.rows[0] });
  error(await call("timegate_get_device_info", { target: auto }), /Ambiguous/); state.rows.pop();
  error(await call("timegate_get_device_info", { target: { host: "missing.invalid" } }), /not found/);
  state.discoveryFail = true;
  error(await call("timegate_get_device_info", { target: auto }), /HTTP error/);
  data(await call("timegate_get_device_info", { target: target(402) })); state.discoveryFail = false;
});
test("missing or invalid LocalToken never sends a device command", async () => {
  for (const localToken of [undefined, null, "864213", 0, -1, 1.5]) {
    state.calls = [];
    error(await call("timegate_set_brightness", { target: target(400), localToken, brightness: 20 }), /localToken/);
    assert.equal(state.calls.length, 0);
  }
});
test("display lists preserve native field spelling, UTF-8, screen selection and replace/append", async () => {
  for (const hardware of [400, 402]) for (const mode of ["replace", "append"]) {
    state.calls = [];
    data(await call("timegate_send_items", { target: target(hardware), localToken: token, lcdIndex: 4, mode,
      backgroundGif: "http://example.com/bg.gif", items: [item({ align: hardware === 402 ? 5 : 3 })] }));
    const sent = state.calls[0]; assert.equal(sent.path, hardware === 400 ? "/post" : "/divoom_api");
    assert.equal(sent.body.LocalToken, token); assert.equal(sent.body.LcdIndex, 4);
    assert.equal(sent.body.NewFlag, mode === "replace" ? 1 : 0);
    assert.equal(sent.body.BackgroudGif, "http://example.com/bg.gif"); assert.equal(Object.hasOwn(sent.body, "BackgroundGif"), false);
    assert.equal(sent.body.ItemList[0].TextString, "你好 TimeGate"); assert.equal(sent.length, sent.actualLength);
    assert.equal(Object.hasOwn(sent.body, "ReturnCode"), hardware === 402);
  }
});
test("invalid item lists and out-of-screen geometry cause zero writes", async () => {
  for (const change of [{ TextId: 40 }, { type: 24 }, { x: 127 }, { y: 127 }, { TextWidth: 129 }, { speed: 101 },
    { TextString: "中".repeat(171) }, { color: "green" }, { type: 22, TextString: undefined },
    { type: 23, TextString: "https://example.com" }, { type: 23, TextString: "http://example.com", update_time: 0 }]) {
    state.calls = [];
    assert.equal((await call("timegate_send_items", { target: target(402), localToken: token, lcdIndex: 0,
      items: [item(), item({ TextId: 2, ...change })] })).isError, true);
    assert.equal(state.calls.length, 0);
  }
  state.calls = [];
  error(await call("timegate_send_items", { target: target(400), localToken: token, lcdIndex: 5, items: [item()] }), /LcdIndex/);
  error(await call("timegate_send_items", { target: target(400), localToken: token, lcdIndex: 0, items: [item(), item()] }), /Duplicate/);
  assert.equal(state.calls.length, 0);
  data(await call("timegate_send_items", { target: target(402), localToken: token, lcdIndex: 0,
    items: [item({ type: 23, TextString: "http://example.com" })] }));
  assert.equal(state.calls.at(-1).body.ItemList[0].update_time, 60);
});
test("text uses LcdIndex on 400 and LcdId on 402, with separate alignment policies", async () => {
  const text = { TextId: 1, x: 0, y: 40, font: 4, TextWidth: 64, TextString: "TimeGate", color: "#FFFFFF" };
  for (const hardware of [400, 402]) {
    state.calls = [];
    data(await call("timegate_send_text", { target: target(hardware), localToken: token, lcdIndex: 3, text }));
    const body = state.calls[0].body;
    assert.equal(body[hardware === 400 ? "LcdIndex" : "LcdId"], 3);
    assert.equal(Object.hasOwn(body, hardware === 400 ? "LcdId" : "LcdIndex"), false);
  }
  state.calls = [];
  for (const invalid of [{ ...text, align: 5 }, { ...text, y: 49 }, { ...text, font: 18 }, { ...text, Command: "Draw/ClearHttpText" }])
    assert.equal((await call("timegate_send_text", { target: target(402), localToken: token, lcdIndex: 0, text: invalid })).isError, true);
  assert.equal(state.calls.length, 0);
  data(await call("timegate_clear_text", { target: target(402), localToken: token, lcdIndex: 2, textId: -1 }));
  assert.equal(state.calls.at(-1).body.LcdId, 2); assert.equal(state.calls.at(-1).body.TextId, -1);
});
test("400 batches use a native outer token; 402 commands each receive their token", async () => {
  const commands = [{ Command: "Channel/SetBrightness", Brightness: 30 }, { Command: "Channel/OnOffScreen", OnOff: 1 }];
  for (const hardware of [400, 402]) {
    state.calls = [];
    const result = data(await call("timegate_command_list", { target: target(hardware), localToken: token, commands }));
    assert.equal(result.mode, hardware === 400 ? "native" : "sequential");
    if (hardware === 400) {
      assert.equal(state.calls.length, 1); assert.equal(state.calls[0].body.Command, "Draw/CommandList");
      assert.deepEqual(state.calls[0].body.CommandList, commands); assert.equal(state.calls[0].body.LocalToken, token);
    } else {
      assert.deepEqual(state.calls.map(row => row.body.Command), commands.map(row => row.Command));
      assert.ok(state.calls.every(row => row.body.LocalToken === token));
    }
  }
});
test("entire batches are validated before sending; nested lists, token overrides and PIXOO64 commands are rejected", async () => {
  for (const invalid of [{ Command: "Draw/CommandList", CommandList: [] }, { Command: "Draw/ClearHttpText", LcdId: 0, TextId: -1, LocalToken: 123 },
    { Command: "Device/PlayTFGif", FileType: 2, FileName: "http://example.com/a.gif" }, { Command: "Device/CreateLocalClock" }]) {
    state.calls = [];
    error(await call("timegate_command_list", { target: target(400), localToken: token,
      commands: [{ Command: "Channel/SetBrightness", Brightness: 10 }, invalid] }), /Unsupported/);
    assert.equal(state.calls.length, 0);
  }
});
test("failed, invalid, conflicting and timed-out responses stop a batch without retries and redact the token", async () => {
  const commands = [{ Command: "Channel/SetBrightness", Brightness: 10 }, { Command: "Channel/OnOffScreen", OnOff: 1 },
    { Command: "Draw/ClearHttpText", LcdId: 0, TextId: -1 }];
  state.calls = []; state.fail = "Channel/OnOffScreen";
  const failed = await call("timegate_command_list", { target: target(402), localToken: token, commands });
  error(failed, /index 1.*1 commands acknowledged/); assert.ok(!JSON.stringify(failed).includes(String(token)));
  assert.equal(state.calls.length, 2); state.fail = null;
  for (const mode of ["invalid", "missing", "http", "conflict"]) {
    state.calls = []; state.responseMode = mode;
    error(await call("timegate_command_list", { target: target(402), localToken: token, commands }), /index 0.*0 commands acknowledged/);
    assert.equal(state.calls.length, 1);
  }
  state.responseMode = null; state.delay = 80; state.calls = [];
  error(await call("timegate_command_list", { target: { ...target(402), timeoutMs: 20 }, localToken: token, commands }), /index 0/);
  assert.equal(state.calls.length, 1); state.delay = 0;
  state.responseMode = "echo";
  const echoed = await call("timegate_set_brightness", { target: target(402), localToken: token, brightness: 20 });
  data(echoed); assert.ok(!JSON.stringify(echoed).includes(String(token))); state.responseMode = null;
});
test("brightness readers, whole/sub-screen clocks and GIF masks match the supported firmware fields", async () => {
  for (const hardware of [400, 402]) {
    state.calls = [];
    assert.equal(data(await call("timegate_get_brightness", { target: target(hardware), localToken: token })).brightness, 50);
    assert.equal(state.calls[0].body.Command, hardware === 400 ? "Channel/GetAllConf" : "Channel/GetClockInfo");
    if (hardware === 402) assert.equal(state.calls[0].body.LcdIndex, 0);
    data(await call("timegate_select_clock", { target: target(hardware), localToken: token, clockId: 217 }));
    assert.equal(state.calls.at(-1).body.Command, "Channel/Set5LcdWholeClockId");
    data(await call("timegate_select_clock", { target: target(hardware), localToken: token, clockId: 61, lcdIndex: 4, lcdIndependence: 978 }));
    assert.equal(state.calls.at(-1).body.LcdIndependence, 978);
    data(await call("timegate_play_gif", { target: target(hardware), localToken: token, lcdArray: [1, 0, 0, 0, 1], urls: ["http://example.com/a.gif"] }));
    assert.equal(state.calls.at(-1).body.Command, "Device/PlayGif"); assert.deepEqual(state.calls.at(-1).body.FileName, ["http://example.com/a.gif"]);
  }
  const count = state.calls.length;
  error(await call("timegate_select_clock", { target: target(402), localToken: token, clockId: 61, lcdIndex: 4 }), /LcdIndependence/);
  error(await call("timegate_play_gif", { target: target(400), localToken: token, lcdArray: [0, 0, 0, 0, 0], urls: ["http://example.com/a.gif"] }), /at least one/);
  assert.equal(state.calls.length, count);
});
test("generic identification recognizes TimeGate and isolates watchface and PIXOO64 operations", async () => {
  for (const hardware of [400, 402]) {
    state.rows[0].Hardware = hardware;
    const auto = { host: "127.0.0.1", port, timeoutMs: 1000 };
    assert.equal(data(await call("watchface_get_device_info", { target: auto })).model, "timegate");
    for (const name of ["watchface_patch_local", "watchface_raw_command", "watchface_font_catalog", "watchface_upload_file", "pixoo64_send_items"]) {
      state.calls = [];
      assert.equal((await call(name, { target: target(hardware), localToken: token })).isError, true);
      assert.equal(state.calls.length, 0);
    }
  }
  error(await call("timegate_set_brightness", { target: { ...target(400), model: "astrotoo" }, localToken: token, brightness: 30 }), /require model/);
});
test("default-host hardware and token environment do not leak to other targets", async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"], env: {
    ...process.env, DIVOOM_DEVICE_HOST: "127.0.0.1", DIVOOM_DEVICE_PORT: String(port), DIVOOM_DEVICE_MODEL: "timegate",
    DIVOOM_DEVICE_HARDWARE: "402", DIVOOM_TIMEGATE_LOCAL_TOKEN: String(token),
  }, stderr: "pipe" });
  const configured = new Client({ name: "configured-timegate", version: "1" });
  try {
    await configured.connect(transport); state.calls = [];
    const info = data(await configured.callTool({ name: "timegate_get_device_info", arguments: {} }));
    assert.equal(info.hardware, 402);
    data(await configured.callTool({ name: "timegate_set_brightness", arguments: { brightness: 30 } }));
    assert.equal(state.calls[0].body.LocalToken, token); assert.equal(state.calls[0].path, "/divoom_api");
    const count = state.calls.length;
    error(await configured.callTool({ name: "timegate_set_brightness", arguments: {
      target: { host: "other-device.invalid", model: "timegate", hardware: 400 }, brightness: 30,
    } }), /localToken/);
    assert.equal(state.calls.length, count);
  } finally { await configured.close(); }
});
test("public tools and the separate TimeGate resource example work via MCP", async () => {
  const listed = await client.listTools(); assert.equal(listed.tools.filter(row => row.name.startsWith("timegate_")).length, 10);
  const guide = await client.readResource({ uri: "divoom://timegate/guide" }); assert.match(guide.contents[0].text, /BackgroudGif/);
  const example = JSON.parse((await client.readResource({ uri: "divoom://timegate/example" })).contents[0].text);
  example.arguments.target = target(402); example.arguments.localToken = token;
  data(await call(example.tool, example.arguments));
  const registry = JSON.parse(await readFile("resources/products.json", "utf8"));
  assert.deepEqual(registry.products.timegate.hardware, [400, 402]); assert.equal(registry.products.timegate.screens, 5);
});
