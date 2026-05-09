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

## 4) 创建新本地表盘

工具：`watchface_create_local_clock`

```json
{
  "imagePath": "C:/images/new_dial_bg.jpg",
  "metadata": {
    "ClockName": "AI Demo Clock",
    "ItemList": [
      {
        "disp": 5,
        "x": 100,
        "y": 120,
        "w": 300,
        "h": 80,
        "size": 28,
        "font": 1,
        "color_1": "#FFFFFF",
        "color_2": "#000000"
      }
    ]
  }
}
```

说明：

- 工具会自动补 `Command=Device/CreateLocalClock` 与 `ReturnCode=0`
- 建议图片使用 `800x1280`，且 `JPEG/WebP`
- `font` 建议先通过 `watchface_get_fonts_local` 读取可用 id

---

## 5) 仅替换底图（不改 DeviceImageUrl）

工具：`watchface_replace_dial_bg_file`

```json
{
  "useCurrentDisplayClock": true,
  "imagePath": "C:/images/replace_bg.jpg"
}
```

该方式用于“替换解码缓存”，不会改 cfg 里的 URL 字段。
