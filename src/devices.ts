export type Model = "timesframe" | "astrotoo" | "pixoo64" | "timegate";
export type Target = { host: string; port: number; timeoutMs: number; model?: Model | "auto"; hardware?: number | null; portExplicit?: boolean };
export type IdentifiedTarget = Target & { model: Model; hardware: number | null; capabilities: Record<string, unknown>; identification: "hardware" | "legacy-override" | "hardware-no-response-fallback" | "discovery" | "hardware-override" };
type ProductProfile = { hardware: readonly number[]; canvas: { width: number; height: number }; resourceDir: string; screens?: number };
export const PRODUCTS: Record<Model, ProductProfile> = {
  timesframe: { hardware: [510, 511, 512], canvas: { width: 800, height: 1280 }, resourceDir: "timesframe" },
  astrotoo: { hardware: [530], canvas: { width: 480, height: 480 }, resourceDir: "astrotoo" },
  pixoo64: { hardware: [90, 92, 96], canvas: { width: 64, height: 64 }, resourceDir: "pixoo64" },
  timegate: { hardware: [400, 402], canvas: { width: 128, height: 128 }, resourceDir: "timegate", screens: 5 },
};
export const PROFILES = {
  timesframe: PRODUCTS.timesframe.canvas,
  astrotoo: PRODUCTS.astrotoo.canvas,
  pixoo64: PRODUCTS.pixoo64.canvas,
  timegate: PRODUCTS.timegate.canvas,
};
export const DEVICE_DISCOVERY_URL = (process.env.DIVOOM_DISCOVERY_URL ?? "").trim() ||
  "https://app.divoom-gz.com/Device/ReturnSameLANDevice";
export function pixoo64Route(hardware: number) {
  if (![90, 92, 96].includes(hardware)) throw new Error("PIXOO64 Hardware must be 90, 92 or 96.");
  return hardware === 96 ? { port: 9000, endpoint: "/divoom_api" } : { port: 80, endpoint: "/post" };
}
export function timegateRoute(hardware: number) {
  if (![400, 402].includes(hardware)) throw new Error("TimeGate Hardware must be 400 or 402.");
  return hardware === 400 ? { port: 80, endpoint: "/post" } : { port: 9000, endpoint: "/divoom_api" };
}
export async function discoverDevices(timeoutMs: number) {
  const response = await fetch(DEVICE_DISCOVERY_URL, {
    headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs),
  });
  const body: unknown = await response.json();
  assertResponse(response.status, body);
  if (!Array.isArray(body.DeviceList)) throw new Error("Device discovery response is missing DeviceList.");
  return body.DeviceList as unknown[];
}
class DiscoveryIdentityError extends Error {}
async function discoveryHardware(target: Target): Promise<number | undefined> {
  const rows = (await discoverDevices(target.timeoutMs)).filter((value): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).DevicePrivateIP === "string" &&
    String((value as Record<string, unknown>).DevicePrivateIP).trim().toLowerCase() === target.host.toLowerCase());
  if (rows.length > 1) throw new DiscoveryIdentityError("Ambiguous device discovery result for target.host; specify target.hardware explicitly.");
  if (!rows.length) return undefined;
  if (!Number.isInteger(rows[0].Hardware)) throw new DiscoveryIdentityError("Device discovery returned invalid Hardware.");
  return rows[0].Hardware as number;
}
export async function identifyPixoo64(target: Target): Promise<IdentifiedTarget> {
  if (target.model && target.model !== "auto" && target.model !== "pixoo64")
    throw new Error("PIXOO64 tools require model pixoo64 or auto.");
  const hardware = target.hardware ?? await discoveryHardware(target);
  if (hardware === undefined) throw new Error("PIXOO64 not found in discovery. Set target.hardware to the actual 90, 92 or 96 for direct LAN use.");
  const route = pixoo64Route(hardware);
  return { ...target, port: target.portExplicit === false ? route.port : target.port,
    model: "pixoo64", hardware, identification: target.hardware == null ? "discovery" : "hardware-override",
    capabilities: { Hardware: hardware, Endpoint: route.endpoint, NativeCommandList: hardware !== 96,
      WatchfaceUpload: false, Note: "Hardware 90/92/96 routing; firmware feature availability is separate from Hardware." } };
}
export async function identifyTimeGate(target: Target): Promise<IdentifiedTarget> {
  if (target.model && target.model !== "auto" && target.model !== "timegate")
    throw new Error("TimeGate tools require model timegate or auto.");
  const hardware = target.hardware ?? await discoveryHardware(target);
  if (hardware === undefined) throw new Error("TimeGate not found in discovery. Set target.hardware to the actual 400 or 402 for direct LAN use.");
  const route = timegateRoute(hardware);
  return { ...target, port: target.portExplicit === false ? route.port : target.port,
    model: "timegate", hardware, identification: target.hardware == null ? "discovery" : "hardware-override",
    capabilities: { Hardware: hardware, Endpoint: route.endpoint, ScreenCount: 5, CanvasPerScreen: PRODUCTS.timegate.canvas,
      LocalTokenRequired: true, NativeCommandList: hardware === 400, WatchfaceUpload: false,
      Note: "MCP support profile, not a queried firmware capability declaration." } };
}
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
export class DeviceNoResponseError extends Error {
  constructor(command: string, cause: unknown) {
    super(`Device did not respond to ${command}: ${String(cause)}`);
    this.name = "DeviceNoResponseError";
    this.cause = cause;
  }
}
export async function request(target: Target, command: string) {
  const payloadText = JSON.stringify({ Command: command, ReturnCode: 0 });
  let response: Response;
  try {
    response = await fetch(`http://${target.host}:${target.port}/divoom_api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Content-Length": Buffer.byteLength(payloadText, "utf8").toString(),
      },
      body: payloadText,
      signal: AbortSignal.timeout(target.timeoutMs),
    });
  } catch (error) {
    throw new DeviceNoResponseError(command, error);
  }
  const body: unknown = await response.json();
  assertResponse(response.status, body);
  return body;
}
const queues = new Map<string, Promise<unknown>>();
export async function serial<T>(target: Target, operation: () => Promise<T>): Promise<T> {
  // One queue per host also covers aliases using default versus explicit PIXOO64 ports.
  const key = target.host.toLowerCase();
  const previous = queues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  queues.set(key, current);
  try { return await current; }
  finally { if (queues.get(key) === current) queues.delete(key); }
}
// Device queries/discovery are refreshed per operation unless Hardware was explicitly overridden.
// A per-operation identified target is reused for precheck/write/readback.
export async function identify(target: Target): Promise<IdentifiedTarget> {
  if (target.model === "timegate" || PRODUCTS.timegate.hardware.includes(target.hardware as number)) return identifyTimeGate(target);
  if (target.model === "pixoo64" || target.hardware != null) return identifyPixoo64(target);
  let info: Record<string, unknown>;
  try { info = await request(target, "Device/GetHardwareVersion"); }
  catch (error) {
    // PIXOO64/TimeGate do not implement GetHardwareVersion. Check fresh discovery before
    // applying the existing TimesFrame no-response compatibility fallback.
    if (!target.model || target.model === "auto") {
      let hardware: number | undefined;
      try { hardware = await discoveryHardware({ ...target, timeoutMs: Math.min(target.timeoutMs, 2500) }); }
      catch (discoveryError) {
        if (discoveryError instanceof DiscoveryIdentityError) throw discoveryError;
        // Preserve the original hardware-query failure if discovery is unavailable.
      }
      if (hardware !== undefined) {
        const discoveredModel = hardwareModel(hardware);
        if (discoveredModel === "pixoo64") {
          const identified = await identifyPixoo64({ ...target, hardware });
          return { ...identified, identification: "discovery" };
        }
        if (discoveredModel === "timegate") {
          const identified = await identifyTimeGate({ ...target, hardware });
          return { ...identified, identification: "discovery" };
        }
        if (discoveredModel !== "timesframe")
          throw new Error(`Discovered ${discoveredModel} requires a valid device Hardware response; TimesFrame fallback is disabled.`);
      }
    }
    if (error instanceof DeviceNoResponseError && target.model !== "astrotoo")
      return {
        ...target,
        model: "timesframe",
        hardware: null,
        capabilities: {},
        identification: target.model === "timesframe" ? "legacy-override" : "hardware-no-response-fallback",
      };
    if (error instanceof DeviceNoResponseError)
      throw new Error(`Configured model astrotoo requires a Hardware response. ${String(error)}`);
    throw new Error(`Cannot validate device hardware version because the device returned an invalid or failed response. ${String(error)}`);
  }
  const model = hardwareModel(info.Hardware);
  if (target.model && target.model !== "auto" && target.model !== model)
    throw new Error(`Configured model ${target.model} conflicts with Hardware ${info.Hardware} (${model}).`);
  if (model === "pixoo64") {
    const identified = await identifyPixoo64({ ...target, hardware: info.Hardware as number });
    return { ...identified, identification: "hardware" };
  }
  if (model === "timegate") {
    const identified = await identifyTimeGate({ ...target, hardware: info.Hardware as number });
    return { ...identified, identification: "hardware" };
  }
  const capabilities = model === "astrotoo" ? await request(target, "Device/GetLanCapabilities") : info;
  if (capabilities.Hardware !== info.Hardware) throw new Error("Device identity changed during discovery.");
  return { ...target, model, hardware: info.Hardware as number, capabilities, identification: "hardware" };
}
export function requireLocal(target: IdentifiedTarget) {
  if (target.model === "astrotoo" &&
      (target.capabilities.LocalOnly !== true || target.capabilities.LanApiVersion !== 1))
    throw new Error("AstroToo firmware does not declare the supported local-only LAN API; upgrade before writing.");
}
