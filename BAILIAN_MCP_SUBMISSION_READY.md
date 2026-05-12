# 阿里云百炼（Model Studio）— MCP 接入说明

百炼的 MCP 能力分散在 **MCP 广场**（挑选官方/已上架服务）与 **MCP 管理**（自定义部署）两处。以下为 **`mcp-divoom-lan`** 的推荐配置与文档索引。

## 官方文档（建议收藏）

| 主题 | 链接 |
|------|------|
| MCP 简介与计费 | [模型上下文协议（MCP）](https://help.aliyun.com/zh/model-studio/mcp-introduction) |
| 官方 MCP 开通与智能体配置 | [官方 MCP 服务](https://help.aliyun.com/zh/model-studio/official-and-third-party-mcp) |
| **自定义 MCP（脚本 npx / uvx、AI 网关、OpenAPI）** | [**自定义 MCP 服务**](https://help.aliyun.com/zh/model-studio/custom-mcp) |
| 快速开始（广场开通示例） | [官方 MCP 服务快速入门](https://help.aliyun.com/zh/model-studio/mcp-quickstart) |
| 外部调用 | [外部调用 MCP 服务](https://help.aliyun.com/zh/model-studio/mcp-external-calls) |

## 控制台入口

- **MCP 广场（市场）**：[百炼控制台 MCP](https://bailian.console.aliyun.com/?tab=mcp#/mcp-market)  
- **MCP 管理（创建自定义服务）**：[MCP 管理](https://bailian.console.aliyun.com/?tab=app#/mcp-manage)  

说明：帮助中心写的是「在 **MCP 市场** 搜寻服务，以**自定义 MCP 服务**形式部署」——即多数第三方开源服务是 **你自己在 MCP 管理里创建**，而非一定有「对外开放上架到广场」的自助入口。若要把服务做成 **广场首页可检索的公开条目**，通常需 **阿里云运营/合作渠道**，以最新控制台与协议为准。

---

## 在百炼中创建「自定义 MCP」（脚本部署 · npx）

适用于已发布到 npm、支持 **`npx -y <包名>`** 的 Node MCP（本仓库 **0.1.2+** 已配置 `bin`）。

### 1. 进入创建流程

1. 打开 [MCP 管理](https://bailian.console.aliyun.com/?tab=app#/mcp-manage)。  
2. **创建 MCP 服务** → 选择 **使用脚本部署** → **部署服务**。  

### 2. 表单建议填写

| 配置项 | 建议值 |
|--------|--------|
| **服务名称** | `Divoom LAN Watchface` 或 `mcp-divoom-lan` |
| **描述** | 基于 MCP 的 Divoom 局域网表盘定制：读写本地表盘、替换底图、亮度与切盘、multipart 上传；需局域网内 HTTP 访问设备。 |
| **安装方式** | **npx** |
| **部署方式** | 按调用频率选 **基础模式**（按次/时长）或 **极速模式**（常驻，费用更高）；详见 [MCP 简介-计费](https://help.aliyun.com/zh/model-studio/mcp-introduction)。 |
| **部署地域** | 与其他百炼资源接近即可（文档示例常用北京）。 |

### 3. MCP 服务配置（JSON）

将下面 **整段** 粘贴到「MCP 服务配置」中（与帮助中心 [自定义 MCP](https://help.aliyun.com/zh/model-studio/custom-mcp) 模板一致：`type: stdio` + `command` / `args` / `env`）。把 `DIVOOM_DEVICE_HOST` 换成你设备在 **该运行环境可达** 的地址。

```json
{
  "mcpServers": {
    "divoom-lan": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "mcp-divoom-lan"
      ],
      "env": {
        "DIVOOM_DEVICE_HOST": "192.168.1.120",
        "DIVOOM_DEVICE_PORT": "9000",
        "DIVOOM_TIMEOUT_MS": "45000"
      }
    }
  }
}
```

- **包版本**：若需固定版本，可将 `"mcp-divoom-lan"` 改为 `"mcp-divoom-lan@0.1.2"`。  
- **安全**：勿将真实内网 IP、Token 写入对外可见的仓库；控制台可用 KMS 管理敏感项（见官方 MCP 开通说明）。

### 4. 部署后在应用中启用

按 [官方 MCP 服务](https://help.aliyun.com/zh/model-studio/official-and-third-party-mcp) 的「在智能体或工作流中配置 MCP 服务」：**智能体应用**最多挂 **5 个** MCP；工作流中使用 **MCP 节点**并逐项选工具。

---

## 重要限制：局域网设备与云托管

- Divoom 设备通常在 **家庭/办公局域网**（如 `192.168.x.x`），HTTP 端口常见 **9000**。  
- 百炼 **脚本部署**会将 MCP 跑在 **函数计算 FC** 等云端环境，**默认无法访问你家里路由器后面的 IP**。  
- **因此：** 若无 **专线 / VPN / 内网穿透 / 设备公网可达地址**，云端智能体**无法**稳定驱动实机；更适合的场景是：  
  - **本地开发机 / 同局域网主机**上跑 MCP（Cursor、Claude 等），或  
  - 自行在 **可访问设备网段**的环境部署 **Streamable HTTP** MCP，再在百炼用 **`type: sse/streamableHttp`** 填 URL（需你先有远端 MCP 网关；本仓库默认 **stdio**）。  

若仅希望在百炼里 **演示协议与工具列表**，可将 `DIVOOM_DEVICE_HOST` 指向测试中可达的地址；真实用户需理解 **网络可达性** 是前提。

---

## 与「MCP 广场」的关系

- **广场**：浏览 [MCP 广场](https://bailian.console.aliyun.com/?tab=mcp#/mcp-market) 中已由平台收录的服务，点卡片查看 **NPX** 配置示例。  
- **`mcp-divoom-lan`** 若未出现在广场，仍可按上文 **自定义 MCP** 使用 npm 包部署。  
- 若贵司希望 **入驻广场公开展示**，请向 **阿里云百炼商务/合作伙伴** 或控制台 **工单** 咨询当前政策。

## 相关（本仓库）

- npm：`mcp-divoom-lan`（推荐 0.1.2+，`npx -y mcp-divoom-lan`）  
- 源码：<https://github.com/DivoomDevelop/mcp-divoom-lan>  
- 其他目录：`MCP_SO_SUBMISSION_READY.md`、`VOLCENGINE_SUBMISSION_READY.md`  
