# mcp-divoom-lan Documentation

If you are new to the Divoom MCP server, read the documentation in this order:

1. `quick-start.md`: install, configure, and complete the first call in about five minutes.
2. `mcp-tools.md`: all 21 MCP tools, product scope, and file policy.
3. `astrotoo-and-multiple-devices.md`: Hardware detection, concurrent devices, and AstroToo local persistence.
4. `adding-products.md`: product registration, isolated resource directories, and onboarding checks.
5. `tool-examples.md`: core operations, including sequential AstroToo asset uploads, creation, and analog pointers.
6. `html-visual-editor.md`: use the HTML visual editor with this MCP server.
7. `safety-and-troubleshooting.md`: operating boundaries and common failures.
8. `reference/`: condensed protocol rules.
9. `examples/`: request and response examples with a catalog.

Read `disp-usage.md` before building an `ItemList`. It documents image-element uniqueness and maps the network-gallery `disp` values 13, 125–130, and 173–175 to firmware constants.

## Capabilities

The server provides 21 MCP tools: 15 device tools and 6 offline or model-aware authoring tools. See `mcp-tools.md` for the complete catalog.

- Query the product model and LAN capabilities with `watchface_get_device_info`.
- Patch local watchface content with `watchface_patch_local`.
- Select the current watchface with `watchface_set_clock_select`.
- Read and set brightness.
- Create a new local watchface with `watchface_create_local_clock`.
- Select TimesFrame or AstroToo automatically from the Hardware value returned by each device.
- Control multiple devices from one MCP server by passing `target.host`.

## Requirements

- The device must be reachable from the MCP client machine, normally on the same LAN.
- You must know the device LAN IP address, such as `192.168.1.120`.
- Node.js 20 or later is required.

## Documentation directories

- `reference/`: condensed constraints extracted from the original guides for fast and consistent model behavior.
- `examples/`: common requests and responses for integration tests and regression checks.

## Public visual editor v2

- GitHub repository: `https://github.com/DivoomDevelop/divoom-watchface-visual-editor_v2`
- GitHub Pages: `https://divoomdevelop.github.io/divoom-watchface-visual-editor_v2/`

A local working directory such as `D:\divoom-watchface-visual-editor` is only a clone of the v2 repository. Treat the GitHub repository above as the authoritative remote for development and pushes. The npm package name is `divoom-watchface-visual-editor-v2`, which distinguishes it from v1.
