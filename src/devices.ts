export type Model = "timesframe" | "astrotoo";
export type Target = { host: string; port: number; timeoutMs: number; model?: Model | "auto" };
export type IdentifiedTarget = Target & { model: Model; hardware: number | null; capabilities: Record<string, unknown>; identification: "hardware" | "legacy-override" };
type ProductProfile = { hardware: readonly number[]; canvas: { width: number; height: number }; resourceDir: string };
export const PRODUCTS: Record<Model, ProductProfile> = {
  timesframe: { hardware: [510, 511, 512], canvas: { width: 800, height: 1280 }, resourceDir: "timesframe" },
  astrotoo: { hardware: [530], canvas: { width: 480, height: 480 }, resourceDir: "astrotoo" },
};
export const PROFILES = {
  timesframe: PRODUCTS.timesframe.canvas,
  astrotoo: PRODUCTS.astrotoo.canvas,
};
export function hardwareModel(hardware: unknown): Model {
  for (const [model, profile] of Object.entries(PRODUCTS) as [Model, ProductProfile][])
    if (profile.hardware.includes(hardware as number)) return model;
  throw new Error(`Unsupported device Hardware: ${String(hardware)}. No product profile was assumed.`);
}
export function assertResponse(status: number, response: unknown): asserts response is Record<string, unknown> {
  if (status < 200 || status >= 300) throw new Error(`Device HTTP error ${status}`);
  if (!response || typeof response !== "object" || Array.isArray(response))
    throw new Error("Device returned invalid JSON; this is not an empty result.");
  const data = response as Record<string, unknown>;
  if (data.ReturnCode !== 0)
    throw new Error(`Device error ReturnCode=${String(data.ReturnCode)}: ${String(data.ReturnMessage ?? "missing success code")}`);
}
export async function request(target: Target, command: string) {
  const payloadText = JSON.stringify({ Command: command, ReturnCode: 0 });
  const response = await fetch(`http://${target.host}:${target.port}/divoom_api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Content-Length": Buffer.byteLength(payloadText, "utf8").toString(),
    },
    body: payloadText,
    signal: AbortSignal.timeout(target.timeoutMs),
  });
  const body: unknown = await response.json();
  assertResponse(response.status, body);
  return body;
}
const queues = new Map<string, Promise<unknown>>();
export async function serial<T>(target: Target, operation: () => Promise<T>): Promise<T> {
  const key = `${target.host.toLowerCase()}:${target.port}`;
  const previous = queues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  queues.set(key, current);
  try { return await current; }
  finally { if (queues.get(key) === current) queues.delete(key); }
}
// Discovery is deliberately refreshed for each operation, including after an IP is reassigned.
// A per-operation identified target is reused for precheck/write/readback.
export async function identify(target: Target): Promise<IdentifiedTarget> {
  let info: Record<string, unknown>;
  try { info = await request(target, "Device/GetHardwareVersion"); }
  catch (error) {
    if (target.model === "timesframe")
      return { ...target, model: "timesframe", hardware: null, capabilities: {}, identification: "legacy-override" };
    throw new Error(`Cannot read device hardware version; upgrade firmware or explicitly select a legacy TimesFrame. ${String(error)}`);
  }
  const model = hardwareModel(info.Hardware);
  if (target.model && target.model !== "auto" && target.model !== model)
    throw new Error(`Configured model ${target.model} conflicts with Hardware ${info.Hardware} (${model}).`);
  const capabilities = model === "astrotoo" ? await request(target, "Device/GetLanCapabilities") : info;
  if (capabilities.Hardware !== info.Hardware) throw new Error("Device identity changed during discovery.");
  return { ...target, model, hardware: info.Hardware as number, capabilities, identification: "hardware" };
}
export function requireLocal(target: IdentifiedTarget) {
  if (target.model === "astrotoo" &&
      (target.capabilities.LocalOnly !== true || target.capabilities.LanApiVersion !== 1))
    throw new Error("AstroToo firmware does not declare the supported local-only LAN API; upgrade before writing.");
}
