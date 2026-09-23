# Core Tool Examples

This document shows MCP parameters for patching, selecting, changing brightness, creating a watchface, updating assets, replacing a backdrop, and uploading AstroToo files individually.

## 1. Increase the time font and change it to red

Tool: `watchface_patch_local`

```json
{
  "useCurrentDisplayClock": true,
  "itemPatchByRoleList": [
    {
      "role": "clock_time_font",
      "patch": {
        "size_delta": 2,
        "color_1": "#FF0000"
      }
    }
  ]
}
```

`size_delta` is applied to the current `size`. Call `watchface_get_local` immediately afterward to verify the committed value.

## 2. Select a watchface by ClockId

Tool: `watchface_set_clock_select`

```json
{
  "clockId": 17
}
```

Query `watchface_clock_catalog` for the current product before selecting an ID. This prevents ClockId, font, or element semantics from another product from entering the request:

```json
{
  "target": { "host": "192.168.13.142", "port": 9000 },
  "nameContains": "NBA",
  "defaultOnly": true,
  "limit": 10,
  "includeConfig": false
}
```

To inspect the original AstroToo configuration for a known watchface, pass `clockIds:[101]` with `includeConfig:true`. `watchface_get_store_market_list` remains the tool for reading market entries already cached by the device.

## 3. Change brightness

Tool: `watchface_set_brightness`

```json
{
  "brightness": 60
}
```

Use `watchface_get_brightness` to read the current value.

## 4. Create a local watchface with a backdrop only

Tool: `watchface_create_local_clock`

```json
{
  "imagePath": "C:/images/new_dial_bg.jpg",
  "metadata": {
    "ClockName": "AI Demo Clock",
    "DialAssets": "image",
    "ItemList": [
      {
        "disp": 5,
        "x": 100,
        "y": 120,
        "w": 300,
        "h": 80,
        "size": 28,
        "alig": 3,
        "sep": 0,
        "font": 1,
        "color_1": "#FFFFFF",
        "color_2": "#000000",
        "item_id": "time_main"
      }
    ],
    "ItemIdList": ["time_main"]
  }
}
```

Rules:

- The tool adds `Command=Device/CreateLocalClock` and `ReturnCode=0`.
- A TimesFrame backdrop must be an 800×1280 JPEG/WebP file, not PNG, and should be smaller than 512000 bytes. Element files referenced by `ItemList[i].image_addr` inside tar.gz may be JPEG, WebP, or PNG; firmware validates their magic bytes with `wf_validate_bundle_slot_image_file`.
- Query available font IDs with `watchface_get_fonts_local`.
- Every `item_id` must be a non-empty string because firmware applies `NEED_STR("item_id")`. Every `ItemIdList` entry must also be non-empty and normally matches the corresponding `item_id`.
- Use only one row for each image-related `disp` in a watchface. When duplicate rows exist, the later row replaces the earlier one. This is especially relevant to network-gallery values 13, 125–130, and 173–175 (`DIVOOM_CLOCK_DISP_SUPPORT_NET*_PIC`). See the image-element uniqueness section in `docs/disp-usage.md`.

## 5. Create a TimesFrame watchface with bundled element images

When a TimesFrame watchface needs several element images, such as icons, pointer images, or bitmap digits, package the element files and `clock_bg.jpg` in one `clock_bg.tar.gz` using USTAR plus gzip. Each leaf name must exactly match its `ItemList[i].image_addr`.

Tool: `watchface_create_local_clock`

```json
{
  "imagePath": "C:/build/clock_bg.tar.gz",
  "metadata": {
    "ClockName": "AI Bundle Demo",
    "DialAssets": "bundle",
    "ItemList": [
      {
        "disp": 4,
        "x": 50,
        "y": 174,
        "w": 700,
        "h": 306,
        "size": 280,
        "alig": 3,
        "sep": 0,
        "font": 24,
        "color_1": "#47ede9",
        "color_2": "#ff0000",
        "item_id": "time_main"
      },
      {
        "disp": 240,
        "x": 431,
        "y": 530,
        "w": 250,
        "h": 250,
        "size": 0,
        "alig": 4,
        "sep": 0,
        "font": 6,
        "color_1": "#ffffff",
        "color_2": "#ff0000",
        "image_addr": "weather_pack.bin",
        "item_id": "weather_anim"
      }
    ],
    "ItemIdList": ["time_main", "weather_anim"]
  }
}
```

Archive contents:

```text
clock_bg.jpg
weather_pack.bin
```

Rules:

- With `DialAssets:"bundle"`, the second multipart part must use the file name `clock_bg.tar.gz`. Firmware uses that name to choose extraction into `/userdata/app_pic/`.
- Do not send element files as separate multipart parts. Firmware accepts one file per request.
- An `image_addr` that is already an `http://` or `https://` URL does not need a corresponding archive member.
- Do not create archive subdirectories or use relative or absolute paths. Each leaf name must be at most 95 bytes.
- Do not duplicate image slots with the same `disp`; the later row replaces the earlier one.

## 5b. Analog pointer images

The firmware constants are:

- `DIVOOM_CLOCK_DISP_SUPPORT_HOUR_POINT_IMAGE` = 131
- `DIVOOM_CLOCK_DISP_SUPPORT_MIN_POINT_IMAGE` = 132
- `DIVOOM_CLOCK_DISP_SUPPORT_SECOND_POINT_IMAGE` = 233

These slots use `image_addr` with TimesFrame `clock_bg.tar.gz` element files, but their geometry differs from a full-screen image:

1. All three pointer entries must use exactly the same `x`, `y`, `w`, and `h`, with `w = h`. Each pointer image must be a `w`×`w` canvas. Draw the pointer from the exact center toward 12 o'clock so firmware can rotate the layer around its center. Do not use three unrelated narrow rectangles or an 800×1280 full-screen pointer image. Device export ClockId 60012 is a known example in which all pointers share the same square layer.
2. Center the square layer on the physical pivot of the dial. Common side lengths range from 180 to 600 pixels; `watchface_disp_catalog` exposes template medians under `typography.box`.
3. Each PNG, WebP, or JPEG pointer asset must have the exact `w`×`h` dimensions declared by its entry.
4. `hier` has three valid levels: 0 for automatic order, 1 for the bottom layer, and 2 for the top layer. A common layout uses `hier:1` for the hour hand, `hier:2` for the second hand, and `hier:0` for the minute hand. Verify final ordering on the physical device.
5. `transp` represents visible opacity. Set `transp:100` for a visible pointer or image. A generated default of 0 makes the element invisible.
6. Most published templates use `alig:4` (left). For a dial centered on the canvas, `alig:3` also works with `x = cx - w/2` and `y = cy - h/2`. Verify geometry on the physical device.

To repair pointer geometry, prepare a new TimesFrame `clock_bg.tar.gz`, optionally with an updated `clock_bg.jpg`, pass it as `dialAssetsPath` to `watchface_patch_local`, and set `bundle_image` plus the matching `image_addr` in `ItemPatchList[].patch`.

`scripts/gen_ocean_analog_dial_assets.py` is a reference generator for an ocean backdrop and square pointer assets.

## 6. Patch a TimesFrame backdrop or element image

Tool: `watchface_patch_local` with `dialAssetsPath`

```json
{
  "clockId": 60006,
  "dialAssetsPath": "C:/build/patch_assets.tar.gz",
  "metadata": {
    "DialAssets": "bundle",
    "ItemPatchList": [
      {
        "index": 5,
        "patch": {
          "image_addr": "weather_pack_v2.bin",
          "bundle_image": "weather_pack_v2.bin"
        }
      }
    ]
  }
}
```

The archive contains each referenced leaf. It may omit `clock_bg.*` when at least one `ItemPatchList[].patch.bundle_image` points to an existing archive member.

Do not include `item_id` in `patch.*`. Otherwise a client-side value can replace the device's meaningful identifier, such as `time_main`, and break menu or configuration relationships. Send `item_id` only when intentionally renaming a slot.

## 6b. Patch fields without uploading files

For size, position, color, and other field-only changes, omit multipart and send JSON through `POST /divoom_api`.

Tool: `watchface_patch_local` without `dialAssetsPath`

```json
{
  "clockId": 60006,
  "itemPatchList": [
    { "index": 0, "patch": { "size": 320 } },
    { "index": 0, "patch": { "color_1": "#ffaa00" } },
    { "index": 3, "patch": { "x": 240, "y": 720 } }
  ]
}
```

Send only changed fields. The quick reference lists the `wf_apply_item_patch` allowlist. Alignment values are 3 for center, 4 for left, and 5 for right. Keep `item_id` out of `patch.*`. The tool performs a `Device/GetLocalClockInfo` precheck and rejects the write when `ItemList` is empty.

## 7. Replace only the backdrop

Tool: `watchface_replace_dial_bg_file`

```json
{
  "useCurrentDisplayClock": true,
  "imagePath": "C:/images/replace_bg.jpg"
}
```

This replaces the decoded cache without changing the URL field in the configuration. `/replace_clock_dial_bg` accepts one JPEG/WebP file as the second multipart part and does not accept tar.gz.

## 8. Create an AstroToo watchface after sequential asset uploads

First identify the product and verify local persistence:

```json
{
  "target": {
    "host": "192.168.13.142",
    "port": 9000,
    "model": "auto"
  }
}
```

Call `watchface_get_device_info`. The result must contain `model:"astrotoo"`, `hardware:530`, and `capabilities.LocalOnly:true`.

Call `watchface_upload_file` once for each pointer or icon, keeping the calls sequential:

```json
{
  "target": { "host": "192.168.13.142", "port": 9000 },
  "filePath": "C:/watchface/hour.png",
  "fileName": "hour.png",
  "metadata": {}
}
```

Upload `hour.png`, `minute.png`, and `second.png` in order. Read the `local://...` reference from `responseJson.FileId` after each call. Put each returned value in the matching entry's `image_addr`, then call `watchface_create_local_clock`:

```json
{
  "target": { "host": "192.168.13.142", "port": 9000 },
  "imagePath": "C:/watchface/clock_bg.webp",
  "fileName": "clock_bg.webp",
  "metadata": {
    "ClockName": "Spring Analog Watchface",
    "DialAssets": "image",
    "ItemIdList": ["hour", "minute", "second", "date"],
    "ItemList": [
      {
        "item_id": "hour",
        "disp": 131,
        "font": 0,
        "x": 40,
        "y": 40,
        "w": 400,
        "h": 400,
        "size": 0,
        "alig": 3,
        "sep": 0,
        "hier": 1,
        "transp": 100,
        "image_addr": "local://value-from-hour-upload",
        "color_1": "#FFFFFF",
        "color_2": "#000000"
      }
    ]
  }
}
```

The abbreviated `ItemList` shows one pointer structure. The submitted configuration must contain every entry referenced by `ItemIdList`. A complete three-pointer and date example is in `artifacts/astrotoo-spring-watchface/create-payload.json`; the end-to-end MCP example is `artifacts/astrotoo-spring-watchface/create-via-mcp.mjs`.

AstroToo rejects TAR, TGZ, and ZIP. A `local://...` value is a temporary transfer reference on that device. After a successful create or patch, firmware moves bound assets into the persistent watchface directory. Unbound assets are removed on reboot and are never sent to an external server. The MCP server blocks generic TimesFrame `/upload`; files supplied to TimesFrame create or patch operations are likewise temporary device-side inputs for that operation only.
