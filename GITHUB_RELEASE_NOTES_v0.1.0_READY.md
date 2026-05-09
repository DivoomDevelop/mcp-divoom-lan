# Release v0.1.0 - mcp-divoom-lan

> Replace placeholders before publishing:
> - `{{REPO_URL}}`
> - `{{ISSUES_URL}}`
> - `{{SECURITY_EMAIL}}`

## English

`mcp-divoom-lan` is an MCP server for Divoom LAN watchface customization.
It wraps local Divoom HTTP APIs into MCP tools so AI clients can operate watchface workflows through natural language.

### Highlights

- Added core watchface tools:
  - `watchface_get_local`
  - `watchface_patch_local`
  - `watchface_get_fonts_local`
  - `watchface_get_store_market_list`
- Added control tools:
  - `watchface_set_clock_select`
  - `watchface_get_brightness`
  - `watchface_set_brightness`
- Added multipart tools:
  - `watchface_replace_dial_bg_file`
  - `watchface_upload_file`
  - `watchface_create_local_clock`
- Added safety-aware wrappers:
  - `watchface_reset_local_then_cloud`
  - `watchface_raw_command`
- Added MCP resources:
  - `divoom://guide/quick-reference`
  - `divoom://skill/watchface-customization`

### Install

```bash
npm install
npm run build
node dist/index.js
```

Use `client-config.example.json` for MCP client setup.

### Safety Notes

- Always read before write (`GetLocalClockInfo` -> patch -> verify).
- `watchface_reset_local_then_cloud` may delete local sys-side files before cloud refresh.
- Multipart requests require `filename="..."` and per-part `Content-Length`.

### Links

- Repository: `{{REPO_URL}}`
- Issues: `{{ISSUES_URL}}`
- Security contact: `{{SECURITY_EMAIL}}`

---

## 中文

`mcp-divoom-lan` 是一个面向 Divoom 局域网表盘定制的 MCP Server。  
它将设备本地 HTTP API 封装为标准 MCP 工具，让 AI 客户端可通过自然语言执行表盘操作。

### 本版本亮点

- 新增表盘核心工具：
  - `watchface_get_local`
  - `watchface_patch_local`
  - `watchface_get_fonts_local`
  - `watchface_get_store_market_list`
- 新增控制工具：
  - `watchface_set_clock_select`
  - `watchface_get_brightness`
  - `watchface_set_brightness`
- 新增 multipart 能力：
  - `watchface_replace_dial_bg_file`
  - `watchface_upload_file`
  - `watchface_create_local_clock`
- 新增安全封装：
  - `watchface_reset_local_then_cloud`
  - `watchface_raw_command`
- 新增 MCP 资源：
  - `divoom://guide/quick-reference`
  - `divoom://skill/watchface-customization`

### 安装

```bash
npm install
npm run build
node dist/index.js
```

客户端配置可直接参考 `client-config.example.json`。

### 安全提示

- 建议遵循“先读后写”流程（先 `GetLocalClockInfo` 再 patch，再回读校验）。
- `watchface_reset_local_then_cloud` 可能先删除本地 sys 侧文件，再触发云端流程。
- multipart 请求必须带 `filename="..."` 与每段 `Content-Length`。

### 链接

- 仓库：`{{REPO_URL}}`
- 问题反馈：`{{ISSUES_URL}}`
- 安全联系：`{{SECURITY_EMAIL}}`
