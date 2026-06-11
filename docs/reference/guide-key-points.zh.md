# 指南关键点（中文）

本页提炼局域网表盘定制的高优先级规则，便于 MCP 使用者快速落地。
所有约束以设备固件为准（`divoom_app/src/app/divoom_http_server.c`、
`divoom_app/src/middle/divoom_watchface_local_api.c`）。

## 传输规则

- `/divoom_api` 只用 `POST` + JSON body。
- 不要对 `/divoom_api` 使用 HTTP `GET`。
- 请求根字段必须有 `ReturnCode: 0`。
- `Command` 大小写敏感。

## 先读后写流程

1. `Device/GetLocalClockInfo`
2. 校验当前上下文可编辑（`ItemList` 不能空）
3. `Device/PatchLocalClockInfo` 最小化修改
4. 再次 `Device/GetLocalClockInfo` 回读确认

## 表盘快照（视觉验收）

创建或修改表盘（或切换当前表盘）后，抓取设备真实渲染结果：

1. `POST /divoom_api`，`Command: "Device/GetScreenSnapshot"`，`ReturnCode: 0`
   （固件 `DIVOOM_NET_COMM_GET_SCREEN_SNAPSHOT`）。
2. **等待 2 秒** — 设备异步将 LVGL 画面编码为 WebP（`divoom_device_save_screen_snapshot`）。
3. `GET http://<设备IP>:9000/userdata/snapshot.webp`（HTTP 静态文件；响应里
   `snapShotPath` 可能为 `/userdata/app_pic/snapshot.webp`）。
4. 用 WebP 与设计稿或上一次快照对比，验证布局、颜色、字体与素材绑定。

MCP 工具：`watchface_get_screen_snapshot`（可选 `savePath` 保存到本地做 diff）。

## PATCH 选择路径（强烈推荐）

`Device/PatchLocalClockInfo` 在固件里支持两类语义，选择不当会破坏 dial：

| 编辑器侧操作 | 推荐路径 | 端点 | JSON | 第二段 |
|---|---|---|---|---|
| 仅修改字号/位置/颜色等字段 | **字段级补丁** | `POST /divoom_api` | `ItemPatchList[].{index, patch}` 仅含变更字段 | 无 |
| 用户在编辑器里换了元素图（picker / drag-and-drop） | **字段级补丁 + 打包** | `POST /patch_local_clock` multipart | `ItemPatchList[].patch` 含 `bundle_image: <leaf>` | tar.gz：必含同名 leaf；可加 `clock_bg.jpg` |
| 仅替换 dial 底图 | 字段级补丁 + 单图 | `POST /patch_local_clock` multipart | `clockSel` 即可（可附 `ItemPatchList`） | 单 `clock_bg.jpg` / `.webp` |
| 增删 `ItemList` 项（长度变化） | 整表替换（兜底） | `POST /patch_local_clock` multipart | `ItemList` + `ItemIdList`（按需 `ItemPatchList`） | 视有无 leaf 决定单图或 tar.gz |

**禁忌**：日常仅"改字号"也整表替换 + 重传同一份 tar.gz —— 设备会用编辑器自动生成的
`item_${i+1}` 覆盖原本有意义的 `item_id`（如 `time_main`），破坏菜单/config 关联；同时
没有 `ItemPatchList[].patch.bundle_image` 的元素 `.bin` 即使解压到设备也不会被绑定，
浪费上传又看似什么都没改。

## 必须显式授权的操作

- `watchface_create_local_clock` 只在用户明确提出"创建新表盘"时调用。
- 对"改颜色/改字体"请求，禁止隐式新建表盘。

## multipart 强约束（与固件一致）

适用于 `/create_local_clock`、`/patch_local_clock`、`/replace_clock_dial_bg`、
`/upload`。违反会得到 `missing JSON part` / `missing file part` /
`size mismatch` / `filename in multipart` 等错误。

1. **必须两段，顺序固定：第一段 JSON，第二段文件。**
2. **第一段** header：`Content-Disposition: form-data; name="json"; filename="cmd.json"`，
   `Content-Type: application/json`，**带段内 `Content-Length: <jsonLen>`**，
   body 为压缩后的命令 JSON。
3. **第二段** header：`Content-Disposition: form-data; name="<任意>"; filename="<file_name>"`，
   `Content-Type: application/octet-stream`，**带段内 `Content-Length: <fileLen>`**，
   body 为文件字节。
4. CRLF 换行；`Content-Type: multipart/form-data; boundary=<boundary>`，
   **boundary 不能加引号**；正文以 `\r\n--<boundary>--\r\n` 结束。
5. **每次请求只允许一个文件**。要传多个元素图，必须打包为单个
   `clock_bg.tar.gz`（USTAR + gzip）。
6. 外层 HTTP `Content-Length` 必须等于整个 body 字节数。

**传输文件打包（`divoom_http_server_upload_get_file_info`）：** 固件历史上要求每个 multipart 段带段内 `Content-Length`；浏览器 `FormData` 常以 boundary 分界而不写每段长度。固件侧正在补充：无 `Content-Length` 时按 boundary 终止解析，并修正 JSON 段之后定位文件数据的指针；**编辑器与 MCP 客户端仍应手动构造带段内 `Content-Length` 的 multipart**，以兼容各版本固件。

`<file_name>` 决定写入路径 `/userdata/app_pic/<file_name>`。常用：
- `clock_bg.jpg` / `clock_bg.webp`：仅底图。
- `clock_bg.tar.gz`：底图 + 元素图组合。

## DialAssets：单图 / 打包

`Device/CreateLocalClock` 与 `Device/PatchLocalClockInfo` 用 `DialAssets`
（或旧字段 `UseDialAssetBundle`）选择第二段形态：

| `DialAssets` | 何时使用 | 第二段 file_name | 第二段 body |
|--------------|----------|------------------|-------------|
| `image` | `ItemList[i].image_addr` 全为空或全是 `http(s)` URL | `clock_bg.jpg` 或 `clock_bg.webp` | 单张底图 |
| `bundle` | 任一 `image_addr` 是本机叶子名（如 `44465.bin`、`weather.gif`） | `clock_bg.tar.gz` | gzip USTAR 归档 |

判定算法（编辑器实现，建议所有客户端遵循）：

```
leaves = unique(basename(image_addr))
        for image_addr non-empty and not http(s)
DialAssets = "image" if leaves is empty else "bundle"
```

### `clock_bg.tar.gz` 归档要求

- 压缩：gzip；归档：USTAR (`magic="ustar\0"`, `version="00"`, `typeflag='0'`)。
- 顶层文件 `clock_bg.jpg` 或 `clock_bg.webp`：CREATE 必带；
  PATCH 仅当至少有一个 `ItemPatchList[].patch.bundle_image` 时可省略。
- 对 CREATE 中每个 `ItemList[i].image_addr`、PATCH 中每个
  `ItemPatchList[i].patch.bundle_image` 引用到的本地叶子名，
  归档根目录下必须有同名文件（不要建子目录、不要相对路径）。
- 叶子名 ≤ 95 字节 + NUL。
- 跳过 `clock_bg.*` 与 `http(s)` URL（前者由我们写入，后者是设备已托管资源）。

例：`ItemList` 引用 `44465.bin`、`weather.gif`，则 tar 内容为：

```
clock_bg.jpg
44465.bin
weather.gif
```

## ItemList / ItemIdList 校验

固件 `wf_unpack_disp_items` 中：

- 必填数字：`disp`, `font`, `x`, `y`, `w`, `h`, `size`, `alig`
- 必填非空字符串：`color_1`（`#RRGGBB`）、`color_2`（`#RRGGBB`）、
  **`item_id`**
- 其它字段：`sep`, `image_id`, `image_addr`, `animation`, `angle`, `hier`,
  `transp`，bundle 模式下还有 `bundle_image`

`ItemIdList` 是平行字符串数组，每项必须非空，通常等于同位置的 `item_id`
（如 `"item_1"`, `"time_main"`）。空串会触发
`ItemList[i]: missing or empty string "item_id"`。

### `transp` 与 `hier`（透明度 / 叠层，AI 易错）

- **`transp`**：控制图层**是否看得见**，可理解为不透明度。**凡是需要显示的元素都必须显式写 `transp: 100`**。
  许多自动生成会把缺失字段或未用意落成 **`0`**，在真机上表现为 **整块透明、指针/贴图「不见了」**（易被误判为坐标错误）。
- **`hier`**：**仅有三档** — **`0`**：自动叠层顺序；**`1`**：**底层**（先绘制）；**`2`**：**顶层**（后绘制，压住下层）。
  **不存在 `3`、`4`…**。模拟指针常见组合：时针 **`hier: 1`**、秒针 **`hier: 2`**、分针 **`hier: 0`**（自动），以真机为准微调。

### 时针 / 分针 / 秒针指针图（131 / 132 / 233）

固件常量：**`DIVOOM_CLOCK_DISP_SUPPORT_HOUR_POINT_IMAGE`（131）**、**`DIVOOM_CLOCK_DISP_SUPPORT_MIN_POINT_IMAGE`（132）**、**`DIVOOM_CLOCK_DISP_SUPPORT_SECOND_POINT_IMAGE`（233）**。

- **必须**三根共用**同一正方形**图层 **`w = h`** 及相同 **`x,y,w,h`**；素材 **`w`×`w`**，**绕正方形中心旋转**，针朝 **12 点**。勿用互不相同的细长矩形框或 **`800×1280`** 全屏单笔图。
- 正确布局可参考 **`ClockId 60012`** 导出配置（示例 **`clock60012.cfg`**）。详见 **`docs/disp-usage.md`** 与 **`docs/tool-examples.md` §5b**。

### 图像槽位与网络图库唯一性

同一表盘的 **`ItemList` 中，每种图像相关 `disp` 原则上只保留一行**。若同一 **`disp`**
出现多行，固件侧常见行为是 **以后者为准**，前面的绑定或显示会被覆盖。

**网络图库**类槽位（固件 `DIVOOM_CLOCK_DISP_SUPPORT_NET_PIC` 等）尤其典型：`disp`
**13**（`NET_PIC`）、**173–175**（`NET2_PIC`–`NET4_PIC`）、**125–130**（`NET5_PIC`–`NET10_PIC`）。
完整对照表见 **`docs/disp-usage.md`**「图像元素唯一性（网络图库系列）」。

### `alig` 取值（与固件一致）

- `3` = 居中
- `4` = 左对齐
- `5` = 右对齐

第三方旧工具的 `1`/`2` 必须先归一化（编辑器 `normalizeAligToDevice`
在导入时自动完成）。

### `ItemPatchList[].patch` 字段白名单

`wf_apply_item_patch` 仅识别下列字段，其它键会被静默丢弃：

- 数字：`size`、`size_delta`、`x`、`y`、`w`、`h`、`disp`、`alig`、`sep`、
  `font`、`image_id`、`angle`、`hier`、`transp`、`animation`
- 字符串：`image_addr`、`item_id`、`color_1`、`color_2` 与（multipart
  专用）`bundle_image`

> 推荐：除非显式重命名槽位，**不要**把 `item_id` 放进 `patch.*`。
> HTML 编辑器只在字段差异里发可改属性，从不携带 `item_id`。

## 图片约束

底图（`clock_bg.jpg` / `clock_bg.webp`，由
`divoom_watchface_replace_clock_dial_bg_validate_saved_file` 校验）：

- 格式：仅 JPEG（`FF D8`）或 WebP（`RIFF....WEBP`）；不接 PNG/GIF。
- 分辨率：必须 `800x1280`（竖屏）。
- 体积：通常 < `512000` 字节（`DIVOOM_REPLACE_DIAL_BG_MAX_FILE_BYTES`）。

元素槽位（tar.gz 内 `ItemList[i].image_addr` / `ItemPatchList[i].patch.bundle_image`
引用的叶子，由 `wf_validate_bundle_slot_image_file` 校验）：

- 格式：JPEG / WebP / PNG（`89 50 4E 47 0D 0A 1A 0A`）。
- 体积上限同底图（`< DIVOOM_REPLACE_DIAL_BG_MAX_FILE_BYTES`）。
- 不接受 GIF / BMP / TIFF 等其它格式；客户端打包前如遇这些格式应自行
  转码到上述支持的三种之一（动画 GIF 转码会丢动画，仅留首帧）。

整体：

- 整个 tar.gz body 需小于设备上传上限（外层 `Content-Length` < 100 MiB）。

## 显示元素 204（日出/日落时间）

`DIVOOM_CLOCK_DISP_SUPPORT_SUNRISE_SUNSET_TIME` 在最新固件里**不再两边来回切**：

- 当前时间在今日 `[sunrise, sunset]`（端点含）→ 只显示 sunset。
- 其它时间（夜间/凌晨）→ 显示下一次有效 sunrise（已过当日日落则切换到次日日出）。

UI 写法建议「日出或日落（按当前时间自动切换）」，避免误导用户认为它在闪烁切换。

## 高风险命令

- `Device/ResetLocalClockFromServer`：先删本地 sys 侧文件。
- `Channel/SetClockSelectId`：会立即切换当前显示表盘（编辑器里的「显示表盘」按钮）。
