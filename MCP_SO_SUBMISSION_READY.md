# MCP.so — submission copy and steps

Submit at: [mcp.so/submit](https://mcp.so/submit) (sign in if required).

## Form fields (copy-paste)

| Field | Value |
| ----- | ----- |
| **Type** | MCP Server |
| **Name** | `mcp-divoom-lan` |
| **URL** | `https://github.com/DivoomDevelop/mcp-divoom-lan` |

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

> **Note:** The `npx -y mcp-divoom-lan` entry requires a published npm version that includes the `bin` field in `package.json` (present in this repo from the `bin` + shebang change). Until you publish that version to npm, use **Variant B** or **C** below on the form.

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

## Short description (if the site has a free-text field)

MCP server for Divoom LAN watchface customization: read/patch local clock config, multipart background upload, brightness and dial selection — with read-before-write safety notes.

## Long description (optional)

`mcp-divoom-lan` wraps Divoom device HTTP/LAN APIs as MCP tools (`watchface_get_local`, `watchface_patch_local`, multipart dial/upload helpers, etc.) and ships markdown resources for protocol constraints. Requires LAN access to the watch; set `DIVOOM_DEVICE_HOST` (or pass `target.host` per call). See repository `README.md` and `SECURITY.md` (`developer@divoom.com`).

## Related

- Directory template: `MCP_DIRECTORY_LISTING_TEMPLATE.md`
- npm package: `mcp-divoom-lan`
- MCP Registry id: `io.github.DivoomDevelop/mcp-divoom-lan`
