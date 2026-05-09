# 指南关键点（中文）

本页提炼局域网表盘定制的高优先级规则，便于 MCP 使用者快速落地。

## 传输规则

- `/divoom_api` 只用 `POST` + JSON body。
- 不要对 `/divoom_api` 使用 HTTP `GET`。
- 请求根字段必须有 `ReturnCode: 0`。
- `Command` 大小写敏感。

## 先读后写流程

1. `Device/GetLocalClockInfo`
2. 校验当前上下文可编辑（`ItemList` 不能空）
3. `Device/PatchLocalClockInfo` 最小化修改
4. 再次 `Device/GetLocalClockInfo` 回读确认

## 必须显式授权的操作

- `watchface_create_local_clock` 只在用户明确提出“创建新表盘”时调用。
- 对“改颜色/改字体”请求，禁止隐式新建表盘。

## multipart 必要约束

- 每段都要有 `filename="..."`。
- 每段带 `Content-Length`。
- 常见图片约束：
  - JPEG/WebP
  - 分辨率必须 800x1280
  - 大小通常低于约 512000 字节（视固件而定）

## 高风险命令

- `Device/ResetLocalClockFromServer`：先删本地 sys 侧文件。
- `Channel/SetClockSelectId`：会立即切换当前显示表盘。
