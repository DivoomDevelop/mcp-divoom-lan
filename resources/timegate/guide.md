# TimeGate MCP 控制

仅适用于 TimeGate Hardware 400、402。每台设备有 **5 块独立的 128×128 屏幕**，`lcdIndex` 为 0–4；坐标属于单屏，不是 640×128 连续画布。设备源码只作参考，不需要修改固件。

## 版本与认证

| Hardware | 默认 HTTP 路由 | 成功响应 | 批量命令 |
|---|---|---|---|
| 400 | `80/post` | `error_code:0` | 原生 `Draw/CommandList` |
| 402 | `9000/divoom_api` | `ReturnCode:0` | MCP 逐条发送，参考源码没有原生列表执行分支 |

两种成功字段均可识别；若同时存在，必须都为数值 0。非 2xx、缺少成功字段、业务错误、无效 JSON 和超时均报错。Hardware 400/402 与固件版本号不同，不能据此声称已经验证所有固件功能。

`watchface_list_devices` 返回这两种设备的 `model:"timegate"`、Hardware 和端口。使用该 target 调用 `timegate_*` 工具。省略 hardware 时，每次通过发现服务查找当前目标；没有匹配、重复匹配或未知型号时停止。直接局域网使用可显式填写实际版本：

```json
{"target":{"host":"192.168.1.100","model":"timegate","hardware":400}}
```

显式 hardware 是调用者指定的配置，返回 `identification:"hardware-override"`，不是设备硬件查询的结果。PIXOO64/TimeGate 不使用 TimesFrame 的无响应回退。`target.port` 或 `DIVOOM_DEVICE_PORT` 会覆盖默认端口，想自动选择时请省略。

除配置说明工具 `timegate_get_device_info` 外，所有操作必须提供设备设置中的 **LocalToken**。MCP 参数是 `localToken`，发送给设备时才转换为 `LocalToken`。MCP 不猜测、不自动提取令牌，也不会在失败后去掉令牌重试。不要在批量子命令中放入另一个 LocalToken。

默认设备可设置 `DIVOOM_DEVICE_HOST`、`DIVOOM_DEVICE_MODEL=timegate`、`DIVOOM_DEVICE_HARDWARE=400` 或 `402`，并通过 `DIVOOM_TIMEGATE_LOCAL_TOKEN` 提供令牌。令牌和硬件环境变量仅适用于匹配的默认 host；跨设备调用应明确提供各自的 localToken。令牌不属于 target，不会出现在发现列表、配置说明或返回的请求中；设备响应若回显 LocalToken，会被隐藏。

## 工具与使用顺序

| 工具 | 参数与作用 |
|---|---|
| `timegate_get_device_info` | 型号配置、路由、单屏画布及屏幕数量，不访问屏幕内容 |
| `timegate_send_items` | `lcdIndex`、`items`、`mode`、可选 `backgroundGif`；创建或更新单屏自定义显示 |
| `timegate_command_list` | `commands` 原生命令数组，整批预校验后按版本执行 |
| `timegate_send_text` | `lcdIndex`、`text`；在已激活的 HTTP 动画上显示文字 |
| `timegate_clear_text` | `lcdIndex`、`textId`；-1 清除该动画的所有文字 |
| `timegate_set_brightness` | `brightness:0–100`，所有屏幕的 LCD 亮度 |
| `timegate_get_brightness` | 400 用 `Channel/GetAllConf`；402 用 `Channel/GetClockInfo` 的实际 Brightness，关屏时为 0 |
| `timegate_onoff_screen` | `onOff:1` 开启所有屏幕，0 关闭 |
| `timegate_select_clock` | `clockId`；不提供 lcdIndex 时选整机表盘；单屏选择还必须提供 lcdIndex 和既有 lcdIndependence |
| `timegate_play_gif` | `lcdArray` 恰好 5 个 0/1，至少选择一屏；`urls` 为 1–9 个设备可访问的 HTTP GIF URL |

自定义表盘优先用 send_items，普通文字使用 type 22；它不要求先发送 PIXOO64 的 RGB 动画。切回原表盘可用 select_clock，必须记录并使用该设备原来的整机 ClockId，或其原单屏 ClockId、LcdIndependence，不能套用其他型号的编号。

402 源码中的 `Sys/GetBrightness` 固定返回 100，不能用来验证亮度写入。MCP 使用 `Channel/GetClockInfo` 的实际 Brightness 回读；该值表示当前有效亮度，关屏时为 0。

同一 host 的完整操作排队执行。批量内容全部校验通过后才开始发送。400 原生批量的整体应答不能证明每一项都已经渲染。402 逐条发送时报告失败下标和已确认数量；失败项可能已经生效，不自动重试、不回滚。

## 单屏元素列表

`mode:"replace"`（默认）对应 `NewFlag:1`，替换指定屏幕的元素；`mode:"append"` 对应 `NewFlag:0`，增加元素并按 TextId 替换同 ID。每次发送 1–40 个元素，TextId 为 0–39，同一列表不能重复 ID。

原生字段名区分大小写：`LcdIndex`、`NewFlag`、**`BackgroudGif`**、`ItemList`。背景原生字段保持 API 原有拼写。

背景行为存在资料差异：400 文档描述 replace 时忽略背景；402 的 `divoom_light_app.c` 实现则在 `NewFlag==1` 且 URL 非空时下载背景。MCP 保留显式提供的 backgroundGif，并按版本说明这一差异，不自动改写 mode，也不承诺相同的背景更新行为。省略背景时发送空字符串，设备侧的既有背景行为由固件决定。

402 真机验证（固件 402077）：第一次初始化某屏自定义表盘时，应使用 replace 并提供 backgroundGif。没有已有背景时，设备可能成功应答并解析文字，但日志出现背景文件读取失败，屏幕仍不更新。提供背景后已现场确认时间与文字显示正常。后续 append 可省略背景。不要把 HTTP 成功应答当作可见渲染已经完成。

元素字段为 `TextId`、`type`、`x`、`y`、`dir`、`font`、`TextWidth`、`Textheight`、`speed`、`align`、`color`、可选 `TextString`、`update_time`。所有区域必须位于单屏 128×128 内。默认 dir=0、speed=100、align=1。速度为 0–100，颜色使用 `#RRGGBB`。文字少于 512 UTF-8 字节，不是 512 个汉字。

type 1–23：秒、分、时、AM/PM、时分、时分秒、年、日、月、月年、英文月份与日、完整日期、两字母星期、三字母星期、完整英文星期、三字母月份、当前温度、最高温度、最低温度、天气文字、噪声、自定义文字、网络文字。type 22 必须给出 TextString；type 23 的 TextString 是 HTTP URL，响应应包含 `{"DispData":"文字"}`，update_time 为 1–86400 秒，默认 60。

400 元素列表对齐按照文档：1 左、2 中、3 右。402 列表按源码效果枚举：0 滚动、1 单行固定、2 多行滚动、3 中、4 左、5 右。不要假设两个版本的 align 数值含义相同。

列表 font 来自 TimeGate 的 `POST https://app.divoom-gz.com/Device/GetTimeDialFontList`，滚动需选择 Type/type=0 且覆盖所需字符集的字体。示例使用文档中的 font=2；仍需在实际固件上核对可用性。不可使用 TimesFrame/AstroToo 的字体目录。

## 文字、GIF 与限制

send_text 使用独立的动画字体 0–7、固定高 16、宽 16–64，区域限制在 64×64 内，以符合文档和参考解析器。400 使用 `LcdIndex`，402 解析器实际读取 `LcdId`，MCP 自动转换。lcdIndex 必须指向 HTTP 动画选中的第一块屏幕；工具不会自动创建这个前置动画。

400 独立文字 align 按文档允许 0–5；402 解析器只接受 1–3。clear_text 的原生屏幕字段是 LcdId，两版本保持一致。该接口清除动画文字，不清除 send_items 创建的自定义表盘元素。

GIF URL 使用 `Device/PlayGif`，原生字段为 LcdArray、FileName 数组。参考 402 源码没有注册文档批量示例中的 `Device/PlayTFGif`，因此白名单只接受其支持的 Device/PlayGif。设备 URL 限于无凭据的 `http://`，少于 256 UTF-8 字节；参考源码关闭了 TLS 下载支持。GIF 应为 16/32/64/128 正方形，应答仅说明收到命令，不代表完成下载或显示。

本次不提供 JPEG 分帧动画上传：TimeGate 的 SendHttpGif 接受 JPEG 文件字节，不能使用 PIXOO64 的 RGB888 数据。本 MCP 也不为 TimeGate 提供 TimesFrame/AstroToo 的表盘文件上传、raw command 或离线表盘目录。批量白名单限定为工具描述中列出的命令，不允许嵌套列表、额外字段或令牌覆盖。

## 依据

- [发送显示元素列表](https://docin.divoom-gz.com/web/#/5/132)
- [批量命令](https://docin.divoom-gz.com/web/#/5/135)
- [动画文字](https://docin.divoom-gz.com/web/#/5/134)
- [播放 GIF](https://docin.divoom-gz.com/web/#/5/129)
- 402 参考源码：`middle/include/divoom.h`、`net/ctrl/divoom_http_server.c`、`net/src/divoom_drawing_json.c`、`net/src/divoom_general_json.c`、`app/src/divoom_net_app.c`、`app/src/divoom_light_app.c`。设备源码未修改。
