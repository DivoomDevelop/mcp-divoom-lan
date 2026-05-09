# Smithery Listing Copy

> Replace placeholders:
> - `{{REPO_URL}}`
> - `{{CONTACT_EMAIL}}`

## Name

`mcp-divoom-lan`

## Summary

Control Divoom LAN watchface APIs through MCP: read/patch local clock configs, upload or replace backgrounds, and manage brightness/dial selection.

## Description

`mcp-divoom-lan` is a Node.js MCP server for Divoom local network devices.
It wraps local HTTP commands and multipart endpoints into tool calls suitable for AI clients.

Core workflows:

1. Read current watchface (`watchface_get_local`)
2. Patch minimal fields (`watchface_patch_local`)
3. Verify by reading back
4. Optional background workflow:
   - cache-only replace: `watchface_replace_dial_bg_file`
   - URL workflow: `watchface_upload_file` + patch

## Install / Command

- Command: `node`
- Args: `["/ABSOLUTE/PATH/to/mcp-divoom-lan/dist/index.js"]`

## Environment

- `DIVOOM_DEVICE_HOST=192.168.x.x`
- `DIVOOM_DEVICE_PORT=9000`
- `DIVOOM_TIMEOUT_MS=45000`

## Tooling Surface

- 13 tools total, including:
  - local read/patch
  - fonts/store listing
  - brightness/select control
  - multipart uploads
  - raw command passthrough
  - quick protocol reference

## Safety / Limitations

- LAN reachability required (device and host in reachable network path).
- `watchface_reset_local_then_cloud` is destructive; use with explicit intent.
- Multipart requests enforce `filename="..."` and per-part content length expectations.

## Links

- Repository: `{{REPO_URL}}`
- Security Contact: `{{CONTACT_EMAIL}}`
