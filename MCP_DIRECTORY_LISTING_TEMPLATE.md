# MCP Directory Listing Template

Use this template when submitting `mcp-divoom-lan` to MCP registries/directories.

## Basic Metadata

- Project Name: `mcp-divoom-lan`
- Category: IoT / Smart Device / Watchface
- Repository URL: `<YOUR_GITHUB_REPO_URL>`
- License: MIT
- Runtime: Node.js 20+
- Transport: stdio
- Entry Command: `npx -y mcp-divoom-lan@0.2.0`

## One-line Description

Multi-device MCP server for TimesFrame and AstroToo LAN watchface creation, updates, switching, brightness, and screenshots.

## Long Description

`mcp-divoom-lan` exposes Divoom local HTTP APIs as 22 MCP tools. It discovers selectable devices through `Device/ReturnSameLANDevice`, filters unsupported products, requests Hardware for every target, and keeps TimesFrame and AstroToo authoring data isolated. A hardware command with no response falls back to TimesFrame; a returned unknown value is rejected. It includes:

- managed-slot create and patch workflows with an MCP-injected ClockId
- product-specific clock, font, display-element, template, and layout discovery
- watchface selection, brightness, screen power, and screenshot capture
- local AstroToo sequential element uploads and validated multipart backdrop updates
- independent queues for multiple devices

## Tool List

- `watchface_list_devices`
- `watchface_get_device_info`
- `watchface_get_local`
- `watchface_patch_local`
- `watchface_get_fonts_local`
- `watchface_get_store_market_list`
- `watchface_set_clock_select`
- `watchface_get_brightness`
- `watchface_set_brightness`
- `watchface_onoff_screen`
- `watchface_replace_dial_bg_file`
- `watchface_upload_file`
- `watchface_create_local_clock`
- `watchface_reset_local_then_cloud`
- `watchface_get_screen_snapshot`
- `watchface_raw_command`
- `watchface_protocol_quick_reference`
- `watchface_clock_catalog`
- `watchface_disp_catalog`
- `watchface_font_catalog`
- `watchface_template_search`
- `watchface_layout_suggest`

## Environment Variables

- `DIVOOM_DEVICE_HOST` (optional default; omit it when passing `target.host` per call)
- `DIVOOM_DEVICE_PORT` (default `9000`)
- `DIVOOM_DEVICE_MODEL` (default `auto`)
- `DIVOOM_TIMEOUT_MS` (default `45000`)

## Install Snippet (JSON)

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

## Suggested Demo Prompts

- "Identify this device and list its editable watchface elements."
- "Increase the time size, write only the changed fields, read back, and capture a screenshot."
- "Create a 480x480 AstroToo weather watchface and verify it on the device."

## Risk & Safety Statement

- The server wraps local LAN commands and does not bypass firmware limits.
- `watchface_reset_local_then_cloud` is TimesFrame-only and may delete local sys-side files before cloud refresh.
- AstroToo archive uploads are rejected; element files are uploaded one at a time and remain local to the device workflow.
