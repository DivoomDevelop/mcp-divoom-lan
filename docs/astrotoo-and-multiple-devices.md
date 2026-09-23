# AstroToo and Multiple Devices

## Device identification

Before every online tool call, the MCP server sends this request to the current `target.host:target.port`:

```json
{"Command":"Device/GetHardwareVersion","ReturnCode":0}
```

The current Hardware mapping is:

| Hardware | Product | Canvas |
|---:|---|---:|
| 510 / 511 / 512 | TimesFrame | 800×1280 |
| 530 | AstroToo | 480×480 |

The server never infers a product from a previous response or from `DeviceType:"Frame"`. Unknown Hardware values are rejected. An explicit `target.model` that conflicts with the detected Hardware is also rejected. Legacy TimesFrame firmware without the hardware query can be used with an explicit `model:"timesframe"`; AstroToo cannot bypass capability detection.

## Multiple-device operation

A single MCP process can access different devices sequentially or concurrently:

```json
{"target":{"host":"192.168.1.120","port":9000},"useCurrentDisplayClock":true}
```

```json
{"target":{"host":"192.168.1.121","port":9000},"useCurrentDisplayClock":true}
```

Queues are isolated by `host:port`. The identify → pre-read → write sequence for one device cannot interleave with another operation on that device, while independent devices do not block each other. The Hardware value is queried again on the next operation after an IP address is reassigned.

## AstroToo local-storage policy

Before an AstroToo write, the server also reads `Device/GetLanCapabilities` and requires `LocalOnly:true` with `LanApiVersion:1`. Watchface creation, updates, asset transfer, and selection use only local device files. These operations do not enter cloud restore, automatic asset download, or external file-upload paths. The market-list tool reads only the cache already present on the device.

The backdrop must be a 480×480 JPEG or WebP file smaller than 500 KiB. The JSON request is limited to 64 KiB measured as UTF-8 bytes. AstroToo does not accept TAR, TGZ, or ZIP asset bundles. Upload each element image sequentially with `watchface_upload_file` through the dedicated `/upload_local_asset` route, place the returned `local://...` value in the matching `image_addr`, and then submit one backdrop with the watchface configuration.

The product photo and pixel-art feature continues to use its separate `/upload` route. A `local://...` value is a temporary transfer reference valid only on the device that returned it. After a successful create or patch, firmware atomically moves bound assets within the same partition into the persistent watchface directory. Unbound staging files are removed on reboot. A failed operation preserves the old configuration, old assets, and current staging files so the request can be retried. Submit an AstroToo backdrop through `dialAssetsPath` on create or patch, or through the dedicated backdrop replacement tool; never store a `local://...` reference in `DeviceImageUrl`.

TimesFrame multipart inputs are also written to a unique temporary file and removed after processing. The MCP server blocks the legacy TimesFrame generic `/upload` path because that route forwards work to the device's online task. Submit TimesFrame assets only as part of a create or patch request.

Query fonts with `watchface_get_fonts_local` first and select only entries whose `AvailableLocally` value is `true`. AstroToo references use `divoom://astrotoo/...` URIs. The original unprefixed resource URIs continue to mean TimesFrame.

## Product data isolation

`ClockId`, Chinese and English watchface names, font IDs, `disp`, and `item_id` semantics are isolated by product. With a live target, `watchface_clock_catalog` selects the resource directory from the detected Hardware. Offline calls must provide `model`. AstroToo source data is merged from:

- `resource/userdata/system/clocksys`
- `resource/usr/share/divoom_app/clocksys`

The resource generator sends a JSON body to a URL formed from `https://appchina.divoom-gz.com/` plus the command string. `Device/GetClockDefaultList` with `IsDefault=1` returns the default IDs. When a default ID has no local configuration, `Device/GetClockInfoV3` with `DeviceId` supplies it. Font files and IDs come from `resource/usr/share/divoom_app/system/font_list.cfg`; `Device/GetFontForAI` supplies display names. The current reference device ID is `300400436`.

Generated resources include `divoom://astrotoo/clocks/catalog` for the compact index, `divoom://astrotoo/clocks/configs` for full configurations, `divoom://astrotoo/font/catalog`, and `divoom://astrotoo/disp/catalog`. These resources must not be used for TimesFrame.

A timed-out write is never retried automatically because the device might already have committed it. Read the current configuration before deciding whether to retry. A snapshot must use the `snapShotPath` returned by the current request; AstroToo currently returns a BMP path. A missing path or failed download is reported as an error so an older snapshot cannot be mistaken for the current capture.

## Firmware compatibility

AstroToo must provide local LAN API v1. The MCP server can still perform diagnostic reads against older firmware that does not advertise local persistence, but it blocks asset writes and reports that a firmware upgrade is required. Existing public TimesFrame tool names and behavior remain compatible.
