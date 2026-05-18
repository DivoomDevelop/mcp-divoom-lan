# 核心功能示例

本文给出四类常见需求的 MCP 调用参数示例。

---

## 1) 修改表盘（字体变大 + 红色）

工具：`watchface_patch_local`

```json
{
  "useCurrentDisplayClock": true,
  "itemPatchByRoleList": [
    {
      "role": "clock_time_font",
      "patch": {
        "size_delta": 2,
        "color_1": "#FF0000"
      }
    }
  ]
}
```

说明：

- `size_delta` 是在原有 `size` 上增量修改
- 建议修改后立即调用 `watchface_get_local` 回读

---

## 2) 选择表盘（切换到指定 ClockId）

工具：`watchface_set_clock_select`

```json
{
  "clockId": 17
}
```

可先用 `watchface_get_store_market_list` 获取候选列表，再选择 `ClockId`。

---

## 3) 修改亮度

工具：`watchface_set_brightness`

```json
{
  "brightness": 60
}
```

配套读取：

- `watchface_get_brightness`

---

## 4) 创建新本地表盘（仅底图）

工具：`watchface_create_local_clock`

```json
{
  "imagePath": "C:/images/new_dial_bg.jpg",
  "metadata": {
    "ClockName": "AI Demo Clock",
    "DialAssets": "image",
    "ItemList": [
      {
        "disp": 5,
        "x": 100,
        "y": 120,
        "w": 300,
        "h": 80,
        "size": 28,
        "alig": 3,
        "sep": 0,
        "font": 1,
        "color_1": "#FFFFFF",
        "color_2": "#000000",
        "item_id": "time_main"
      }
    ],
    "ItemIdList": ["time_main"]
  }
}
```

说明：

- 工具会自动补 `Command=Device/CreateLocalClock` 与 `ReturnCode=0`
- 底图使用 `800x1280` 的 `JPEG/WebP`（不接 PNG），建议 < 512000 字节；
  tar.gz 内的元素槽位（`ItemList[i].image_addr` 引用的叶子）支持
  `JPEG/WebP/PNG`，由固件 `wf_validate_bundle_slot_image_file` 按魔数校验
- `font` 建议先通过 `watchface_get_fonts_local` 读取可用 id
- `item_id` **必须为非空字符串**（固件 `NEED_STR("item_id")`），`ItemIdList`
  内每项也必须非空，通常等同于 `item_id`

---

## 5) 创建新本地表盘（底图 + 元素图打包）

需要随表盘上传多张元素图（图标 / 指针 GIF / 数字位图）时，把所有元素图与
`clock_bg.jpg` 一起打成一个 `clock_bg.tar.gz`（USTAR + gzip），叶子名与
`ItemList[i].image_addr` 完全一致。

工具：`watchface_create_local_clock`

```json
{
  "imagePath": "C:/build/clock_bg.tar.gz",
  "metadata": {
    "ClockName": "AI Bundle Demo",
    "DialAssets": "bundle",
    "ItemList": [
      {
        "disp": 4,
        "x": 50,
        "y": 174,
        "w": 700,
        "h": 306,
        "size": 280,
        "alig": 3,
        "sep": 0,
        "font": 24,
        "color_1": "#47ede9",
        "color_2": "#ff0000",
        "item_id": "time_main"
      },
      {
        "disp": 240,
        "x": 431,
        "y": 530,
        "w": 250,
        "h": 250,
        "size": 0,
        "alig": 4,
        "sep": 0,
        "font": 6,
        "color_1": "#ffffff",
        "color_2": "#ff0000",
        "image_addr": "weather_pack.bin",
        "item_id": "weather_anim"
      }
    ],
    "ItemIdList": ["time_main", "weather_anim"]
  }
}
```

`clock_bg.tar.gz` 内部结构：

```
clock_bg.jpg
weather_pack.bin
```

要点：

- `DialAssets: "bundle"` 时第二段 `file_name` 必须是 `clock_bg.tar.gz`，且
  服务器据此把 tar 解压到 `/userdata/app_pic/`。
- 不要把元素图作为独立的多段 multipart 上传——固件每次请求只接受一个文件。
- `image_addr` 跳过本地叶子名时（比如已经是 `http(s)` URL），那张图无需进 tar。
- 不要在 tar 内建子目录、不要使用相对路径或绝对路径，叶子名 ≤ 95 字节。

---

## 6) PATCH 时同时上传新底图 / 元素图

工具：`watchface_patch_local` + `dialAssetsPath`

```json
{
  "clockId": 60006,
  "dialAssetsPath": "C:/build/patch_assets.tar.gz",
  "metadata": {
    "DialAssets": "bundle",
    "ItemPatchList": [
      {
        "index": 5,
        "patch": {
          "image_addr": "weather_pack_v2.bin",
          "bundle_image": "weather_pack_v2.bin"
        }
      }
    ]
  }
}
```

`patch_assets.tar.gz` 内含被引用的叶子。tar 内可省略 `clock_bg.*`，前提是
至少一条 `ItemPatchList[].patch.bundle_image` 指向 tar 内已有文件。

**重要**：`patch.*` 不要传 `item_id`，否则会用本侧值覆盖设备里原本有意义的
`item_id`（例如 `time_main`），破坏菜单/config 关联。仅当显式想重命名槽位时
才发 `item_id`。

---

## 6b) 仅修改字段（无文件上传） — 走 `/divoom_api`

如果只是改字号/位置/颜色等字段，**不要**用 multipart，直接走
`POST /divoom_api`：

工具：`watchface_patch_local`（不传 `dialAssetsPath`）

```json
{
  "clockId": 60006,
  "itemPatchList": [
    { "index": 0, "patch": { "size": 320 } },
    { "index": 0, "patch": { "color_1": "#ffaa00" } },
    { "index": 3, "patch": { "x": 240, "y": 720 } }
  ]
}
```

要点：
- 仅发**变更字段**的 diff（`wf_apply_item_patch` 字段白名单见 quick reference）。
- `alig` 取值：`3`=居中、`4`=左对齐、`5`=右对齐（与固件一致）。
- 同样不要把 `item_id` 放进 `patch.*`。
- 工具会先做 `Device/GetLocalClockInfo` 预检查，`ItemList` 为空时拒绝写入。

---

## 7) 仅替换底图（不改 DeviceImageUrl）

工具：`watchface_replace_dial_bg_file`

```json
{
  "useCurrentDisplayClock": true,
  "imagePath": "C:/images/replace_bg.jpg"
}
```

该方式用于"替换解码缓存"，不会改 cfg 里的 URL 字段；`/replace_clock_dial_bg`
只接受单张 JPEG/WebP 第二段，不接受 tar.gz。
