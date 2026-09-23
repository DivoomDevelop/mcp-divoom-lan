# AstroToo LAN watchface authoring

Connect to the target and call watchface_get_device_info first. Hardware 530 selects AstroToo; 510/511/512 select TimesFrame. Never infer the product from legacy DeviceType fields or a previous device.

- Canvas: 480×480. Backgrounds: JPEG/WebP, exactly 480×480, less than 512000 bytes. AstroToo rejects TAR/TGZ/ZIP bundles.
- Read the current ItemList before editing. Empty or invalid results stop writes. Keep item_id stable and prefer per-index patches.
- All AstroToo LAN edits and assets stay on the device. Required fonts/images must already exist locally or be supplied in the upload. No cloud reset or automatic resource download.
- Get fonts from this device with watchface_get_fonts_local; use only AvailableLocally=true. watchface_font_catalog merges that status with AstroToo names from Device/GetFontForAI.
- Query watchface_clock_catalog before reusing an existing ClockId or element layout. The catalog merges both simulator clocksys directories and keeps names, fonts, disp and item_id semantics separate from TimesFrame.
- Use divoom://astrotoo/clocks/catalog, divoom://astrotoo/clocks/configs, divoom://astrotoo/disp/catalog, divoom://astrotoo/templates/curated, and divoom://astrotoo/watchface/schema. TimesFrame coordinates and font availability do not apply.
- Analog hands: disp 131/132/233, shared square box and matching square images pointing upward, center pivot, transp=100, hier in 0/1/2.
- Upload element images serially through the dedicated /upload_local_asset route, one file per watchface_upload_file call, with Device/UploadLocalAsset metadata. The product photo/pixel /upload route is separate. Each call returns a temporary local://<asset> for image_addr binding. Bind it in the same create/patch workflow: after a successful commit firmware atomically moves the image into durable watchface storage; unbound staging files are cleared on reboot. The reference belongs to the device which returned it and no received file is uploaded outward. Submit the 480x480 background through create/patch multipart dialAssetsPath, never through DeviceImageUrl.
- Each multipart request has JSON first, one file second, explicit per-part Content-Length, CRLF, and an unquoted boundary. The firmware streams the file and rejects incomplete uploads.
- JSON limit: 65536 UTF-8 bytes. One operation at a time per device. Independent targets can run concurrently.
- Snapshot captures complete before their response; use snapShotPath from that response (current firmware returns BMP). Failed captures must not be treated as old images.
- Verify writes by reading back and taking a fresh snapshot. A write timeout has an unknown outcome; inspect state before retrying.
