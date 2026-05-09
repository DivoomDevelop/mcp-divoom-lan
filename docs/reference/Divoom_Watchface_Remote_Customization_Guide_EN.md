# Divoom Watchface Remote Customization Guide (Condensed)

This document is a compact MCP-oriented guide for day-to-day operations.

For complete product protocol details, maintain the full upstream guide in your source repository and treat this file as a quick operational companion.

## Core endpoints

- `POST /divoom_api`
- `POST /replace_clock_dial_bg`
- `POST /upload`
- `POST /create_local_clock`

## Core JSON commands

- `Device/GetLocalClockInfo`
- `Device/PatchLocalClockInfo`
- `Channel/SetClockSelectId`
- `Sys/GetBrightness`
- `Channel/SetBrightness`
- `Device/GetLocalFontList`
- `Device/GetStoreClockMarketList`
- `Device/ResetLocalClockFromServer` (dangerous)

## MCP-safe workflow

1. Read current clock: `watchface_get_local`
2. Verify `ItemList` is not empty
3. Patch minimally: `watchface_patch_local`
4. Read again to verify

Do not call `watchface_create_local_clock` unless user explicitly asks to create a new clock.

## Multipart checklist

- Include `filename` in each part.
- Include part-level `Content-Length`.
- Image should be `800x1280`, `JPEG/WebP`, and within firmware size limits.

## Extra references in this repo

- `guide-key-points.en.md`
- `guide-key-points.zh.md`
- `../examples/`
