# MCP Tool API

The server exposes 21 tools: 15 device tools and 6 offline or model-aware authoring tools. Every device tool first reads `Device/GetHardwareVersion` from the target. Hardware 510/511/512 selects TimesFrame; Hardware 530 selects AstroToo.

## Common target parameter

```json
{
  "target": {
    "host": "192.168.13.142",
    "port": 9000,
    "model": "auto",
    "timeoutMs": 45000
  }
}
```

Keep `model:"auto"` unless compatibility with legacy TimesFrame firmware requires an explicit model. Complete operations are serialized for the same `host:port`; different devices can run concurrently. When `target` is omitted, the server uses `DIVOOM_DEVICE_HOST`, `DIVOOM_DEVICE_PORT`, `DIVOOM_DEVICE_MODEL`, and `DIVOOM_TIMEOUT_MS`.

## Device tools (15)

| Tool | Product | Purpose |
|---|---|---|
| `watchface_get_device_info` | Both | Report Hardware, product model, canvas, LAN capabilities, and file policy. |
| `watchface_get_local` | Both | Read the current watchface or a specified `ClockId`. |
| `watchface_patch_local` | Both | Pre-read and patch a watchface. Field-only changes use JSON; a request with a backdrop uses multipart. |
| `watchface_get_fonts_local` | Both | Read fonts actually available on the device. |
| `watchface_get_store_market_list` | Both | Read the market cache already present on the device. AstroToo does not download missing entries. |
| `watchface_set_clock_select` | Both | Select a watchface. The payload contains only `ClockId` unless `sysUpdateTime` is explicitly supplied. TimesFrame queues a verified pair of identical requests within one serialized MCP operation so a manual selection overrides the current traditional schedule period; AstroToo sends one request. |
| `watchface_get_brightness` | Both | Read brightness. |
| `watchface_set_brightness` | Both | Set brightness. AstroToo accepts 0–100. |
| `watchface_onoff_screen` | Both | Use `onOff:1` to turn the display on and `onOff:0` to turn it off. |
| `watchface_replace_dial_bg_file` | Both | Replace the cached backdrop without changing `DeviceImageUrl`. |
| `watchface_upload_file` | AstroToo | Upload one element file and return a temporary `local://` reference. |
| `watchface_create_local_clock` | Both | Create a local watchface. TimesFrame accepts an image or tar.gz; AstroToo accepts one 480×480 backdrop after element files have been uploaded individually. |
| `watchface_reset_local_then_cloud` | TimesFrame | Remove local system-side files and restore from the cloud. This tool is blocked for AstroToo. |
| `watchface_get_screen_snapshot` | Both | Capture the screen and validate the path returned by this request. AstroToo currently returns BMP. |
| `watchface_raw_command` | Both | Send a product command unchanged to `/divoom_api`. AstroToo watchface-write commands still perform the required read precheck. |

## Authoring tools (6)

| Tool | Purpose |
|---|---|
| `watchface_protocol_quick_reference` | Return operating rules for the selected model. |
| `watchface_clock_catalog` | Query product-specific watchface IDs, Chinese and English names, fonts, `disp`, and `item_id`; `includeConfig:true` includes native configurations. |
| `watchface_disp_catalog` | Query and filter the selected model's `disp` catalog. |
| `watchface_font_catalog` | Query the selected model's font catalog. With a live AstroToo target, local availability is merged into the AstroToo names. |
| `watchface_template_search` | Search curated templates for the selected model. |
| `watchface_layout_suggest` | Return model-specific layout guidance. AstroToo never receives TimesFrame coordinate statistics. |

Offline calls select data with a top-level `model:"timesframe"` or `model:"astrotoo"`. Calls with a live device always use the product detected from Hardware.

AstroToo watchface data comes from the simulator's `resource/userdata/system/clocksys` and `resource/usr/share/divoom_app/clocksys`. Default IDs come from `Device/GetClockDefaultList` with `IsDefault=1`; missing local configurations come from `Device/GetClockInfoV3` with `DeviceId`. Font IDs and files come from `resource/usr/share/divoom_app/system/font_list.cfg`, and names come from `Device/GetFontForAI`. Server requests use `https://appchina.divoom-gz.com/` plus the command string with a JSON body.

AstroToo resources are `divoom://astrotoo/clocks/catalog`, `divoom://astrotoo/clocks/configs`, `divoom://astrotoo/font/catalog`, and `divoom://astrotoo/disp/catalog`. Existing resource URIs without the `astrotoo` prefix retain TimesFrame semantics.

Product data lives in `resources/timesframe` and `resources/astrotoo`; shared protocol guidance lives in `resources/common`. `resources/products.json` and `divoom://products/catalog` expose the product registry. A new product must add its own directory, Hardware mapping, and complete resource set. Runtime code never falls back to another product's watchfaces, fonts, or element metadata.

## File and local-storage policy

- AstroToo backdrops must be 480×480 JPEG/WebP files smaller than 500 KiB. JSON is limited to 64 KiB measured as UTF-8 bytes.
- AstroToo has no TAR support, and the MCP server rejects TAR, TGZ, and ZIP. Upload each element image sequentially with `watchface_upload_file`. This tool uses the dedicated `/upload_local_asset` route and does not use the photo or pixel-art `/upload` route.
- A `local://...` value returned by `watchface_upload_file` is a temporary device-local transfer reference. After a successful create or patch, firmware atomically moves bound files into the persistent watchface directory. Unbound files are removed on reboot.
- Generic TimesFrame `/upload` is disabled. TimesFrame files enter the device staging area only through `watchface_create_local_clock` or `watchface_patch_local` and are removed after the operation.
- LAN files received by either product are never uploaded to the cloud or another external server.
- Timed-out writes are not retried automatically. Read device state before deciding whether to retry.
- The two TimesFrame `SetClockSelectId` calls are one verified manual-selection protocol sequence. They are queued together and each response is validated. The sequence does not edit or disable schedule configuration and is not a timeout retry.

## Recommended flows

Patch an existing watchface:

```text
watchface_get_device_info
→ watchface_get_local
→ watchface_patch_local
→ watchface_get_local
→ watchface_get_screen_snapshot
```

Create an AstroToo watchface with element assets:

```text
watchface_get_device_info
→ watchface_get_fonts_local
→ watchface_upload_file (once per element, sequentially)
→ watchface_create_local_clock
→ watchface_set_clock_select
→ watchface_get_local
→ watchface_get_screen_snapshot
```

See `tool-examples.md` for complete parameter examples and `astrotoo-and-multiple-devices.md` for multi-device behavior and firmware capability requirements.
