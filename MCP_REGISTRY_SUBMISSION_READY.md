# Official MCP Registry Submission Copy

> Replace placeholders before submit:
> - `{{REPO_URL}}`
> - `{{CONTACT_EMAIL}}`
> - `{{MAINTAINER_NAME}}`

## Project Name

`mcp-divoom-lan`

## Short Description

MCP server for Divoom LAN watchface customization (local watchface read/patch, multipart background/file workflows, brightness and dial selection).

## Long Description

`mcp-divoom-lan` exposes Divoom local HTTP APIs as MCP tools so AI assistants can safely operate watchface customization workflows via natural language.

Main capabilities:

- read current or specific local watchface config
- patch `ItemList` or role-based watchface fields
- query local fonts and store market list
- switch active dial and manage brightness
- run multipart endpoints for background replacement, file upload, and local clock creation
- provide protocol and skill quick-reference resources

## Repository

`{{REPO_URL}}`

## Runtime / Transport

- Runtime: Node.js `>=20`
- Transport: `stdio`
- Entry command: `node dist/index.js`

## Required Environment Variables

- `DIVOOM_DEVICE_HOST` (required unless overridden per call)
- `DIVOOM_DEVICE_PORT` (default `9000`)
- `DIVOOM_TIMEOUT_MS` (default `45000`)

## Tool Names

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

## Safety Statement

- This server follows firmware-level constraints and does not bypass device validation.
- Destructive operation warning: `watchface_reset_local_then_cloud`.
- Recommended flow: read -> patch -> verify.

## Maintainer

- Name: `{{MAINTAINER_NAME}}`
- Contact: `{{CONTACT_EMAIL}}`
