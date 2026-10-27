# mcp-divoom-lan v0.3.0

This release adds PIXOO64 and TimeGate LAN control alongside the existing TimesFrame and AstroToo watchface tools. One MCP server now exposes 42 tools across four product families.

## Highlights

- **PIXOO64 Hardware 90/92/96:** ten tools for RGB888 animations, text, display elements, brightness, screen power, channels, GIF URLs, and command batches.
- **TimeGate Hardware 400/402:** ten tools for five independent 128×128 screens, including display elements, animation text, GIF URLs, brightness, screen power, and clock selection.
- **Version-specific routing:** PIXOO64 90/92 and TimeGate 400 use `http://<host>:80/post`; PIXOO64 96 and TimeGate 402 use `http://<host>:9000/divoom_api`.
- **TimeGate authentication:** supply the LocalToken from the device settings per call, or configure it for the matching default host. Tokens are redacted from responses and never reused across unrelated targets.
- **Serialized operations:** animation uploads and control batches remain together on each host. Hardware 96/402 batches execute sequentially in MCP and stop on the first failure.
- **Product isolation:** PIXOO64/TimeGate cannot enter TimesFrame/AstroToo watchface upload or raw-command paths.

## Install

Node.js 20 or later is required.

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "npx",
      "args": ["-y", "mcp-divoom-lan@0.3.0"]
    }
  }
}
```

Call `watchface_list_devices`, select a target, and pass its returned `target` object to the appropriate product tools. Use `pixoo64_*` for PIXOO64 and `timegate_*` for TimeGate.

## TimeGate compatibility fixes

- Hardware 402 brightness is read through `Channel/GetClockInfo`; the reference `Sys/GetBrightness` handler returns a constant 100.
- Standalone text uses the version's expected screen field: `LcdIndex` on 400 and `LcdId` on 402.
- On first use of a 402 screen, supply `backgroundGif` with `mode:"replace"`. A missing background can prevent visible output even when the command is acknowledged.
- Display-list alignment values and background-update behavior are documented separately for 400 and 402.

## Migration notes

- Existing TimesFrame and AstroToo tool names remain available.
- Remove an old global `DIVOOM_DEVICE_PORT=9000` override when automatic port selection is desired for PIXOO64 90/92 or TimeGate 400.
- An explicit `target.hardware` selects a caller-supplied product profile; it is not a device hardware-query result.
- TimeGate calls require `localToken`, or `DIVOOM_TIMEGATE_LOCAL_TOKEN` for the matching `DIVOOM_DEVICE_HOST`.
- PIXOO64 animation input is raw RGB888 base64. TimeGate's JPEG frame-upload protocol is different and is not exposed by this release.
- HTTP acknowledgements do not independently prove rendering or completion of a device-side URL download.

## Validation

- 54 automated MCP protocol tests, TypeScript checks, release metadata validation, MCPB manifest validation, and package-content checks.
- Live PIXOO64 Hardware 90/92 control and state readback, with visual confirmation on Hardware 92.
- Live TimeGate Hardware 402 / firmware 402077: brightness write/readback, sequential batches, and confirmed display updates on both the first and fifth screens while preserving the remaining screens.
- Device source code and binaries were not changed. Original display settings and normal application supervision were restored after testing.
- Physical-device validation remains pending for PIXOO64 Hardware 96 and TimeGate Hardware 400; both are covered by protocol fixtures.

See the [PIXOO64 guide](https://github.com/DivoomDevelop/mcp-divoom-lan/blob/v0.3.0/resources/pixoo64/guide.md), [TimeGate guide](https://github.com/DivoomDevelop/mcp-divoom-lan/blob/v0.3.0/resources/timegate/guide.md), and [MCP tool reference](https://github.com/DivoomDevelop/mcp-divoom-lan/blob/v0.3.0/docs/mcp-tools.md) for detailed parameters and examples.
