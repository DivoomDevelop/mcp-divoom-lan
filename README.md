# mcp-divoom-lan

`mcp-divoom-lan` is an open-source MCP server that wraps Divoom watchface LAN APIs as standard tools for AI clients.

It works together with the **v2** HTML visual editor for modifying watchfaces, switching faces, adjusting brightness, and creating new local watchfaces.

**v2 visual editor (public):**

- GitHub: `https://github.com/DivoomDevelop/divoom-watchface-visual-editor_v2`
- Live site: `https://divoomdevelop.github.io/divoom-watchface-visual-editor_v2/`

Your local clone path (e.g. `D:\divoom-watchface-visual-editor`) is machine-specific; **use the v2 GitHub / GitHub Pages URLs above in docs and MCP metadata.**

## Goals

- Expose key capabilities from `Divoom_Watchface_Remote_Customization_Guide_EN.md` as MCP tools
- Let MCP-enabled clients (Cursor, Claude Desktop, local LLMs, etc.) drive watchface actions via natural language
- Preserve safety boundaries (read before write, explicit warnings for risky operations, multipart rules)

## Default safety policy (important)

- **Read before write:** call `watchface_get_local`, then `watchface_patch_local`, then read back to verify.
- If `GetLocalClockInfo` returns an **empty `ItemList`:** stop writes; switch to an editable watchface first.
- Do **not** call `watchface_create_local_clock` unless the user clearly asks to create a new one (no implicit creation).

## Implemented tools

- `watchface_get_local` → `Device/GetLocalClockInfo`
- `watchface_patch_local` → `Device/PatchLocalClockInfo`
- `watchface_get_fonts_local` → `Device/GetLocalFontList`
- `watchface_get_store_market_list` → `Device/GetStoreClockMarketList`
- `watchface_set_clock_select` → `Channel/SetClockSelectId`
- `watchface_get_brightness` → `Sys/GetBrightness`
- `watchface_set_brightness` → `Channel/SetBrightness`
- `watchface_onoff_screen` → `Channel/OnOffScreen` (1=on, 0=off)
- `watchface_replace_dial_bg_file` → `POST /replace_clock_dial_bg`
- `watchface_upload_file` → `POST /upload`
- `watchface_create_local_clock` → `POST /create_local_clock`
- `watchface_reset_local_then_cloud` → `Device/ResetLocalClockFromServer`
- `watchface_raw_command` → generic `POST /divoom_api`
- `watchface_protocol_quick_reference` → key protocol constraints for the model

## Resources (context for the model)

The server exposes two MCP resources:

- `divoom://guide/quick-reference`
- `divoom://skill/watchface-customization`

## MCP Bundle (.mcpb)

For [MCPB](https://github.com/anthropics/mcpb)-compatible hosts (e.g. Claude desktop connectors, Smithery stdio releases), build a local bundle:

1. Install the packer: `npm install -g @anthropic-ai/mcpb`
2. From this package root: `npm run mcpb:pack`
3. Output: `mcp-divoom-lan.mcpb` (gitignored). The staging directory `mcpb/staging/` is also gitignored.

The bundle includes `dist/`, `resources/`, production `node_modules`, and a `manifest.json` with user fields for **device IP**, **port**, and **timeout**.

## Quick start

```bash
cd tools/mcp-divoom-lan  # or your clone root for this package
npm install
npm run build
npm start
```

Development (watch rebuild):

```bash
npm run dev
```

Pre-release check (typecheck, build, pack dry-run):

```bash
npm run release:check
```

## Documentation

- `docs/README.md` — documentation index
- `docs/quick-start.md` — minimal setup
- `docs/tool-examples.md` — tool usage examples
- `docs/html-visual-editor.md` — using the visual editor with MCP
- `docs/safety-and-troubleshooting.md` — safety and FAQs
- `docs/reference/` — condensed protocol rules (EN/ZH)
- `docs/examples/` — sample requests/responses and catalog

## Environment variables

- `DIVOOM_DEVICE_HOST` — device LAN IP (e.g. `192.168.1.120`)
- `DIVOOM_DEVICE_PORT` — HTTP port, default `9000`
- `DIVOOM_TIMEOUT_MS` — request timeout ms, default `45000`

If `DIVOOM_DEVICE_HOST` is unset, each tool call must pass `target.host`.

## Example client config (stdio)

### Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/to/tools/mcp-divoom-lan/dist/index.js"
      ],
      "env": {
        "DIVOOM_DEVICE_HOST": "192.168.1.120",
        "DIVOOM_DEVICE_PORT": "9000",
        "DIVOOM_TIMEOUT_MS": "45000"
      }
    }
  }
}
```

You can also copy `client-config.example.json` in this directory as a starting point.

## Publishing checklist (for maintainers)

1. Use a dedicated repo (e.g. `mcp-divoom-lan`) with this package at the repo root.
2. Verify metadata: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `RELEASE.md` as applicable.
3. Run `npm run release:check`.
4. Tag a GitHub release (e.g. `v0.1.1`) with screenshots and sample requests if helpful.
5. Submit listings where appropriate (MCP Registry, Smithery, Glama, [MCP.so](https://mcp.so/submit), community indexes). For Glama, follow `GLAMA_SUBMISSION_READY.md` (includes `Dockerfile` and `glama.json` for registry builds and ownership claim). For MCP.so, follow `MCP_SO_SUBMISSION_READY.md`. For Glama, follow `GLAMA_SUBMISSION_READY.md` (includes `Dockerfile` and `glama.json` for registry builds and ownership claim).
6. Minimal demo flow: `watchface_get_local` → `watchface_patch_local` (font size/color) → `watchface_replace_dial_bg_file` (background).

## Files often used at release

Included in this repo (when present): `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `RELEASE.md`, optional checklist and directory templates, and `.github/workflows/ci.yml`.

## Should the HTML visual editor ship inside this npm package?

**Recommendation:** **no** for the core MCP package — keep MCP lean. Offer the editor as a **separate optional** project.

- **Core:** `https://github.com/DivoomDevelop/mcp-divoom-lan`
- **Visual editor v2:** `https://github.com/DivoomDevelop/divoom-watchface-visual-editor_v2`
- **Hosted v2:** `https://divoomdevelop.github.io/divoom-watchface-visual-editor_v2/`

Benefits:

- Small MCP install suitable for all AI clients  
- Non-developers can use the visual UI to understand `ItemList`, then let the AI apply patches  
- Clear split between WYSIWYG editing and automated MCP writes  

## Alignment with upstream docs

This repo ships standalone docs under `docs/`, `docs/reference/`, and `docs/examples/`. If you maintain full guides elsewhere, keep this tree synced or treat it as the distribution subset.
