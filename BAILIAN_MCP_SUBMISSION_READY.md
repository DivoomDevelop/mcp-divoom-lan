# 阿里云百炼（Model Studio）— MCP 接入说明

百炼的 MCP 能力分散在 **MCP 广场**（挑选官方/已上架服务）与 **MCP 管理**（自定义部署）两处。以下为 `**mcp-divoom-lan`** 的推荐配置与文档索引。

## 官方文档（建议收藏）


| 主题                                      | 链接                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| MCP 简介与计费                               | [模型上下文协议（MCP）](https://help.aliyun.com/zh/model-studio/mcp-introduction)          |
| 官方 MCP 开通与智能体配置                         | [官方 MCP 服务](https://help.aliyun.com/zh/model-studio/official-and-third-party-mcp) |
| **自定义 MCP（脚本 npx / uvx、AI 网关、OpenAPI）** | **[自定义 MCP 服务](https://help.aliyun.com/zh/model-studio/custom-mcp)**              |
| 快速开始（广场开通示例）                            | [官方 MCP 服务快速入门](https://help.aliyun.com/zh/model-studio/mcp-quickstart)           |
| 外部调用                                    | [外部调用 MCP 服务](https://help.aliyun.com/zh/model-studio/mcp-external-calls)         |


## 控制台入口

- **MCP 广场（市场）**：[百炼控制台 MCP](https://bailian.console.aliyun.com/?tab=mcp#/mcp-market)  
- **MCP 管理（创建自定义服务）**：[MCP 管理](https://bailian.console.aliyun.com/?tab=app#/mcp-manage)

说明：帮助中心写的是「在 **MCP 市场** 搜寻服务，以**自定义 MCP 服务**形式部署」——即多数第三方开源服务是 **你自己在 MCP 管理里创建**，而非一定有「对外开放上架到广场」的自助入口。若要把服务做成 **广场首页可检索的公开条目**，通常需 **阿里云运营/合作渠道**，以最新控制台与协议为准。

---

## 在百炼中创建「自定义 MCP」（脚本部署 · npx）

适用于已发布到 npm、支持 `**npx -y <包名>`** 的 Node MCP（本仓库 **0.1.2+** 已配置 `bin`）。

### 1. 进入创建流程

1. 打开 [MCP 管理](https://bailian.console.aliyun.com/?tab=app#/mcp-manage)。
2. **创建 MCP 服务** → 选择 **使用脚本部署** → **部署服务**。

### 2. 表单建议填写


| 配置项      | 建议值                                       |
| -------- | ----------------------------------------- |
| **服务名称** | `Divoom LAN Watchface` 或 `mcp-divoom-lan` |
| **描述**   | 见下 **「详细描述（控制台 ≤500 字）」**，可直接粘贴。          |
| **安装方式** | **npx**                                   |


#### 详细描述（控制台 ≤500 字）

> 字数约 389（以控制台计数为准）。

mcp-divoom-lan 是基于模型上下文协议（MCP）的 Divoom 局域网工具集，面向手表、像素屏等支持官方 LAN HTTP API 的设备。将设备能力封装为 MCP 工具：读取与补丁式修改本地表盘（GetLocalClockInfo / PatchLocalClockInfo，含 ItemList 与按角色补丁）、查询本地字体与商城表盘、切换当前表盘、读写亮度，并提供 multipart 流程以更换底图、上传文件、创建本地表盘；附带协议与安全要点资源。stdio 传输，须网络可达设备，配置 DIVOOM_DEVICE_HOST（可选 DIVOOM_DEVICE_PORT、DIVOOM_TIMEOUT_MS）。建议先读再改并回读校验；从云端重置本地等高风险操作须用户确认。MIT，Node 20+，npx -y mcp-divoom-lan（≥0.1.2）。

| **部署方式** | 按调用频率选 **基础模式**（按次/时长）或 **极速模式**（常驻，费用更高）；详见 [MCP 简介-计费](https://help.aliyun.com/zh/model-studio/mcp-introduction)。 |
| **部署地域** | 与其他百炼资源接近即可（文档示例常用北京）。 |

### 3. MCP 服务配置（JSON）

百炼控制台里 **NPX 配置** 常与 **高德等官方卡片** 相同：仅 `command` / `args` / `env`，**不带 `type`**。帮助中心 [自定义 MCP](https://help.aliyun.com/zh/model-studio/custom-mcp) 文档模板里则写有 `**"type": "stdio"**`。若一种格式校验失败，可换另一种。

**A. 与控制台高德示例一致（推荐先试）**

```json
{
  "mcpServers": {
    "divoom-lan": {
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

**B. 与帮助中心模板一致（含 `type`）**

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

把 `DIVOOM_DEVICE_HOST` 换成你设备在 **该运行环境可达** 的地址。

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
  - 自行在 **可访问设备网段**的环境部署 **Streamable HTTP** MCP，再在百炼用 `**type: sse/streamableHttp`** 填 URL（需你先有远端 MCP 网关；本仓库默认 **stdio**）。

若仅希望在百炼里 **演示协议与工具列表**，可将 `DIVOOM_DEVICE_HOST` 指向测试中可达的地址；真实用户需理解 **网络可达性** 是前提。

---

## 与「MCP 广场」的关系

### 「MCP 管理」里有，「MCP 广场」里看不到？

**这是预期现象。**


| 位置                                                                            | 含义                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **[MCP 管理](https://bailian.console.aliyun.com/?tab=app#/mcp-manage) → 自定义服务** | 当前账号下**自行创建/部署**的 MCP（如脚本 npx），状态「已部署」表示**本账号内**可用的自定义服务。          |
| **[MCP 广场](https://bailian.console.aliyun.com/?tab=mcp#/mcp-market)**         | 平台**对外展示、可检索**的服务目录，多为**官方预置或与阿里云合作上架**；**不会**因为你在管理里部署成功就自动出现在广场。 |


**使用方式：** 在 **应用管理** 里给智能体/工作流 **添加 MCP** 时，从 **自定义服务** 列表里选用你部署的服务（例如 `mcp-divoom`），无需在广场搜同名条目。

**若希望服务像高德一样出现在广场供所有用户发现：** 需 **工单 / 商务 / 伙伴生态** 等渠道向阿里云咨询是否可收录；帮助中心未提供与「提交后必进广场」等价的自助流程。

### 其它说明

- **广场**：浏览已收录服务，点卡片可复制 **NPX** 等示例。  
- `**mcp-divoom-lan`** 未上广场时，仍用 **MCP 管理 → 自定义 MCP（脚本部署）** 即可。  
- 若贵司推动 **入驻广场**，请以控制台与阿里云最新政策为准。

## 相关（本仓库）

- npm：`mcp-divoom-lan`（推荐 0.1.2+，`npx -y mcp-divoom-lan`）  
- 源码：[https://github.com/DivoomDevelop/mcp-divoom-lan](https://github.com/DivoomDevelop/mcp-divoom-lan)  
- 其他目录：`MCP_SO_SUBMISSION_READY.md`、`VOLCENGINE_SUBMISSION_READY.md`

