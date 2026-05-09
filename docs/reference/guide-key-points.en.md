# Guide Key Points (EN)

This page summarizes the most important operational rules for LAN watchface customization.

## Transport rules

- Always `POST` to `/divoom_api` with JSON body.
- Never use HTTP `GET` for `/divoom_api`.
- Root request must include `ReturnCode: 0`.
- Command strings are case-sensitive.

## Read-before-write workflow

1. `Device/GetLocalClockInfo`
2. validate editable context (`ItemList` must not be empty)
3. `Device/PatchLocalClockInfo` with minimal patch
4. `Device/GetLocalClockInfo` again for verification

## Explicit-only operations

- `watchface_create_local_clock` should run only when user explicitly asks to create a new clock.
- Do not auto-create clocks for style/color patch requests.

## Multipart essentials

- Include `filename="..."` in each multipart part.
- Include per-part `Content-Length`.
- Typical image constraints:
  - JPEG/WebP
  - exactly 800x1280
  - below ~512000 bytes (firmware-dependent)

## Risky commands

- `Device/ResetLocalClockFromServer` deletes local sys-side files first.
- `Channel/SetClockSelectId` immediately changes active dial.
