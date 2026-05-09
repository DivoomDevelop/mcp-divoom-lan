# Publish Checklist

> Use this checklist before announcing a new release.

## A. Local validation

- [ ] `npm install`
- [ ] `npm run release:check`
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
- [ ] Submit/update Glama
- [ ] Verify listing install instructions

## F. Post-release smoke test

- [ ] Fresh install from published source
- [ ] `watchface_get_local` returns expected data
- [ ] `watchface_patch_local` works on a non-destructive patch
- [ ] `watchface_replace_dial_bg_file` works with valid image
