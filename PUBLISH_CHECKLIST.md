# Publish Checklist

> Use this checklist before announcing a new release.

## A. Local validation

- [ ] `npm install`
- [ ] `npm run release:check`
- [ ] Confirm `package.json`, `package-lock.json`, `server.json`, and `mcpb/manifest.json` report the same version
- [ ] Confirm `dist/index.js` is up to date
- [ ] Confirm `client-config.example.json` works on a clean client

## B. Metadata and docs

- [ ] Update `package.json` version
- [ ] Update `CHANGELOG.md`
- [ ] Confirm `README.md` install and config examples
- [ ] Confirm `SECURITY.md` and contact email
- [ ] Confirm `LICENSE` is present

## C. Release assets

- [ ] Copy/adjust `GITHUB_RELEASE_NOTES_vX.Y.Z.md`
- [ ] Prepare screenshots or terminal demo
- [ ] Prepare short demo prompts

## D. GitHub

- [ ] Commit all release changes
- [ ] Tag: `vX.Y.Z`
- [ ] Push branch and tag
- [ ] Create GitHub Release with notes

## E. MCP directory submissions

- [ ] Fill `MCP_DIRECTORY_LISTING_TEMPLATE.md`
- [ ] Submit/update official MCP registry
- [ ] Submit/update Smithery
- [ ] Submit/update Glama (`GLAMA_SUBMISSION_READY.md`)
- [ ] Submit/update MCP.so (`MCP_SO_SUBMISSION_READY.md`, [submit form](https://mcp.so/submit))
- [ ] Alibaba Cloud Bailian custom MCP (`BAILIAN_MCP_SUBMISSION_READY.md`)
- [ ] Coze HTTP plugin (`COZE_SUBMISSION_READY.md`)
- [ ] Verify listing install instructions

## F. Post-release smoke test

- [ ] Fresh install from published source
- [ ] `watchface_list_devices` returns only Hardware 510/511/512/530 and omits MAC addresses
- [ ] `watchface_get_device_info` identifies TimesFrame and AstroToo from Hardware
- [ ] `watchface_get_local` returns expected product-specific data
- [ ] `watchface_patch_local` injects the managed slot ID, updates it, and readback matches
- [ ] AstroToo accepts a 480×480 JPEG/WebP backdrop and returns a fresh screenshot
- [ ] AstroToo element files upload sequentially and no TAR/TGZ/ZIP is used
- [ ] TimesFrame create, patch, switch, and screenshot regression tests pass
