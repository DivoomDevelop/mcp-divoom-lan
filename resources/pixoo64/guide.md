# PIXOO64 MCP 控制

本资源仅适用于 PIXOO64 Hardware 90、92、96，画布为 64×64。MCP 不修改设备固件。

## 版本与路由

| Hardware | 默认端口 | POST 路径 | 成功字段 | 批量命令 |
|---|---|---|---|---|
| 90 | 80 | `/post` | `error_code:0` | 原生 `Draw/CommandList`，需要固件 90102+ |
| 92 | 80 | `/post` | `error_code:0` | 原生 `Draw/CommandList`，需要固件 90102+ |
| 96 | 9000 | `/divoom_api` | `ReturnCode:0` | MCP 逐条发送，参考源码没有原生列表执行分支 |

Hardware 与固件版本号是两回事，不可把 96 与 90102 作大小比较。响应兼容两种成功字段；缺少成功字段、非零代码、HTTP 错误或无效 JSON 均报错。即使同时返回两种字段，也必须全部为 0。HTTP 确认表示设备已应答，不代表已经观察到屏幕显示结果。

`watchface_list_devices` 返回这三种设备，并为它们附带 `model:"pixoo64"`、`hardware` 和正确端口。将所选 `target` 传给 `pixoo64_*` 工具。

PIXOO64 没有 TimesFrame/AstroToo 的 `Device/GetHardwareVersion` 接口。`pixoo64_*` 工具省略 `target.hardware` 时，每次从发现服务查找当前目标的 Hardware；不会依据名称或 IP 格式推测型号。网络不通、结果缺失或歧义时停止。直接局域网控制可显式设置：

```json
{"target":{"host":"192.168.1.100","model":"pixoo64","hardware":90}}
```

显式 `hardware` 是调用者指定的设备配置，返回 `identification:"hardware-override"`；它不代表设备已验证该版本。必须填写实际版本。显式 `target.port` 或 `DIVOOM_DEVICE_PORT` 覆盖默认端口；希望自动选端口时不要设置它们。

默认设备也可使用 `DIVOOM_DEVICE_HOST`、`DIVOOM_DEVICE_MODEL=pixoo64`、`DIVOOM_DEVICE_HARDWARE=90`（或 92/96）。硬件环境变量只用于该默认 host，不会套用到另一个目标。

## 工具

| 工具 | 作用 |
|---|---|
| `pixoo64_get_device_info` | 返回版本配置、路由、画布及 MCP 支持范围 |
| `pixoo64_send_animation` | 发送 1–59 帧 RGB888 动画；重置 GIF ID 后以 PicID=1 顺序发送 |
| `pixoo64_send_items` | 发送时间、日期、天气、文字等元素列表 |
| `pixoo64_send_text` | 发送单行文字，独立的动画字体 0–7，固定高 16 |
| `pixoo64_clear_text` | 清除所有 HTTP 文字和元素叠加层 |
| `pixoo64_set_brightness` | 亮度 0–100 |
| `pixoo64_onoff_screen` | `onOff:1` 开屏，`0` 关屏 |
| `pixoo64_set_channel` | `index:0` 表盘、1 云频道、2 频谱、3 自定义、4 黑屏 |
| `pixoo64_play_gif` | 播放设备可访问的 HTTP GIF URL，尺寸 16/32/64 的正方形 |
| `pixoo64_command_list` | 预先校验整批白名单命令，再按版本发送 |

同一 host 的完整操作排队执行，避免动画分帧和其他操作交错。所有帧和元素先校验后发送。设备错误或超时立即停止，提示失败下标与已确认数量；没有自动重试或回滚，失败命令也可能已经生效。

PIXOO64 不支持本 MCP 的 `watchface_*` 表盘创建、patch、资源上传、快照或通用 raw 工具。`watchface_get_device_info` 可返回 PIXOO64 配置信息。离线表盘设计仍只适用于 TimesFrame/AstroToo；PIXOO64 使用本资源和自己的示例。

## 元素与字体

先发送动画背景，再叠加文字/元素。`pixoo64_send_items` 与 `pixoo64_send_text` 可指定 `backgroundColor:"#000000"`，在同一个排队操作中发送纯色 64×64 背景后叠加元素。省略背景颜色则更新已有叠加层。

列表字段名区分大小写：`TextId`、`type`、`x`、`y`、`dir`、`font`、`TextWidth`、`Textheight`、`speed`、`align`、`color`、`TextString`、`update_time`。`TextId` 为 0–39，同 ID 替换已有元素；同一请求中不允许重复 ID。坐标与宽高必须位于 64×64 画布内。默认 `dir:0`、`speed:100`、`align:1`。方向 0 向左、1 向右；对齐 1 左、2 中、3 右；颜色为 `#RRGGBB`。

| type | 显示内容 | type | 显示内容 |
|---|---|---|---|
| 1 | 秒 | 2 | 分 |
| 3 | 时 | 4 | AM/PM |
| 5 | 时:分 | 6 | 时:分:秒 |
| 7 | 年 | 8 | 日 |
| 9 | 月 | 10 | 月-年 |
| 11 | 英文月份与日 | 12 | 日期与年 |
| 13 | 两字母星期 | 14 | 三字母星期 |
| 15 | 完整英文星期 | 16 | 三字母月份 |
| 17 | 当前温度 | 18 | 今日最高温度 |
| 19 | 今日最低温度 | 20 | 天气文字 |
| 21 | 噪声数值 | 22 | 自定义 UTF-8 文字 |
| 23 | HTTP URL 返回的文字 | | |

type 22 必须提供 `TextString`。type 23 的 `TextString` 是设备请求的 HTTP URL，服务器应返回 `{"DispData":"显示文字"}`；`update_time` 为 1–86400 秒，默认 60。文本少于 512 UTF-8 字节；设备 URL 少于 256 UTF-8 字节。参考 96 源码关闭了 TLS 下载支持，因此 MCP 统一限制设备 URL 为 `http://`。

列表的 `font` 使用 PIXOO64 的字体服务 `POST https://app.divoom-gz.com/Device/GetTimeDialFontList`，优先选择 `Type/type=0` 的字体以支持滚动，并核实字符集覆盖文字。该服务可能返回空列表；空列表不能被视为本地字体清单。文档示例的 font=2 用于英文数字，并不保证所有固件都安装相同字体。不可套用 TimesFrame/AstroToo 字体目录。

`pixoo64_send_text` 使用另一套 0–7 的动画字体；`TextId` 为 0–19，`TextWidth` 为 16–64，字符区域固定高 16。`speed` 为 0–100。旧固件文字、对齐和原生命令列表需 90102+；HTTP GIF URL 播放需 90096+。MCP 不假装通过 Hardware 验证了固件功能。

## 动画与批量命令

`pixoo64_send_animation` 的 `frames` 为标准 Base64 RGB888 字节串，从左至右、从上至下，每像素 R/G/B 各一字节。`width` 仅 16、32、64，默认 64；每帧解码长度须恰好 `width*width*3`。`speed` 为毫秒，默认 100。不能直接传 PNG/JPEG/GIF 文件的 Base64。该工具会重置设备 HTTP GIF ID，替换当前 HTTP 动画。

`pixoo64_command_list` 的 `commands` 为 1–40 个原生命令对象。只允许 `Draw/SendHttpItemList`、`Draw/SendHttpText`、`Draw/ClearHttpText`、`Draw/ResetHttpGifId`、`Draw/SendHttpGif`、`Channel/SetBrightness`、`Channel/OnOffScreen`、`Channel/SetIndex`、`Device/PlayTFGif`。不允许嵌套列表或未支持的设备命令。原生列表整体成功应答不能证明每一项的实际显示效果，也不提供事务回滚。

## 依据

- [发送元素列表](https://docin.divoom-gz.com/web/#/5/61)
- [命令列表](https://docin.divoom-gz.com/web/#/5/66)
- [发送动画](https://docin.divoom-gz.com/web/#/5/57)
- [发送文字](https://docin.divoom-gz.com/web/#/5/58)
- [字体列表](https://docin.divoom-gz.com/web/#/5/60)
- 本地 Hardware 96 参考：`middle/include/divoom.h`、`net/src/divoom_drawing_json.c`、`net/ctrl/divoom_http_server.c`、`app/src/divoom_net_app.c`。仅阅读，未修改设备源码。
