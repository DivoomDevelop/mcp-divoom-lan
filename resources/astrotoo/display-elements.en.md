# AstroToo Display Elements

This document explains how the MCP server discovers, classifies, and safely uses AstroToo watchface display elements. It applies to Hardware 530 and the 480×480 canvas. TimesFrame element IDs, fonts, and coordinates are independent.

## Source and coverage

The generated data combines:

- positive numeric display declarations from `src/divoom_light/include/divoom_disp_clock.h`;
- direct and alias references found in the AstroToo renderer C sources;
- component positions accepted by the renderer range `261 <= disp < 280`;
- 1,096 bundled and server-fallback AstroToo watchface configurations.

The current catalog contains 522 IDs. Of these, 481 have direct renderer-symbol evidence, one is reached through an enum alias, 18 are range-backed component positions, and 22 are header declarations without a direct renderer reference. Reference configurations use 227 IDs; 295 IDs have no loaded configuration example.

Use these MCP resources:

- `divoom://astrotoo/disp/summary`: counts, category totals, common elements, and authoring requirements.
- `divoom://astrotoo/disp/catalog`: the complete per-ID metadata.
- `divoom://astrotoo/clocks/catalog`: compact watchface metadata and example ClockIds.
- `divoom://astrotoo/clocks/configs`: full native configurations for copying proven element groups.
- `divoom://astrotoo/watchface/schema`: IDs accepted for MCP-authored configurations.

## Catalog fields

| Field | Meaning |
|---|---|
| `disp` | AstroToo element ID used in `ItemList[].disp`. |
| `name` | Firmware symbol without the common prefix. |
| `description_en` / `description_zh` | English generated label and original Chinese source comment. |
| `category` | Functional group such as `time`, `weather`, `analog`, or `calendar`. |
| `renderKind` | `text`, `image`, `animation`, `analog_hand`, `composite`, or `system`. |
| `dataSource` | Runtime producer such as device time, weather service, calendar service, or local media. |
| `assetRequirement` | Whether the row uses a font, local asset, service/firmware asset, or firmware-managed composite. |
| `implementationEvidence` | `direct_symbol`, `alias_symbol`, `renderer_range`, or `declaration_only`. |
| `authoringMode` | `direct`, `component_reference`, `declared_only`, or `firmware_internal`. |
| `usage` | Reference configuration count, proof flag, and example ClockIds. |

`declaration_only` records are kept for completeness but are excluded from the authoring JSON Schema. Do not generate them without device-side proof. An implemented element with `usedInReferenceConfigs=false` also needs hardware validation because no proven layout or supporting-field example is available.

## Functional categories

| Category | IDs | Typical content |
|---|---:|---|
| `weather` | 82 | Weather icons, temperature, humidity, wind, air quality, sunrise/sunset, and forecasts. |
| `photo_video` | 71 | Photos, WebP/GIF/video, pixel dials, galleries, and animation rows. |
| `app_data` | 58 | App titles, names, data columns, and application payload fields. |
| `date` | 54 | Day, month, year, weekday, and combined date formats. |
| `time` | 45 | Hours, minutes, seconds, AM/PM, time zones, and digit fields. |
| `text` | 44 | User text, messages, sentences, and configurable text areas. |
| `calendar` | 35 | Calendar grids, events, schedules, activities, and to-do items. |
| `lunar_culture` | 25 | Chinese lunar calendar, solar terms, festivals, and cultural data. |
| `component` | 24 | Linked sub-watchfaces, dynamic components, and special dial items. |
| `countdown` | 23 | Countdown, count-up, anniversary, and holiday counters. |
| `image` | 15 | General firmware or local image slots. |
| `network` | 11 | Network galleries, RSS, and web content. |
| `music` | 10 | Track data, singer, lyrics, and audio visualizers. |
| `system_status` | 6 | Wi-Fi, battery, volume, alarm, and work-mode status. |
| `analog` | 5 | Hour, minute, second, and world-clock hands. |
| `ai_dynamic` | 4 | AI text, emoji, background, and dynamic content. |
| `environment` | 4 | Device environment or sensor values such as noise. |
| `finance` | 4 | Stock, exchange, and finance trend displays. |
| `system_control` | 2 | Internal renderer control elements; never author directly. |

## Authoring requirements

1. Detect Hardware first with `watchface_get_device_info`; use this catalog only when Hardware 530 selects AstroToo.
2. Query `watchface_disp_catalog` and prefer `usage.usedInReferenceConfigs=true`.
3. Load one of the reported `usage.exampleClockIds` through `watchface_clock_catalog` with `includeConfig:true`, or read it from the full configuration resource.
4. Copy complete related families instead of isolated rows. Forecast columns, calendar composites, image sequences, time-digit images, and app-data columns often depend on sibling elements.
5. Confirm the element's `dataSource`. Layout JSON cannot create weather, calendar, music, finance, AI, app, or network data when the corresponding runtime provider is absent.
6. Upload each required local element image separately with `watchface_upload_file`, bind the returned `local://` reference, and commit it through the fixed ClockId 60000 create/patch flow.
7. Read back the configuration and capture a new snapshot after writing.

## Important element families

- Analog hands: `131 HOUR_POINT_IMAGE`, `132 MIN_POINT_IMAGE`, and `233 SECOND_POINT_IMAGE`. Use matching square transparent images pointing upward, a shared center pivot, and correct layer order.
- Sunrise and sunset: `176 SUNRISE_TIME` and `177 SUNSET_TIME`. Older extraction logic missed them because their symbols omit the `SUPPORT_` segment.
- Components: `261–279` are linked component positions. Preserve the native `item_id` and component ClockId binding. `280 DAIL_COMPONENT_END_ID` is the exclusive range boundary and cannot be authored.
- Full-screen lyrics: `538 FULL_SCREEN_LYRICS` is an audio-service composite with native reference configurations. It is not a generic static text row.
- Upload progress: `1000 HTTP_UPLOAD_PROGRESS` is firmware-internal and cannot be authored.

## Query examples

Find proven weather images:

```json
{
  "model": "astrotoo",
  "category": "weather",
  "renderKind": "image",
  "usedInReferenceConfigs": true,
  "limit": 100
}
```

Inspect analog hands and full-screen lyrics:

```json
{
  "model": "astrotoo",
  "ids": [131, 132, 233, 538],
  "limit": 20
}
```

The resource generator is `scripts/build-astrotoo-resources.mjs`. Regeneration requires `DIVOOM_ASTROTOO_SIMULATOR_ROOT`; `DIVOOM_ASTROTOO_DEVICE_ID` defaults to reference device `300400436`.
