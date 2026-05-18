# `disp` 选择指南（给 AGENT）

`disp` 是表盘元素的 **firmware 端类型 id**，它决定渲染管线、是不是需要外部
图片资源、是文本还是数字、是否需要联网取数等等。AGENT 在写 `ItemList[i].disp`
或 `ItemPatchList[i].patch.disp` 之前，请先翻这份目录。

## MCP 入口

- 资源：`divoom://disp/catalog`（JSON，`application/json`，194 个条目）
- 工具：`watchface_disp_catalog` —— 支持下面过滤参数：
  - `ids: number[]` —— 只取指定的 disp id
  - `nameContains: string` —— 在英文符号上做大小写不敏感的子串匹配（如 `WEATHER`）
  - `descriptionContains: string` —— 在中文描述里做匹配（如 `日历`）
  - `expects: "any" | "image" | "text"` —— 用启发式信号筛
  - `limit: number` —— 默认 80，最大 300
  - `idsOnly: boolean` —— 仅返回 `[{disp,name,description_zh}]` 紧凑视图

数据来源：

1. 编辑器 `npm run gen:ai-docs` 产物 `docs/generated/disp-catalog.json`
   （`disp + name + hints`）；
2. 叠加 `src/editor/app.js` 的 `DISP_COMMENT_ZH_MAP`（中文释义，**最权威的人类描述**）。

合并工作由 `scripts/sync-editor-ai-bundle.mjs` 完成。

## 字段说明

| 字段 | 含义 |
|---|---|
| `disp` | 写到 `ItemList[i].disp` 的整数 id |
| `name` | 编辑器导出的英文符号，例如 `HOUR_MIN`、`SUNRISE_SUNSET_TIME` |
| `description_zh` | 中文描述，与编辑器的 `DISP_COMMENT_ZH_MAP` 同源 |
| `hints.likelyUsesRasterOrAssetLayer` | `true` ⇒ 这个槽位通常需要 `image_addr` 或图层资源（如 `_PIC` / `_IMAGE` / `_GIF` 类） |
| `hints.oftenUsesVectorFontForText` | `true` ⇒ 这个槽位以文本/数字为主，需要给 `font` 一个合适的 id |
| `hints.note` | 一句话提示「这是启发式判断；最终以固件 + 设备实测为准」 |

## 推荐用法

1. `watchface_get_local` 读到当前 `ItemList`。
2. 逐个 slot 看 `disp`：
   - `expects: "image"` 命中 → 准备 `image_addr` 资源（参与 `clock_bg.tar.gz` 打包）
   - `expects: "text"` 命中 → 走 `watchface_font_catalog` 选 `font`
   - 两个 hint 都 false ⇒ 多半是「驱动型」槽位（动画/状态机），通常不需要素材也不依赖 font
3. 改 `disp` 时，务必把 `font` 和 `image_addr` 一起对齐（避免出现「文本 disp 配
   `image_addr`」之类的非法组合）。
4. `disp = 204`（SUNRISE_SUNSET_TIME）：当前固件不再来回切换，而是
   - 在「今天日出 ~ 日落」窗口里显示 **日落时间**；
   - 其它时间显示 **下一个日出**（跨过日落自动滚到次日）。
   面向用户时建议描述为「日出/日落时间（按当前时间自动切换）」。

## 图像元素唯一性（网络图库系列）

**在同一本地表盘的 `ItemList` 里，图像类元素每种 `disp` 原则上只应出现一行。** 若同一 `disp`
被配置了多行（或等价的多实例），固件侧往往 **以后面的条目为准**，前面的会被覆盖或失效，
表现为「只显示最后一次那张图 / 最后一次绑定」。

下列 **网络图库** 槽位（固件侧 `DIVOOM_CLOCK_DISP_SUPPORT_NET*_PIC`）尤其典型——AGENT 生成表盘时
**各自至多一行**，不要重复添加：

| `disp` | 编辑器符号 | 中文说明 | 固件常量（参考） |
|---:|---|---|---|
| 13 | `NET_PIC` | 网络图库 | `DIVOOM_CLOCK_DISP_SUPPORT_NET_PIC` |
| 173 | `NET2_PIC` | 网络图库2 | `DIVOOM_CLOCK_DISP_SUPPORT_NET2_PIC` |
| 174 | `NET3_PIC` | 网络图库3 | `DIVOOM_CLOCK_DISP_SUPPORT_NET3_PIC` |
| 175 | `NET4_PIC` | 网络图库4 | `DIVOOM_CLOCK_DISP_SUPPORT_NET4_PIC` |
| 125 | `NET5_PIC` | 网络图库5 | `DIVOOM_CLOCK_DISP_SUPPORT_NET5_PIC` |
| 126 | `NET6_PIC` | 网络图库6 | `DIVOOM_CLOCK_DISP_SUPPORT_NET6_PIC` |
| 127 | `NET7_PIC` | 网络图库7 | `DIVOOM_CLOCK_DISP_SUPPORT_NET7_PIC` |
| 128 | `NET8_PIC` | 网络图库8 | `DIVOOM_CLOCK_DISP_SUPPORT_NET8_PIC` |
| 129 | `NET9_PIC` | 网络图库9 | `DIVOOM_CLOCK_DISP_SUPPORT_NET9_PIC` |
| 130 | `NET10_PIC` | 网络图库10 | `DIVOOM_CLOCK_DISP_SUPPORT_NET10_PIC` |

其它带本地 / 网络 **`image_addr`** 的槽位也建议遵循「**每种 `disp` 至多一行**」，除非编辑器或
官方文档明确允许多实例。

## 与字体目录配合

```text
ItemList[i] is text-driven (hints.oftenUsesVectorFontForText)
  ├── content is digits only (time/date/temp)        → font: digits-capable image font 或 digital TTF
  ├── content is Latin only (AM/PM, weekday short)   → font: latin-capable TTF
  └── content has CJK (中文 weekday/lunar/user text) → font: cjk-capable TTF

ItemList[i] is asset-driven (hints.likelyUsesRasterOrAssetLayer)
  ├── 用户提供的本地图 → image_addr = 叶子名，并把文件放进 clock_bg.tar.gz
  └── 网络/云端图       → image_addr = http(s)://...
```

详见 `docs/font-usage.md`。

## 模拟指针类 `disp`（131 / 132 / 233）

**`HOUR_POINT_IMAGE`（131）、`MIN_POINT_IMAGE`（132）、`SECOND_POINT_IMAGE`（233）**
用于「_RESOURCE 指针图」驱动模拟时钟，而不是数字时间字符串。

- **`ItemList[i].image_addr`**（或 PATCH 时的 **`bundle_image`**）指向 tar 里的叶子；每张图
  的尺寸必须等于该条的 **`w`×`h`**。
- **旋转枢轴**在图层矩形 **`(x,y,w,h)`** 的几何中心一侧（设备按指针类型旋转）；因此三根针
  应共用同一 **`x,y,w,h`**，且素材以**正方形**最为稳妥。
- 指针美术：**枢轴在画布中心**，针尖指向 **12 点（屏幕上方）**；禁止把指针画在 **`800×1280`**
  全屏图的任意偏移位置来代替「方形图层」——会出现三根针围绕不同中心旋转的现象。
- **`transp`**：**需要能看见的元素必须显式 `transp: 100`**。模型生成 JSON 时常默认为 **`0`**，设备上会 **整块透明看不见**（误以为坐标错了）。
- **`hier`**（叠层，仅 **`0` / `1` / `2`**）：**`0`** = 自动；**`1`** = **底层**；**`2`** = **顶层**。秒针通常 **`2`**，时针常 **`1`**，分针可用 **`0`**，按真机微调。
- 参考排版统计：`watchface_disp_catalog` 中上述 `disp` 的 **`typography.box.p50`**。
- 实操示例：`docs/tool-examples.md` 第 **5b** 节。

## `typography` 排版统计（v0.1.4+）

同步编辑器 bundle 后，`divoom://disp/catalog` 里每个 `disp` 可能多一段 **`typography`**：

- 来自编辑器自带的 `public/template/config/*.cfg` 聚合（上架模板几何分布）。
- `size` / `box.{x,y,w,h}` 的 `p10` / `p50` / `p90`：新手默认用 **`p50`（中位数）** 当初始 `size/x/y/w/h`。
- `alig.mode`：模板里出现最多的对齐（3 居中 / 4 左 / 5 右）。
- `colorHints.color_*_common`：该 disp 下最常见的 `#RRGGBB`，仅作配色启发。

快捷工具：**`watchface_layout_suggest`**（传 `disp`）会直接吐出一份合并后的 **`suggestedItemFields`**（median + 常见色）。

这不是固件校验规则；最终仍以预览与真机效果为准。

## 维护方式

```bash
# 一键同步整个 AI bundle
npm run sync:editor -- path/to/divoom-watchface-visual-editor
```

如果只想刷新这一份 disp 目录，可以重新跑 `scripts/sync-editor-ai-bundle.mjs`，
它会读编辑器仓库，**优先**使用 `docs/generated/disp-catalog.json`（保留 hints），
**额外**注入 `DISP_COMMENT_ZH_MAP` 中的中文释义。
