## Summary

Add **[mcp-divoom-lan](https://github.com/DivoomDevelop/mcp-divoom-lan)** to the third-party MCP list under **「其他」**: Divoom watchface customization over **LAN** (read/patch dial config, replace background, brightness, dial switch, multipart uploads).

## Open source

- **License:** MIT
- **Repository:** https://github.com/DivoomDevelop/mcp-divoom-lan

## Runtime & install

- **Transport:** stdio (Node.js 20+)
- **User environment:** end users must reach the physical device on the **same LAN**; set `DIVOOM_DEVICE_HOST` (optional `DIVOOM_DEVICE_PORT`, `DIVOOM_TIMEOUT_MS`).
- **Install:** `npx -y mcp-divoom-lan` (npm 0.1.2+ with `bin` entry) or `node dist/index.js` after clone/build.

## Notes for reviewers

- No Volcengine cloud resources required; purely **local/LAN** device HTTP API access.
- Listing request aligns with MCP ecosystem plaza third-party entries (similar to existing external links in README).
