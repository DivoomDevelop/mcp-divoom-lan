# Divoom 表盘字体 AI 使用指南

> 自动生成于 `2026-05-29T10:26:16.712Z`，数据源 `public/font/font_info.cfg`。
> 共 **157** 款字体：矢量 TTF **123** 款，位图字图集 **34** 款。
> 机器可读 ID 列表见同目录 `ai-font-catalog.json`。

---

## 一、AI 必须遵守的字体规则

1. **`font` 字段必须是整数 ID**，只能使用本文档或 `ai-font-catalog.json` 中 `allowedFontIds` 列出的值，禁止臆造。
2. **矢量 TTF（type=1 / `vector_ttf`）**：可自由使用 `size`、`color_r/g/b`、`color_a`、`sep`（字间距）、`alig`（对齐）等文本样式。
3. **位图字图集（type=0 / `image_glyph`）**：字形外观已烘焙进位图，**颜色与字号样式无效**；通过 `x,y,w,h,alig` 布局框缩放。字符集有限，见各字体 `charset`。
4. **同一 `name` 可能对应多个 ID**（不同字重/文件版本），选 ID 时以本文档条目为准，不要只凭名称。
5. **成套主题字体**（如彩虹手账 340/342/344、节气画历 348-352、像素霓城 290/292）应整套使用以保持风格统一。

---

## 二、按场景快速选字体

| 场景 | 推荐 font ID | 说明 |
|------|-------------|------|
| 主时钟大数字（时/分/秒） | 24, 110, 112, 256, 262, 268, 290, 292, 326, 340 | 需要固定位图外观选 image_glyph；需要可调颜色选 DS Digital (24/110) |
| 中文日期/星期/说明 | 26, 62, 100, 126, 16, 60 | 思源黑体(26)与 HarmonyOS Regular(62) 最通用 |
| 中文大标题/海报风 | 252, 186, 168, 196, 160, 360 | 优设标题黑(252)、站酷系列辨识度高 |
| 国风/农历/节气 | 184, 238, 246, 348, 350, 352 | 宋体配节气画历位图字(id 348-352) 成套 |
| 像素/复古游戏 | 66, 98, 222, 272, 276, 298, 300, 268, 270 | 8-bit Arcade、ArcadeClassic、Galmuri 系列 |
| 可爱/少女/手账 | 160, 254, 360, 278, 302, 304, 340, 342, 344, 330 | 手写体 + 彩虹手账/粘土/粉彩位图数字 |
| 英文大标题 | 90, 228, 114, 124, 116, 152 | Bebas Neue(90) 最常用；League Gothic(228) 窄高 |
| 英文正文/UI | 126, 208, 96, 328 | Tahoma(126)、Nunito(208) |
| 蒸汽波/霓虹/赛博 | 326, 290, 292, 116, 102 | 蒸汽波渐变(326)、像素霓城(290/292) |
| Emoji 符号 | 182 | 仅 EmojiFont(182)，配合 Emoji 类 disp |

---

## 三、字体类型对比

| 类型 | type 值 | 可调样式 | 典型用途 | 代表 ID |
|------|---------|----------|----------|---------|
| 矢量 TTF | 1 | size, color, sep, alig 等 | 任意文本、中文说明、可调色数字 | 26, 62, 24, 90 |
| 位图字图集 | 0 | 仅 x,y,w,h,alig | 预设计数字/艺术字，风格固定 | 112, 340, 326, 348 |

---

## 四、按分类详述

### 位图字图集（image_glyph）

#### font=112 · webp font Digital

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：WebP 位图数码数字，预渲染七段/电子风格
- **效果/气质**：固定位图外观，颜色/字号不可调；仅 0-9
- **推荐用途**：主时间数字；需要固定位图效果的时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `数字`, `数码`

#### font=256 · 70*86

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：70×86 像素位图大数字
- **效果/气质**：超大块像素数字，固定位图；仅 0-9
- **推荐用途**：大号主时钟数字
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `像素`, `数字`, `大号`

#### font=258 · 20*26

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：20×26 像素位图小数字
- **效果/气质**：紧凑像素数字；仅 0-9
- **推荐用途**：小号时间/日期数字；副时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `像素`, `数字`, `小号`

#### font=262 · Blue time font

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：Blue time 蓝色主题位图数字
- **效果/气质**：预渲染蓝色电子/艺术数字；仅 0-9
- **推荐用途**：蓝色主题表盘主时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `数字`, `蓝色`

#### font=268 · Pixel Machine Font 1

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：Pixel Machine 像素机台数字（仅数字）
- **效果/气质**：机械像素风固定位图；0-9
- **推荐用途**：赛博/机械风时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `像素`, `数字`

#### font=270 · Pixel Machine Font 1

- **类型**：image_glyph（位图）
- **字符集**：`ABCDEFGHIJKLMNOPQRSTUVWXYZ`（26 字符）
- **视觉特点**：Pixel Machine 像素机台大写字母
- **效果/气质**：同上系列，仅 A-Z 大写
- **推荐用途**：像素风英文缩写/AM PM
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `像素`, `英文`

#### font=278 · Pastel Dream font

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：Pastel Dream 粉彩梦幻位图数字
- **效果/气质**：柔和粉彩渐变固定位图；0-9
- **推荐用途**：少女/梦幻风主时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `粉彩`, `数字`

#### font=280 · 波普艺术手写字体1

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：波普艺术手写字体1 位图数字
- **效果/气质**：波普风手绘数字，风格1；0-9
- **推荐用途**：波普/艺术风表盘时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `波普`, `手写`, `数字`

#### font=282 · 波普艺术手写字体2

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：波普艺术手写字体2 位图数字
- **效果/气质**：波普风手绘数字，风格2（与 id 280 成对）；0-9
- **推荐用途**：波普风表盘，可与 280 混用做层次
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `波普`, `手写`, `数字`

#### font=290 · 像素霓城字体（紫）

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：像素霓城字体（紫）位图数字
- **效果/气质**：紫色霓虹像素城市场景数字；0-9
- **推荐用途**：赛博朋克/霓虹紫主题时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `霓虹`, `像素`, `紫色`

#### font=292 · 像素霓城字体（蓝）

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：像素霓城字体（蓝）位图数字
- **效果/气质**：蓝色霓虹像素数字；0-9
- **推荐用途**：赛博朋克/霓虹蓝主题时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `霓虹`, `像素`, `蓝色`

#### font=294 · 警戒信号烟雾字体

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：警戒信号烟雾字体 位图数字
- **效果/气质**：烟雾/警示风格艺术数字；0-9
- **推荐用途**：工业/警示/军事风表盘
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `烟雾`, `数字`

#### font=296 · 海底泡泡屋时间字体

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：海底泡泡屋时间字体 位图数字
- **效果/气质**：气泡/水下主题可爱数字；0-9
- **推荐用途**：海洋/儿童风主时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `气泡`, `可爱`, `数字`

#### font=302 · 咩咩好心情手写体1

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：咩咩好心情手写体1 位图数字
- **效果/气质**：可爱羊主题手写数字；0-9
- **推荐用途**：萌系/农场风表盘
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `手写`, `可爱`, `数字`

#### font=304 · 咩咩好心情手写体2

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：咩咩好心情手写体2 位图数字
- **效果/气质**：同系列变体2；0-9
- **推荐用途**：与 id 302 搭配使用
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `手写`, `可爱`, `数字`

#### font=306 · 咔滋一口不规则数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：咔滋一口不规则手绘位图数字
- **效果/气质**：食物/零食风不规则手绘；0-9
- **推荐用途**：美食/趣味风表盘
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `手绘`, `不规则`, `数字`

#### font=308 · 波普艺术方形绿色数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：波普艺术方形绿色位图数字
- **效果/气质**：方形块面波普绿；0-9
- **推荐用途**：波普/复古绿主题时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `波普`, `绿色`, `数字`

#### font=310 · 波普艺术方形粉色数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：波普艺术方形粉色位图数字
- **效果/气质**：方形块面波普粉；0-9
- **推荐用途**：波普/复古粉主题时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `波普`, `粉色`, `数字`

#### font=314 · 黑色描边手绘数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：黑色描边手绘位图数字
- **效果/气质**：白底黑描边手绘风；0-9
- **推荐用途**：手账/涂鸦风表盘
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `描边`, `手绘`, `数字`

#### font=316 · 橙色铅笔手绘数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：橙色铅笔手绘位图数字
- **效果/气质**：铅笔质感橙色手绘；0-9
- **推荐用途**：手账/文具风表盘
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `铅笔`, `手绘`, `数字`

#### font=324 · 粉色玻璃数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：粉色玻璃质感位图数字
- **效果/气质**：半透明玻璃材质渲染；0-9
- **推荐用途**：玻璃拟态/粉色主题时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `玻璃`, `粉色`, `数字`

#### font=326 · 蒸汽波渐变数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：蒸汽波渐变位图数字
- **效果/气质**：Vaporwave 渐变霓虹；0-9
- **推荐用途**：蒸汽波/复古未来风时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `蒸汽波`, `渐变`, `数字`

#### font=330 · 粘土数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：粘土/黏土质感位图数字
- **效果/气质**：3D 粘土材质可爱数字；0-9
- **推荐用途**：3D 可爱/Claymorphism 风表盘
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `粘土`, `3D`, `数字`

#### font=332 · 小虎购物日粉色数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：小虎购物日粉色位图数字
- **效果/气质**：购物/零售主题粉色数字；0-9
- **推荐用途**：购物节/促销风表盘
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `粉色`, `主题`, `数字`

#### font=334 · 小虎购物日蓝色数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：小虎购物日蓝色位图数字
- **效果/气质**：同系列蓝色变体；0-9
- **推荐用途**：与 id 332 成对使用
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `蓝色`, `主题`, `数字`

#### font=340 · 彩虹手账时间数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：彩虹手账时间位图数字
- **效果/气质**：彩虹色手账风，专用于时间；0-9
- **推荐用途**：手账风表盘主时钟
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `彩虹`, `手账`, `时间`

#### font=342 · 彩虹手账温度数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：彩虹手账温度位图数字
- **效果/气质**：同系列，适合温度显示；0-9
- **推荐用途**：手账风温度 disp
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `彩虹`, `手账`, `温度`

#### font=344 · 彩虹手账日期数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：彩虹手账日期位图数字
- **效果/气质**：同系列，适合日期；0-9
- **推荐用途**：手账风日期 disp
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `彩虹`, `手账`, `日期`

#### font=346 · 跨年报纸倒计时数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789adoTy`（15 字符）
- **视觉特点**：跨年报纸倒计时位图字
- **效果/气质**：报纸排版风，含数字+adoTy（day/today/yesterday 等缩写）；固定位图
- **推荐用途**：倒计时；报纸/新闻风表盘
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `报纸`, `倒计时`

#### font=348 · 节气画历-温度/年份-月份字体

- **类型**：image_glyph（位图）
- **字符集**：`0123456789.-/`（13 字符）
- **视觉特点**：节气画历温度/年月位图字
- **效果/气质**：国风节气主题，含数字与 .-/；固定位图
- **推荐用途**：温度；年份；月份显示
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `国风`, `节气`

#### font=350 · 节气画历日期数字

- **类型**：image_glyph（位图）
- **字符集**：`0123456789`（10 字符）
- **视觉特点**：节气画历日期位图数字
- **效果/气质**：国风节气日期专用；0-9
- **推荐用途**：日期 disp（节气主题）
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `国风`, `日期`

#### font=352 · 节气画历农历字体

- **类型**：image_glyph（位图）
- **字符集**：`0123456789cdlnyz`（16 字符）
- **视觉特点**：节气画历农历位图字
- **效果/气质**：含农历用字 cdlnyz 等；固定位图
- **推荐用途**：农历/节气说明文字
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `国风`, `农历`

#### font=354 · 几何拼贴小字体

- **类型**：image_glyph（位图）
- **字符集**：`0123456789°-`（12 字符）
- **视觉特点**：几何拼贴小位图字
- **效果/气质**：几何拼贴艺术风，含数字与 °-；固定位图
- **推荐用途**：温度（带°）；小型装饰数字
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `几何`, `拼贴`

#### font=356 · (未命名)

- **类型**：image_glyph（位图）
- **字符集**：`0123456789°-`（12 字符）
- **视觉特点**：几何拼贴小位图字（无名称变体）
- **效果/气质**：与 id 354 同类，含 0-9 与 °-
- **推荐用途**：与 354 类似，温度/小数字
- **样式字段**：位图字图集：仅调整 x,y,w,h,alig；size/color/sep 等无效
- **标签**：`位图`, `几何`, `拼贴`

### 数码 / LED / 像素

#### font=24 · 009-DS Digital

- **类型**：vector_ttf（矢量）
- **视觉特点**：DS Digital 经典七段数码管
- **效果/气质**：LED/计算器数码显示，科技感强
- **推荐用途**：时/分/秒数字；倒计时；步数
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`数码`, `LED`, `数字`

#### font=66 · Square pixel 12 Simplified

- **类型**：vector_ttf（矢量）
- **视觉特点**：Square pixel 12 简体像素字
- **效果/气质**：8-bit 方块像素，复古游戏感
- **推荐用途**：像素风表盘文字；复古游戏主题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`像素`, `中文`, `复古`

#### font=84 · Big Pixel Shadowed Demo

- **类型**：vector_ttf（矢量）
- **视觉特点**：Big Pixel Shadowed Demo：电子/像素/数码风格
- **效果/气质**：科技感或复古游戏感
- **推荐用途**：时钟数字；倒计时；数据
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`数码/LED/电子`

#### font=98 · 8-bit Arcade Out

- **类型**：vector_ttf（矢量）
- **视觉特点**：8-bit Arcade Out 空心像素街机字
- **效果/气质**：街机游戏空心像素轮廓
- **推荐用途**：复古游戏表盘；装饰英文
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`像素`, `8-bit`, `英文`

#### font=110 · DS-Digital Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：DS-Digital Bold 粗七段数码
- **效果/气质**：比 id 24 更粗的 LED 数码管
- **推荐用途**：大号时间数字；主时钟
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`数码`, `LED`, `数字`, `粗体`

#### font=144 · Silkscreen-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Silkscreen 像素无衬线
- **效果/气质**：清晰小像素英文
- **推荐用途**：像素风小号英文
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`像素`, `英文`

#### font=216 · Silkscreen-Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Silkscreen-Bold：电子/像素/数码风格，粗体/Heavy 字重
- **效果/气质**：科技感或复古游戏感，更醒目
- **推荐用途**：时钟数字；倒计时；数据
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`数码/LED/电子`, `粗体`

#### font=222 · 8-bit Arcade In

- **类型**：vector_ttf（矢量）
- **视觉特点**：8-bit Arcade In 实心像素街机字
- **效果/气质**：实心像素块，比 id 98 更实
- **推荐用途**：复古游戏表盘英文
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`像素`, `8-bit`

#### font=272 · ArcadeClassic

- **类型**：vector_ttf（矢量）
- **视觉特点**：Arcade Classic 经典街机像素
- **效果/气质**：80年代街机字母数字
- **推荐用途**：复古游戏表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`像素`, `街机`

#### font=276 · ProggyClean Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：ProggyClean 编程等宽像素
- **效果/气质**：程序员终端风，等宽清晰
- **推荐用途**：等宽数据；黑客/终端风
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`等宽`, `像素`, `终端`

#### font=298 · Galmuri11-Bold

- **类型**：vector_ttf（矢量）
- **字符集**：`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-°`（64 字符）
- **视觉特点**：Galmuri11 Bold 韩文像素无衬线（含拉丁）
- **效果/气质**：11px 韩系像素字体，清晰等宽感；字符集有限
- **推荐用途**：像素风英文/数字；复古 UI
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`像素`, `等宽`, `Limited charset`

#### font=300 · Galmuri7

- **类型**：vector_ttf（矢量）
- **字符集**：`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`（62 字符）
- **视觉特点**：Galmuri7 更小号韩文像素体
- **效果/气质**：7px 像素，更紧凑；字符集有限
- **推荐用途**：小号像素文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`像素`, `小号`, `Limited charset`

### 中文无衬线正文

#### font=6 · 002-Career

- **类型**：vector_ttf（矢量）
- **视觉特点**：几何无衬线，笔画干净、偏商务
- **效果/气质**：稳重职业感，适合信息密度较高的界面
- **推荐用途**：日期/星期；辅助数据；英文标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`无衬线`, `英文`

#### font=8 · 003-Absolute

- **类型**：vector_ttf（矢量）
- **视觉特点**：003-Absolute：现代中文无衬线
- **效果/气质**：清晰易读
- **推荐用途**：中文正文；日期/星期；说明文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文无衬线`

#### font=10 · 003-Absolute

- **类型**：vector_ttf（矢量）
- **视觉特点**：003-Absolute：现代中文无衬线
- **效果/气质**：清晰易读
- **推荐用途**：中文正文；日期/星期；说明文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文无衬线`

#### font=12 · 003-Absolute

- **类型**：vector_ttf（矢量）
- **视觉特点**：003-Absolute：现代中文无衬线
- **效果/气质**：清晰易读
- **推荐用途**：中文正文；日期/星期；说明文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文无衬线`

#### font=14 · 004-Wander Brave

- **类型**：vector_ttf（矢量）
- **视觉特点**：手写感粗体展示字，带冒险/旅行气质
- **效果/气质**：标题醒目，有户外探索感
- **推荐用途**：表盘主标题；装饰性英文词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`展示`, `英文`

#### font=16 · 005-OPPOSans Medium

- **类型**：vector_ttf（矢量）
- **视觉特点**：OPPO Sans 中等字重，现代中文无衬线
- **效果/气质**：清晰易读，中性百搭
- **推荐用途**：中文正文；日期说明；天气文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `无衬线`, `正文`

#### font=18 · 006-Library 3 am

- **类型**：vector_ttf（矢量）
- **视觉特点**：Library 3 am，细线复古衬线/装饰混合
- **效果/气质**：文艺、深夜阅读氛围
- **推荐用途**：装饰标题；英文短句
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`装饰`, `英文`

#### font=20 · 007-Keep Calm

- **类型**：vector_ttf（矢量）
- **视觉特点**：Keep Calm 风格，英式海报粗体
- **效果/气质**：经典 Keep Calm 海报气质，稳重大字
- **推荐用途**：英文主标题；标语
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`展示`, `英文`

#### font=22 · 008-smooth line 7

- **类型**：vector_ttf（矢量）
- **视觉特点**：smooth line 7，细线几何无衬线
- **效果/气质**：轻盈、现代
- **推荐用途**：小号辅助文字；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`无衬线`, `细体`

#### font=26 · 001-SourceHanSans

- **类型**：vector_ttf（矢量）
- **视觉特点**：思源黑体（Source Han Sans），标准中文无衬线
- **效果/气质**：通用中文正文，可读性最佳之一
- **推荐用途**：中文日期/星期；天气/健康说明；任意中文文本
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `无衬线`, `正文`, `通用`

#### font=30 · 005-OPPOSans Heavy

- **类型**：vector_ttf（矢量）
- **视觉特点**：OPPO Sans Heavy 超粗中文无衬线
- **效果/气质**：极粗、冲击力强
- **推荐用途**：大号时间数字旁的中文；主标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `粗体`, `标题`

#### font=52 · OPPO Sans-Blod

- **类型**：vector_ttf（矢量）
- **视觉特点**：OPPO Sans-Blod：现代中文无衬线，粗体/Heavy 字重
- **效果/气质**：清晰易读，更醒目
- **推荐用途**：中文正文；日期/星期；说明文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文无衬线`, `粗体`

#### font=54 · HarmonyOS_SansSC_Black

- **类型**：vector_ttf（矢量）
- **视觉特点**：HarmonyOS Sans SC Black 极粗
- **效果/气质**：华为鸿蒙黑体，现代、厚重
- **推荐用途**：大号中文标题；强调数字旁文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `粗体`, `系统`

#### font=56 · HarmonyOS_SansSC_Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：HarmonyOS Sans SC Bold 粗体
- **效果/气质**：清晰有力，适合标题
- **推荐用途**：中文标题；星期/月份
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `粗体`

#### font=58 · HarmonyOS_SansSC_Light

- **类型**：vector_ttf（矢量）
- **视觉特点**：HarmonyOS Sans SC Light 细体
- **效果/气质**：轻盈通透
- **推荐用途**：小号辅助中文；次要信息
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `细体`

#### font=60 · HarmonyOS_SansSC_Medium

- **类型**：vector_ttf（矢量）
- **视觉特点**：HarmonyOS Sans SC Medium 中等
- **效果/气质**：平衡的正文粗细
- **推荐用途**：中文正文；通用
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `正文`

#### font=62 · HarmonyOS_SansSC_Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：HarmonyOS Sans SC Regular 常规
- **效果/气质**：标准鸿蒙正文
- **推荐用途**：中文正文；日期文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `正文`, `通用`

#### font=64 · HarmonyOS_SansSC_Thin

- **类型**：vector_ttf（矢量）
- **视觉特点**：HarmonyOS Sans SC Thin 极细
- **效果/气质**：极细线条，精致
- **推荐用途**：小号注释；极简风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `细体`, `极简`

#### font=100 · SourceHanSansCN-Medium

- **类型**：vector_ttf（矢量）
- **视觉特点**：思源黑体 CN Medium
- **效果/气质**：中等粗细中文正文
- **推荐用途**：中文正文；通用文本
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `正文`

#### font=126 · 全语言Tahoma

- **类型**：vector_ttf（矢量）
- **视觉特点**：全语言 Tahoma 系统无衬线
- **效果/气质**：Windows 经典 UI 字体，多语言兼容
- **推荐用途**：英文/数字正文；通用 UI 文本
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`系统`, `无衬线`, `多语言`

#### font=128 · SourceHanSans-Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：思源黑体 Bold 粗体
- **效果/气质**：中文粗标题
- **推荐用途**：中文标题；强调文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `粗体`

#### font=132 · SourceHanSans-Heavy

- **类型**：vector_ttf（矢量）
- **视觉特点**：思源黑体 Heavy 超粗
- **效果/气质**：极粗中文展示
- **推荐用途**：大号中文标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `超粗`

#### font=170 · Alimama Square Medium

- **类型**：vector_ttf（矢量）
- **视觉特点**：Alimama Square Medium：现代中文无衬线，较轻字重
- **效果/气质**：清晰易读
- **推荐用途**：中文正文；日期/星期；说明文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文无衬线`, `轻量`

#### font=172 · Alimama Square SemiBold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Alimama Square SemiBold：现代中文无衬线，粗体/Heavy 字重
- **效果/气质**：清晰易读，更醒目
- **推荐用途**：中文正文；日期/星期；说明文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文无衬线`, `粗体`

#### font=184 · 思源宋体SemiBold

- **类型**：vector_ttf（矢量）
- **视觉特点**：思源宋体 SemiBold 中文衬线
- **效果/气质**：传统宋体，典雅书卷气
- **推荐用途**：国风/文艺中文；日期农历说明
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `衬线`, `宋体`

#### font=192 · 汇文港黑v1.001

- **类型**：vector_ttf（矢量）
- **视觉特点**：汇文港黑v1.001：现代中文无衬线
- **效果/气质**：清晰易读
- **推荐用途**：中文正文；日期/星期；说明文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文无衬线`

#### font=194 · 京东朗正体

- **类型**：vector_ttf（矢量）
- **视觉特点**：京东朗正体，品牌几何中文
- **效果/气质**：现代、略窄的几何黑体
- **推荐用途**：中文正文/标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `无衬线`

#### font=200 · 阿里巴巴普惠体-Heavy

- **类型**：vector_ttf（矢量）
- **视觉特点**：阿里巴巴普惠体 Heavy
- **效果/气质**：普惠超粗，电商/互联网风
- **推荐用途**：中文强调标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `粗体`

#### font=238 · 思源宋体 SC-Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：思源宋体 SC Bold 粗宋体
- **效果/气质**：粗衬线中文，庄重
- **推荐用途**：国风标题；正式中文
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `衬线`

### 中文展示标题

#### font=160 · ZCOOL KuaiLe

- **类型**：vector_ttf（矢量）
- **视觉特点**：站酷快乐体，不规则手绘中文
- **效果/气质**：活泼、年轻、趣味
- **推荐用途**：可爱风中文标题；趣味表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `手写`, `可爱`

#### font=186 · ZCOOL GAODUANHEI

- **类型**：vector_ttf（矢量）
- **视觉特点**：站酷高端黑，超粗中文标题
- **效果/气质**：力量感、潮流黑体
- **推荐用途**：中文大标题；运动风
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `标题`, `粗体`

#### font=196 · 站酷酷黑体

- **类型**：vector_ttf（矢量）
- **视觉特点**：站酷酷黑体，极粗展示黑体
- **效果/气质**：硬朗、潮流
- **推荐用途**：中文大标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `展示`

#### font=252 · 优设标题黑

- **类型**：vector_ttf（矢量）
- **视觉特点**：优设标题黑，超粗中文标题黑体
- **效果/气质**：网红级粗黑标题，极醒目
- **推荐用途**：中文主标题；大字号装饰
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `标题`, `超粗`

#### font=254 · 字制区喜脉喜欢体

- **类型**：vector_ttf（矢量）
- **视觉特点**：字制区喜脉喜欢体，手写感中文
- **效果/气质**：活泼手写中文，偏少女/趣味
- **推荐用途**：可爱风中文；趣味表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `手写`, `可爱`

#### font=360 · 站酷庆科黄油体

- **类型**：vector_ttf（矢量）
- **视觉特点**：站酷庆科黄油体，圆润中文展示
- **效果/气质**：黄油般顺滑圆角中文，可爱
- **推荐用途**：可爱风中文标题；趣味表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `圆体`, `可爱`

### 中文衬线 / 宋体

#### font=158 · SoukouMincho

- **类型**：vector_ttf（矢量）
- **视觉特点**：SoukouMincho：衬线/宋体
- **效果/气质**：典雅、书卷、传统
- **推荐用途**：国风表盘；农历/节气说明
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文衬线/宋体`

#### font=162 · HanaMin

- **类型**：vector_ttf（矢量）
- **视觉特点**：HanaMin：衬线/宋体
- **效果/气质**：典雅、书卷、传统
- **推荐用途**：国风表盘；农历/节气说明
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文衬线/宋体`

#### font=164 · Libre_Baskerville-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Libre_Baskerville-Regular：衬线/宋体，较轻字重
- **效果/气质**：典雅、书卷、传统
- **推荐用途**：国风表盘；农历/节气说明
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文衬线/宋体`, `轻量`

#### font=178 · Libre Baskerville-Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Libre Baskerville-Bold：衬线/宋体，粗体/Heavy 字重
- **效果/气质**：典雅、书卷、传统，更醒目
- **推荐用途**：国风表盘；农历/节气说明
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文衬线/宋体`, `粗体`

#### font=240 · SourceHanSerifSC-ExtraLight

- **类型**：vector_ttf（矢量）
- **视觉特点**：SourceHanSerifSC-ExtraLight：衬线/宋体，较轻字重
- **效果/气质**：典雅、书卷、传统
- **推荐用途**：国风表盘；农历/节气说明
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文衬线/宋体`, `轻量`

#### font=242 · SourceHanSerifSC-Heavy

- **类型**：vector_ttf（矢量）
- **视觉特点**：SourceHanSerifSC-Heavy：衬线/宋体，粗体/Heavy 字重
- **效果/气质**：典雅、书卷、传统，更醒目
- **推荐用途**：国风表盘；农历/节气说明
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文衬线/宋体`, `粗体`

#### font=246 · SourceHanSerifSC-SemiBold

- **类型**：vector_ttf（矢量）
- **视觉特点**：思源宋体 SC SemiBold
- **效果/气质**：中等粗细宋体正文
- **推荐用途**：国风中文正文
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `衬线`, `宋体`

### 手写 / 脚本

#### font=88 · Nickainley

- **类型**：vector_ttf（矢量）
- **视觉特点**：Nickainley：手写或连笔脚本
- **效果/气质**：轻松、人文、个性化
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`

#### font=92 · Pacifico

- **类型**：vector_ttf（矢量）
- **视觉特点**：Pacifico 连笔手写体
- **效果/气质**：轻松、度假、手写感
- **推荐用途**：装饰英文；休闲风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写`, `英文`, `休闲`

#### font=142 · Pacifico-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Pacifico-Regular：手写或连笔脚本，较轻字重
- **效果/气质**：轻松、人文、个性化
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`, `轻量`

#### font=146 · Dancing Script-Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Dancing Script Bold 手写脚本粗体
- **效果/气质**：优雅连笔手写
- **推荐用途**：装饰英文；女性/优雅风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写`, `脚本`, `英文`

#### font=148 · Dancing Script-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Dancing Script-Regular：手写或连笔脚本，较轻字重
- **效果/气质**：轻松、人文、个性化
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`, `轻量`

#### font=166 · Pacifico-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Pacifico-Regular：手写或连笔脚本，较轻字重
- **效果/气质**：轻松、人文、个性化
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`, `轻量`

#### font=168 · Pangmen Zhengdao Bold Script

- **类型**：vector_ttf（矢量）
- **视觉特点**：庞门正道标题体，粗方中文标题
- **效果/气质**：商业级中文大标题，辨识度高
- **推荐用途**：中文主标题；海报风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `标题`, `展示`

#### font=174 · Rock_Salt

- **类型**：vector_ttf（矢量）
- **视觉特点**：Rock_Salt：手写或连笔脚本
- **效果/气质**：轻松、人文、个性化
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`

#### font=176 · Caveat-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Caveat  casual 手写
- **效果/气质**：自然手写字，轻松
- **推荐用途**：手写风英文/数字注释
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写`, `英文`

#### font=204 · BukhariScript-lemD

- **类型**：vector_ttf（矢量）
- **视觉特点**：BukhariScript-lemD：手写或连笔脚本
- **效果/气质**：轻松、人文、个性化
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`

#### font=236 · Shrikhand-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Shrikhand 复古装饰展示
- **效果/气质**：70年代印度复古装饰体
- **推荐用途**：复古装饰英文
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`装饰`, `复古`

#### font=266 · OleoScript-Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：OleoScript-Bold：手写或连笔脚本，粗体/Heavy 字重
- **效果/气质**：轻松、人文、个性化，更醒目
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`, `粗体`

#### font=318 · Great Vibes

- **类型**：vector_ttf（矢量）
- **视觉特点**：Great Vibes 华丽脚本
- **效果/气质**：正式场合连笔花体
- **推荐用途**：婚礼/优雅风装饰英文
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`脚本`, `华丽`, `英文`

#### font=320 · Caveat-bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Caveat-bold：手写或连笔脚本，粗体/Heavy 字重
- **效果/气质**：轻松、人文、个性化，更醒目
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`, `粗体`

#### font=358 · CaveatBrush-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：CaveatBrush-Regular：手写或连笔脚本，较轻字重
- **效果/气质**：轻松、人文、个性化
- **推荐用途**：装饰文字；休闲/艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`手写/脚本`, `轻量`

### 英文展示 / 海报

#### font=48 · Parisish

- **类型**：vector_ttf（矢量）
- **视觉特点**：Parisish，法式复古装饰体
- **效果/气质**：优雅复古，略华丽
- **推荐用途**：装饰英文；艺术风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`装饰`, `英文`, `复古`

#### font=50 · Alpin Gothic CG No2

- **类型**：vector_ttf（矢量）
- **视觉特点**：Alpin Gothic，哥特式展示体
- **效果/气质**：尖锐、中世纪哥特风
- **推荐用途**：暗黑/哥特主题英文标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`哥特`, `展示`, `英文`

#### font=82 · MesseDuesseldorf-O1d3

- **类型**：vector_ttf（矢量）
- **视觉特点**：MesseDuesseldorf-O1d3：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=90 · Bebas Neue

- **类型**：vector_ttf（矢量）
- **视觉特点**：Bebas Neue 超高窄体无衬线
- **效果/气质**：经典海报大标题，仅适合大写英文
- **推荐用途**：英文大标题；时/分/秒旁英文标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`展示`, `英文`, `窄体`

#### font=114 · Big Shoulders Stencil—Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Big Shoulders Stencil 镂空展示体
- **效果/气质**：工业Stencil镂空大标题
- **推荐用途**：英文大标题；运动/工业风
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`展示`, `Stencil`, `英文`

#### font=116 · Audiowide

- **类型**：vector_ttf（矢量）
- **视觉特点**：Audiowide 宽体未来科技无衬线
- **效果/气质**：科幻、宽间距
- **推荐用途**：科技风英文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`科技`, `英文`, `宽体`

#### font=118 · TrainOne-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Train One 日文/拉丁展示圆体
- **效果/气质**：圆润、列车/卡通气质
- **推荐用途**：可爱风标题；装饰文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`圆体`, `展示`

#### font=120 · AllertaStencil-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：AllertaStencil-Regular：英文展示/海报体，较轻字重
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`, `轻量`

#### font=124 · Bangers-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Bangers 漫画爆炸体
- **效果/气质**：美漫风格，极粗圆角
- **推荐用途**：漫画/波普风英文标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`漫画`, `展示`, `英文`

#### font=138 · Oxford-LAqy

- **类型**：vector_ttf（矢量）
- **视觉特点**：Oxford-LAqy：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=140 · Bebas Neue-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Bebas Neue-Regular：英文展示/海报体，较轻字重
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`, `轻量`

#### font=152 · Playfair Display-Black

- **类型**：vector_ttf（矢量）
- **视觉特点**：Playfair Display Black 高对比衬线
- **效果/气质**：时尚杂志级衬线大标题
- **推荐用途**：奢华/时尚风英文标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`衬线`, `展示`, `英文`

#### font=154 · Playfair Display-Black-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Playfair Display-Black-Regular：英文展示/海报体，粗体/Heavy 字重
- **效果/气质**：大标题冲击力强，更醒目
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`, `粗体`

#### font=156 · Coiny-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Coiny 圆角漫画体
- **效果/气质**：卡通硬币质感，圆润可爱
- **推荐用途**：儿童/可爱风文字
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`圆体`, `卡通`

#### font=180 · Bitrimus

- **类型**：vector_ttf（矢量）
- **视觉特点**：Bitrimus：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=190 · Bitrimus

- **类型**：vector_ttf（矢量）
- **视觉特点**：Bitrimus：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=198 · Adrenaline-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Adrenaline-Regular：英文展示/海报体，较轻字重
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`, `轻量`

#### font=202 · BAUHS93

- **类型**：vector_ttf（矢量）
- **视觉特点**：BAUHS93：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=214 · GLECB

- **类型**：vector_ttf（矢量）
- **视觉特点**：GLECB：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=224 · IMPRISHA

- **类型**：vector_ttf（矢量）
- **视觉特点**：IMPRISHA：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=226 · INFROMAN

- **类型**：vector_ttf（矢量）
- **视觉特点**：INFROMAN：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=228 · LeagueGothic-Condensed

- **类型**：vector_ttf（矢量）
- **视觉特点**：League Gothic Condensed 窄体哥特展示
- **效果/气质**：经典窄高英文大标题
- **推荐用途**：英文大标题；运动表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`展示`, `窄体`, `英文`

#### font=230 · LeagueGothic-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：LeagueGothic-Regular：英文展示/海报体，较轻字重
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`, `轻量`

#### font=232 · Project Space

- **类型**：vector_ttf（矢量）
- **视觉特点**：Project Space：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=264 · walbaum-fraktur.bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：walbaum-fraktur.bold：英文展示/海报体，粗体/Heavy 字重
- **效果/气质**：大标题冲击力强，更醒目
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`, `粗体`

#### font=286 · Futura LT Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Futura LT Bold 几何无衬线经典
- **效果/气质**：现代主义几何，简洁永恒
- **推荐用途**：极简/现代风英文标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`无衬线`, `几何`, `英文`

#### font=288 · Mexican Tequila

- **类型**：vector_ttf（矢量）
- **视觉特点**：Mexican Tequila：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=312 · Jack Armstrong

- **类型**：vector_ttf（矢量）
- **视觉特点**：Jack Armstrong：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=336 · SuperFoods

- **类型**：vector_ttf（矢量）
- **视觉特点**：SuperFoods：英文展示/海报体
- **效果/气质**：大标题冲击力强
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`

#### font=338 · Spectral SC-ExtraBold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Spectral SC-ExtraBold：英文展示/海报体，粗体/Heavy 字重
- **效果/气质**：大标题冲击力强，更醒目
- **推荐用途**：英文标题；装饰词
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文展示/海报`, `粗体`

### 英文无衬线 / UI

#### font=38 · Alimama Square VF-Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：阿里妈妈方圆体 VF Bold，圆角方块中文
- **效果/气质**：活泼、圆润、偏潮流
- **推荐用途**：可爱风表盘中文；标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `圆体`, `展示`

#### font=80 · Alimama Square VF-SemiBold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Alimama Square VF-SemiBold：英文无衬线 UI 字体，粗体/Heavy 字重
- **效果/气质**：通用可读，更醒目
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `粗体`

#### font=94 · Source font

- **类型**：vector_ttf（矢量）
- **视觉特点**：Source font：英文无衬线 UI 字体
- **效果/气质**：通用可读
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`

#### font=96 · Open Sans —ExtraBold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Open Sans —ExtraBold：英文无衬线 UI 字体，粗体/Heavy 字重
- **效果/气质**：通用可读，更醒目
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `粗体`

#### font=104 · Trueno-bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Trueno-bold：英文无衬线 UI 字体，粗体/Heavy 字重
- **效果/气质**：通用可读，更醒目
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `粗体`

#### font=106 · Trueno-black

- **类型**：vector_ttf（矢量）
- **视觉特点**：Trueno-black：英文无衬线 UI 字体，粗体/Heavy 字重
- **效果/气质**：通用可读，更醒目
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `粗体`

#### font=108 · Krungthep

- **类型**：vector_ttf（矢量）
- **视觉特点**：Krungthep：英文无衬线 UI 字体
- **效果/气质**：通用可读
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`

#### font=122 · trueno-light

- **类型**：vector_ttf（矢量）
- **视觉特点**：trueno-light：英文无衬线 UI 字体，较轻字重
- **效果/气质**：通用可读
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `轻量`

#### font=188 · AlimamaAgileVF-Thin

- **类型**：vector_ttf（矢量）
- **视觉特点**：AlimamaAgileVF-Thin：英文无衬线 UI 字体，较轻字重
- **效果/气质**：通用可读
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `轻量`

#### font=206 · DingTalk JinBuTi

- **类型**：vector_ttf（矢量）
- **视觉特点**：钉钉进步体，现代中文创意黑体
- **效果/气质**：略带设计感的黑体
- **推荐用途**：中文标题；科技风表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`中文`, `展示`

#### font=208 · Nunito-Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Nunito Regular 圆角英文无衬线
- **效果/气质**：友好、圆润的 UI 字体
- **推荐用途**：英文正文；健康/生活类表盘
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文`, `圆体`, `正文`

#### font=210 · Nunito-Black

- **类型**：vector_ttf（矢量）
- **视觉特点**：Nunito-Black：英文无衬线 UI 字体，粗体/Heavy 字重
- **效果/气质**：通用可读，更醒目
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `粗体`

#### font=212 · DroidSerif

- **类型**：vector_ttf（矢量）
- **视觉特点**：DroidSerif：英文无衬线 UI 字体
- **效果/气质**：通用可读
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`

#### font=248 · verdanaz

- **类型**：vector_ttf（矢量）
- **视觉特点**：verdanaz：英文无衬线 UI 字体
- **效果/气质**：通用可读
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`

#### font=260 · AaCaoLeSongMianBaoYuan

- **类型**：vector_ttf（矢量）
- **视觉特点**：AaCaoLeSongMianBaoYuan：英文无衬线 UI 字体
- **效果/气质**：通用可读
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`

#### font=284 · Hisham LT Regular

- **类型**：vector_ttf（矢量）
- **视觉特点**：Hisham LT Regular：英文无衬线 UI 字体，较轻字重
- **效果/气质**：通用可读
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `轻量`

#### font=328 · Tahoma_Bold

- **类型**：vector_ttf（矢量）
- **视觉特点**：Tahoma_Bold：英文无衬线 UI 字体，粗体/Heavy 字重
- **效果/气质**：通用可读，更醒目
- **推荐用途**：英文正文；数据标签
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`英文无衬线/UI`, `粗体`

### 哥特 / 特殊主题

#### font=102 · Upheaval TT (BRK)

- **类型**：vector_ttf（矢量）
- **视觉特点**：Upheaval TT 像素破坏风
- **效果/气质**：强烈像素/地震扭曲感
- **推荐用途**：像素/赛博风英文标题
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`像素`, `英文`, `装饰`

#### font=182 · EmojiFont

- **类型**：vector_ttf（矢量）
- **视觉特点**：EmojiFont 彩色 Emoji 字体
- **效果/气质**：渲染 Emoji 符号（非普通文字）
- **推荐用途**：Emoji 装饰元素；表情符号 disp
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`Emoji`, `特殊`

#### font=218 · GOST Common Italic

- **类型**：vector_ttf（矢量）
- **视觉特点**：GOST Common Italic：特殊风格字体
- **效果/气质**：强主题性
- **推荐用途**：主题表盘装饰
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`哥特/特殊`

#### font=220 · GOST Common

- **类型**：vector_ttf（矢量）
- **视觉特点**：GOST Common：特殊风格字体
- **效果/气质**：强主题性
- **推荐用途**：主题表盘装饰
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`哥特/特殊`

#### font=234 · RL Madena Variable

- **类型**：vector_ttf（矢量）
- **视觉特点**：RL Madena Variable：特殊风格字体
- **效果/气质**：强主题性
- **推荐用途**：主题表盘装饰
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`哥特/特殊`

#### font=250 · vinet

- **类型**：vector_ttf（矢量）
- **视觉特点**：vinet：特殊风格字体
- **效果/气质**：强主题性
- **推荐用途**：主题表盘装饰
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`哥特/特殊`

#### font=274 · Upheaval TT (BRK)

- **类型**：vector_ttf（矢量）
- **视觉特点**：Upheaval TT (BRK)：特殊风格字体
- **效果/气质**：强主题性
- **推荐用途**：主题表盘装饰
- **样式字段**：矢量 TTF：可用 size、color_r/g/b、a、sep、alig 等完整文本样式
- **标签**：`哥特/特殊`

---

## 五、完整 ID 速查表

| ID | 类型 | 名称 | 字符集 | 一句话 |
|----|------|------|--------|--------|
| 6 | vector_ttf | 002-Career | — | 稳重职业感，适合信息密度较高的界面 |
| 8 | vector_ttf | 003-Absolute | — | 清晰易读 |
| 10 | vector_ttf | 003-Absolute | — | 清晰易读 |
| 12 | vector_ttf | 003-Absolute | — | 清晰易读 |
| 14 | vector_ttf | 004-Wander Brave | — | 标题醒目，有户外探索感 |
| 16 | vector_ttf | 005-OPPOSans Medium | — | 清晰易读，中性百搭 |
| 18 | vector_ttf | 006-Library 3 am | — | 文艺、深夜阅读氛围 |
| 20 | vector_ttf | 007-Keep Calm | — | 经典 Keep Calm 海报气质，稳重大字 |
| 22 | vector_ttf | 008-smooth line 7 | — | 轻盈、现代 |
| 24 | vector_ttf | 009-DS Digital | — | LED/计算器数码显示，科技感强 |
| 26 | vector_ttf | 001-SourceHanSans | — | 通用中文正文，可读性最佳之一 |
| 30 | vector_ttf | 005-OPPOSans Heavy | — | 极粗、冲击力强 |
| 38 | vector_ttf | Alimama Square VF-Bold | — | 活泼、圆润、偏潮流 |
| 48 | vector_ttf | Parisish | — | 优雅复古，略华丽 |
| 50 | vector_ttf | Alpin Gothic CG No2 | — | 尖锐、中世纪哥特风 |
| 52 | vector_ttf | OPPO Sans-Blod | — | 清晰易读，更醒目 |
| 54 | vector_ttf | HarmonyOS_SansSC_Black | — | 华为鸿蒙黑体，现代、厚重 |
| 56 | vector_ttf | HarmonyOS_SansSC_Bold | — | 清晰有力，适合标题 |
| 58 | vector_ttf | HarmonyOS_SansSC_Light | — | 轻盈通透 |
| 60 | vector_ttf | HarmonyOS_SansSC_Medium | — | 平衡的正文粗细 |
| 62 | vector_ttf | HarmonyOS_SansSC_Regular | — | 标准鸿蒙正文 |
| 64 | vector_ttf | HarmonyOS_SansSC_Thin | — | 极细线条，精致 |
| 66 | vector_ttf | Square pixel 12 Simplified | — | 8-bit 方块像素，复古游戏感 |
| 80 | vector_ttf | Alimama Square VF-SemiBold | — | 通用可读，更醒目 |
| 82 | vector_ttf | MesseDuesseldorf-O1d3 | — | 大标题冲击力强 |
| 84 | vector_ttf | Big Pixel Shadowed Demo | — | 科技感或复古游戏感 |
| 88 | vector_ttf | Nickainley | — | 轻松、人文、个性化 |
| 90 | vector_ttf | Bebas Neue | — | 经典海报大标题，仅适合大写英文 |
| 92 | vector_ttf | Pacifico | — | 轻松、度假、手写感 |
| 94 | vector_ttf | Source font | — | 通用可读 |
| 96 | vector_ttf | Open Sans —ExtraBold | — | 通用可读，更醒目 |
| 98 | vector_ttf | 8-bit Arcade Out | — | 街机游戏空心像素轮廓 |
| 100 | vector_ttf | SourceHanSansCN-Medium | — | 中等粗细中文正文 |
| 102 | vector_ttf | Upheaval TT (BRK) | — | 强烈像素/地震扭曲感 |
| 104 | vector_ttf | Trueno-bold | — | 通用可读，更醒目 |
| 106 | vector_ttf | Trueno-black | — | 通用可读，更醒目 |
| 108 | vector_ttf | Krungthep | — | 通用可读 |
| 110 | vector_ttf | DS-Digital Bold | — | 比 id 24 更粗的 LED 数码管 |
| 112 | image_glyph | webp font Digital | `0123456789` | 固定位图外观，颜色/字号不可调；仅 0-9 |
| 114 | vector_ttf | Big Shoulders Stencil—Regular | — | 工业Stencil镂空大标题 |
| 116 | vector_ttf | Audiowide | — | 科幻、宽间距 |
| 118 | vector_ttf | TrainOne-Regular | — | 圆润、列车/卡通气质 |
| 120 | vector_ttf | AllertaStencil-Regular | — | 大标题冲击力强 |
| 122 | vector_ttf | trueno-light | — | 通用可读 |
| 124 | vector_ttf | Bangers-Regular | — | 美漫风格，极粗圆角 |
| 126 | vector_ttf | 全语言Tahoma | — | Windows 经典 UI 字体，多语言兼容 |
| 128 | vector_ttf | SourceHanSans-Bold | — | 中文粗标题 |
| 132 | vector_ttf | SourceHanSans-Heavy | — | 极粗中文展示 |
| 138 | vector_ttf | Oxford-LAqy | — | 大标题冲击力强 |
| 140 | vector_ttf | Bebas Neue-Regular | — | 大标题冲击力强 |
| 142 | vector_ttf | Pacifico-Regular | — | 轻松、人文、个性化 |
| 144 | vector_ttf | Silkscreen-Regular | — | 清晰小像素英文 |
| 146 | vector_ttf | Dancing Script-Bold | — | 优雅连笔手写 |
| 148 | vector_ttf | Dancing Script-Regular | — | 轻松、人文、个性化 |
| 152 | vector_ttf | Playfair Display-Black | — | 时尚杂志级衬线大标题 |
| 154 | vector_ttf | Playfair Display-Black-Regular | — | 大标题冲击力强，更醒目 |
| 156 | vector_ttf | Coiny-Regular | — | 卡通硬币质感，圆润可爱 |
| 158 | vector_ttf | SoukouMincho | — | 典雅、书卷、传统 |
| 160 | vector_ttf | ZCOOL KuaiLe | — | 活泼、年轻、趣味 |
| 162 | vector_ttf | HanaMin | — | 典雅、书卷、传统 |
| 164 | vector_ttf | Libre_Baskerville-Regular | — | 典雅、书卷、传统 |
| 166 | vector_ttf | Pacifico-Regular | — | 轻松、人文、个性化 |
| 168 | vector_ttf | Pangmen Zhengdao Bold Script | — | 商业级中文大标题，辨识度高 |
| 170 | vector_ttf | Alimama Square Medium | — | 清晰易读 |
| 172 | vector_ttf | Alimama Square SemiBold | — | 清晰易读，更醒目 |
| 174 | vector_ttf | Rock_Salt | — | 轻松、人文、个性化 |
| 176 | vector_ttf | Caveat-Regular | — | 自然手写字，轻松 |
| 178 | vector_ttf | Libre Baskerville-Bold | — | 典雅、书卷、传统，更醒目 |
| 180 | vector_ttf | Bitrimus | — | 大标题冲击力强 |
| 182 | vector_ttf | EmojiFont | — | 渲染 Emoji 符号（非普通文字） |
| 184 | vector_ttf | 思源宋体SemiBold | — | 传统宋体，典雅书卷气 |
| 186 | vector_ttf | ZCOOL GAODUANHEI | — | 力量感、潮流黑体 |
| 188 | vector_ttf | AlimamaAgileVF-Thin | — | 通用可读 |
| 190 | vector_ttf | Bitrimus | — | 大标题冲击力强 |
| 192 | vector_ttf | 汇文港黑v1.001 | — | 清晰易读 |
| 194 | vector_ttf | 京东朗正体 | — | 现代、略窄的几何黑体 |
| 196 | vector_ttf | 站酷酷黑体 | — | 硬朗、潮流 |
| 198 | vector_ttf | Adrenaline-Regular | — | 大标题冲击力强 |
| 200 | vector_ttf | 阿里巴巴普惠体-Heavy | — | 普惠超粗，电商/互联网风 |
| 202 | vector_ttf | BAUHS93 | — | 大标题冲击力强 |
| 204 | vector_ttf | BukhariScript-lemD | — | 轻松、人文、个性化 |
| 206 | vector_ttf | DingTalk JinBuTi | — | 略带设计感的黑体 |
| 208 | vector_ttf | Nunito-Regular | — | 友好、圆润的 UI 字体 |
| 210 | vector_ttf | Nunito-Black | — | 通用可读，更醒目 |
| 212 | vector_ttf | DroidSerif | — | 通用可读 |
| 214 | vector_ttf | GLECB | — | 大标题冲击力强 |
| 216 | vector_ttf | Silkscreen-Bold | — | 科技感或复古游戏感，更醒目 |
| 218 | vector_ttf | GOST Common Italic | — | 强主题性 |
| 220 | vector_ttf | GOST Common | — | 强主题性 |
| 222 | vector_ttf | 8-bit Arcade In | — | 实心像素块，比 id 98 更实 |
| 224 | vector_ttf | IMPRISHA | — | 大标题冲击力强 |
| 226 | vector_ttf | INFROMAN | — | 大标题冲击力强 |
| 228 | vector_ttf | LeagueGothic-Condensed | — | 经典窄高英文大标题 |
| 230 | vector_ttf | LeagueGothic-Regular | — | 大标题冲击力强 |
| 232 | vector_ttf | Project Space | — | 大标题冲击力强 |
| 234 | vector_ttf | RL Madena Variable | — | 强主题性 |
| 236 | vector_ttf | Shrikhand-Regular | — | 70年代印度复古装饰体 |
| 238 | vector_ttf | 思源宋体 SC-Bold | — | 粗衬线中文，庄重 |
| 240 | vector_ttf | SourceHanSerifSC-ExtraLight | — | 典雅、书卷、传统 |
| 242 | vector_ttf | SourceHanSerifSC-Heavy | — | 典雅、书卷、传统，更醒目 |
| 246 | vector_ttf | SourceHanSerifSC-SemiBold | — | 中等粗细宋体正文 |
| 248 | vector_ttf | verdanaz | — | 通用可读 |
| 250 | vector_ttf | vinet | — | 强主题性 |
| 252 | vector_ttf | 优设标题黑 | — | 网红级粗黑标题，极醒目 |
| 254 | vector_ttf | 字制区喜脉喜欢体 | — | 活泼手写中文，偏少女/趣味 |
| 256 | image_glyph | 70*86 | `0123456789` | 超大块像素数字，固定位图；仅 0-9 |
| 258 | image_glyph | 20*26 | `0123456789` | 紧凑像素数字；仅 0-9 |
| 260 | vector_ttf | AaCaoLeSongMianBaoYuan | — | 通用可读 |
| 262 | image_glyph | Blue time font | `0123456789` | 预渲染蓝色电子/艺术数字；仅 0-9 |
| 264 | vector_ttf | walbaum-fraktur.bold | — | 大标题冲击力强，更醒目 |
| 266 | vector_ttf | OleoScript-Bold | — | 轻松、人文、个性化，更醒目 |
| 268 | image_glyph | Pixel Machine Font 1 | `0123456789` | 机械像素风固定位图；0-9 |
| 270 | image_glyph | Pixel Machine Font 1 | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` | 同上系列，仅 A-Z 大写 |
| 272 | vector_ttf | ArcadeClassic | — | 80年代街机字母数字 |
| 274 | vector_ttf | Upheaval TT (BRK) | — | 强主题性 |
| 276 | vector_ttf | ProggyClean Regular | — | 程序员终端风，等宽清晰 |
| 278 | image_glyph | Pastel Dream font | `0123456789` | 柔和粉彩渐变固定位图；0-9 |
| 280 | image_glyph | 波普艺术手写字体1 | `0123456789` | 波普风手绘数字，风格1；0-9 |
| 282 | image_glyph | 波普艺术手写字体2 | `0123456789` | 波普风手绘数字，风格2（与 id 280 成对）；0-9 |
| 284 | vector_ttf | Hisham LT Regular | — | 通用可读 |
| 286 | vector_ttf | Futura LT Bold | — | 现代主义几何，简洁永恒 |
| 288 | vector_ttf | Mexican Tequila | — | 大标题冲击力强 |
| 290 | image_glyph | 像素霓城字体（紫） | `0123456789` | 紫色霓虹像素城市场景数字；0-9 |
| 292 | image_glyph | 像素霓城字体（蓝） | `0123456789` | 蓝色霓虹像素数字；0-9 |
| 294 | image_glyph | 警戒信号烟雾字体 | `0123456789` | 烟雾/警示风格艺术数字；0-9 |
| 296 | image_glyph | 海底泡泡屋时间字体 | `0123456789` | 气泡/水下主题可爱数字；0-9 |
| 298 | vector_ttf | Galmuri11-Bold | `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-°` | 11px 韩系像素字体，清晰等宽感；字符集有限 |
| 300 | vector_ttf | Galmuri7 | `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz` | 7px 像素，更紧凑；字符集有限 |
| 302 | image_glyph | 咩咩好心情手写体1 | `0123456789` | 可爱羊主题手写数字；0-9 |
| 304 | image_glyph | 咩咩好心情手写体2 | `0123456789` | 同系列变体2；0-9 |
| 306 | image_glyph | 咔滋一口不规则数字 | `0123456789` | 食物/零食风不规则手绘；0-9 |
| 308 | image_glyph | 波普艺术方形绿色数字 | `0123456789` | 方形块面波普绿；0-9 |
| 310 | image_glyph | 波普艺术方形粉色数字 | `0123456789` | 方形块面波普粉；0-9 |
| 312 | vector_ttf | Jack Armstrong | — | 大标题冲击力强 |
| 314 | image_glyph | 黑色描边手绘数字 | `0123456789` | 白底黑描边手绘风；0-9 |
| 316 | image_glyph | 橙色铅笔手绘数字 | `0123456789` | 铅笔质感橙色手绘；0-9 |
| 318 | vector_ttf | Great Vibes | — | 正式场合连笔花体 |
| 320 | vector_ttf | Caveat-bold | — | 轻松、人文、个性化，更醒目 |
| 324 | image_glyph | 粉色玻璃数字 | `0123456789` | 半透明玻璃材质渲染；0-9 |
| 326 | image_glyph | 蒸汽波渐变数字 | `0123456789` | Vaporwave 渐变霓虹；0-9 |
| 328 | vector_ttf | Tahoma_Bold | — | 通用可读，更醒目 |
| 330 | image_glyph | 粘土数字 | `0123456789` | 3D 粘土材质可爱数字；0-9 |
| 332 | image_glyph | 小虎购物日粉色数字 | `0123456789` | 购物/零售主题粉色数字；0-9 |
| 334 | image_glyph | 小虎购物日蓝色数字 | `0123456789` | 同系列蓝色变体；0-9 |
| 336 | vector_ttf | SuperFoods | — | 大标题冲击力强 |
| 338 | vector_ttf | Spectral SC-ExtraBold | — | 大标题冲击力强，更醒目 |
| 340 | image_glyph | 彩虹手账时间数字 | `0123456789` | 彩虹色手账风，专用于时间；0-9 |
| 342 | image_glyph | 彩虹手账温度数字 | `0123456789` | 同系列，适合温度显示；0-9 |
| 344 | image_glyph | 彩虹手账日期数字 | `0123456789` | 同系列，适合日期；0-9 |
| 346 | image_glyph | 跨年报纸倒计时数字 | `0123456789adoTy` | 报纸排版风，含数字+adoTy（day/today/yesterday 等缩写）；固定位图 |
| 348 | image_glyph | 节气画历-温度/年份-月份字体 | `0123456789.-/` | 国风节气主题，含数字与 .-/；固定位图 |
| 350 | image_glyph | 节气画历日期数字 | `0123456789` | 国风节气日期专用；0-9 |
| 352 | image_glyph | 节气画历农历字体 | `0123456789cdlnyz` | 含农历用字 cdlnyz 等；固定位图 |
| 354 | image_glyph | 几何拼贴小字体 | `0123456789°-` | 几何拼贴艺术风，含数字与 °-；固定位图 |
| 356 | image_glyph | — | `0123456789°-` | 与 id 354 同类，含 0-9 与 °- |
| 358 | vector_ttf | CaveatBrush-Regular | — | 轻松、人文、个性化 |
| 360 | vector_ttf | 站酷庆科黄油体 | — | 黄油般顺滑圆角中文，可爱 |

---

## 六、与表盘 JSON 的配合示例

```json
{
  "font": 24,
  "size": 72,
  "color_r": 0, "color_g": 255, "color_b": 128,
  "x": 200, "y": 400, "w": 400, "h": 100,
  "alig": 1,
  "disp": 1
}
```

上例：DS Digital 矢量数码字 + 自定义颜色/字号，用于时间类 `disp`。

```json
{
  "font": 340,
  "x": 180, "y": 350, "w": 440, "h": 120,
  "alig": 1,
  "disp": 1
}
```

上例：彩虹手账位图数字，仅用布局框，不传 size/color。
