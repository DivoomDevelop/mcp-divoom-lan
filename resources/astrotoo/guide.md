# AstroToo LAN watchface authoring

Connect to the target and call watchface_get_device_info first. Hardware 530 selects AstroToo; 510/511/512 select TimesFrame. Never infer the product from legacy DeviceType fields or a previous device.

- Canvas: 480×480. Backgrounds: JPEG/WebP, exactly 480×480, less than 512000 bytes. AstroToo rejects TAR/TGZ/ZIP bundles.
- MCP create and patch tools manage fixed ClockId 60000. They read it first, create it only when missing and complete creation data is supplied, and otherwise update it. Other explicit IDs are rejected.
- Read the current ItemList before editing. Empty or invalid results stop writes. Keep item_id stable and prefer per-index patches.
- All AstroToo LAN edits and assets stay on the device. Required fonts/images must already exist locally or be supplied in the upload. No cloud reset or automatic resource download.
- Get fonts from this device with watchface_get_fonts_local; use only AvailableLocally=true. watchface_font_catalog merges that status with AstroToo names from Device/GetFontForAI.
- Query watchface_clock_catalog before reusing an existing ClockId or element layout. The catalog merges both simulator clocksys directories and keeps names, fonts, disp and item_id semantics separate from TimesFrame.
- Read the display-element guide in English at divoom://astrotoo/disp/guide/en or in Chinese at divoom://astrotoo/disp/guide/zh-cn. Use divoom://astrotoo/clocks/catalog, divoom://astrotoo/clocks/configs, divoom://astrotoo/disp/summary, divoom://astrotoo/disp/catalog, divoom://astrotoo/templates/curated, and divoom://astrotoo/watchface/schema. TimesFrame coordinates and font availability do not apply.
- Analog hands: disp 131/132/233, shared square box and matching square images pointing upward, center pivot, transp=100, hier in 0/1/2.
- Upload element images serially through the dedicated /upload_local_asset route, one file per watchface_upload_file call, with Device/UploadLocalAsset metadata. The product photo/pixel /upload route is separate. Each call returns a temporary local://<asset> for image_addr binding. Bind it in the same create/patch workflow: after a successful commit firmware atomically moves the image into durable watchface storage; unbound staging files are cleared on reboot. The reference belongs to the device which returned it and no received file is uploaded outward. Submit the 480x480 background through create/patch multipart dialAssetsPath, never through DeviceImageUrl.
- Each multipart request has JSON first, one file second, explicit per-part Content-Length, CRLF, and an unquoted boundary. The firmware streams the file and rejects incomplete uploads.
- JSON limit: 65536 UTF-8 bytes. One operation at a time per device. Independent targets can run concurrently.
- Snapshot captures complete before their response; use snapShotPath from that response (current firmware returns BMP). Failed captures must not be treated as old images.
- Verify writes by reading back and taking a fresh snapshot. A write timeout has an unknown outcome; inspect state before retrying.

## Display-element requirements

The generated AstroToo catalog contains every positive numeric display declaration in the current header plus all component positions in the firmware-supported range. Read the compact summary first, then filter `watchface_disp_catalog` by `category`, `renderKind`, `dataSource`, or `usedInReferenceConfigs`.

- Prefer an element with `usage.usedInReferenceConfigs=true`, then copy geometry and related fields from one of its `usage.exampleClockIds`. An unused renderer entry has no validated authoring recipe and needs hardware verification.
- `implementationEvidence` distinguishes a direct renderer symbol, an alias used by the renderer, a renderer-supported numeric range, and a header declaration with no direct implementation reference. Entries with `authoringMode=declared_only` are documented for completeness but excluded from the authoring JSON Schema.
- `dataSource` identifies the runtime producer. Weather, calendar, music, finance, AI, app, and network elements do not become functional from layout JSON alone; the matching device service or cached payload must be available.
- `assetRequirement=local_asset` requires a file uploaded with `watchface_upload_file`. `service_or_firmware_asset` is selected by a service or firmware state and must not be replaced with an arbitrary local image unless an existing AstroToo configuration proves that pattern.
- Analog hands are `131 HOUR_POINT_IMAGE`, `132 MIN_POINT_IMAGE`, and `233 SECOND_POINT_IMAGE`. Use centered square layers, upward-pointing transparent images, the same pivot, and suitable `hier` ordering.
- `261–279` are linked component positions. Their `item_id` and component ClockId binding must follow a native component configuration. `280 DAIL_COMPONENT_END_ID` and `1000 HTTP_UPLOAD_PROGRESS` are firmware-internal and must not be authored.
- Multi-part families must be copied as a complete family. Examples include time digit image slots, forecast rows, calendar composites, app data columns, and image sequences. Do not assume one member is independently meaningful.
- `538 FULL_SCREEN_LYRICS` is an audio-service composite proven by current native configurations. It is not a generic static text box.
