# Glama Listing Copy

> Replace placeholders:
> - `{{REPO_URL}}`
> - `{{CONTACT_EMAIL}}`

## Project

`mcp-divoom-lan`

## Elevator Pitch

MCP server for Divoom LAN watchface operations with practical safety boundaries: read-before-write flow, explicit destructive command warning, and multipart endpoint support.

## Full Description

`mcp-divoom-lan` enables MCP-compatible AI clients to operate Divoom watchface customization workflows over LAN HTTP APIs.

It provides:

- Local clock config read and patch tools
- Font and market list discovery
- Dial switch and brightness controls
- Multipart wrappers for:
  - `/replace_clock_dial_bg`
  - `/upload`
  - `/create_local_clock`
- Quick-reference MCP resources for protocol and skill behavior

## Transport and Runtime

- Runtime: Node.js `>=20`
- Transport: stdio
- Entrypoint: `node dist/index.js`

## Configuration

- `DIVOOM_DEVICE_HOST` (recommended global default)
- `DIVOOM_DEVICE_PORT` (default 9000)
- `DIVOOM_TIMEOUT_MS` (default 45000)

## Example Use Cases

- "Read current watchface JSON and list editable text items."
- "Increase time font size and set color to red."
- "Replace current dial background with this 800x1280 image."

## Safety Considerations

- Requires local network/device access.
- `watchface_reset_local_then_cloud` may delete local sys-side files first.
- Verify changes with `watchface_get_local` after write actions.

## Links

- Repository: `{{REPO_URL}}`
- Security Contact: `{{CONTACT_EMAIL}}`
