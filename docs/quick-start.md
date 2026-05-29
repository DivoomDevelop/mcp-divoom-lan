# 快速开始（5 分钟）

## 1) 安装与构建

```bash
npm install
npm run build
```

## 2) MCP 客户端配置

可直接复制仓库根目录的 `client-config.example.json`，并把路径改成你本机实际路径。

关键项：

- `command`: `node`
- `args`: `.../dist/index.js`
- `env.DIVOOM_DEVICE_HOST`: 设备局域网 IP
- `env.DIVOOM_DEVICE_PORT`: 默认 `9000`

## 3) 首次连通性测试

先调用：

- `watchface_get_local`

最小参数（读取当前屏幕表盘）：

```json
{
  "useCurrentDisplayClock": true
}
```

如果你没配置环境变量，也可以每次传设备地址：

```json
{
  "target": {
    "host": "192.168.1.120",
    "port": 9000
  },
  "useCurrentDisplayClock": true
}
```

## 4) 建议标准流程

所有写操作都建议使用下面流程：

1. `watchface_get_local`（读当前配置）
2. 检查 `ItemList`：
   - 为空：停止写入，先切换到可编辑表盘（`watchface_set_clock_select`）
   - 非空：继续下一步
3. 选择写入路径（与 HTML 编辑器保持一致）：
   - 仅字段差异 → `watchface_patch_local`（不传 `dialAssetsPath`，走
     `POST /divoom_api`）
   - 用户换了元素图 → `watchface_patch_local` + `dialAssetsPath` 指向
     `clock_bg.tar.gz`，`ItemPatchList[].patch.bundle_image` 指明绑定的叶子
   - 仅换底图 → `watchface_patch_local` + 单张 JPEG/WebP，或
     `watchface_replace_dial_bg_file`（不改 `DeviceImageUrl`）
   - 行数变化 → 整表替换 `ItemList` + `ItemIdList`（兜底）
4. `watchface_get_local`（回读确认）

> `patch.*` 不要包含 `item_id`，避免覆盖设备菜单/config 关联。
> 非用户明确要求时，不要调用 `watchface_create_local_clock`。

## 5) 快速排错

- 连接失败：检查 IP、端口、同网段、防火墙
- 返回码非 0：先看 `ReturnMessage`，再核对请求字段（参见
  `docs/safety-and-troubleshooting.md` 错误对照表）
- 底图上传失败：底图必须是 JPEG（`FF D8`）/ WebP（`RIFF…WEBP`），
  ≤ 500 KiB，建议 800×1280
- 元素 bundle 失败：`tar.gz` 内每个元素必须是 JPEG / WebP / PNG，
  GIF/BMP/TIFF 需要先转码

## 6) 字体怎么选

写 `ItemList[i].font` 之前，先翻字体目录：

- 资源：`divoom://font/guide`（Markdown，**首选** — 每款字体的视觉特点与场景推荐）
- 资源：`divoom://font/catalog`（JSON）
- 工具：`watchface_font_catalog`（按 `type/script/tag/scenario/ids` 过滤）

数字位图字体（charset 仅 `0123456789`）只能渲染数字，适合时间/日期/温度位；
带中文的文本槽位（disp 49/56/154/155/178/179/219/220 等）必须挑 `script:"cjk"`
的 TTF（HarmonyOS_SansSC、SourceHanSans、Alimama、ZCOOL 等）。详情见
`docs/font-usage.md`。

实操时务必再用 `watchface_get_fonts_local` 校验一次设备真正装了哪些字体。

## 7) `disp` 怎么选 / 怎么验证 JSON

- 资源：`divoom://disp/catalog`（194 个 disp，含中文描述 + 是否需要图片资源的启发式提示）
- 工具：`watchface_disp_catalog`（按 `ids/nameContains/descriptionContains/expects` 过滤）

启发式信号：

- `hints.likelyUsesRasterOrAssetLayer = true` → 槽位需要 `image_addr`/图层资源（多为 *_PIC、*_GIF、*_IMAGE 类）
- `hints.oftenUsesVectorFontForText = true` → 槽位以文本为主，配合 `watchface_font_catalog` 选 `script` 合适的 font id

## 8) 生成完整表盘 JSON 时

- 校验 schema：资源 `divoom://watchface/schema`
- 起步模板：资源 `divoom://watchface/example-minimal`
- 保持 `ItemIdList` 与 `ItemList[].item_id` 顺序一致；逻辑画布默认 `800×1280`

## 9) 配套样例位置

- 请求/响应样例：`docs/examples/`
- 协议关键点提炼：`docs/reference/`
- 编辑器侧 AI 指南：资源 `divoom://guide/ai-watchface`（`docs/ai-watchface-guide.md` 同源）

## 10) 模板克隆 + 排版默认值（漂亮表盘）

从零手写坐标最容易丑。**优先**：

- 资源：`divoom://templates/curated`（约 20 套从编辑器上架 cfg 挖出来的骨架）
- 工具：`watchface_template_search`（按 `tagsAll` / `tagsAny` / `bucket` /
  `dispPresent` 过滤）
- 工具：`watchface_layout_suggest`（按 `disp` 取 `typography` 的中位数
  `size/x/y/w/h/alig` + 常见 `color_*`）

推荐流程：先 `watchface_template_search({ tagsAny: ["weather"] })` 挑一套接近主题的
`ItemList`，再对每个改动过的 `disp` 调用 `watchface_layout_suggest` 微调几何，
最后用 `watchface_font_catalog` 替换字体并用 `watchface_get_fonts_local` 确认设备可用。

详见 `docs/templates-curated.md`。
