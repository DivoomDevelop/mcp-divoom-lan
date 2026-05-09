# mcp-divoom-lan v0.1.0

Initial public release of `mcp-divoom-lan`, an MCP server that wraps Divoom LAN watchface APIs into standardized tools for AI clients.

## Highlights

- Added core watchface read/patch tools:
  - `watchface_get_local`
  - `watchface_patch_local`
  - `watchface_get_fonts_local`
  - `watchface_get_store_market_list`
- Added device control tools:
  - `watchface_set_clock_select`
  - `watchface_get_brightness`
  - `watchface_set_brightness`
- Added multipart workflow tools:
  - `watchface_replace_dial_bg_file`
  - `watchface_upload_file`
  - `watchface_create_local_clock`
- Added risk-aware command wrappers:
  - `watchface_reset_local_then_cloud`
  - `watchface_raw_command`
- Added protocol/skill resources:
  - `divoom://guide/quick-reference`
  - `divoom://skill/watchface-customization`

## Install

```bash
npm install
npm run build
node dist/index.js
```

For MCP client configuration, use:

- `client-config.example.json`

## Safety Notes

- Always read before write.
- `Device/ResetLocalClockFromServer` is destructive.
- Multipart requests require `filename="..."` and per-part `Content-Length`.

## Related Docs

- `README.md`
- `RELEASE.md`
- `docs/Divoom_Watchface_Remote_Customization_Guide_EN.md` (from source repo)

---

# mcp-divoom-lan v0.1.0（中文）

`mcp-divoom-lan` 首个公开版本发布。该 MCP Server 将 Divoom 局域网表盘 API 封装为标准工具，便于 Cursor、Claude Desktop 等 AI 客户端直接调用。

## 版本亮点

- 新增表盘读取/修改核心工具
- 新增亮度与切换表盘控制工具
- 新增 multipart 图片/创建表盘工具链
- 新增危险操作封装与协议速查资源

## 安装

```bash
npm install
npm run build
node dist/index.js
```

客户端配置可直接参考：

- `client-config.example.json`

## 安全提示

- 请遵循“先读后写”。
- `Device/ResetLocalClockFromServer` 为高风险操作。
- multipart 必须包含 `filename="..."` 与每段 `Content-Length`。
