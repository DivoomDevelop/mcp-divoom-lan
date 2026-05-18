# Curated templates（上架表盘骨架）

`resources/templates-curated.json`（资源 URI：`divoom://templates/curated`）包含约 **20**
套从编辑器自带的 **`public/template/config/*.cfg`** 挖掘出来的表盘骨架，供 AGENT **克隆
`ItemList` 几何与层级**，而不是从 `(0,0)` 凭空猜坐标。

## 数据形状

- `templates[]`：每项含 `bucket`（挑选理由）、`clockId`、`tags`、`stats`、`watchface`。
- `watchface`：**仅有** `ClockId`、`NameCn`、`NameEn`、`ItemIdList`、`ItemList` —— **不含**
  `DeviceImageUrl` / 预览图 URL（需用户自备底图或走 LAN 上传流程）。
- `tagIndex`：反向索引 tag → `clockId[]`，便于粗筛。

## 何时用 `watchface_template_search`

| 场景 | 建议参数 |
|------|-----------|
| 想做天气信息角落 | `tagsAny: ["weather"]` |
| 农历/节气文案 | `tagsAny: ["lunar_calendar"]` |
| 分离小时十位个位等 | `tagsAny: ["split_time_digits"]` |
| 像素风候选 | `tagsAny: ["pixel_theme"]` |
| 大量自定义贴图槽 | `tagsAny: ["asset_heavy"]` |
| 已在用某个 disp | `dispPresent: <disp>` |

设 `includeWatchface: false` 可先只看 meta（减小上下文）。

## 与 `watchface_layout_suggest` 配合

模板给出**整体设计**；对单个 `disp` 仍可调用 **`watchface_layout_suggest`**，用
`disp-catalog.typography` 的中位数 (`p50`) 校准某一行的 `size/x/y/w/h/alig` 与常见色。

## 再生成了什么

```bash
npm run sync:editor -- path/to/divoom-watchface-visual-editor
# 或单独：
npm run build:templates -- path/to/divoom-watchface-visual-editor
```

上游变更：`public/template/config` 或 `font-catalog.json` 分类逻辑变化时，应重新同步以使
模板标签与 typography 统计更新。
