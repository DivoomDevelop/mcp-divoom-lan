# 配合 HTML 可视化编辑器（v2）

`mcp-divoom-lan` 可以和 **v2** 可视化表盘编辑器协同使用，推荐工作流如下。

## 公开地址（给最终用户）

- GitHub 仓库：`https://github.com/DivoomDevelop/divoom-watchface-visual-editor_v2`
- 在线页面（GitHub Pages）：`https://divoomdevelop.github.io/divoom-watchface-visual-editor_v2/`

> 文档统一使用以上 **v2** 公开地址，不再依赖本地目录路径描述。

本地开发与向 Git 推送时，以你机器上的工程目录（例如 `D:\divoom-watchface-visual-editor`）为工作副本即可；**远程权威仓库**即为上方 **v2** GitHub 地址，推送目标应与该仓库保持一致，便于与 `mcp-divoom-lan` 文档中的链接同步。

## 推荐工作流

1. 用 MCP 读取当前表盘：
   - `watchface_get_local`
2. 在 HTML 编辑器中可视化调整：
   - 位置（`x/y/w/h`）
   - 字体（`font/size`）
   - 颜色（`color_1/color_2`）
3. 输出修改后的 JSON（或补丁思路）
4. 用 MCP 下发：
   - `watchface_patch_local`（优先）
   - 必要时才整表替换 `itemList`
5. 回读确认：
   - `watchface_get_local`

## 为什么建议“可视化 + MCP”

- 可视化编辑器负责“看得见”的布局调试
- MCP 负责“可自动化”的设备写入和回读验证
- 两者结合可减少误改风险，尤其是复杂 `ItemList`

## 注意事项

- 先读后写：不要盲写未知 `index`
- 尽量使用 `itemPatchList` / `itemPatchByRoleList`，避免整表覆盖
- 图片操作遵循规格：`800x1280`、`JPEG/WebP`
- 危险命令（重置、切换）应有明确用户意图

## 可视化能力范围建议

优先把这些能力放进可视化面板：

- 当前表盘预览与元素选中
- 字体与颜色快速试改
- 生成 patch 片段供 MCP 调用
- 亮度和表盘切换快捷操作
