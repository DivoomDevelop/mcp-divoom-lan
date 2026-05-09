# Divoom 表盘远程定制指南（精简版）

该文档为 MCP 使用场景整理的精简操作版，便于快速对齐调用规范。

完整协议细节建议继续在源码大仓中维护；此处聚焦“如何安全可用”。

## 核心接口

- `POST /divoom_api`
- `POST /replace_clock_dial_bg`
- `POST /upload`
- `POST /create_local_clock`

## 常用命令

- `Device/GetLocalClockInfo`
- `Device/PatchLocalClockInfo`
- `Channel/SetClockSelectId`
- `Sys/GetBrightness`
- `Channel/SetBrightness`
- `Device/GetLocalFontList`
- `Device/GetStoreClockMarketList`
- `Device/ResetLocalClockFromServer`（高风险）

## MCP 安全流程

1. 先读：`watchface_get_local`
2. 校验：`ItemList` 不为空
3. 再改：`watchface_patch_local`（最小化修改）
4. 回读：`watchface_get_local` 确认

除非用户明确要求“创建新表盘”，否则不要调用 `watchface_create_local_clock`。

## multipart 关键点

- 每段包含 `filename`
- 每段包含 `Content-Length`
- 图片遵循 `800x1280`、`JPEG/WebP`、大小满足固件限制

## 本仓配套文档

- `guide-key-points.zh.md`
- `guide-key-points.en.md`
- `../examples/`
