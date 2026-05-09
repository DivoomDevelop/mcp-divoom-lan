# Release Guide

This file is the release runbook for `mcp-divoom-lan`.

## 1) Pre-release checks

```bash
npm install
npm run check
npm run build
npm pack --dry-run
```

## 2) Versioning

1. Update `package.json` version.
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
  - `watchface_get_local`
  - `watchface_patch_local`
  - `watchface_replace_dial_bg_file`
- Confirm docs and demo still match real behavior.
