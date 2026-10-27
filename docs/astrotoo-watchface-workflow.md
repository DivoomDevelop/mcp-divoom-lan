# AstroToo Watchface Workflow

This workflow is intended for MCP clients that create or update an AstroToo watchface over the local network. Users never need to know or provide the numeric managed-slot ID, and no device token is required.

## Prerequisites

- The MCP host and AstroToo must be reachable on the same LAN.
- Use port `9000` unless the device is configured differently.
- Keep product detection on `auto`.
- Backdrops must be 480×480 JPEG or WebP files smaller than 500 KiB.
- AstroToo does not accept TAR, TGZ, or ZIP watchface bundles.

Call `watchface_list_devices` first and choose an AstroToo entry (Hardware 530) for this workflow. The list also includes supported TimesFrame, PIXOO64 and TimeGate devices. Use the selected target object on every later call:

```json
{
  "target": {
    "host": "192.168.1.120",
    "port": 9000,
    "model": "auto",
    "timeoutMs": 45000
  }
}
```

## 1. Discover and identify the device

Call `watchface_list_devices`, let the user choose `devices[].label`, then call `watchface_get_device_info` with the selected `devices[].target`. Continue only when the response reports:

- `model: "astrotoo"`
- `hardware: 530`
- `canvas.width: 480` and `canvas.height: 480`
- `capabilities.LocalOnly: true`
- `capabilities.AssetTransfer: "sequential"`

The server reads `Device/GetHardwareVersion` for the current target. It does not identify a product from `DeviceType` or from a previous device call. A command with no response falls back to TimesFrame, so AstroToo authoring continues only after Hardware 530 is returned explicitly.

## 2. Select product-specific authoring data

Before building `ItemList`, query the AstroToo catalogs instead of reusing TimesFrame IDs:

1. `watchface_clock_catalog` for native clock names, IDs, and configurations.
2. `watchface_disp_catalog` for AstroToo display-element semantics.
3. `watchface_font_catalog` for AstroToo font names.
4. `watchface_get_fonts_local` for fonts actually installed on this device.
5. `watchface_template_search` and `watchface_layout_suggest` for a 480×480 starting layout.

The following text elements were verified on AstroToo hardware 530:

| Content | `disp` |
|---|---:|
| Hour and minute | 4 |
| English month and day | 39 |
| English weekday | 37 |
| Weather text | 54 |
| Current temperature | 254 |
| Daily low-to-high temperature | 157 |

Use the catalogs as the source of truth because future firmware and products can expose different element sets.

## 3. Create or fully replace the managed watchface

Call `watchface_create_local_clock` with one backdrop and a complete configuration, omitting `ClockId`. The tool injects and reads its managed slot, creates it when missing, and updates it when present.

```json
{
  "target": { "host": "192.168.1.120", "port": 9000 },
  "imagePath": "C:/watchface/clock_bg.webp",
  "fileName": "clock_bg.webp",
  "metadata": {
    "ClockName": "Spring Cat Weather",
    "NameCn": "Spring Cat Weather",
    "NameEn": "Spring Cat Weather",
    "DialAssets": "image",
    "ItemIdList": [
      "time",
      "date",
      "weekday",
      "weather",
      "temperature",
      "temperature_range"
    ],
    "ItemList": [
      {
        "item_id": "time",
        "disp": 4,
        "font": 28,
        "x": 18,
        "y": 18,
        "w": 292,
        "h": 94,
        "size": 78,
        "alig": 4,
        "sep": 0,
        "angle": 0,
        "hier": 2,
        "transp": 100,
        "animation": 0,
        "image_id": 0,
        "image_addr": "",
        "color_1": "#D7FBFF",
        "color_2": "#163B46"
      }
    ]
  }
}
```

The abbreviated `ItemList` above shows one row. A real request must include every row named by `ItemIdList` in the same order.

## 4. Update an existing watchface

For coordinates, sizes, fonts, or colors, call `watchface_patch_local` with only the changed fields:

```json
{
  "target": { "host": "192.168.1.120", "port": 9000 },
  "itemPatchList": [
    {
      "index": 0,
      "patch": {
        "size": 78,
        "color_1": "#D7FBFF"
      }
    }
  ]
}
```

Do not put `item_id` inside `patch`. The tool injects and pre-reads its managed slot and refuses an unsafe write when the configuration is missing or empty.

To replace only the backdrop while keeping the existing configuration, call `watchface_patch_local` with `dialAssetsPath`:

```json
{
  "target": { "host": "192.168.1.120", "port": 9000 },
  "dialAssetsPath": "C:/watchface/new_clock_bg.webp",
  "fileName": "clock_bg.webp"
}
```

Use the complete upsert in step 3 when the name, full row table, and backdrop must change together.

## 5. Add image elements

Upload every pointer, icon, or other element file separately with `watchface_upload_file`. Keep the calls sequential. Read `responseJson.FileId` from each response and place the returned `local://...` value in the matching row's `image_addr` before the create or patch call.

An uploaded reference is temporary until a successful create or patch binds it. Unbound staging files are removed on reboot. The MCP LAN workflow does not upload received files to the cloud.

## 6. Display and verify

After a successful create or update:

1. The MCP client selects the internal managed slot.
2. The MCP client reads the same slot and compares the committed rows.
3. Call `watchface_get_screen_snapshot` and inspect the returned image.

Do not retry a timed-out write automatically. Read the managed slot first because the device might have committed the request before the client timed out.

## Verified AstroToo smoke test

The release workflow was exercised on 2026-10-16 with AstroToo hardware 530 and firmware 530055:

- created a missing `ClockId 60000` watchface;
- updated six text elements through `watchface_patch_local`;
- replaced the backdrop with a 480×480 WebP file;
- selected `ClockId 60000`;
- read back the committed configuration;
- downloaded and visually checked the BMP snapshot.

This is a compatibility data point, not a firmware requirement. Runtime capability detection remains authoritative.

## Suggested prompts for an MCP client

- `Identify the device first, then create a 480x480 AstroToo weather watchface and verify it with a screenshot.`
- `Increase the displayed time size, change its color, write only those fields, then read back and capture a screenshot.`
- `Keep every current element, replace only the AstroToo backdrop with this WebP file, display the result, and verify it.`
