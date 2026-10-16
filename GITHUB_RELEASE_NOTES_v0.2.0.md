# mcp-divoom-lan v0.2.0

Version 0.2.0 extends the existing TimesFrame MCP server to support AstroToo and multiple devices from one process.

## Highlights

- Discovers selectable devices through `Device/ReturnSameLANDevice` and filters unsupported products before presenting the list.
- Identifies every target through `Device/GetHardwareVersion`, with a TimesFrame fallback only when that command gets no response.
- Supports TimesFrame Hardware 510/511/512 and AstroToo Hardware 530.
- Keeps each product's clock IDs, names, fonts, display elements, templates, and layout data isolated.
- Manages local create and patch operations through an internal slot whose ClockId is injected automatically.
- Supports AstroToo 480×480 backdrop validation and local-only persistence.
- Uploads AstroToo element images one file at a time and rejects TAR, TGZ, and ZIP bundles.
- Captures the device screen after create, update, or switch operations.
- Serializes a complete operation per device while allowing different devices to run concurrently.

## Install

Node.js 20 or later is required.

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "npx",
      "args": ["-y", "mcp-divoom-lan@0.2.0"],
      "env": {
        "DIVOOM_DEVICE_HOST": "192.168.1.120",
        "DIVOOM_DEVICE_PORT": "9000",
        "DIVOOM_DEVICE_MODEL": "auto",
        "DIVOOM_TIMEOUT_MS": "45000"
      }
    }
  }
}
```

Leave `DIVOOM_DEVICE_HOST` unset and pass `target.host` per tool call when controlling multiple devices.

## AstroToo workflow

1. Call `watchface_list_devices` and let the user choose a supported target.
2. Call `watchface_get_device_info` and require `model:"astrotoo"`, Hardware 530, and `LocalOnly:true`.
3. Query AstroToo-specific clock, display-element, and font catalogs.
4. Create or fully replace the managed watchface with `watchface_create_local_clock`; omit `ClockId`.
5. Apply field or backdrop updates with `watchface_patch_local`.
6. Upload image elements sequentially with `watchface_upload_file` and bind the returned `local://...` references in the same create or patch operation.
7. Select the managed watchface, read it back, and capture a screenshot.

See `docs/astrotoo-watchface-workflow.md` for complete examples.

## Compatibility and migration

- Existing TimesFrame tool names remain available.
- Use `DIVOOM_DEVICE_MODEL=auto` for current firmware.
- Auto detection defaults to TimesFrame when `Device/GetHardwareVersion` gets no response; a returned unknown Hardware value is still rejected.
- AstroToo requires LAN API v1 and local persistence capability reporting for asset writes.
- AstroToo accepts one 480×480 JPEG or WebP backdrop smaller than 500 KiB. It does not accept watchface archives.
- Timed-out writes are not retried automatically. Read the managed watchface before deciding whether to retry.

## Validation

- TypeScript build and package dry run.
- 26 MCP protocol and safety tests.
- AstroToo Hardware 530 / firmware 530055 create, field patch, backdrop replacement, selection, readback, and BMP screenshot verification.
- TimesFrame regression coverage for identification, create and patch rules, selection, and file policy.
