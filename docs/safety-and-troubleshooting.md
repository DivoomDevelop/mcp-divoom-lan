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

底图 (`clock_bg.jpg|webp`，由
`divoom_watchface_replace_clock_dial_bg_validate_saved_file` 校验)：

- 分辨率：`800x1280`（竖屏）
- 格式：`JPEG`（魔数 `FF D8`）或 `WebP`（`RIFF…WEBP`），不接 PNG/GIF
- 文件大小：≤ `500 KiB`（`DIVOOM_REPLACE_DIAL_BG_MAX_FILE_BYTES`）

tar.gz 内部元素槽位（`ItemList[i].image_addr` /
`ItemPatchList[i].patch.bundle_image` 引用，由
`wf_validate_bundle_slot_image_file` 校验）：

- 格式：`JPEG / WebP / PNG`（`89 50 4E 47 …`），其它格式（GIF/BMP/TIFF…）
  必须客户端转码后再打包
- 单文件大小：与底图同上限
- 叶子名 ≤ 95 字节，禁止子目录

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

### 3) 重复的图像槽位 / 网络图库 `disp`

现象：

- 配置了多张「网络图库」或同一图像类 `disp` 的多行，只看到最后一处生效，前面的像被覆盖。

说明：

- 同一表盘的 **`ItemList` 里，每种图像相关 `disp` 原则上只保留一行**；重复时 **后面的条目会覆盖前面的**。
- 网络图库系列参见 `docs/disp-usage.md` **「图像元素唯一性（网络图库系列）」**（`disp`
  **13 / 125–130 / 173–175** 等）。

### 4) patch 不生效

排查：

- 是否针对错误的 `ClockId`
- `index` 是否与当前 `ItemList` 对应
- 是否被后续流程覆盖（例如切换表盘后再回读）
- 是否命中了空 `ItemList` 场景（先 `watchface_get_local` 检查）

### 5) 图片相关失败

通用排查：

- 尺寸是否为 `800x1280`（仅底图必须）
- 路径是否正确、文件是否可读

按 `ReturnMessage` 定位：

- `bundle image must be JPEG or WEBP` / `底图必须小于500KiB` —
  对应底图校验（`divoom_watchface_replace_clock_dial_bg_validate_saved_file`）。
  底图必须是 JPEG（`FF D8`）或 WebP（`RIFF…WEBP`），≤ 500 KiB。
- `bundle element image must be JPEG, WEBP or PNG` —
  对应元素槽位校验（`wf_validate_bundle_slot_image_file`）。tar.gz 里的
  元素文件必须是 JPEG / WebP / PNG，常见原因是把 GIF / BMP 或动画 GIF 直接
  打包了，需在客户端先转码。
- `bundle element file missing` / `bundle_image leaf name invalid` —
  叶子名拼错或 tar 里没这个文件，叶子名只允许 `[A-Za-z0-9._-]`，长度
  ≤ 95 字节，禁子目录与相对路径。
- `ItemList[i]: missing or empty string "item_id"` /
  `ItemIdList[i]: missing or empty string` — `item_id`/`ItemIdList` 任何
  一项空字符串都会拒。
- `DialAssets:image requires raw JPEG/WebP second part` —
  `DialAssets` 字段与第二段实际形态不一致，要么改 `DialAssets:bundle`
  要么发单图。

### 6) 创建表盘失败

排查：

- `metadata.ItemList` 结构是否完整
- `font` id 是否存在（先调用 `watchface_get_fonts_local`）
- 背景图参数是否满足规格
