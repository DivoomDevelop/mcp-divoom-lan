import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const target = { host: "192.168.13.142", port: 9000, timeoutMs: 45000 };
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, "dist/index.js")],
  cwd: root,
  env: { ...process.env, DIVOOM_DEVICE_MODEL: "auto", DIVOOM_DEVICE_HOST: "" },
  stderr: "inherit",
});
const client = new Client({ name: "astrotoo-temp-asset-test", version: "1.0.0" });

async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(result.content?.[0]?.text ?? `${name} failed`);
  return JSON.parse(result.content.find((entry) => entry.type === "text").text);
}

try {
  await client.connect(transport);
  const upload = await call("watchface_upload_file", {
    target,
    filePath: path.join(here, "hour.png"),
    metadata: {},
    fileName: "hour.png",
  });
  const fileId = upload.FileId ?? upload.responseJson?.FileId;
  if (!fileId?.startsWith("local://")) throw new Error(`missing FileId: ${JSON.stringify(upload)}`);
  let result = { fileId, mode: "upload-only", pass: true };
  if (process.env.ASTROTOO_TEMP_TEST_MODE !== "upload-only") {
    const patch = await call("watchface_patch_local", {
      target,
      clockId: 60001,
      itemPatchList: [{ index: 0, patch: { image_addr: fileId } }],
    });
    const readback = await call("watchface_get_local", { target, clockId: 60001 });
    const item = (readback.responseJson ?? readback).ItemList?.[0];
    result = {
      fileId,
      mode: "bind",
      patchReturnCode: patch.ReturnCode ?? patch.responseJson?.ReturnCode,
      committedImageAddr: item?.image_addr,
      pass: (patch.ReturnCode ?? patch.responseJson?.ReturnCode) === 0 && item?.image_addr === "UserDefine",
    };
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await client.close();
}
