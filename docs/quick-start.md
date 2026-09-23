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
- `env.DIVOOM_DEVICE_MODEL`: 建议保持 `auto`

## 3) 首次连通性测试

先调用：

- `watchface_get_device_info`

MCP 会先调用设备的 `Device/GetHardwareVersion`。硬件 510/511/512 使用 TimesFrame 配置，530 使用 AstroToo 配置；未知硬件会停止操作。

再调用 `watchface_get_local`。最小参数（读取当前屏幕表盘）：

```json
{
  "useCurrentDisplayClock": true
}
```

同一 MCP 服务控制多台设备时，每次调用都传对应 `target`。识别结果不会在设备之间复用；同一设备的完整操作会串行，不同设备可并行。

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
   - 用户换了元素图：
     - TimesFrame → `watchface_patch_local` + `clock_bg.tar.gz`，用
       `ItemPatchList[].patch.bundle_image` 绑定叶子
     - AstroToo → 对每张图串行调用一次 `watchface_upload_file`，再把返回的
       临时 `local://...` 写入同一轮创建/修改的 `image_addr`；提交成功后暂存文件会被删除，禁止 TAR/TGZ/ZIP
   - 仅换底图 → `watchface_patch_local` + 单张 JPEG/WebP，或
     `watchface_replace_dial_bg_file`（不改 `DeviceImageUrl`）
   - 行数变化 → 整表替换 `ItemList` + `ItemIdList`（兜底）
4. `watchface_get_local`（回读确认）

> `patch.*` 不要包含 `item_id`，避免覆盖设备菜单/config 关联。

TimesFrame 不开放通用 `watchface_upload_file`。其素材随创建/修改 multipart 请求传入，设备处理完成后会删除接收暂存文件。两种机型的 MCP/LAN 流程都不会把接收文件上传到云端。

> 非用户明确要求时，不要调用 `watchface_create_local_clock`。

## 5) 快速排错

- 连接失败：检查 IP、端口、同网段、防火墙
- 返回码非 0：先看 `ReturnMessage`，再核对请求字段（参见
  `docs/safety-and-troubleshooting.md` 错误对照表）
- 底图上传失败：底图必须是 JPEG/WebP 且小于 500 KiB；TimesFrame 为
  800×1280，AstroToo 为 480×480
- TimesFrame 元素 bundle 失败：`tar.gz` 内每个元素必须是 JPEG / WebP /
  PNG；AstroToo 不支持 bundle，必须逐文件上传

## 6) 字体怎么选

写 `ItemList[i].font` 之前，先翻字体目录：

- TimesFrame 资源：`divoom://font/guide`、`divoom://font/catalog`
- AstroToo 资源：`divoom://astrotoo/font/catalog`
- 工具：`watchface_font_catalog`（用 `model` 或在线 `target` 选择机型；AstroToo 在线模式把设备可用性合并到独立名称目录）

数字位图字体（charset 仅 `0123456789`）只能渲染数字，适合时间/日期/温度位；
带中文的文本槽位（disp 49/56/154/155/178/179/219/220 等）必须挑 `script:"cjk"`
的 TTF（HarmonyOS_SansSC、SourceHanSans、Alimama、ZCOOL 等）。详情见
`docs/font-usage.md`。

实操时务必再用 `watchface_get_fonts_local` 校验一次设备真正装了哪些字体。

## 7) `disp` 怎么选 / 怎么验证 JSON

- TimesFrame 资源：`divoom://disp/catalog`（194 个 disp，含中文描述 + 是否需要图片资源的启发式提示）
- AstroToo 资源：`divoom://astrotoo/disp/catalog`
- 工具：`watchface_disp_catalog`（用 `model` 或在线 `target` 选择机型，再按 `ids/nameContains/descriptionContains/expects` 过滤）

启发式信号：

- `hints.likelyUsesRasterOrAssetLayer = true` → 槽位需要 `image_addr`/图层资源（多为 *_PIC、*_GIF、*_IMAGE 类）
- `hints.oftenUsesVectorFontForText = true` → 槽位以文本为主，配合 `watchface_font_catalog` 选 `script` 合适的 font id

## 8) 生成完整表盘 JSON 时

- TimesFrame：用 `divoom://watchface/schema` 校验，从 `divoom://watchface/example-minimal` 起步，画布为 `800×1280`
- AstroToo：用 `divoom://astrotoo/watchface/schema` 校验，从 `divoom://astrotoo/watchface/example-minimal` 起步，画布为 `480×480`
- 保持 `ItemIdList` 与 `ItemList[].item_id` 顺序一致

## 9) 配套样例位置

- 请求/响应样例：`docs/examples/`
- 协议关键点提炼：`docs/reference/`
- 编辑器侧 AI 指南：资源 `divoom://guide/ai-watchface`（`docs/ai-watchface-guide.md` 同源）

## 10) 模板克隆 + 排版默认值（漂亮表盘）

先用 `watchface_clock_catalog` 查询所选产品已有的 `ClockId`、中英文名称、字体、`disp` 和 `item_id`。AstroToo 紧凑索引位于 `divoom://astrotoo/clocks/catalog`；需要完整原始配置时传 `includeConfig:true` 或读取 `divoom://astrotoo/clocks/configs`。这些 ID 和元素语义不能跨产品使用。

从零手写坐标最容易丑。**优先**：

- TimesFrame 资源：`divoom://templates/curated`（约 20 套从编辑器上架 cfg 挖出来的骨架）
- AstroToo 资源：`divoom://astrotoo/templates/curated`
- 工具：`watchface_template_search`（按 `tagsAll` / `tagsAny` / `bucket` /
  `dispPresent` 过滤）
- 工具：`watchface_layout_suggest`（按 `disp` 取 `typography` 的中位数
  `size/x/y/w/h/alig` + 常见 `color_*`）

推荐流程：先 `watchface_template_search({ tagsAny: ["weather"] })` 挑一套接近主题的
`ItemList`，再对每个改动过的 `disp` 调用 `watchface_layout_suggest` 微调几何，
最后用 `watchface_font_catalog` 替换字体并用 `watchface_get_fonts_local` 确认设备可用。

详见 `docs/templates-curated.md`。
