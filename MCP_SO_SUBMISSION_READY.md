# MCP.so — submission copy and steps

Submit at: [mcp.so/submit](https://mcp.so/submit) (sign in if required).

## Form fields (copy-paste)

| Field | Value |
| ----- | ----- |
| **Type** | MCP Server |
| **Name** | `mcp-divoom-lan` |
| **URL** | `https://github.com/DivoomDevelop/mcp-divoom-lan` |
| **Description** | See §Description (full paragraph) below — copy into multi-line “Description” if the form has one. |
| **Tags** | `MCP,Model Context Protocol,Divoom,watchface,clock face,customization,LAN,local network,IoT,smart clock,gadget,Node.js,stdio,HTTP API,multipart upload` |

## Description (for “Description” textarea)

**mcp-divoom-lan** is an open-source Model Context Protocol (MCP) server that exposes Divoom watchface customization over **local LAN HTTP**. AI assistants can read and patch the current on-device watchface JSON, manage fonts and store market lists, switch the active dial, adjust brightness, and run **multipart** flows for background replacement, file upload, and creating a local clock—while following a **read-before-write** workflow and explicit warnings for destructive actions (e.g. reset-from-cloud). Requires network access to the Divoom device; configure `DIVOOM_DEVICE_HOST` (and optionally port/timeout). MIT license; Node.js 20+; stdio transport.

**One-liner (if the form has a strict length limit):** MCP server for **Divoom** devices: customize watchfaces over **LAN** (read/patch config, dial/brightness, multipart uploads). Node 20+, stdio—set `DIVOOM_DEVICE_HOST` on your network.

## Tags (comma-separated)

Shorter list:

`MCP,Divoom,watchface,LAN,IoT,smart-device,Node.js,stdio,home-automation`

Longer list (more discoverability):

`MCP,Model Context Protocol,Divoom,watchface,clock face,customization,LAN,local network,IoT,smart clock,gadget,Node.js,stdio,HTTP API,multipart upload`

## Server Config (paste into the form)

Use **one** of the following JSON blocks (mcp.so may expect the full `mcpServers` object or only the inner server entry — if submit fails, try the other variant).

### Variant A — full `mcpServers` (Cursor / Claude style)

**Install from npm** (recommended for users):

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "npx",
      "args": ["-y", "mcp-divoom-lan"],
      "env": {
        "DIVOOM_DEVICE_HOST": "192.168.1.120",
        "DIVOOM_DEVICE_PORT": "9000",
        "DIVOOM_TIMEOUT_MS": "45000"
      }
    }
  }
}
```

> **npm:** From **0.1.2** on, the published package includes `bin` and a `dist/index.js` shebang so **`npx -y mcp-divoom-lan`** works. **Variant A** is the default recommendation for MCP.so and end users. Use **Variant B** / **C** for contributors (local `node_modules`, git clone, or pinned paths).

### Variant B — `node` + local `node_modules` path

After `npm install mcp-divoom-lan` in a project directory:

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "node",
      "args": ["./node_modules/mcp-divoom-lan/dist/index.js"],
      "env": {
        "DIVOOM_DEVICE_HOST": "192.168.1.120",
        "DIVOOM_DEVICE_PORT": "9000",
        "DIVOOM_TIMEOUT_MS": "45000"
      }
    }
  }
}
```

### Variant C — clone / dev: absolute path to `dist/index.js`

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-divoom-lan/dist/index.js"],
      "env": {
        "DIVOOM_DEVICE_HOST": "192.168.1.120",
        "DIVOOM_DEVICE_PORT": "9000",
        "DIVOOM_TIMEOUT_MS": "45000"
      }
    }
  }
}
```

## Long description (optional extra field)

`mcp-divoom-lan` wraps Divoom device HTTP/LAN APIs as MCP tools (`watchface_get_local`, `watchface_patch_local`, multipart dial/upload helpers, etc.) and ships markdown resources for protocol constraints. Requires LAN access to the watch; set `DIVOOM_DEVICE_HOST` (or pass `target.host` per call). See repository `README.md` and `SECURITY.md` (`developer@divoom.com`).

## Related

- Directory template: `MCP_DIRECTORY_LISTING_TEMPLATE.md`
- npm package: `mcp-divoom-lan`
- MCP Registry id: `io.github.DivoomDevelop/mcp-divoom-lan`
