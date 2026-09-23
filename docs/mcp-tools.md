# MCP 工具 API

当前服务提供 21 个工具：15 个设备工具和 6 个离线/机型感知设计工具。设备工具每次都先读取目标设备的 `Device/GetHardwareVersion`；Hardware 510/511/512 使用 TimesFrame 配置，530 使用 AstroToo 配置。

## 通用目标参数

```json
{
  "target": {
    "host": "192.168.13.142",
    "port": 9000,
    "model": "auto",
    "timeoutMs": 45000
  }
}
```

建议保持 `model:"auto"`。同一 `host:port` 上的完整操作串行执行，不同设备可以并行。没有传 `target` 时使用 `DIVOOM_DEVICE_HOST`、`DIVOOM_DEVICE_PORT`、`DIVOOM_DEVICE_MODEL` 和 `DIVOOM_TIMEOUT_MS`。

## 设备工具（15）

| 工具 | 机型 | 用途 |
|---|---|---|
| `watchface_get_device_info` | 两者 | 查询硬件版本、型号、画布、LAN 能力和文件策略。 |
| `watchface_get_local` | 两者 | 读取当前或指定 `ClockId` 的表盘配置。 |
| `watchface_patch_local` | 两者 | 预检后修改表盘；纯字段修改走 JSON，带底图时走 multipart。 |
| `watchface_get_fonts_local` | 两者 | 读取设备实际可用字体。 |
| `watchface_get_store_market_list` | 两者 | 读取设备已有市场缓存；AstroToo 不触发下载。 |
| `watchface_set_clock_select` | 两者 | 切换表盘；请求只含 `ClockId`，显式传入时才含 `sysUpdateTime`。TimesFrame 在同一 MCP 串行操作中成对排队两次相同请求，使手动选择在当前时段覆盖传统定时表盘；AstroToo 只发送一次。 |
| `watchface_get_brightness` | 两者 | 读取亮度。 |
| `watchface_set_brightness` | 两者 | 设置亮度；AstroToo 范围为 0～100。 |
| `watchface_onoff_screen` | 两者 | `onOff:1` 开屏，`onOff:0` 关屏。 |
| `watchface_replace_dial_bg_file` | 两者 | 替换缓存底图，不修改 `DeviceImageUrl`。 |
| `watchface_upload_file` | AstroToo | 每次上传一个元素文件，返回临时 `local://` 引用。 |
| `watchface_create_local_clock` | 两者 | 创建本地表盘；TimesFrame 可用 tar.gz，AstroToo 只接收一张 480×480 底图。 |
| `watchface_reset_local_then_cloud` | TimesFrame | 删除本地 sys 侧文件后从云端恢复；AstroToo 禁止。 |
| `watchface_get_screen_snapshot` | 两者 | 截图并校验本次返回路径；AstroToo 当前为 BMP。 |
| `watchface_raw_command` | 两者 | 原样发送 `/divoom_api` 产品命令；AstroToo 的表盘修改命令仍执行读取预检。 |

## 设计辅助工具（6）

| 工具 | 用途 |
|---|---|
| `watchface_protocol_quick_reference` | 返回所选机型的操作规则。 |
| `watchface_clock_catalog` | 查询所选产品的表盘 ID、中英文名称、字体、`disp`、`item_id`；可用 `includeConfig:true` 返回原始配置。 |
| `watchface_disp_catalog` | 查询所选机型的 `disp` 枚举及过滤结果。 |
| `watchface_font_catalog` | 查询字体目录；传在线 AstroToo `target` 时合并设备的 `AvailableLocally` 状态。 |
| `watchface_template_search` | 搜索所选机型的表盘模板。 |
| `watchface_layout_suggest` | 返回所选机型的布局建议；AstroToo 不使用 TimesFrame 坐标统计。 |

离线调用通过顶层 `model:"timesframe"` 或 `model:"astrotoo"` 选资料；连接设备时以硬件识别结果为准。

AstroToo 表盘资料来自模拟器的 `resource/userdata/system/clocksys` 与 `resource/usr/share/divoom_app/clocksys`。默认 ID 由 `Device/GetClockDefaultList` 和 `IsDefault=1` 获取；本地缺失配置时由 `Device/GetClockInfoV3` 加 `DeviceId` 获取。字体 ID 与文件来自 `resource/usr/share/divoom_app/system/font_list.cfg`，名称来自 `Device/GetFontForAI`。服务器请求 URL 为 `https://appchina.divoom-gz.com/` 加命令字符串，BODY 使用 JSON 打包。

AstroToo 专用资源为 `divoom://astrotoo/clocks/catalog`、`divoom://astrotoo/clocks/configs`、`divoom://astrotoo/font/catalog` 和 `divoom://astrotoo/disp/catalog`。原有无 `astrotoo` 前缀的资源保持 TimesFrame 语义。

文件按产品存放在 `resources/timesframe` 和 `resources/astrotoo`，共享协议资料放在 `resources/common`。`resources/products.json` 与 `divoom://products/catalog` 给出产品注册信息。新增产品时必须增加独立目录、Hardware 映射与完整资源，运行时不会回退使用另一产品的表盘、字体或元素资料。

## 文件和本地保存策略

- AstroToo 底图为 480×480 JPEG/WebP，文件小于 500 KiB；JSON 按 UTF-8 不超过 64 KiB。
- AstroToo 没有 TAR，MCP 同时拒绝 TAR/TGZ/ZIP。元素图片必须逐个串行调用 `watchface_upload_file`；该工具使用专用 `/upload_local_asset`，不会占用照片/像素业务的 `/upload`。
- `watchface_upload_file` 返回的 `local://...` 是设备临时传输引用。创建或修改成功后，固件把已绑定文件原子移动到持久表盘目录；未绑定文件在重启时清理。
- TimesFrame 的通用 `/upload` 已禁用。其文件只随 `watchface_create_local_clock` 或 `watchface_patch_local` 进入设备端暂存区，并在操作处理后清理。
- 两种机型收到的 LAN 文件都不会向云端或外部服务器上传。
- 写入超时不自动重发；先回读设备状态，再决定是否重试。
- TimesFrame 的两个 `SetClockSelectId` 是一组已验证的手动切换协议序列，会一起排入设备命令队列并分别校验回包。它不会修改或关闭定时配置，也不是超时重试。

## 推荐调用流程

修改已有表盘：

```text
watchface_get_device_info
→ watchface_get_local
→ watchface_patch_local
→ watchface_get_local
→ watchface_get_screen_snapshot
```

AstroToo 创建带元素素材的表盘：

```text
watchface_get_device_info
→ watchface_get_fonts_local
→ watchface_upload_file（每个元素一次，串行）
→ watchface_create_local_clock
→ watchface_set_clock_select
→ watchface_get_local
→ watchface_get_screen_snapshot
```

具体参数示例见 `tool-examples.md`，多设备和固件能力要求见 `astrotoo-and-multiple-devices.md`。
