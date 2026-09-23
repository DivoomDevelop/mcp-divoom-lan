# AstroToo 与多设备

## 设备识别

每次联网工具调用都会先向本次 `target.host:target.port` 发送：

```json
{"Command":"Device/GetHardwareVersion","ReturnCode":0}
```

当前映射为：

| Hardware | 产品 | 画布 |
|---:|---|---:|
| 510 / 511 / 512 | TimesFrame | 800×1280 |
| 530 | AstroToo | 480×480 |

MCP 不使用历史响应或 `DeviceType:"Frame"` 猜型号。未知硬件会报错；显式 `target.model` 与硬件冲突也会报错。旧 TimesFrame 固件没有硬件接口时，可以显式设置 `model:"timesframe"` 兼容；AstroToo 不允许跳过能力检查。

## 多设备调用

同一个 MCP 进程可以连续或并行访问不同设备：

```json
{"target":{"host":"192.168.1.120","port":9000},"useCurrentDisplayClock":true}
```

```json
{"target":{"host":"192.168.1.121","port":9000},"useCurrentDisplayClock":true}
```

队列以 `host:port` 隔离。同一设备上的“识别 → 预读 → 修改”不会相互穿插；不同设备不会互相阻塞。IP 重新分配后，下次操作会重新读硬件版本。

## AstroToo 本地策略

AstroToo 写入前还会读取 `Device/GetLanCapabilities`，要求 `LocalOnly:true` 和 `LanApiVersion:1`。新建表盘、修改、素材上传和切换只使用设备本地文件，不进入云恢复、素材下载或对外文件上传。市场列表只读设备已有缓存。

底图为 480×480 JPEG/WebP 且小于 500 KiB；JSON 按 UTF-8 字节数不超过 64 KiB。AstroToo 不支持 TAR/TGZ/ZIP 素材包：每张元素图使用 `watchface_upload_file` 经专用 `/upload_local_asset` 串行上传一次，将返回的 `local://...` 写入对应 `image_addr`，最后再提交一张底图和表盘配置。产品照片/像素业务继续使用独立的 `/upload`。`local://...` 只是一份临时传输文件，只属于返回它的设备；创建/修改成功后，固件在同一分区内把素材原子移动到表盘持久目录，未绑定文件在重启时清理。失败会保留旧配置、旧素材和本次暂存文件，便于重试。AstroToo 底图必须通过创建/修改的 `dialAssetsPath` 或专用换底图工具提交，不能把 `local://...` 写入 `DeviceImageUrl`。

TimesFrame 的创建/修改 multipart 输入同样写入唯一临时文件，处理结束即删除。MCP 禁止 TimesFrame 通用 `/upload`，因为该旧入口会把命令转给设备联网任务；TimesFrame 素材必须随创建/修改请求提交。

字体必须先用 `watchface_get_fonts_local` 查询，并选择 `AvailableLocally:true` 的条目。AstroToo 专用资料使用 `divoom://astrotoo/...` URI；原有 URI 始终表示 TimesFrame。

## 产品资料隔离

`ClockId`、中英文表盘名称、字体 ID、`disp` 和 `item_id` 的功能都按产品隔离。`watchface_clock_catalog` 在连接设备时由硬件型号选择目录，离线时必须显式传 `model`。AstroToo 目录合并下面两个位置：

- `resource/userdata/system/clocksys`
- `resource/usr/share/divoom_app/clocksys`

生成时以 `https://appchina.divoom-gz.com/` 加命令字符串作为 URL，并用 JSON BODY 请求服务器：`Device/GetClockDefaultList` 携带 `IsDefault=1` 得到默认 ID；默认 ID 没有本地配置时用 `Device/GetClockInfoV3` 和 `DeviceId` 补齐。字体以 `resource/usr/share/divoom_app/system/font_list.cfg` 为准，`Device/GetFontForAI` 提供名称。当前参考设备 ID 为 `300400436`。

生成结果提供 `divoom://astrotoo/clocks/catalog`（紧凑索引）、`divoom://astrotoo/clocks/configs`（完整配置）、`divoom://astrotoo/font/catalog` 和 `divoom://astrotoo/disp/catalog`。这些资源不能用于 TimesFrame。

写入超时不会自动重发，因为设备可能已经提交。应先读取当前配置，再决定是否重试。截图必须使用本次响应的 `snapShotPath`；当前 AstroToo 返回 BMP 路径。路径缺失或下载失败会直接报错，避免把旧截图当作本次结果。

## 固件兼容要求

AstroToo 必须包含本地 LAN API v1。旧固件没有声明本地保存能力时，读取仍可诊断，但 MCP 会阻止素材写入并提示升级。TimesFrame 的公开工具名和行为保持兼容。
