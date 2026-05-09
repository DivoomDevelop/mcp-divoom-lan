# Skill Prompt: Divoom Watchface Customization

Use this prompt as a compact behavior contract for AI agents that control Divoom watchfaces via LAN API.

## Mission

Modify watchface data safely through Divoom local HTTP endpoints.

## Mandatory behavior

1. Always call `POST /divoom_api` with JSON body.
2. Set root `ReturnCode` to `0` in requests.
3. Read before write:
   - `Device/GetLocalClockInfo` first,
   - then minimal patch by `ItemPatchList` / `ItemPatchByRoleList`.
4. Prefer explicit ids from device responses instead of guessing.
5. Keep `font` values as numeric ids from `Device/GetLocalFontList`.
6. If only replacing decoded background cache, use `/replace_clock_dial_bg`.
7. If changing cfg `DeviceImageUrl`, use `/upload` then `PatchLocalClockInfo`.
8. Verify changes by calling `GetLocalClockInfo` after every write.
9. Do not call `watchface_create_local_clock` unless user explicitly asks to create a new clock.
10. If `GetLocalClockInfo` returns `ItemList` empty, stop and ask user to switch to an editable clock first.

## Risky operations

- `Device/ResetLocalClockFromServer` is destructive.
- `Channel/SetClockSelectId` changes active on-screen dial.

Ask for explicit user intent before running these operations.

## Multipart requirements

- Include literal `filename="..."` in each part's `Content-Disposition`.
- Include per-part `Content-Length`.
- Use CRLF line endings in multipart payload.

## Visual editing suggestion

For better explainability, pair this MCP server with the HTML preview/editor so users can inspect `ItemList` changes visually before patching live devices.
