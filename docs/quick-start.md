# Quick Start (5 Minutes)

## 1. Install and build

```bash
npm install
npm run build
```

## 2. Configure the MCP client

Copy `client-config.example.json` from the repository root and replace its executable path with the absolute path on your machine.

Key settings:

- `command`: `node`
- `args`: `.../dist/index.js`
- `env.DIVOOM_DEVICE_HOST`: the device's LAN IP address
- `env.DIVOOM_DEVICE_PORT`: `9000` by default
- `env.DIVOOM_DEVICE_MODEL`: keep `auto` unless legacy TimesFrame compatibility requires an explicit value

## 3. Test the first connection

Call `watchface_get_device_info` first.

The MCP server calls `Device/GetHardwareVersion` on the target. Hardware 510/511/512 selects TimesFrame, and Hardware 530 selects AstroToo. Unknown Hardware values stop the operation.

Then call `watchface_get_local`. The smallest request for the watchface currently shown on screen is:

```json
{
  "useCurrentDisplayClock": true
}
```

When one MCP server controls several devices, include the corresponding `target` in every call. Identification results are never reused between devices. Complete operations are serialized for the same device, while different devices can run concurrently.

If you did not configure environment variables, pass the device address in each call:

```json
{
  "target": {
    "host": "192.168.1.120",
    "port": 9000
  },
  "useCurrentDisplayClock": true
}
```

## 4. Standard write flow

Use this flow for write operations:

1. Call `watchface_get_local` to read the current configuration.
2. Inspect `ItemList`.
   - If it is empty, stop the write and select an editable watchface with `watchface_set_clock_select`.
   - If it is populated, continue.
3. Choose the file path that matches the change:
   - Field changes only: call `watchface_patch_local` without `dialAssetsPath`; the request uses `POST /divoom_api`.
   - Changed element images on TimesFrame: call `watchface_patch_local` with `clock_bg.tar.gz` and bind each leaf with `ItemPatchList[].patch.bundle_image`.
   - Changed element images on AstroToo: call `watchface_upload_file` once for each image, sequentially. Put each returned temporary `local://...` value into `image_addr` in the same create or patch operation. Staging files are consumed after a successful commit. TAR, TGZ, and ZIP are rejected.
   - Backdrop only: call `watchface_patch_local` with one JPEG/WebP file, or use `watchface_replace_dial_bg_file` to leave `DeviceImageUrl` unchanged.
   - A changed number of rows: replace the complete `ItemList` and `ItemIdList` as a fallback.
4. Call `watchface_get_local` again and verify the committed state.

Do not place `item_id` in `patch.*`; doing so can overwrite the device's menu and configuration relationships.

TimesFrame does not expose generic `watchface_upload_file`. Its assets are sent with the create or patch multipart request and the receiving staging file is removed after processing. The MCP/LAN flows for both products keep received files on the device and never upload them to the cloud.

Do not call `watchface_create_local_clock` unless the user explicitly requests a new watchface.

## 5. Troubleshooting

- Connection failure: verify the IP address, port, subnet, and firewall.
- Nonzero return code: read `ReturnMessage`, then compare the request fields with the error table in `docs/safety-and-troubleshooting.md`.
- Backdrop upload failure: use JPEG or WebP smaller than 500 KiB. TimesFrame requires 800×1280; AstroToo requires 480×480.
- TimesFrame element-bundle failure: every element in `tar.gz` must be JPEG, WebP, or PNG. AstroToo does not support bundles and requires sequential uploads.

## 6. Choose a font

Before writing `ItemList[i].font`, inspect the font catalog:

- TimesFrame resources: `divoom://font/guide` and `divoom://font/catalog`
- AstroToo resource: `divoom://astrotoo/font/catalog`
- Tool: `watchface_font_catalog`, using `model` for offline work or a live `target` for device-aware selection. A live AstroToo query merges local availability into the independent AstroToo name catalog.

A bitmap font whose charset is only `0123456789` can render digits only and is suitable for time, date, or temperature values. Text slots that contain Chinese characters, such as disp 49/56/154/155/178/179/219/220, require a CJK-capable TTF such as HarmonyOS Sans SC, Source Han Sans, Alimama, or ZCOOL. See `docs/font-usage.md` for details.

Always call `watchface_get_fonts_local` before writing to confirm which fonts are actually installed on the target device.

## 7. Choose `disp` and validate JSON

- TimesFrame resource: `divoom://disp/catalog`, containing 194 `disp` entries and hints about image resources
- AstroToo resource: `divoom://astrotoo/disp/catalog`
- Tool: `watchface_disp_catalog`, selecting the model with `model` or a live `target`, then filtering by `ids`, `nameContains`, `descriptionContains`, or `expects`

Useful hints:

- `hints.likelyUsesRasterOrAssetLayer = true`: the slot usually needs `image_addr` or another image-layer asset, commonly for `*_PIC`, `*_GIF`, or `*_IMAGE` entries.
- `hints.oftenUsesVectorFontForText = true`: the slot primarily renders text; choose an appropriate font script with `watchface_font_catalog`.

## 8. Generate a complete watchface configuration

- TimesFrame: validate with `divoom://watchface/schema`, start from `divoom://watchface/example-minimal`, and use an 800×1280 canvas.
- AstroToo: validate with `divoom://astrotoo/watchface/schema`, start from `divoom://astrotoo/watchface/example-minimal`, and use a 480×480 canvas.
- Keep `ItemIdList` in the same order as `ItemList[].item_id`.

## 9. Sample locations

- Request and response samples: `docs/examples/`
- Condensed protocol rules: `docs/reference/`
- Editor-side AI guide: `divoom://guide/ai-watchface`

## 10. Clone a template and choose layout defaults

Call `watchface_clock_catalog` first to inspect existing `ClockId` values, Chinese and English names, fonts, `disp`, and `item_id` semantics for the selected product. The compact AstroToo index is available at `divoom://astrotoo/clocks/catalog`. To read full native configurations, pass `includeConfig:true` or read `divoom://astrotoo/clocks/configs`. Never reuse these IDs or semantics across products.

Use an existing template instead of inventing every coordinate:

- TimesFrame resource: `divoom://templates/curated`
- AstroToo resource: `divoom://astrotoo/templates/curated`
- Tool: `watchface_template_search`, filtered with `tagsAll`, `tagsAny`, `bucket`, or `dispPresent`
- Tool: `watchface_layout_suggest`, which returns median `size/x/y/w/h/alig` values and common colors for a `disp`

A practical sequence is to search with `watchface_template_search({ tagsAny: ["weather"] })`, adapt the closest `ItemList`, call `watchface_layout_suggest` for each changed `disp`, replace fonts with `watchface_font_catalog`, and confirm device availability with `watchface_get_fonts_local`.

See `docs/templates-curated.md` for more detail.
