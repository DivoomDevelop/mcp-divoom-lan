# 新增产品资料

产品资料必须独立存放在 `resources/<model>/`。当前目录为 `timesframe` 和 `astrotoo`；共享协议说明放在 `resources/common`。

## 产品注册

在 `src/devices.ts` 的 `PRODUCTS` 中登记 Hardware 列表、画布尺寸和资源目录，并同步更新 `resources/products.json`。一个 Hardware 只能属于一个产品。设备联网调用始终先读 `Device/GetHardwareVersion`，未知 Hardware 直接失败。

## 目录约定

每个产品目录至少提供：

- `clock-catalog.json`：表盘 ID、中英文名称、字体、`disp`、`item_id` 和来源摘要。
- `clock-configs.json`：按 ClockId 索引的完整配置。
- `font-catalog.json`：该产品自己的字体 ID 和名称。
- `disp-catalog.json`：该产品固件实际支持的 `disp`。
- `templates-curated.json`：只由该产品配置生成的模板。
- `watchface-config.schema.json`：该产品画布和字段约束。
- `example-minimal.json`：该产品的最小示例。

可以增加产品专用 `guide.md` 和其他文件。运行时加载器只读取 `PRODUCTS[model].resourceDir`，禁止缺失时回退到另一个产品目录。

## 接入检查

1. 增加 Hardware 映射和产品目录。
2. 为 `watchface_clock_catalog`、字体、`disp`、模板和 schema 准备独立数据。
3. 增加公开资源 URI；旧 URI 保持原语义。
4. 添加测试，覆盖自动识别、目录选择、同名或同 ID 数据不串用、未知 Hardware 拒绝。
5. 运行类型检查、MCP 协议测试和资源生成器，再做对应真机验证。

不要仅根据 `DeviceType`、IP、上一次设备结果或某个常见 ClockId 判断产品。
