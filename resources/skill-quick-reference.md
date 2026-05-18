# Skill Prompt: Divoom Watchface Customization

Use this prompt as a compact behavior contract for AI agents that control
Divoom watchfaces via LAN API.

## Mission

Modify watchface data safely through Divoom local HTTP endpoints, mirroring the
HTML editor's behavior (see `divoom_app/tools/divoom-watchface-visual-editor`).

## Mandatory behavior

1. Always call `POST /divoom_api` with JSON body. Set root `ReturnCode` to `0`.
2. **Read before write:** `Device/GetLocalClockInfo` first; if `ItemList` is
   empty, stop and ask the user to switch to an editable clock first.
3. **Patch minimally** with `ItemPatchList` (per-index field diff) and
   `ItemPatchByRoleList` (semantic role). Do **not** include `item_id` inside
   `patch.*` — the firmware will overwrite the device-side `item_id` and break
   menu/config bindings. Renaming a slot is the only legitimate exception, and
   requires explicit user intent.
4. Only fall back to a full `ItemList` replacement when row count actually
   changes (rows added/removed). For pure metadata edits (size/x/y/font/color),
   `POST /divoom_api` JSON-only is enough — no multipart overhead.
5. Keep `font` values as numeric ids returned by `Device/GetLocalFontList`.
6. To replace the cached backdrop without touching cfg `DeviceImageUrl`, use
   `POST /replace_clock_dial_bg` (no tarball, JPEG/WebP only).
7. To upload new dial backdrop **and/or** element bitmaps while applying
   `ItemPatchList`, use multipart `POST /patch_local_clock` with the
   firmware-strict layout (see "Multipart wire format" below).
8. To make `DeviceImageUrl` point to a new file, use `POST /upload` then
   `Device/PatchLocalClockInfo` with the new URL.
9. Verify changes by calling `Device/GetLocalClockInfo` after every write.
10. Do not call `watchface_create_local_clock` unless the user explicitly asks
    to create a new clock.

## Risky operations (require explicit user intent)

- `Device/ResetLocalClockFromServer` — destructive (deletes local sys-side
  files first).
- `Channel/SetClockSelectId` — immediately changes the on-screen dial.

## Multipart wire format (firmware-strict)

Applies to `/create_local_clock`, `/patch_local_clock`, `/replace_clock_dial_bg`,
`/upload`. Violations produce `missing JSON part`, `missing file part`,
`size mismatch`, or `filename in multipart` errors.

- Exactly **two parts**, **JSON first**, **file second**.
- Part 1: `Content-Disposition: form-data; name="json"; filename="cmd.json"`,
  `Content-Type: application/json`, **per-part `Content-Length`**, body is
  the minified command JSON.
- Part 2: `Content-Disposition: form-data; name="<arbitrary>"; filename="<file_name>"`,
  `Content-Type: application/octet-stream`, **per-part `Content-Length`**,
  body is the file bytes.
- CRLF line endings everywhere. Boundary unquoted in `Content-Type`. Closing
  `--<boundary>--`.
- **Single file per request.** Pack multiple element bitmaps as one
  `clock_bg.tar.gz` (USTAR + gzip; leaf names match `image_addr` basenames).
- `<file_name>` is what gets written to `/userdata/app_pic/`. Use
  `clock_bg.jpg` / `clock_bg.webp` for image, `clock_bg.tar.gz` for bundle.

### Firmware multipart parser (`divoom_http_server_upload_get_file_info`)

**English:** The device resolves each file-bearing multipart segment using
`divoom_http_server_upload_get_file_info`. It expects **per-part
`Content-Length`** on every segment. Typical browser **`FormData`** emits
boundary-delimited parts **without** per-part lengths. Firmware work-in-progress
adds **boundary-terminated** parsing when `Content-Length` is missing and fixes
pointer math **after the JSON part** when locating the binary file payload.
Editors and MCP clients should **still assemble multipart with explicit
per-part `Content-Length`** for compatibility across firmware versions.

**中文（传输文件打包要求）：** 固件在 `divoom_http_server_upload_get_file_info`
中要求每个文件段必须有 `Content-Length`，而浏览器 `FormData` 通常只使用 boundary
分隔、不包含每段 `Content-Length`。正在实现固件在无 `Content-Length` 时用 boundary
终止解析，并修复 JSON 段之后定位文件数据的指针计算；编辑器侧改为手动构造带
`Content-Length` 的 multipart 以提高兼容性。

## DialAssets selection

- `image`: every `ItemList[i].image_addr` is empty or already an `http(s)` URL
  → upload only the dial JPEG/WebP backdrop.
- `bundle`: any `ItemList[i].image_addr` (or
  `ItemPatchList[i].patch.bundle_image`) is a local leaf name → ship a
  `clock_bg.tar.gz` containing all such leaves plus optional `clock_bg.*`.
- `auto` (default; legacy `UseDialAssetBundle` 0/!=0 still honored):
  the device sniffs the gzip magic on the file part.

In bundle mode, leaf basenames inside the tar must exactly match the
`image_addr` values used in JSON (no subdirs, no leading paths).

## Image format constraints

- **Dial backdrop** (`clock_bg.jpg|webp`, validated by
  `divoom_watchface_replace_clock_dial_bg_validate_saved_file`): JPEG (`FF D8`)
  or WebP (`RIFF…WEBP`) only. PNG and GIF are rejected. Recommended
  `800x1280` portrait, ≤ `500 KiB`.
- **Element slots inside the tar.gz** (validated by
  `wf_validate_bundle_slot_image_file`): JPEG / WebP / PNG
  (`89 50 4E 47 0D 0A 1A 0A`) accepted. GIF / BMP / TIFF and other formats
  must be transcoded client-side before packing (animated GIF loses animation;
  only the first frame survives). Same per-leaf size cap as the backdrop.

## ItemList / ItemIdList rules

- Each `ItemList[i]` must include `disp`, `font`, `x`, `y`, `w`, `h`, `size`,
  `alig` (numbers) and `color_1`, `color_2`, `item_id` (non-empty strings,
  hex colors `#RRGGBB`).
- `alig`: **3** = center, **4** = left, **5** = right (firmware-native).
  Older `1`/`2` values from third-party tools must be normalized.
- `ItemIdList[i]` must be **non-empty** and is conventionally the same value
  as the matching `item_id`. Empty strings cause
  `ItemList[i]: missing or empty string "item_id"`.
- `ItemPatchList[].patch` whitelist: `size`, `size_delta`, `x`, `y`, `w`, `h`,
  `disp`, `alig`, `sep`, `font`, `image_id`, `angle`, `hier`, `transp`,
  `animation`, `image_addr`, `item_id`, `color_1`, `color_2`, and (multipart
  only) `bundle_image`. Any other key is silently ignored. Skip `item_id`
  unless renaming a slot.

## `transp` & `hier` (AI generators often get this wrong)

- **`transp`:** Treat as **opacity for visibility**. For anything that should **show on screen**, set **`transp: 100`**. **Many LLMs default missing/`transp: 0`, which renders fully invisible on device** — users think layout is broken when it is only transparency.
- **`hier`:** Only **`0` = auto**, **`1` = bottom layer**, **`2` = top layer**. There is **no `hier: 3`**. Stack analog hands e.g. hour **`1`**, minute **`0`**, second **`2`**.

## Analog pointer slots (`DIVOOM_CLOCK_DISP_SUPPORT_*_POINT_IMAGE`: **131** / **132** / **233**)

**Required:** shared **square** bbox (**`w = h`**, **same `x,y,w,h`** on all three `ItemList` rows); each PNG/WebP/JPEG is **`w`×`w`**, **pivot at square center**, hand toward **12 o'clock** (firmware rotates around layer center). **Never** three different thin rectangles or **`800×1280`** full-screen needles. Good reference: device export **`ClockId 60012`** (`clock60012.cfg`). **`transp: 100`**; **`hier`** **`0`/`1`/`2`** with second often **`2`**. Details: `docs/tool-examples.md` §5b, `docs/disp-usage.md`.

## Image elements / net-gallery uniqueness

Across a single dial **`ItemList`**, treat **image-backed `disp` types as at most one row per
`disp`**. If duplicated, **later rows override earlier ones**. This is especially strict for the
**network gallery** slots: **`disp` 13** (`NET_PIC`), **`173–175`** (`NET2_PIC`–`NET4_PIC`),
**`125–130`** (`NET5_PIC`–`NET10_PIC`) — firmware symbols `DIVOOM_CLOCK_DISP_SUPPORT_NET*_PIC`.
Full table: **`docs/disp-usage.md`** (section “图像元素唯一性（网络图库系列）”).

## Sunrise / sunset slot (`disp = 204`)

The current firmware shows a single value rather than toggling:

- Between today's sunrise and sunset (inclusive) → show the **sunset** time.
- Otherwise → show the **next applicable sunrise** (rolls to next day after
  sunset).

Describe this slot as "sunrise OR sunset (auto-switch by current time)".

## Visual editing pairing

For better explainability, pair this MCP server with the HTML editor at
`divoom_app/tools/divoom-watchface-visual-editor`. The editor's LAN flow
(`src/editor/app.js`) is the canonical reference implementation of:

- `fromLocalPick` filtering (only user-picked elements ride the tar.gz)
- diff-only `ItemPatchList` with `item_id` excluded
- transparent transcoding of unsupported element formats to JPEG before
  packing
- a centered confirmation dialog and disabled action buttons when no LAN
  device is selected
