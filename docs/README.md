# mcp-divoom-lan 文档索引

如果你是第一次接触 Divoom MCP，按下面顺序阅读：

1. `quick-start.md`：5 分钟跑通安装和首个调用
2. `tool-examples.md`：核心功能示例（改表盘、选表盘、亮度、新建表盘）
3. `html-visual-editor.md`：如何配合 HTML 可视化编辑器（含公开仓库地址）
4. `safety-and-troubleshooting.md`：风险边界与常见问题
5. `reference/`：协议关键规则提炼（中英）
6. `examples/`：请求/响应示例与目录清单

## 目标能力

- 修改本地表盘内容（`watchface_patch_local`）
- 切换当前表盘（`watchface_set_clock_select`）
- 调整亮度（`watchface_set_brightness`）
- 创建新本地表盘（`watchface_create_local_clock`）

## 前置条件（必须）

- 设备和 MCP 客户端机器网络可达（通常在同一局域网）
- 知道设备 LAN IP（例如 `192.168.1.120`）
- Node.js 版本 >= 20

## 新增目录说明

- `reference/`：从原始 Guide 提炼的关键协议约束，便于模型快速对齐行为
- `examples/`：从原始 EXAMPLE 抽取的常用样例，适合联调与回归

## 可视化编辑器公开地址（v2）

- GitHub 仓库：`https://github.com/DivoomDevelop/divoom-watchface-visual-editor_v2`
- 在线页面（GitHub Pages）：`https://divoomdevelop.github.io/divoom-watchface-visual-editor_v2/`

本地工作目录（例如 `D:\divoom-watchface-visual-editor`）与上述 **v2** 仓库对应：开发、提交、`git push` 均以该 GitHub 地址为远程权威来源；npm 包名定位为 `divoom-watchface-visual-editor-v2`（与 v1 区分）。
