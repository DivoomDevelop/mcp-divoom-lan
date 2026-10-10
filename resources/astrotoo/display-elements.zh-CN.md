# AstroToo 显示元素说明

本文说明 MCP 如何发现、分类并安全使用 AstroToo 表盘显示元素。内容适用于 Hardware 530 和 480×480 画布。TimesFrame 的元素 ID、字体和坐标体系与 AstroToo 相互独立。

## 数据来源与覆盖范围

生成数据综合以下来源：

- `src/divoom_light/include/divoom_disp_clock.h` 中所有大于零的数字型显示元素声明；
- AstroToo 渲染器 C 源码中的直接引用和枚举别名引用；
- 渲染器接受的组件范围 `261 <= disp < 280`；
- 1,096 份内置及服务器补充的 AstroToo 表盘配置。

当前目录共包含 522 个 ID：481 个有渲染符号直接引用，1 个通过枚举别名引用，18 个来自组件范围，22 个只在头文件声明、没有直接渲染引用。参考配置实际使用了 227 个 ID，另外 295 个暂时没有已加载的配置用例。

相关 MCP 资源：

- `divoom://astrotoo/disp/summary`：数量、分类统计、常用元素及创作要求。
- `divoom://astrotoo/disp/catalog`：完整的逐 ID 元数据。
- `divoom://astrotoo/clocks/catalog`：表盘索引和示例 ClockId。
- `divoom://astrotoo/clocks/configs`：用于复制已验证元素组合的完整原生配置。
- `divoom://astrotoo/watchface/schema`：MCP 创作配置允许使用的元素 ID。

## 目录字段

| 字段 | 含义 |
|---|---|
| `disp` | `ItemList[].disp` 使用的 AstroToo 元素 ID。 |
| `name` | 去掉公共前缀后的固件符号名称。 |
| `description_en` / `description_zh` | 自动生成的英文标签和源码中的中文注释。 |
| `category` | 功能分类，例如 `time`、`weather`、`analog`、`calendar`。 |
| `renderKind` | `text`、`image`、`animation`、`analog_hand`、`composite` 或 `system`。 |
| `dataSource` | 数据生产方，例如设备时间、天气服务、日历服务或本地媒体。 |
| `assetRequirement` | 是否需要字体、本地素材、服务/固件素材或固件管理的复合元素。 |
| `implementationEvidence` | `direct_symbol`、`alias_symbol`、`renderer_range` 或 `declaration_only`。 |
| `authoringMode` | `direct`、`component_reference`、`declared_only` 或 `firmware_internal`。 |
| `usage` | 参考配置次数、是否有用例以及示例 ClockId。 |

`declaration_only` 记录为了资料完整性而保留，但不会进入创作 JSON Schema；没有真机证据时不能生成。已经实现但 `usedInReferenceConfigs=false` 的元素也需要真机验证，因为当前没有已验证的布局和配套字段用例。

## 功能分类汇总

| 分类 | ID 数量 | 典型内容 |
|---|---:|---|
| `weather` | 82 | 天气图标、温度、湿度、风、空气质量、日出日落和预报。 |
| `photo_video` | 71 | 照片、WebP/GIF/视频、像素表盘、图库和动画。 |
| `app_data` | 58 | App 标题、名称、数据列和应用数据字段。 |
| `date` | 54 | 日、月、年、星期以及组合日期格式。 |
| `time` | 45 | 时、分、秒、AM/PM、时区和时间数字。 |
| `text` | 44 | 用户文本、消息、每日短句和可配置文本区域。 |
| `calendar` | 35 | 日历网格、事件、日程、活动和待办事项。 |
| `lunar_culture` | 25 | 中国农历、节气、节日及文化数据。 |
| `component` | 24 | 子表盘、动态组件和特殊表盘元素。 |
| `countdown` | 23 | 倒计时、正计时、纪念日和节日计数。 |
| `image` | 15 | 通用固件图片或本地图片位置。 |
| `network` | 11 | 网络图库、RSS 和网页内容。 |
| `music` | 10 | 歌曲信息、歌手、歌词和音频动画。 |
| `system_status` | 6 | Wi-Fi、电池、音量、闹钟和工作模式。 |
| `analog` | 5 | 时针、分针、秒针和世界时钟指针。 |
| `ai_dynamic` | 4 | AI 文本、表情、背景和动态内容。 |
| `environment` | 4 | 噪音等设备环境或传感器数据。 |
| `finance` | 4 | 股票、汇率和金融趋势。 |
| `system_control` | 2 | 渲染器内部控制元素，不能直接创作。 |

## 创作要求

1. 先调用 `watchface_get_device_info` 检测 Hardware；只有 Hardware 530 识别为 AstroToo 时才使用本目录。
2. 调用 `watchface_disp_catalog`，优先选择 `usage.usedInReferenceConfigs=true` 的元素。
3. 使用 `usage.exampleClockIds` 中的 ClockId，通过 `watchface_clock_catalog` 配合 `includeConfig:true` 获取用例，或读取完整配置资源。
4. 对相关元素按完整组合复制。预报列、日历复合元素、图片序列、时间数字图片和 App 数据列通常依赖同组的其他元素。
5. 检查 `dataSource`。只有布局 JSON 不能产生天气、日历、音乐、金融、AI、App 或网络数据，设备上必须存在对应运行服务或缓存数据。
6. 需要本地图片时，使用 `watchface_upload_file` 逐个上传，绑定返回的 `local://` 引用，再通过固定 ClockId 60000 的创建/修改流程提交。
7. 写入后重新读取配置并获取一张新的设备截图进行验证。

## 重要元素组合

- 指针：`131 HOUR_POINT_IMAGE`、`132 MIN_POINT_IMAGE`、`233 SECOND_POINT_IMAGE`。使用尺寸一致、透明背景、朝上的正方形图片，共用同一中心轴，并正确设置层级。
- 日出日落：`176 SUNRISE_TIME`、`177 SUNSET_TIME`。旧生成逻辑因为符号中没有 `SUPPORT_` 而漏掉了这两个元素。
- 组件：`261–279` 是子表盘组件位置，必须保留原生配置中的 `item_id` 和组件 ClockId 绑定。`280 DAIL_COMPONENT_END_ID` 是范围结束标记，不能用于创作。
- 全屏歌词：`538 FULL_SCREEN_LYRICS` 是由音频服务驱动的复合元素，已有原生配置用例，不能当作普通静态文本框使用。
- 上传进度：`1000 HTTP_UPLOAD_PROGRESS` 是固件内部元素，不能用于创作。

## 查询示例

查询有参考用例的天气图片元素：

```json
{
  "model": "astrotoo",
  "category": "weather",
  "renderKind": "image",
  "usedInReferenceConfigs": true,
  "limit": 100
}
```

查询指针和全屏歌词：

```json
{
  "model": "astrotoo",
  "ids": [131, 132, 233, 538],
  "limit": 20
}
```

资源生成程序是 `scripts/build-astrotoo-resources.mjs`。重新生成时需要设置 `DIVOOM_ASTROTOO_SIMULATOR_ROOT`；`DIVOOM_ASTROTOO_DEVICE_ID` 默认使用参考设备 `300400436`。
