# 火山引擎 MCP 生态广场 — 上架操作（README 收录）

**进展：** 已向官方仓库提交 PR：**https://github.com/volcengine/mcp-server/pull/398**（合并后由火山侧同步 [大模型生态广场](https://www.volcengine.com/mcp-marketplace)）。

## 本仓库已准备的改动

- 在 **「### 其他」** 分组**首条**增加 **mcp-divoom-lan** 一行说明（中文版，含场景、stdio、环境变量、MIT、安装方式）。
- 可在本机用补丁应用，或直接使用下面「一次性推送」里已做好的分支。

### 方式 A：打补丁（无需保留整仓克隆）

将下列 diff 保存为 `volcengine-readme-divoom.patch`，在 **你 fork 后的** `mcp-server` 仓库根目录执行：

```bash
git apply volcengine-readme-divoom.patch
git checkout -b feat/add-mcp-divoom-lan
git add README.md
git commit -m "docs: add mcp-divoom-lan to third-party MCP list"
git push origin feat/add-mcp-divoom-lan
```

补丁内容见本目录下 **`docs/volcengine-readme-divoom.patch`**（与上游 `main` 对比的单文件差异）。

### 方式 B：使用本工作区已生成的分支（若你仍保留 `tools/volcengine-mcp-server-fork-prep`）

若已在 `divoom_app/tools/volcengine-mcp-server-fork-prep` 中生成提交 `docs: add mcp-divoom-lan to third-party MCP list`、分支 `feat/add-mcp-divoom-lan`：

1. 浏览器打开 <https://github.com/volcengine/mcp-server> → **Fork** 到 **`DivoomDevelop/mcp-server`**（若尚未 fork）。
2. 在该克隆目录执行：

```bash
git remote add fork https://github.com/DivoomDevelop/mcp-server.git
git push fork feat/add-mcp-divoom-lan
```

3. 打开 GitHub 提示的 **Compare & pull request**，目标仓库为 `volcengine/mcp-server` 的 `main`。

---

## PR 标题（建议）

```text
docs: add mcp-divoom-lan to third-party MCP list
```

## PR 描述（建议粘贴）

```markdown
## Summary

Add **[mcp-divoom-lan](https://github.com/DivoomDevelop/mcp-divoom-lan)** to the third-party MCP list under **「其他」**: Divoom watchface customization over **LAN** (read/patch dial config, replace background, brightness, dial switch, multipart uploads).

## Open source

- **License:** MIT  
- **Repository:** https://github.com/DivoomDevelop/mcp-divoom-lan  

## Runtime & install

- **Transport:** stdio (Node.js 20+)  
- **User environment:** end users must reach the physical device on the **same LAN**; set `DIVOOM_DEVICE_HOST` (optional `DIVOOM_DEVICE_PORT`, `DIVOOM_TIMEOUT_MS`).  
- **Install:** `npx -y mcp-divoom-lan` (npm 0.1.2+ with `bin` entry) or `node dist/index.js` after clone/build.  

## Notes for reviewers

- No Volcengine cloud resources required; purely **local/LAN** device HTTP API access.  
- Listing request aligns with MCP ecosystem plaza third-party entries (similar to existing external links in README).
```

## 合并之后

- 广场展示以火山侧同步为准；若 README 已合并但 [mcp-marketplace](https://www.volcengine.com/mcp-marketplace) 长期未出现，可通过 **控制台工单** 或对接商务核对。
