# MCP Directory Listing Template

Use this template when submitting `mcp-divoom-lan` to MCP registries/directories.

## Basic Metadata

- Project Name: `mcp-divoom-lan`
- Category: IoT / Smart Device / Watchface
- Repository URL: `<YOUR_GITHUB_REPO_URL>`
- License: MIT
- Runtime: Node.js 20+
- Transport: stdio
- Entry Command: `node dist/index.js`

## One-line Description

MCP server for Divoom LAN watchface customization (read/patch local clock config, background replacement, upload, brightness, and store dial selection).

## Long Description

`mcp-divoom-lan` exposes Divoom local HTTP APIs as MCP tools so AI assistants can safely operate watchface customization workflows through natural language. It includes:

- local watchface read/patch
- local font and store market list discovery
- dial selection and brightness control
- multipart operations (`/replace_clock_dial_bg`, `/upload`, `/create_local_clock`)
- protocol quick-reference resources for agents

## Tool List

- `watchface_get_local`
- `watchface_patch_local`
- `watchface_get_fonts_local`
- `watchface_get_store_market_list`
- `watchface_set_clock_select`
- `watchface_get_brightness`
- `watchface_set_brightness`
- `watchface_replace_dial_bg_file`
- `watchface_upload_file`
- `watchface_create_local_clock`
- `watchface_reset_local_then_cloud`
- `watchface_raw_command`
- `watchface_protocol_quick_reference`

## Environment Variables

- `DIVOOM_DEVICE_HOST` (required unless passed per call via `target.host`)
- `DIVOOM_DEVICE_PORT` (default `9000`)
- `DIVOOM_TIMEOUT_MS` (default `45000`)

## Install Snippet (JSON)

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/to/mcp-divoom-lan/dist/index.js"],
      "env": {
        "DIVOOM_DEVICE_HOST": "192.168.1.120",
        "DIVOOM_DEVICE_PORT": "9000",
        "DIVOOM_TIMEOUT_MS": "45000"
      }
    }
  }
}
```

## Suggested Demo Prompts

- "Read current local watchface config."
- "Increase time font size by 2 and set text color to #FF0000."
- "Replace current dial background with this 800x1280 image."

## Risk & Safety Statement

- The server wraps local LAN commands and does not bypass firmware limits.
- `watchface_reset_local_then_cloud` may delete local sys-side files before cloud refresh.
- Users should confirm destructive operations explicitly.
