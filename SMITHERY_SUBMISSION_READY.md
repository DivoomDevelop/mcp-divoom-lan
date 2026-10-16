# Smithery Listing Copy

> Replace placeholders:
> - `{{REPO_URL}}`
> - `{{CONTACT_EMAIL}}`

## Name

`mcp-divoom-lan`

## Summary

Control TimesFrame and AstroToo watchfaces over LAN with automatic hardware detection, product-specific authoring data, local creation and updates, switching, and screenshots.

## Description

`mcp-divoom-lan` is a Node.js MCP server for Divoom TimesFrame and AstroToo devices. It requests Hardware for every target, falls back to TimesFrame only when that command gets no response, isolates product-specific clock and element semantics, and serializes complete operations per device.

Core workflows:

1. Discover supported targets and let the user choose (`watchface_list_devices`)
2. Identify model and capabilities (`watchface_get_device_info`)
3. Read the managed watchface (`watchface_get_local`)
4. Create or patch locally without supplying a ClockId (`watchface_create_local_clock` / `watchface_patch_local`)
5. Select, read back, and capture a screenshot
6. For AstroToo image elements, upload each file sequentially and bind the returned `local://...` reference in the same create or patch operation

## Install / Command

- **npm:** `npx -y mcp-divoom-lan@0.2.0` with optional default `DIVOOM_DEVICE_HOST`, `DIVOOM_DEVICE_PORT` (9000), `DIVOOM_DEVICE_MODEL` (`auto`), and `DIVOOM_TIMEOUT_MS` (45000).
- **MCPB:** Build with `npm run mcpb:pack` in [mcp-divoom-lan](https://github.com/DivoomDevelop/mcp-divoom-lan); install `mcp-divoom-lan.mcpb` in a host that supports MCP Bundles; publish the same file to registries (e.g. Smithery) that accept stdio bundles.
- **From source:** `node dist/index.js` after `npm run build`.

## Environment

- `DIVOOM_DEVICE_HOST=192.168.x.x`
- `DIVOOM_DEVICE_PORT=9000`
- `DIVOOM_DEVICE_MODEL=auto`
- `DIVOOM_TIMEOUT_MS=45000`

## Tooling Surface

- 22 tools total: 1 discovery tool, 15 device tools, and 6 offline or model-aware authoring tools.
- Device tools cover identification, read/create/patch, fonts, market cache, selection, brightness, screen power, local asset transfer, screenshots, and raw product commands.
- Authoring tools provide product-specific clock, display-element, font, template, and layout data.

## Safety / Limitations

- LAN reachability required (device and host in reachable network path).
- `watchface_reset_local_then_cloud` is TimesFrame-only and is blocked on AstroToo.
- AstroToo requires a 480×480 JPEG/WebP backdrop and sequential element uploads; TAR/TGZ/ZIP is rejected.
- Timed-out writes are never retried automatically.

## Links

- Repository: `{{REPO_URL}}`
- Security Contact: `{{CONTACT_EMAIL}}`
