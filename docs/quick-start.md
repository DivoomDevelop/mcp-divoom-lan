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
   - 为空：停止写入，先切换到可编辑表盘
   - 非空：继续下一步
3. `watchface_patch_local`（最小化修改）
4. `watchface_get_local`（回读确认）

> 非用户明确要求时，不要调用 `watchface_create_local_clock`。

## 5) 快速排错

- 连接失败：检查 IP、端口、同网段、防火墙
- 返回码非 0：先看 `ReturnMessage`，再核对请求字段
- 图片上传失败：检查尺寸是否为 `800x1280`，格式 `JPEG/WebP`

## 6) 配套样例位置

- 请求/响应样例：`docs/examples/`
- 协议关键点提炼：`docs/reference/`
