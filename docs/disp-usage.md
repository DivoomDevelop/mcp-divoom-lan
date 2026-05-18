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
