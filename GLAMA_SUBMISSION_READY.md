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

MCP server for Divoom LAN watchface operations with practical safety boundaries: read-before-write flow, explicit destructive command warning, and multipart endpoint support.

### Full description

`mcp-divoom-lan` enables MCP-compatible AI clients to operate Divoom watchface customization workflows over LAN HTTP APIs.

It provides:

- Local clock config read and patch tools
- Font and market list discovery
- Dial switch and brightness controls
- Multipart wrappers for:
  - `/replace_clock_dial_bg`
  - `/upload`
  - `/create_local_clock`
- Quick-reference MCP resources for protocol and skill behavior

### Transport and runtime

- Runtime: Node.js `>=20`
- Transport: stdio
- Entrypoint: `node dist/index.js`

### Configuration

- `DIVOOM_DEVICE_HOST` (recommended global default)
- `DIVOOM_DEVICE_PORT` (default 9000)
- `DIVOOM_TIMEOUT_MS` (default 45000)

### Example use cases

- "Read current watchface JSON and list editable text items."
- "Increase time font size and set color to red."
- "Replace current dial background with this 800x1280 image."

### Safety considerations

- Requires local network/device access.
- `watchface_reset_local_then_cloud` may delete local sys-side files first.
- Verify changes with `watchface_get_local` after write actions.

### Links

- Repository: https://github.com/DivoomDevelop/mcp-divoom-lan
- Security contact: developer@divoom.com
