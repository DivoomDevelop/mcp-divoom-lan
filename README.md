# mcp-divoom-lan

`mcp-divoom-lan` is an open-source MCP server for TimesFrame/AstroToo watchfaces and PIXOO64/TimeGate LAN display control. TimesFrame/AstroToo query `Device/GetHardwareVersion`; PIXOO64/TimeGate use discovery Hardware or explicit hardware profiles. Unknown hardware is rejected. The TimesFrame no-response fallback is retained after checking available discovery data.

PIXOO64 Hardware **90/92** uses `80/post`; **96** uses `9000/divoom_api`. Its 10 dedicated tools send display elements, text, RGB animations and control commands. Hardware 96 command lists execute sequentially in MCP to match the reference firmware. See the [PIXOO64 guide and examples](resources/pixoo64/guide.md). Device firmware is unchanged.

It works together with the **v2** HTML visual editor for modifying watchfaces, switching faces, adjusting brightness, and creating new local watchfaces.

TimeGate Hardware **400** uses `80/post`; **402** uses `9000/divoom_api`. Its 10 dedicated tools control five independent **128×128** screens and require **LocalToken** from device settings. Hardware 402 batches run sequentially in MCP. See the [TimeGate guide](resources/timegate/guide.md) for per-version field, alignment and background differences. Device firmware is unchanged.

**v2 visual editor (public):**

- GitHub: `https://github.com/DivoomDevelop/divoom-watchface-visual-editor_v2`
- Live site: `https://divoomdevelop.github.io/divoom-watchface-visual-editor_v2/`

Your local clone path (e.g. `D:\divoom-watchface-visual-editor`) is machine-specific; **use the v2 GitHub / GitHub Pages URLs above in docs and MCP metadata.**

## Goals

- Expose key capabilities from `Divoom_Watchface_Remote_Customization_Guide_EN.md` as MCP tools
- Let MCP-enabled clients (Cursor, Claude Desktop, local LLMs, etc.) drive watchface actions via natural language
- Preserve safety boundaries (read before write, explicit warnings for risky operations, multipart rules)

## Default safety policy (important)

- **Select the product profile:** `Hardware` 510/511/512 selects TimesFrame; 530 AstroToo; 90/92/96 PIXOO64; 400/402 TimeGate. Explicit `target.hardware` is a caller profile override. Use `pixoo64_*` or `timegate_*` for those products; managed-watchface rules below apply to TimesFrame/AstroToo.
- **Internal managed slot:** users and MCP clients omit `ClockId` from create and patch calls. The server injects its managed slot, reads it first, creates it when missing, and updates it when present.
- **Read before write:** the MCP server prechecks its managed slot, writes, and then clients should read back to verify.
- If `GetLocalClockInfo` returns an **empty `ItemList`:** stop writes; switch to an editable watchface first.
- Prefer `watchface_patch_local` for edits. Use `watchface_create_local_clock` when the user asks to create a watchface or when intentionally replacing the complete managed configuration and backdrop.

## Implemented tools (42)

Discovery tool (1):

- `watchface_list_devices` → returns selectable TimesFrame/AstroToo/PIXOO64/TimeGate targets with product-specific default ports

Device tools (15):

- `watchface_get_device_info` → hardware identification and LAN capability report
- `watchface_get_local` → `Device/GetLocalClockInfo`
- `watchface_patch_local` → managed-slot upsert with no caller-supplied `ClockId`. Existing configurations use `Device/PatchLocalClockInfo`; a missing configuration is created when a backdrop and complete item tables are supplied.
- `watchface_get_fonts_local` → `Device/GetLocalFontList`
- `watchface_get_store_market_list` → `Device/GetStoreClockMarketList`
- `watchface_set_clock_select` → `Channel/SetClockSelectId` (TimesFrame queues a paired request inside one serialized MCP operation so a manual selection suppresses the active traditional schedule for the current period; AstroToo sends once)
- `watchface_get_brightness` → `Sys/GetBrightness`
- `watchface_set_brightness` → `Channel/SetBrightness`
- `watchface_onoff_screen` → `Channel/OnOffScreen` (1=on, 0=off)
- `watchface_replace_dial_bg_file` → `POST /replace_clock_dial_bg`
- `watchface_upload_file` → AstroToo-only `POST /upload_local_asset`; returns a temporary `local://` staging reference consumed by a successful create/patch. AstroToo keeps product photo/pixel `POST /upload` separate. TimesFrame generic `/upload` is blocked in local-only MCP mode.
- `watchface_create_local_clock` → managed-slot multipart upsert with no caller-supplied `ClockId`: `/create_local_clock` when missing and `/patch_local_clock` when already present.
- `watchface_reset_local_then_cloud` → `Device/ResetLocalClockFromServer`
- `watchface_get_screen_snapshot` → `Device/GetScreenSnapshot` (downloads the returned AstroToo snapshot path; TimesFrame keeps its WebP fallback)
- `watchface_raw_command` → generic `POST /divoom_api`

Offline/model-aware authoring tools (6):

- `watchface_protocol_quick_reference` → key protocol constraints for the model
- `watchface_clock_catalog` → product-specific ClockId, Chinese/English names, fonts, disp and item-id semantics; optional native configuration
- `watchface_disp_catalog` → model-specific `disp` catalog and filters
- `watchface_font_catalog` → model-specific font catalog; with a live AstroToo target it merges local availability into the AstroToo names
- `watchface_template_search` → curated TimesFrame or AstroToo watchface templates
- `watchface_layout_suggest` → model-specific layout hints; AstroToo never receives TimesFrame coordinate statistics

PIXOO64 tools (10): `pixoo64_get_device_info`, `pixoo64_send_animation`, `pixoo64_send_items`, `pixoo64_send_text`, `pixoo64_clear_text`, `pixoo64_set_brightness`, `pixoo64_onoff_screen`, `pixoo64_set_channel`, `pixoo64_play_gif`, and `pixoo64_command_list`. Read `divoom://pixoo64/guide` and `divoom://pixoo64/example`. A direct LAN target can be `{ "host":"192.168.1.100", "model":"pixoo64", "hardware":90 }`; omit `port` and `DIVOOM_DEVICE_PORT` to select the version's default.

TimeGate tools (10): `timegate_get_device_info`, `timegate_send_items`, `timegate_send_text`, `timegate_clear_text`, `timegate_set_brightness`, `timegate_get_brightness`, `timegate_onoff_screen`, `timegate_select_clock`, `timegate_play_gif`, and `timegate_command_list`. Read `divoom://timegate/guide` and `divoom://timegate/example`; authenticated calls supply `localToken` from the actual device settings.

## Resources (context for the model)

Product data is stored by directory: `resources/timesframe`, `resources/astrotoo`, `resources/pixoo64`, `resources/timegate`, and `resources/common`. `resources/products.json` records Hardware mappings, per-screen canvas sizes, directories and routes. Runtime loaders never fall back to another product's data.

The original resource URIs retain TimesFrame semantics. AstroToo has separate 480×480 resources:

- `divoom://products/catalog`
- `divoom://guide/quick-reference`
- `divoom://skill/watchface-customization`
- `divoom://font/catalog`
- `divoom://font/guide`
- `divoom://disp/catalog`
- `divoom://watchface/schema`
- `divoom://watchface/example-minimal`
- `divoom://guide/ai-watchface`
- `divoom://templates/curated`
- `divoom://astrotoo/guide`
- `divoom://astrotoo/disp/summary`
- `divoom://astrotoo/disp/catalog`
- `divoom://astrotoo/disp/guide/en`
- `divoom://astrotoo/disp/guide/zh-cn`
- `divoom://astrotoo/font/catalog`
- `divoom://astrotoo/clocks/catalog`
- `divoom://astrotoo/clocks/configs`
- `divoom://astrotoo/templates/curated`
- `divoom://astrotoo/watchface/example-minimal`
- `divoom://astrotoo/watchface/schema`

## MCP Bundle (.mcpb)

For [MCPB](https://github.com/anthropics/mcpb)-compatible hosts (e.g. Claude desktop connectors, Smithery stdio releases), build a local bundle:

1. Install the packer: `npm install -g @anthropic-ai/mcpb`
2. From this package root: `npm run mcpb:pack`
3. Output: `mcp-divoom-lan.mcpb` (gitignored). The staging directory `mcpb/staging/` is also gitignored.

The bundle includes `dist/`, `resources/`, production `node_modules`, and a `manifest.json` with user fields for **device IP**, **port**, **product detection**, and **timeout**.

## Quick start

Published npm package:

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "npx",
      "args": ["-y", "mcp-divoom-lan@latest"],
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

`DIVOOM_DEVICE_HOST` is optional. Leave it unset and include `target.host` in each tool call when one MCP server controls multiple devices.

Build from source:

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

Regenerate AstroToo resources from the simulator and Divoom command server:

```powershell
$env:DIVOOM_ASTROTOO_SIMULATOR_ROOT='D:\work\divoom_product\timebox\trunck\device\tool_src\lv_sim_visual_studio\LvglAstroTooSimulator'
$env:DIVOOM_ASTROTOO_DEVICE_ID='300400436'
npm run build:astrotoo
```

The generator calls `https://appchina.divoom-gz.com/` + command string with a JSON body. It obtains default IDs from `Device/GetClockDefaultList` (`IsDefault=1`), font names from `Device/GetFontForAI`, and missing configurations from `Device/GetClockInfoV3`.

Pre-release check (typecheck, build, pack dry-run):

```bash
npm run release:check
```

## Documentation

- `docs/README.md` — documentation index
- `docs/quick-start.md` — minimal setup
- `docs/mcp-tools.md` — complete 42-tool API catalog and model-specific file policy
- `docs/astrotoo-and-multiple-devices.md` — hardware detection, multiple targets, and AstroToo local storage
- `docs/astrotoo-watchface-workflow.md` — release-ready AstroToo create, update, switch, and screenshot workflow
- `docs/adding-products.md` — product registry, isolated resource directories, and onboarding checks
- `docs/tool-examples.md` — tool usage examples (includes §5b analog pointer layout)
- `docs/disp-usage.md` — choosing `disp` ids (pointer layout `131/132/233`; net-gallery uniqueness `13/125–130/173–175`)
- `docs/html-visual-editor.md` — using the visual editor with MCP
- `docs/safety-and-troubleshooting.md` — safety and FAQs
- `docs/reference/` — condensed protocol rules (EN/ZH)
- `docs/examples/` — sample requests/responses and catalog

## Environment variables

- `DIVOOM_DEVICE_HOST` — device LAN IP (e.g. `192.168.1.120`)
- `DIVOOM_DEVICE_PORT` — optional override; omit for PIXOO64 90/92 or TimeGate 400 port `80`, otherwise `9000`
- `DIVOOM_DEVICE_MODEL` — `auto` (default), `timesframe`, `astrotoo`, `pixoo64`, or `timegate`
- `DIVOOM_DEVICE_HARDWARE` — optional default-device profile: PIXOO64 `90/92/96` or TimeGate `400/402`; omit to use discovery
- `DIVOOM_TIMEGATE_LOCAL_TOKEN` — optional LocalToken from the default TimeGate settings; matched by host, otherwise supply `localToken` per call
- `DIVOOM_TIMEOUT_MS` — request timeout ms, default `45000`

If `DIVOOM_DEVICE_HOST` is unset, each tool call must pass `target.host`. To control several devices, pass a different `target` on each call. The server serializes a complete operation per host while allowing independent devices to run concurrently.

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
        "DIVOOM_DEVICE_MODEL": "auto",
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
4. Tag a GitHub release (e.g. `v0.3.0`) with screenshots and sample requests if helpful.
5. Submit listings where appropriate (MCP Registry, Smithery, Glama, [MCP.so](https://mcp.so/submit), and community indexes). For Glama, follow `GLAMA_SUBMISSION_READY.md` (including `Dockerfile` and `glama.json`). For MCP.so, follow `MCP_SO_SUBMISSION_READY.md`. For the Volcengine MCP catalog, see `VOLCENGINE_SUBMISSION_READY.md` (PR: https://github.com/volcengine/mcp-server/pull/398). For an Alibaba Cloud Bailian custom MCP deployed with npx, see `BAILIAN_MCP_SUBMISSION_READY.md`. For publishing a Coze HTTP plugin, see `COZE_SUBMISSION_READY.md`.
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
