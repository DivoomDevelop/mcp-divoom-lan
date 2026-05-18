# Changelog

All notable changes to this project are documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.3] - 2026-05-18

### Added

- **AI bundle synced from the editor:** new resources
  - `divoom://disp/catalog` (`resources/disp-catalog.json`, 194 entries) —
    every supported `disp` id with English symbol, Chinese description from the
    editor's `DISP_COMMENT_ZH_MAP`, and heuristic hints
    (`likelyUsesRasterOrAssetLayer`, `oftenUsesVectorFontForText`).
  - `divoom://watchface/schema` — JSON Schema (draft 2020-12) for the
    editor's watchface config (root + `ItemList[]`).
  - `divoom://watchface/example-minimal` — smallest valid watchface JSON, useful
    as a generation seed.
  - `divoom://guide/ai-watchface` — narrative AI-authoring guide copied from
    the editor (`docs/AI_WATCHFACE_GUIDE.md`).
- **`watchface_disp_catalog` tool:** filterable view over the disp catalog.
  Supports `ids`, `nameContains`, `descriptionContains`, `expects`
  (`any` / `image` / `text`), `limit`, `idsOnly`. Pairs with
  `watchface_font_catalog` so AGENTs can pick `disp` and `font` together.
- **Bundle sync script:** `scripts/sync-editor-ai-bundle.mjs` (and
  `npm run sync:editor`) copies `docs/watchface-config.schema.json`,
  `docs/examples/ai-minimal-watchface.json`, `docs/AI_WATCHFACE_GUIDE.md` from
  the editor repo, regenerates the disp catalog (merging `DISP_NAME_MAP` /
  hints / `DISP_COMMENT_ZH_MAP`), and re-runs the font catalog build in one
  shot. Editor path resolves via argv, `DIVOOM_EDITOR_REPO`, or a sibling
  `divoom-watchface-visual-editor` directory.
- **`docs/disp-usage.md`:** AGENT-facing guide for the new disp catalog
  (fields, recommended workflow, sunrise/sunset slot description, font catalog
  pairing).
- **Quick-start additions:** new sections "7) `disp` 怎么选" and "8) 生成完整
  表盘 JSON 时" reference the disp catalog, JSON Schema, and example resource.
- **`watchface_protocol_quick_reference` rules 14 and 15:** point at
  `watchface_disp_catalog`, `divoom://watchface/schema`, and
  `divoom://watchface/example-minimal`.
- **Font catalog for AI agents:** new resource `divoom://font/catalog`
  (`resources/font-catalog.json`) plus tool `watchface_font_catalog`. Each
  entry exposes `id`, `type` (1=TTF, 0=image-font), `name`, original
  `charset`, derived `script` (`digits` / `digits-extended` / `latin` / `cjk`),
  `style_tags` (sans/serif/pixel/digital/handwriting/display/decorative/bold/
  light/cjk-capable/latin-capable/digits-capable/emoji), `recommendedFor`
  scenario keys, and per-font `notes`. The top-level `scenarios` map binds
  scenario names (`time_digits`, `temperature_digits`, `weather_text`,
  `lunar_text`, `pixel_theme_dial`, `retro_digital_clock`, …) to the `disp`
  ids they cover and the tags to prefer, so an LLM can pick `ItemList[i].font`
  deterministically. The tool supports `type` / `script` / `tag` / `scenario`
  / `ids` / `limit` / `idsOnly` / `includeScenarios` filters.
- **Font catalog regenerator:** `scripts/build-font-catalog.mjs` reads the
  HTML editor's `public/font/font_info.cfg` and emits the curated JSON.
  Resolves the cfg via argv, `DIVOOM_EDITOR_FONT_CFG`, or a sibling
  `divoom-watchface-visual-editor/public/font/font_info.cfg` directory.
- **Font usage doc:** `docs/font-usage.md` walks agents through the catalog
  shape, recommended workflow, and per-scenario picking rules; quick-start,
  skill prompt, and `protocol_quick_reference` rule list now point to it.

### Changed

- **Firmware (`divoom_watchface_local_api.c`):** `wf_validate_bundle_slot_image_file`
  now also accepts PNG (`89 50 4E 47 0D 0A 1A 0A`) for tar.gz element slots;
  the dial backdrop (`divoom_watchface_replace_clock_dial_bg_validate_saved_file`)
  is unchanged and still requires JPEG or WebP. Error message switched to
  `bundle element image must be JPEG, WEBP or PNG` so the `bundle_image` /
  background scopes no longer share an identical wording.
- **`src/index.ts`:** rewrote tool descriptions for `watchface_patch_local`,
  `watchface_create_local_clock`, and `watchface_replace_dial_bg_file` to spell
  out the firmware-strict format split (backdrop = JPEG/WebP only;
  element slots = JPEG/WebP/PNG). The `watchface_protocol_quick_reference`
  rule list was reorganized into 12 ordered constraints covering: read-before-
  write, minimal `ItemPatchList` (with `item_id` excluded), full-replace
  fallback rules, multipart wire layout, `DialAssets` resolution, format
  matrix, and the `alig` 3/4/5 firmware-native values.
- **`watchface_replace_dial_bg_file`:** schema description for `imagePath`
  now declares JPEG-or-WebP (no PNG/GIF), ≤ 500 KiB.

### Documentation

- Aligned multipart and watchface JSON guidance with the current device firmware
  (`divoom_app/src/app/divoom_http_server.c`,
  `divoom_app/src/middle/divoom_watchface_local_api.c`).
- Spelled out the firmware-strict wire layout for `/create_local_clock`,
  `/patch_local_clock`, `/replace_clock_dial_bg`, `/upload`: JSON-first part
  (`name="json"; filename="cmd.json"`, per-part `Content-Length`), file-second
  part (`filename="<file_name>"`, per-part `Content-Length`), unquoted boundary,
  CRLF, single file per request.
- Documented the `DialAssets: image` vs `bundle` decision (any non-empty
  non-`http(s)` `image_addr` ⇒ pack everything into one `clock_bg.tar.gz`).
- Added bundle archive layout rules: USTAR + gzip, `clock_bg.jpg|webp` placement,
  leaf-name limits, when `clock_bg.*` may be omitted in PATCH bundles.
- Documented the firmware `NEED_STR("item_id")` rule: every `ItemList[i].item_id`
  and parallel `ItemIdList[i]` must be a non-empty string.
- Updated `resources/guide-quick-reference.md`, `resources/skill-quick-reference.md`,
  `docs/reference/guide-key-points.{en,zh}.md`, `docs/tool-examples.md` and
  the `mcpb/staging/resources/` mirrors.
- Documented the recommended PATCH path matrix: prefer `ItemPatchList`
  (field-level diff) over full `ItemList` replacement; route pure
  metadata changes to `POST /divoom_api`, asset-changes to `POST
  /patch_local_clock` multipart, and only fall back to whole-table
  replace when `ItemList` length changes. Spelled out the consequences
  of the anti-pattern (overwritten device-side `item_id`, orphaned tar
  bundle leaves without `ItemPatchList[].patch.bundle_image`).
- Documented the firmware-native `alig` values (`3`=center, `4`=left,
  `5`=right) and the editor-side `normalizeAligToDevice` import shim that
  converts older `1`/`2` values from third-party tools.
- Documented the `ItemPatchList[].patch` whitelist read by
  `wf_apply_item_patch` (numeric: `size`/`size_delta`/`x`/`y`/`w`/`h`/
  `disp`/`alig`/`sep`/`font`/`image_id`/`angle`/`hier`/`transp`/`animation`;
  string: `image_addr`/`item_id`/`color_1`/`color_2`/`bundle_image`) and the
  recommendation to omit `item_id` from `patch.*` unless the caller is
  intentionally renaming a slot.
- Documented the new behavior of `DIVOOM_CLOCK_DISP_SUPPORT_SUNRISE_SUNSET_TIME`
  (`disp = 204`): single-value display (sunset between today's sunrise and
  sunset, otherwise the next applicable sunrise rolling to next day after
  sunset) — replaces the previous "instantaneous toggle" wording.
- Split the image-format guidance into backdrop vs element scope across
  `guide-key-points.{en,zh}.md`, `guide-quick-reference.md`,
  `skill-quick-reference.md`, `safety-and-troubleshooting.md`,
  `quick-start.md`, and `tool-examples.md` so each constraint cites the
  exact firmware validator (`divoom_watchface_replace_clock_dial_bg_validate_saved_file`
  vs `wf_validate_bundle_slot_image_file`) and lists the matching error
  strings (`bundle image must be JPEG or WEBP` vs
  `bundle element image must be JPEG, WEBP or PNG`).
- Added an editor-aligned UX note in `docs/html-visual-editor.md`
  describing the LAN UI behavior the MCP guidance now mirrors:
  device-required action buttons (Create / Apply / Show watchface)
  disabled when no LAN device is selected, centered `<dialog>` for LAN
  feedback, auto-fit template preview without scrollbars, and
  signature-based JPEG/WebP/GIF/PNG detection for local element files.

## [0.1.2] - 2026-05-12

### Added

- **`bin`:** `mcp-divoom-lan` now resolves via `npx -y mcp-divoom-lan` (stdio entry `dist/index.js`).
- **Build:** prepend `#!/usr/bin/env node` to `dist/index.js` after `tsc` for Unix-compatible bin execution.

### Changed

- Docs: Glama (`Dockerfile`, `glama.json`), MCP.so submission copy (`MCP_SO_SUBMISSION_READY.md`), publishing checklist.

## [0.1.1] - 2026-05-11

Patch release on npm; documentation and metadata only (no `bin` / `npx` entry in the published tarball).

## [0.1.0] - 2026-05-09

### Added

- Initial MCP server implementation over stdio transport.
- Tool wrappers for core Divoom LAN watchface commands:
  - local read/patch (`GetLocalClockInfo`, `PatchLocalClockInfo`)
  - fonts, store market list, clock selection, brightness
  - multipart endpoints (`/replace_clock_dial_bg`, `/upload`, `/create_local_clock`)
  - reset and raw command passthrough
- MCP resources for quick protocol and skill guidance.
- Example MCP client config template (`client-config.example.json`).
- Initial publish docs and release guidance.

[0.1.2]: https://github.com/DivoomDevelop/mcp-divoom-lan/releases/tag/v0.1.2
[0.1.2]: https://github.com/DivoomDevelop/mcp-divoom-lan/releases/tag/v0.1.2
[0.1.1]: https://github.com/DivoomDevelop/mcp-divoom-lan/releases/tag/v0.1.1
[0.1.0]: https://github.com/DivoomDevelop/mcp-divoom-lan/releases/tag/v0.1.0
