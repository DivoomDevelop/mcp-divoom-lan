# Guide Key Points (EN)

This page summarizes the most important operational rules for LAN watchface
customization. All wire-format requirements come from the device firmware
(`divoom_app/src/app/divoom_http_server.c`,
`divoom_app/src/middle/divoom_watchface_local_api.c`).

## Transport rules

- Always `POST` to `/divoom_api` with JSON body.
- Never use HTTP `GET` for `/divoom_api`.
- Root request must include `ReturnCode: 0`.
- Command strings are case-sensitive.

## Read-before-write workflow

1. `Device/GetLocalClockInfo`
2. validate editable context (`ItemList` must not be empty)
3. `Device/PatchLocalClockInfo` with minimal patch
4. `Device/GetLocalClockInfo` again for verification

## PATCH path selection (strongly recommended)

The firmware accepts two PATCH semantics; choosing the wrong one will
corrupt the dial:

| Editor change | Recommended path | Endpoint | JSON | Second part |
|---|---|---|---|---|
| Tweak size/position/color only | **field-level patches** | `POST /divoom_api` | `ItemPatchList[].{index, patch}` with diffs only | none |
| User picked a NEW element image (file picker / drag-drop) | **field-level patches + bundle** | `POST /patch_local_clock` multipart | `ItemPatchList[].patch.bundle_image: <leaf>` | tar.gz including the same leaf; optionally `clock_bg.jpg` |
| Only the dial background changed | field-level patches + image | `POST /patch_local_clock` multipart | `clockSel` (and optional `ItemPatchList`) | single `clock_bg.jpg` / `.webp` |
| Items added/removed (length changes) | full-table replace (fallback) | `POST /patch_local_clock` multipart | `ItemList` + `ItemIdList` (plus `ItemPatchList` if needed) | image or tar.gz depending on leaves |

**Anti-pattern**: doing a whole-table replace + tar.gz re-upload for a
plain "change one font size" edit. The device will overwrite the
original `item_id` strings (e.g. `time_main`) with the editor's
auto-generated `item_${i+1}`, breaking menu/config bindings; element
`.bin` files lacking `ItemPatchList[].patch.bundle_image` will be
extracted but never rebound.

## Explicit-only operations

- `watchface_create_local_clock` should run only when the user explicitly asks
  to create a new clock.
- Do not auto-create clocks for style/color patch requests.

## Multipart wire format (firmware-strict)

Applies to `/create_local_clock`, `/patch_local_clock`,
`/replace_clock_dial_bg`, `/upload`. Violations produce `missing JSON part`,
`missing file part`, `size mismatch` or `filename in multipart` errors.

1. **Exactly two parts** in this order: JSON first, file second.
2. **Part 1** headers: `Content-Disposition: form-data; name="json"; filename="cmd.json"`,
   `Content-Type: application/json`, **per-part `Content-Length: <jsonLen>`**.
   Body is the minified command JSON.
3. **Part 2** headers: `Content-Disposition: form-data; name="<arbitrary>"; filename="<file_name>"`,
   `Content-Type: application/octet-stream`, **per-part `Content-Length: <fileLen>`**.
   Body is the file bytes.
4. CRLF line endings. `Content-Type: multipart/form-data; boundary=<boundary>`
   with the boundary **unquoted**. Close with `\r\n--<boundary>--\r\n`.
5. **One file per request.** To ship multiple element bitmaps, pack them into
   a single `clock_bg.tar.gz` (USTAR + gzip).
6. The outer HTTP `Content-Length` must equal the full body size.

**Firmware parser (`divoom_http_server_upload_get_file_info`):** The device historically expects **per-part `Content-Length`** on every multipart segment; browser **`FormData`** often emits boundary-delimited parts **without** per-part lengths. Firmware work-in-progress adds boundary-terminated parsing when lengths are absent and fixes pointer math after the JSON part when locating file bytes; editors and MCP clients should **still send explicit per-part lengths** for compatibility.

`<file_name>` is what gets written to `/userdata/app_pic/`. Use
`clock_bg.jpg` / `clock_bg.webp` for image mode and
`clock_bg.tar.gz` for bundle mode.

## DialAssets: single image vs bundle

`Device/CreateLocalClock` and `Device/PatchLocalClockInfo` use `DialAssets`
(or legacy `UseDialAssetBundle`) to select the second-part shape:

| `DialAssets` | Use when | Second-part filename | Body |
|--------------|----------|----------------------|------|
| `image` | All `ItemList[i].image_addr` are empty or already an `http(s)` URL | `clock_bg.jpg` or `clock_bg.webp` | Single dial JPEG/WebP |
| `bundle` | Any `image_addr` is a local leaf name (e.g. `44465.bin`, `weather.gif`) | `clock_bg.tar.gz` | gzip-compressed USTAR archive |

Decision rule:

```
leaves = unique(basename(image_addr))
        for image_addr non-empty and not http(s)
DialAssets = "image" if leaves is empty else "bundle"
```

### `clock_bg.tar.gz` archive layout

- Compression: gzip; archive: USTAR (`magic="ustar\0"`, `version="00"`,
  `typeflag='0'`).
- Top-level `clock_bg.jpg` or `clock_bg.webp`:
  required for CREATE; for PATCH it may be omitted only when at least one
  `ItemPatchList[].patch.bundle_image` is set.
- For each leaf name referenced from `ItemList[i].image_addr` (CREATE) or
  `ItemPatchList[i].patch.bundle_image` (PATCH), the archive must contain a
  matching file at the root. No subdirectories, no relative paths.
- Leaf basenames are limited to 95 chars + NUL.
- Skip `clock_bg.*` (handled separately) and `http(s)` URLs (already hosted).

Example tar contents when `ItemList` references `44465.bin` and `weather.gif`:

```
clock_bg.jpg
44465.bin
weather.gif
```

## ItemList / ItemIdList rules

Validation in firmware `wf_unpack_disp_items`:

- Required numbers: `disp`, `font`, `x`, `y`, `w`, `h`, `size`, `alig`.
- Required non-empty strings: `color_1` (`#RRGGBB`), `color_2` (`#RRGGBB`),
  **`item_id`**.
- Other fields: `sep`, `image_id`, `image_addr`, `animation`, `angle`, `hier`,
  `transp`. In bundle mode, `bundle_image` per row.

`ItemIdList` is a parallel array of strings. Each entry **must be non-empty**
and is conventionally the same value as the matching `item_id`
(e.g. `"item_1"`, `"time_main"`). Empty strings cause
`ItemList[i]: missing or empty string "item_id"`.

### `transp` and `hier` (visibility / z-order — LLMs often fail here)

- **`transp`:** Treat as **on-screen visibility / opacity**. Anything that must **appear** needs **`transp: 100`**. **Many AI-generated payloads omit the field or set `0`, which makes the layer invisible on-device** — looks like broken coordinates when it is only transparency.
- **`hier`:** Only three levels — **`0`** automatic ordering, **`1`** **bottom** (painted first), **`2`** **top** (painted last, above others). **There is no `hier: 3`.** Typical analog clock: hour **`1`**, minute **`0`**, second **`2`**; tune on hardware.

### Analog pointer images (`disp` 131 / 132 / 233)

Firmware constants: **`DIVOOM_CLOCK_DISP_SUPPORT_HOUR_POINT_IMAGE` (131)**,
**`DIVOOM_CLOCK_DISP_SUPPORT_MIN_POINT_IMAGE` (132)**,
**`DIVOOM_CLOCK_DISP_SUPPORT_SECOND_POINT_IMAGE` (233)**.

- **Required:** all three rows share the **same square bbox** (**`w == h`**) and the **same** **`x,y,w,h`**; each bitmap is **`w`×`w`** with the **hand pivot at the square center** and the hand pointing to **12 o'clock** (center rotation). Do **not** use three different skinny rectangles or a full **`800×1280`** hand sprite.
- Reference export: **`ClockId 60012`** (e.g. `clock60012.cfg`). See **`docs/disp-usage.md`** and **`docs/tool-examples.md` §5b**.

### Image / net-gallery slot uniqueness

In a single dial **`ItemList`**, keep **at most one row per image-backed `disp`**.
Duplicate **`disp`** rows tend to behave as **last-write-wins**, overwriting earlier bindings.

The **network gallery** slots (`DIVOOM_CLOCK_DISP_SUPPORT_NET_PIC`, …) are the usual examples:
**`disp` 13** (`NET_PIC`), **`173–175`** (`NET2_PIC`–`NET4_PIC`), **`125–130`**
(`NET5_PIC`–`NET10_PIC`). Full table: **`docs/disp-usage.md`** (Chinese section
「图像元素唯一性（网络图库系列）」).

### `alig` values (firmware-native)

- `3` = center
- `4` = left
- `5` = right

Older third-party tools that emit `1`/`2` must be normalized first
(the editor's `normalizeAligToDevice` helper handles this on import).

### `ItemPatchList[].patch` field whitelist

`wf_apply_item_patch` recognizes only the fields below; other keys in
`patch.*` are silently ignored:

- Numbers: `size`, `size_delta`, `x`, `y`, `w`, `h`, `disp`, `alig`, `sep`,
  `font`, `image_id`, `angle`, `hier`, `transp`, `animation`
- Strings: `image_addr`, `item_id`, `color_1`, `color_2`, and (multipart only)
  `bundle_image`

> Do **not** put `item_id` inside `patch.*` unless explicitly renaming a slot.
> The HTML editor diffs only the editable fields and never sends `item_id` in
> patches.

## Image constraints

Dial background (`clock_bg.jpg` / `clock_bg.webp`, validated by
`divoom_watchface_replace_clock_dial_bg_validate_saved_file`):

- JPEG (`FF D8`) or WebP (`RIFF....WEBP`) only — PNG/GIF are rejected.
- Exactly `800x1280` portrait.
- Below ~`512000` bytes (`DIVOOM_REPLACE_DIAL_BG_MAX_FILE_BYTES`).

Element slots inside the tar.gz (leaf names referenced by
`ItemList[i].image_addr` / `ItemPatchList[i].patch.bundle_image`, validated by
`wf_validate_bundle_slot_image_file`):

- JPEG / WebP / PNG (`89 50 4E 47 0D 0A 1A 0A`) accepted.
- Same byte size cap as the dial background.
- GIF / BMP / TIFF and other formats are rejected; the client must transcode
  them to one of the three supported formats before packaging (animated GIF
  loses animation when transcoded — only the first frame survives).

Total `tar.gz` body must fit within the outer HTTP `Content-Length` limit
(firmware caps the upload buffer at 100 MiB).

## Display element 204 (sunrise / sunset)

`DIVOOM_CLOCK_DISP_SUPPORT_SUNRISE_SUNSET_TIME` no longer flips back and forth.
Current firmware behavior:

- When `cur_time` is between today's `[sunrise, sunset]` (inclusive) → show the
  **sunset** time only.
- Otherwise (night / pre-dawn) → show the next applicable **sunrise** (rolls
  to next day after sunset).

Describe this slot in UI as "sunrise OR sunset (auto-switch by current time)"
rather than "toggle".

## Risky commands

- `Device/ResetLocalClockFromServer` deletes local sys-side files first.
- `Channel/SetClockSelectId` immediately changes the active dial (this is the
  HTML editor's "Show watchface" button).
