# Release Guide

This file is the release runbook for `mcp-divoom-lan`.

## 1) Pre-release checks

```bash
npm install
npm test
npm run release:check
```

`release:check` verifies that npm, MCP Registry, and MCPB metadata use the same version before type checking, building, and running the package dry run.

## 2) Versioning

1. Update `package.json`, `package-lock.json`, `server.json`, and `mcpb/manifest.json` to the same version.
2. Update `CHANGELOG.md` with release date and highlights.
3. Ensure `README.md` examples match current behavior.

## 3) GitHub release

1. Commit release changes.
2. Tag version:
   - `git tag vX.Y.Z`
3. Push branch + tag.
4. Create GitHub Release using `vX.Y.Z` and copy notes from changelog.

Suggested release note sections:

- Summary
- New tools / behavior changes
- Migration notes
- Safety notes

## 4) MCP directory submissions

Submit/update listing in:

- official MCP registry
- Smithery
- Glama

Keep these fields consistent across directories:

- package/repo URL
- install command / client config
- tools list
- screenshots or demos

## 5) Post-release validation

- Install server from published artifact in a clean environment.
- Call:
  - `watchface_get_device_info`
  - `watchface_get_local`
  - `watchface_patch_local`
  - `watchface_set_clock_select`
  - `watchface_get_screen_snapshot`
- On AstroToo, verify a 480×480 backdrop update and sequential upload of any image elements.
- On TimesFrame, run create, patch, switch, and snapshot regression checks.
- Confirm docs and demo still match real behavior.
