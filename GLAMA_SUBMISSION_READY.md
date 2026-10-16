# Glama listing — copy and operational steps

## Official references

- Registry / search: [glama.ai/mcp/servers](https://glama.ai/mcp/servers) — use **Add Server** if the package is not indexed yet.
- How indexing works (build + TDQS, etc.): [glama.ai/mcp/methodology](https://glama.ai/mcp/methodology)
- Claiming via `glama.json`: [The purpose and format of glama.json](https://glama.ai/blog/2025-07-08-what-is-glamajson)

## Repository metadata (filled)

- GitHub: https://github.com/DivoomDevelop/mcp-divoom-lan
- npm: `mcp-divoom-lan` (see `package.json` / MCP Registry id `io.github.DivoomDevelop/mcp-divoom-lan`)
- Security contact: developer@divoom.com (see `SECURITY.md`)

Glama also ingests the **official MCP Registry**; keeping `server.json` + [MCP Registry](https://registry.modelcontextprotocol.io/) publish up to date helps discovery even before a manual add.

## Maintainer claim

This repo includes root `glama.json` with GitHub user `DivoomDevelop`. After pushing it:

1. Open the server page on Glama (or **Add Server** and point at the GitHub repo).
2. Complete **Claim ownership** with the GitHub account that matches `maintainers` (or the repo owner).
3. If you change `maintainers`, run **Claim ownership** again so Glama rescans.

> If the project ever moves under a **GitHub Organization** (not a personal user), every maintainer with claim rights must be listed in `glama.json`; personal-account-only OAuth claim is not enough for org-owned repos ([Glama blog](https://glama.ai/blog/2025-07-08-what-is-glamajson)).

## Reproducible Docker build

Root `Dockerfile` builds `dist/` and copies `resources/` so Glama’s sandbox build is less likely to fail. Lists stay suppressed until a working image build exists ([methodology §1.3](https://glama.ai/mcp/methodology)).

Local smoke test:

```bash
docker build -t mcp-divoom-lan:glama .
docker run --rm -e DIVOOM_DEVICE_HOST=127.0.0.1 mcp-divoom-lan:glama
```

(Expect idle stdio server; real tool calls need a reachable device.)

---

## Listing copy (for forms / directory text)

### Project

`mcp-divoom-lan`

### Elevator pitch

Multi-device MCP server for TimesFrame and AstroToo watchface creation, updates, switching, brightness, and screenshot verification over LAN.

### Full description

`mcp-divoom-lan` enables MCP-compatible AI clients to operate TimesFrame and AstroToo watchface workflows over LAN HTTP APIs. Every online call requests the target Hardware and selects isolated product data. A hardware command with no response falls back to TimesFrame; a returned unknown value is rejected.

It provides:

- Supported-device discovery through `Device/ReturnSameLANDevice`, with Pixoo64 90/92/96, Times Gate 400/402, and other unsupported hardware filtered out
- managed-slot create and patch tools that inject the internal ClockId automatically
- Product-specific clock, font, display-element, template, and layout discovery
- Watchface switching, brightness, screen power, and screenshot capture
- AstroToo sequential local asset transfer and 480×480 backdrop validation
- Per-device operation queues for multi-device control

### Transport and runtime

- Runtime: Node.js `>=20`
- Transport: stdio
- Entrypoint: `node dist/index.js`

### Configuration

- `DIVOOM_DEVICE_HOST` (recommended global default)
- `DIVOOM_DEVICE_PORT` (default 9000)
- `DIVOOM_DEVICE_MODEL` (default `auto`)
- `DIVOOM_TIMEOUT_MS` (default 45000)

### Example use cases

- "Identify this device and list its editable watchface elements."
- "Increase the time size, read back the update, and capture a screenshot."
- "Create a 480x480 AstroToo weather watchface with local assets."

### Safety considerations

- Requires local network/device access.
- `watchface_reset_local_then_cloud` is TimesFrame-only and is blocked for AstroToo.
- AstroToo does not accept TAR/TGZ/ZIP; upload image elements sequentially.
- Verify writes with readback and a fresh device screenshot.

### Links

- Repository: https://github.com/DivoomDevelop/mcp-divoom-lan
- Security contact: developer@divoom.com
