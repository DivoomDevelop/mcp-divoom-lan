# Divoom Watchface LAN Guide - Quick Reference

This resource is a condensed reference for agents using the Divoom local HTTP API.

## Core transport rules

- API entry: `POST http://<DEVICE_IP>:<PORT>/divoom_api`
- Typical port is `9000` (confirm on firmware)
- Use `Content-Type: application/json; charset=UTF-8`
- Request root must include:
  - `Command` (case-sensitive command string)
  - `ReturnCode: 0`
- Do not use HTTP `GET` for `/divoom_api`

## High-value commands

- `Device/GetLocalClockInfo`
- `Device/PatchLocalClockInfo`
- `Device/GetLocalFontList`
- `Device/GetStoreClockMarketList`
- `Channel/SetClockSelectId`
- `Sys/GetBrightness`
- `Channel/SetBrightness`
- `Device/ResetLocalClockFromServer` (destructive)

## Safe patch workflow

1. Read current clock (`GetLocalClockInfo`).
2. If `ItemList` is empty, stop and switch to an editable clock first.
3. Patch minimally (`PatchLocalClockInfo`) using:
   - `ItemPatchList` by index, or
   - `ItemPatchByRoleList` for semantic patching.
4. Do not auto-create a new clock for color/style patch requests.
5. Read again and verify.

## Multipart endpoints

### `/replace_clock_dial_bg`

Use when replacing background decode cache without changing cfg `DeviceImageUrl`.

- First part: `name="json"` with:
  - `Command: "Device/ReplaceClockDialBgFile"`
  - `ReturnCode: 0`
  - `ClockId` or `UseCurrentDisplayClock`
- Second part: image bytes (part name usually UTC milliseconds)
- Each multipart part should include:
  - `filename="..."`
  - per-part `Content-Length`

### `/upload`

Use when uploading files to be referenced later by `DeviceImageUrl` and patched with `PatchLocalClockInfo`.

- First part: `name="json"` metadata (product-specific fields)
- Next part(s): file binary
- Each part should include `filename="..."` and per-part `Content-Length`

## Typical image constraints

- Format: JPEG or WebP
- Resolution: exactly `800x1280` (portrait)
- Size: below `512000` bytes (typical firmware limit)

## Notes

- Store list can be empty before prefetch completes.
- `ClockId >= 100000` usually indicates photo/album class dials.
- `ResetLocalClockFromServer` deletes local sys-side files first.
