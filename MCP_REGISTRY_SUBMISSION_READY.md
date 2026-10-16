# Official MCP Registry Submission Copy

> Replace placeholders before submit:
> - `{{REPO_URL}}`
> - `{{CONTACT_EMAIL}}`
> - `{{MAINTAINER_NAME}}`

## Project Name

`mcp-divoom-lan`

## Short Description

Multi-device MCP server for TimesFrame and AstroToo LAN watchface creation, updates, switching, brightness, and screenshot verification.

## Long Description

`mcp-divoom-lan` exposes Divoom local HTTP APIs as 22 MCP tools. It discovers selectable devices through `Device/ReturnSameLANDevice`, filters unsupported products, requests target Hardware for every online operation, and selects an isolated TimesFrame or AstroToo product profile. A hardware command with no response falls back to TimesFrame; a returned unknown value is rejected.

Main capabilities:

- read, create, and patch an internal managed slot without requiring callers to supply its numeric ID
- query product-specific clocks, fonts, display elements, templates, and layout guidance
- switch the active watchface, manage brightness and screen power, and capture screenshots
- upload AstroToo element files sequentially and bind device-local references
- control multiple devices from one server with per-target serialization

## Repository

`{{REPO_URL}}`

## Runtime / Transport

- Runtime: Node.js `>=20`
- Transport: `stdio`
- Entry command: `npx -y mcp-divoom-lan@0.2.0`

## Required Environment Variables

- `DIVOOM_DEVICE_HOST` (optional default; use `target.host` per call for multiple devices)
- `DIVOOM_DEVICE_PORT` (default `9000`)
- `DIVOOM_DEVICE_MODEL` (default `auto`)
- `DIVOOM_TIMEOUT_MS` (default `45000`)

## Tool Names

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

## Safety Statement

- This server follows firmware-level constraints and does not bypass device validation.
- `watchface_reset_local_then_cloud` is TimesFrame-only and is blocked on AstroToo.
- AstroToo requires local persistence capability reporting, 480×480 backdrops, and sequential element uploads; TAR/TGZ/ZIP is rejected.
- Recommended flow: identify -> read -> write -> read back -> capture screenshot.

## Maintainer

- Name: `{{MAINTAINER_NAME}}`
- Contact: `{{CONTACT_EMAIL}}`
