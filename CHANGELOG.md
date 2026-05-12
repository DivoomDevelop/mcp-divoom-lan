# Changelog

All notable changes to this project are documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [0.1.2] - 2026-05-12

### Added

- **`bin`:** `mcp-divoom-lan` now resolves via `npx -y mcp-divoom-lan` (stdio entry `dist/index.js`).
- **Build:** prepend `#!/usr/bin/env node` to `dist/index.js` after `tsc` for Unix-compatible bin execution.

### Changed

- Docs: Glama (`Dockerfile`, `glama.json`), MCP.so submission copy (`MCP_SO_SUBMISSION_READY.md`), publishing checklist.

## [0.1.1] - 2026-05-11

Patch release on npm; documentation and metadata only (no `bin` / `npx` entry in the published tarball).

## [0.1.0] - 2026-05-09

### Added

- Initial MCP server implementation over stdio transport.
- Tool wrappers for core Divoom LAN watchface commands:
  - local read/patch (`GetLocalClockInfo`, `PatchLocalClockInfo`)
  - fonts, store market list, clock selection, brightness
  - multipart endpoints (`/replace_clock_dial_bg`, `/upload`, `/create_local_clock`)
  - reset and raw command passthrough
- MCP resources for quick protocol and skill guidance.
- Example MCP client config template (`client-config.example.json`).
- Initial publish docs and release guidance.

[0.1.2]: https://github.com/DivoomDevelop/mcp-divoom-lan/releases/tag/v0.1.2
[0.1.2]: https://github.com/DivoomDevelop/mcp-divoom-lan/releases/tag/v0.1.2
[0.1.1]: https://github.com/DivoomDevelop/mcp-divoom-lan/releases/tag/v0.1.1
[0.1.0]: https://github.com/DivoomDevelop/mcp-divoom-lan/releases/tag/v0.1.0
