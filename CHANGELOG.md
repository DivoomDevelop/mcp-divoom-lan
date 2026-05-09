# Changelog

All notable changes to this project are documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

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

[0.1.0]: https://github.com/your-org/mcp-divoom-lan/releases/tag/v0.1.0
