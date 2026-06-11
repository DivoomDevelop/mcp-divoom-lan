# Divoom Watchface LAN Guide - Quick Reference

This resource is a condensed reference for agents using the Divoom local HTTP API.
Wire-format requirements below are derived directly from the device firmware
(`divoom_app/src/app/divoom_http_server.c`,
`divoom_app/src/middle/divoom_watchface_local_api.c`).

## Core transport rules

- API entry: `POST http://<DEVICE_IP>:<PORT>/divoom_api`
- Typical port is `9000` (confirm on firmware)
- Use `Content-Type: application/json; charset=UTF-8`
- Request root must include:
  - `Command` (case-sensitive command string)
  - `ReturnCode: 0`
- Do not use HTTP `GET` for `/divoom_api`

## High-value commands

- `Device/GetLocalClockInfo`
- `Device/PatchLocalClockInfo`
- `Device/CreateLocalClock`
- `Device/ReplaceClockDialBgFile`
- `Device/GetLocalFontList`
- `Device/GetStoreClockMarketList`
- `Device/GetScreenSnapshot` — capture on-screen dial WebP (`DIVOOM_NET_COMM_GET_SCREEN_SNAPSHOT`)
- `Channel/SetClockSelectId` (switches the on-screen dial)
- `Sys/GetBrightness` / `Channel/SetBrightness`
- `Channel/OnOffScreen`
- `Device/ResetLocalClockFromServer` (destructive)

## PATCH path matrix (recommended)

The HTML editor in `divoom_app/tools/divoom-watchface-visual-editor` follows this
matrix; agents on top of this MCP should mirror it for predictable behavior:

| Editor change scope | Strategy | Endpoint | JSON | File part |
|---------------------|----------|----------|------|-----------|
| Row count unchanged, only size/position/font/color edits | **Field-level patches** | `POST /divoom_api` | `ItemPatchList[].{index, patch}` (diff only) | none |
| Row count unchanged, user picked a new local element image | **Field-level patches + bundle** | `POST /patch_local_clock` multipart | `ItemPatchList[].patch.bundle_image: <leaf>` | `clock_bg.tar.gz` containing the same leaves; `clock_bg.*` optional |
| Only the dial backdrop changed | Field-level patches + image | `POST /patch_local_clock` multipart | `ClockId` / `UseCurrentDisplayClock` (and optional `ItemPatchList`) | single `clock_bg.jpg` / `clock_bg.webp` |
| Rows added/removed | Full replace | `POST /patch_local_clock` multipart | full `ItemList` + `ItemIdList` + matching `bundle_image` for new local leaves | `clock_bg.tar.gz` |

> Anti-pattern: shipping a full `ItemList` for a pure size/color edit. The
> firmware will overwrite original `item_id` strings (e.g. `time_main`) with the
> editor's auto-generated `item_${i+1}`, breaking menu/config bindings; element
> `.bin` files lacking `ItemPatchList[].patch.bundle_image` will be extracted
> but never rebound. Keep `item_id` out of `patch.*` unless you genuinely want
> to rename a slot.

## Safe patch workflow

1. Read current clock (`Device/GetLocalClockInfo`).
2. If `ItemList` is empty, stop and switch to an editable clock first.
3. Diff editor state vs device state per index, build `ItemPatchList[].patch`
   with only the changed fields. Do **not** include `item_id` in the diff.
4. If any leaf needs uploading, switch to multipart `/patch_local_clock` and
   add `bundle_image: <leaf>` to that index's patch.
5. Send and re-read with `GetLocalClockInfo` to verify.
6. Do not auto-create a new clock for color/style patch requests.

## Screen snapshot (visual verification)

After **creating or patching** a watchface (or switching the active dial), capture
what the device actually renders:

1. `POST /divoom_api` with `Command: "Device/GetScreenSnapshot"` and
   `ReturnCode: 0` (firmware enum `DIVOOM_NET_COMM_GET_SCREEN_SNAPSHOT`).
2. **Wait 2 seconds** — the device encodes the LVGL framebuffer to WebP
   asynchronously (`divoom_device_save_screen_snapshot`).
3. `GET http://<DEVICE_IP>:9000/userdata/snapshot.webp` (HTTP static file;
   firmware may also report `snapShotPath` as `/userdata/app_pic/snapshot.webp`).
4. Compare the WebP against your mockup or a prior snapshot to validate layout,
   colors, fonts, and asset binding.

MCP tool: `watchface_get_screen_snapshot` (optional `savePath` to write the file
locally for diff/vision review).

## Multipart wire format (firmware-strict)

These rules apply to **`POST /create_local_clock`**, **`POST /patch_local_clock`**,
**`POST /replace_clock_dial_bg`** and **`POST /upload`**. Failing to follow them
results in `missing JSON part`, `missing file part`, `size mismatch`, or
`filename in multipart` errors from the device.

1. **Two parts only**, in this exact order:
   1. `application/json` with `name="json"; filename="cmd.json"` and a per-part
      `Content-Length: <jsonLen>` header. Body is the minified JSON command.
   2. `application/octet-stream` with `name="<arbitrary>"; filename="<file_name>"`
      and a per-part `Content-Length: <fileLen>` header. Body is the file bytes.
2. Use **CRLF (`\r\n`) line endings everywhere**.
3. `Content-Type` header value: `multipart/form-data; boundary=<boundary>` —
   **never quote the boundary**. The on-wire delimiter is `--<boundary>` and
   parsing reads it from the first body line up to `\r`.
4. Close with `\r\n--<boundary>--\r\n`.
5. **Single file per request.** When you need to ship multiple element bitmaps,
   pack them as one `clock_bg.tar.gz` (USTAR + gzip) — see next section.
6. The HTTP request must carry an outer `Content-Length` matching the full body
   length.

Reference byte layout:

```
--BOUNDARY\r\n
Content-Disposition: form-data; name="json"; filename="cmd.json"\r\n
Content-Type: application/json\r\n
Content-Length: <jsonLen>\r\n\r\n
<minified JSON>
\r\n
--BOUNDARY\r\n
Content-Disposition: form-data; name="<ts>"; filename="<file_name>"\r\n
Content-Type: application/octet-stream\r\n
Content-Length: <fileLen>\r\n\r\n
<file bytes>
\r\n--BOUNDARY--\r\n
```

`<file_name>` is the leaf written under `/userdata/app_pic/<file_name>`. Use
`clock_bg.jpg` / `clock_bg.webp` for single-image dial uploads, and
`clock_bg.tar.gz` for bundled element packs.

### Firmware note (`divoom_http_server_upload_get_file_info`)

Per-part `Content-Length` on **each** multipart segment is what the parser keys
off today. **`FormData` in browsers** often omits those headers (boundary-only
framing). Firmware is gaining boundary-terminated fallback without per-part
lengths and correcting how the reader jumps from the JSON segment to file
bytes; **clients should still send explicit per-part lengths** for predictable
behavior.

**传输文件打包要求：** 固件在 `divoom_http_server_upload_get_file_info` 中要求每个文件段必须有 `Content-Length`，而浏览器 `FormData` 通常只使用 boundary 分隔、不包含每段 `Content-Length`。正在实现固件在无 `Content-Length` 时用 boundary 终止解析，并修复 JSON 段之后定位文件数据的指针计算；编辑器侧改为手动构造带 `Content-Length` 的 multipart 以提高兼容性。

## DialAssets: single image vs tarball

JSON commands `Device/CreateLocalClock` and `Device/PatchLocalClockInfo` choose
the second-part shape via `DialAssets` (or legacy `UseDialAssetBundle`):

| `DialAssets` | When to use | Second-part filename | Second-part body |
|--------------|-------------|----------------------|------------------|
| `image` | `ItemList[i].image_addr` is empty / already an `http(s)` URL for **every** item; only the dial backdrop is uploaded. | `clock_bg.jpg` (or `.webp`) | The dial JPEG / WebP |
| `bundle` | At least one `ItemList[i].image_addr` is a local leaf name (e.g. `44465.bin`, `weather_set.png`, `pointer.gif`). All such files must travel with the request. | `clock_bg.tar.gz` | gzip-compressed USTAR archive (see below) |

Decision logic the editor follows (recommended for any agent):

```
leaves = unique(basename(item.image_addr))
        for each item where image_addr is non-empty
        and not a http(s) URL
if leaves is empty: DialAssets="image"
else:               DialAssets="bundle"
```

### Bundle (`clock_bg.tar.gz`) layout

- Compression: gzip; archive: USTAR (`magic="ustar\0"`, `version="00"`,
  `typeflag='0'` for files).
- Required (CREATE) / strongly recommended (PATCH): `clock_bg.jpg` **or**
  `clock_bg.webp` placed at the root of the archive.
  - `wf_bundle_find_clock_bg` accepts the tar with no `clock_bg.*` **only** in
    PATCH when at least one `ItemPatchList[].patch.bundle_image` is set.
- For each `ItemList[i].image_addr` (CREATE) or `ItemPatchList[i].patch.bundle_image`
  (PATCH) that points to a leaf name, the archive must contain a file with that
  exact basename at the archive root.
- Leaf basenames are limited to 95 chars + NUL.
- Do not nest folders inside the tar; do not include `..` or absolute paths.
- Skip leaves that are `clock_bg.*` (those are the dial itself) and skip
  `image_addr` values that are already an `http(s)` URL (device-hosted assets).

Example tar contents for an `ItemList` referencing `44465.bin` and `weather.gif`:

```
clock_bg.jpg
44465.bin
weather.gif
```

## ItemList / ItemIdList JSON requirements

Validation lives in `wf_unpack_disp_items` (firmware
`divoom_watchface_local_api.c`). Each `ItemList[i]` object must include all of:

- Numbers: `disp`, `font`, `x`, `y`, `w`, `h`, `size`, `alig`
- Strings (non-empty): `color_1` (`#RRGGBB`), `color_2` (`#RRGGBB`), `item_id`

Other recognized keys: `sep`, `image_id`, `image_addr`, `animation`, `angle`,
`hier`, `transp`, and (bundle only) `bundle_image`.

**Analog pointer slots (`DIVOOM_CLOCK_DISP_SUPPORT_*_POINT_IMAGE` — **`disp` 131 / 132 / 233**,
editor **`HOUR_POINT_IMAGE` / `MIN_POINT_IMAGE` / `SECOND_POINT_IMAGE`):** **Mandatory:** one shared **square**
layer (**`w == h`**) for hour/minute/second — identical **`x,y,w,h`** on all three rows — center pivot rotation (hand painted at bitmap center, toward **12 o'clock**). Bitmap size **`w`×`w`**. Do **not** use mismatched skinny rectangles or a full **`800×1280`** hand sprite. Reference export **`ClockId 60012`** (`clock60012.cfg`). See **`docs/disp-usage.md`** / **`docs/tool-examples.md` §5b**.

**`transp`:** Use **`100`** for every layer that must be visible. **AI generators often emit `0`, which makes the layer invisible on-device** (looks like bad coordinates).

**`hier`:** Only **`0`** (auto), **`1`** (bottom / drawn first), **`2`** (top / drawn last). **No `hier: 3+`.** Typical analog clock: hour **`1`**, minute **`0`**, second **`2`**.

**Image / net-gallery slots (`NET_PIC` family):** In one dial, **do not duplicate the same
`disp`** for asset-backed image slots — firmware tends to keep **only the last row**, overwriting
earlier ones. Especially **`disp` 13 (`NET_PIC`)**, **`125–130` (`NET5_PIC` … `NET10_PIC`)**, and
**`173–175` (`NET2_PIC` … `NET4_PIC`)** (`DIVOOM_CLOCK_DISP_SUPPORT_NET*_PIC`): **at most one row each**.
See `docs/disp-usage.md` (Chinese) for the full table.

`ItemIdList` is a parallel array of strings; each entry **must be non-empty**
and is conventionally the same string as the matching `item_id` (e.g.
`"item_1"`, `"time_main"`). Empty strings on either side cause
`ItemList[i]: missing or empty string "item_id"`.

### `alig` values (firmware-native)

- `3` = center
- `4` = left
- `5` = right

These are what the device persists; older third-party tools that emit `1`/`2`
should be normalized before sending (the editor's `normalizeAligToDevice`
helper does this on import).

### `ItemPatchList[].patch` field whitelist (PATCH only)

`wf_apply_item_patch` reads the following keys; other keys in `patch.*` are
silently ignored:

- Numbers: `size`, `size_delta`, `x`, `y`, `w`, `h`, `disp`, `alig`, `sep`,
  `font`, `image_id`, `angle`, `hier`, `transp`, `animation`
- Strings: `image_addr`, `item_id`, `color_1`, `color_2`, and `bundle_image`
  (leaf inside `clock_bg.tar.gz`; multipart only)

> Recommended: omit `item_id` from PATCH unless explicitly renaming a slot.
> The HTML editor diffs only the fields above and never sends `item_id` in
> patches.

## Image format constraints

Dial backdrop (`clock_bg.jpg` / `clock_bg.webp`, validated by
`divoom_watchface_replace_clock_dial_bg_validate_saved_file`):

- JPEG (`FF D8`) or WebP (`RIFF…WEBP`) only — PNG and GIF are rejected.
- Resolution: exactly `800x1280` (portrait).
- Size: below `500 KiB` (`DIVOOM_REPLACE_DIAL_BG_MAX_FILE_BYTES = 500 * 1024`).

Element slots inside the tar.gz (leaves referenced by
`ItemList[i].image_addr` / `ItemPatchList[i].patch.bundle_image`, validated by
`wf_validate_bundle_slot_image_file`):

- JPEG / WebP / PNG (`89 50 4E 47 0D 0A 1A 0A`) accepted.
- Same per-leaf size cap as the dial backdrop.
- GIF / BMP / TIFF and other formats are rejected — clients must transcode to
  one of the three supported formats before packing (animated GIF loses
  animation; only the first frame survives).

Outer transport:

- The full `tar.gz` body must fit the device upload buffer
  (`Content-Length` < `100 * 1024 * 1024`).

## Endpoint cheatsheet

### `POST /divoom_api`

- JSON-only fast path. Use it for everything that doesn't ship file bytes:
  `Device/GetLocalClockInfo`, `Device/PatchLocalClockInfo` (when only fields
  change), `Channel/SetClockSelectId`, `Sys/GetBrightness`,
  `Channel/SetBrightness`, `Channel/OnOffScreen`,
  `Device/GetLocalFontList`, `Device/GetStoreClockMarketList`,
  `Device/ResetLocalClockFromServer` (destructive), and any
  `watchface_raw_command` wrapper.

### `POST /create_local_clock`

- First JSON part: `Device/CreateLocalClock` with `ClockName`, `ItemList`,
  `ItemIdList`, optional `DialAssets` (`auto` | `image` | `bundle`) or legacy
  `UseDialAssetBundle` (0=image, !0=bundle).
- Second part: dial JPEG/WebP, or `clock_bg.tar.gz` per the rules above.
- Successful response includes the new `ClockId`.

### `POST /patch_local_clock`

- First JSON part: `Device/PatchLocalClockInfo` with `ClockId` /
  `UseCurrentDisplayClock`, plus `ItemPatchList` and/or `ItemPatchByRoleList`.
  Same `DialAssets` semantics as create.
- Second part may be omitted entirely if no asset bytes change — in that case
  prefer `POST /divoom_api` (no multipart overhead).
- A `tar.gz` may omit `clock_bg.*` only when at least one
  `ItemPatchList[].patch.bundle_image` is provided.

### `POST /replace_clock_dial_bg`

- First JSON part: `Device/ReplaceClockDialBgFile` with `ClockId` or
  `UseCurrentDisplayClock`.
- Second part: dial JPEG/WebP only (no tarball, no PNG).
- Replaces the cached bitmap only; cfg `DeviceImageUrl` is NOT updated.

### `POST /upload`

- Generic upload that lets `DeviceImageUrl` reference the file later via
  `Device/PatchLocalClockInfo`.
- First JSON part: product-specific metadata (e.g. photo album upload).
- Second part: a single file. Use multiple `/upload` calls for multiple files.

## Sunrise / sunset behavior (for `disp = 204`)

`DIVOOM_CLOCK_DISP_SUPPORT_SUNRISE_SUNSET_TIME` no longer toggles back-and-forth
on each tick. The current firmware logic
(`divoom_disp_clock.c`, case 9061):

- When `cur_time` is between today's sunrise and sunset (inclusive), show the
  **sunset** time only.
- Otherwise, show the **next applicable sunrise** (rolls to next day after
  sunset).

UI hint: agents and editors should describe this slot as "sunrise OR sunset
(auto-switch by current time)" rather than "sunrise/sunset toggle".

## Notes

- Store list can be empty before prefetch completes.
- `ClockId >= 100000` usually indicates photo/album class dials.
- `ResetLocalClockFromServer` deletes local sys-side files first.
- After write, always re-read with `Device/GetLocalClockInfo` to verify the
  device state matches expectations.
