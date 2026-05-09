# 安全边界与常见问题

## 一、关键安全边界

### 1) 先读后写

每次写入前都建议先调用 `watchface_get_local` 获取最新状态，写后再回读确认。

### 2) 危险操作

- `watchface_reset_local_then_cloud`：可能先删除本地 sys 侧文件
- `watchface_set_clock_select`：会立即切换当前显示表盘

建议在用户明确确认后再执行。

### 3) 禁止隐式新建表盘

- `watchface_create_local_clock` 只在用户明确提出“创建新表盘”时调用。
- 对于“改颜色/改字体/改位置”这类请求，禁止自动新建表盘。

### 4) 空 ItemList 保护

- 若 `watchface_get_local` 返回 `ItemList` 为空，必须先切换到可编辑表盘。
- 在空 `ItemList` 状态下不要继续 `watchface_patch_local`。

### 5) multipart 规范

服务端对 multipart 较敏感，建议：

- 每段都包含 `filename="..."`
- 每段包含 `Content-Length`
- 图像满足规格（见下）

### 6) 图像规格

- 分辨率：`800x1280`
- 格式：`JPEG` 或 `WebP`
- 文件大小：按设备固件限制（常见上限约 `512000` 字节）

## 二、常见问题排查

### 1) 无法连接设备

现象：

- 超时、连接被拒绝、无响应

排查：

- 检查 `DIVOOM_DEVICE_HOST` / `port`
- 设备和客户端机器是否网络可达
- 本机防火墙或路由隔离策略

### 2) 返回 `ReturnCode != 0`

排查：

- 查看响应中的 `ReturnMessage`
- 检查命令名大小写
- 检查请求是否包含 `ReturnCode: 0`
- 对照工具参数字段名（驼峰命名）

### 3) patch 不生效

排查：

- 是否针对错误的 `ClockId`
- `index` 是否与当前 `ItemList` 对应
- 是否被后续流程覆盖（例如切换表盘后再回读）
- 是否命中了空 `ItemList` 场景（先 `watchface_get_local` 检查）

### 4) 图片相关失败

排查：

- 尺寸是否为 `800x1280`
- 格式是否 `JPEG/WebP`
- 路径是否正确、文件是否可读

### 5) 创建表盘失败

排查：

- `metadata.ItemList` 结构是否完整
- `font` id 是否存在（先调用 `watchface_get_fonts_local`）
- 背景图参数是否满足规格
