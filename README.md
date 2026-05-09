# mcp-divoom-lan

`mcp-divoom-lan` 是一个可开源发布的 MCP Server，将 Divoom 表盘局域网 API 封装为标准工具，便于 AI 客户端直接调用。

## 目标

- 将 `Divoom_Watchface_Remote_Customization_Guide_EN.md` 中的关键能力转成 MCP Tools
- 让支持 MCP 的客户端（Cursor、Claude Desktop、本地模型等）通过自然语言执行表盘操作
- 保留安全边界（读前写、危险命令显式提示、multipart 规则）

## 已实现工具

- `watchface_get_local` -> `Device/GetLocalClockInfo`
- `watchface_patch_local` -> `Device/PatchLocalClockInfo`
- `watchface_get_fonts_local` -> `Device/GetLocalFontList`
- `watchface_get_store_market_list` -> `Device/GetStoreClockMarketList`
- `watchface_set_clock_select` -> `Channel/SetClockSelectId`
- `watchface_get_brightness` -> `Sys/GetBrightness`
- `watchface_set_brightness` -> `Channel/SetBrightness`
- `watchface_replace_dial_bg_file` -> `POST /replace_clock_dial_bg`
- `watchface_upload_file` -> `POST /upload`
- `watchface_create_local_clock` -> `POST /create_local_clock`
- `watchface_reset_local_then_cloud` -> `Device/ResetLocalClockFromServer`
- `watchface_raw_command` -> 通用 `POST /divoom_api`
- `watchface_protocol_quick_reference` -> 返回协议关键约束

## Resource（知识上下文）

Server 暴露了两份 MCP Resource，可用于给模型补充上下文：

- `divoom://guide/quick-reference`
- `divoom://skill/watchface-customization`

## 快速开始

```bash
cd tools/mcp-divoom-lan
npm install
npm run build
npm start
```

开发调试：

```bash
npm run dev
```

发布前一键检查：

```bash
npm run release:check
```

## 环境变量

- `DIVOOM_DEVICE_HOST`：设备 LAN IP（例如 `192.168.1.120`）
- `DIVOOM_DEVICE_PORT`：HTTP 端口，默认 `9000`
- `DIVOOM_TIMEOUT_MS`：请求超时，默认 `45000`

如果不设置 `DIVOOM_DEVICE_HOST`，则每次调用工具时必须传 `target.host`。

## 客户端配置示例

### Cursor / Claude Desktop（stdio）

```json
{
  "mcpServers": {
    "divoom-lan": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/to/tools/mcp-divoom-lan/dist/index.js"
      ],
      "env": {
        "DIVOOM_DEVICE_HOST": "192.168.1.120",
        "DIVOOM_DEVICE_PORT": "9000",
        "DIVOOM_TIMEOUT_MS": "45000"
      }
    }
  }
}
```

也可直接使用本目录的 `client-config.example.json` 作为模板。

## 发布方案（可直接执行）

1. 新建独立仓库（建议名 `mcp-divoom-lan`），复制本目录内容作为仓库根目录。
2. 检查并更新元数据（已内置）：
   - `LICENSE`
   - `SECURITY.md`
   - `CONTRIBUTING.md`
   - `CHANGELOG.md`
   - `RELEASE.md`
3. 运行 `npm run release:check`，确认构建、类型检查、打包检查全部通过。
4. GitHub Release 发布 `v0.1.0`，附上使用截图与请求示例。
5. 向 MCP 目录提交：
   - 官方 MCP Registry
   - Smithery
   - Glama
   - 其他社区目录（如 mcp.so）
6. 同步发布“最小可复现演示”：
   - `watchface_get_local` 读配置
   - `watchface_patch_local` 改字体大小和颜色
   - `watchface_replace_dial_bg_file` 替换底图

## 发布收尾文件（已包含）

- `LICENSE`：开源许可证（MIT）
- `CHANGELOG.md`：版本变更记录
- `CONTRIBUTING.md`：贡献规范
- `SECURITY.md`：安全漏洞提交流程
- `RELEASE.md`：发版操作手册
- `PUBLISH_CHECKLIST.md`：发版检查清单
- `GITHUB_RELEASE_NOTES_v0.1.0.md`：可直接使用的 Release 正文模板
- `MCP_DIRECTORY_LISTING_TEMPLATE.md`：MCP 目录提交通用模板
- `GITHUB_RELEASE_NOTES_v0.1.0_READY.md`：可直接替换占位符的 Release 正文
- `MCP_REGISTRY_SUBMISSION_READY.md`：官方 MCP Registry 提交文案
- `SMITHERY_SUBMISSION_READY.md`：Smithery 提交文案
- `GLAMA_SUBMISSION_READY.md`：Glama 提交文案
- `.github/workflows/ci.yml`：CI（check/build/pack）

## 是否要打包 HTML 可视化编辑器？

建议：**要，但作为可选增强包，不要和 MCP 核心耦合。**

- 核心包（必须）：`mcp-divoom-lan`（本目录）
- 可视化包（建议）：复用仓库中的 `html/index.html` 或 `html/modern-editor`

这样做的好处：

- MCP 工具保持轻量，适合所有 AI 客户端
- 非技术用户可以先在可视化页面理解 `ItemList`，再让 AI 下发 patch
- 便于后续演进为“所见即所得 + AI 指令”的组合体验

## 与现有文档对齐

- 协议主文档：`docs/Divoom_Watchface_Remote_Customization_Guide_EN.md`
- API 提纲：`docs/mcp_watchface_api.md`
- 示例请求：`docs/EXAMPLE/`
- 原始 Skill：`.cursor/skills/divoom-watchface-customization/SKILL.md`

> 注意：`CHANGELOG.md` 底部的 GitHub Release 链接目前是占位地址，创建正式仓库后请替换为真实 URL。
