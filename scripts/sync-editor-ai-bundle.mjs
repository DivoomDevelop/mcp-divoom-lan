#!/usr/bin/env node
/**
 * 把 HTML 可视化编辑器（divoom-watchface-visual-editor_v2）的 AI 资料同步到
 * MCP 包的 `resources/`，让任意 AGENT 通过 MCP 资源/工具就能拿到：
 *
 *   - `resources/font-catalog.json`            （由 build-font-catalog.mjs 生成）
 *   - `resources/disp-catalog.json`            （disp + 中文注释 + hints + **typography**）
 *   - `resources/templates-curated.json`       （由 build-templates-and-typography.mjs）
 *   - `resources/disp-typography-overlay.json` （中间产物；合并进 disp-catalog）
 *   - `resources/watchface-config.schema.json`
 *   - `resources/examples/ai-minimal-watchface.json`
 *   - `resources/ai-watchface-guide.md`
 *   - `resources/ai-font-guide.md`           （编辑器 docs/generated/ai-font-guide.md）
 *
 * 用法：
 *   node scripts/sync-editor-ai-bundle.mjs [path/to/divoom-watchface-visual-editor]
 *
 * 解析顺序：
 *   1) argv[2]
 *   2) DIVOOM_EDITOR_REPO 环境变量
 *   3) 与 mcp-divoom-lan 同级的 `divoom-watchface-visual-editor` 目录
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const resourcesRoot = path.join(repoRoot, "resources");

const explicit = process.argv[2];
const fromEnv = process.env.DIVOOM_EDITOR_REPO;
const sibling = path.resolve(repoRoot, "../divoom-watchface-visual-editor");

const editorRoot = [explicit, fromEnv, sibling].filter(Boolean).find((p) => fs.existsSync(p));
if (!editorRoot) {
  console.error(
    "[sync-editor-ai-bundle] cannot find the editor repo. Tried:\n  " +
      [explicit, fromEnv, sibling].filter(Boolean).join("\n  ") +
      "\nPass the path explicitly or set DIVOOM_EDITOR_REPO."
  );
  process.exit(2);
}
const editorAbs = path.resolve(editorRoot);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyIfExists(srcRel, dstRel, label) {
  const src = path.join(editorAbs, srcRel);
  if (!fs.existsSync(src)) {
    console.warn(`[sync-editor-ai-bundle] skip ${label}: not present at ${src}`);
    return false;
  }
  const dst = path.join(resourcesRoot, dstRel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log(`[sync-editor-ai-bundle] copied ${srcRel} → resources/${dstRel}`);
  return true;
}

/**
 * 编辑器 `npm run gen:ai-docs` 的 disp-catalog 只有 name+hints；
 * 这里再读 `src/editor/app.js` 中的 `DISP_NAME_MAP` 与 `DISP_COMMENT_ZH_MAP`，
 * 把中文描述合并到 disp-catalog 上，方便 LLM 直接看到「disp 4 = 小时:分钟」。
 */
function extractObjectMap(src, needle) {
  const start = src.indexOf(needle);
  if (start < 0) return null;
  const slice = src.slice(start);
  const open = slice.indexOf("{");
  let depth = 0;
  for (let i = open; i < slice.length; i++) {
    const c = slice[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const body = slice.slice(open + 1, i);
        const out = new Map();
        // 注意 cfg/源码里偶有 `12: "...",` / `12 : "..."` 形式
        const re = /^\s*(\d+)\s*:\s*"((?:[^"\\]|\\.)*)"/gm;
        let m;
        while ((m = re.exec(body))) {
          out.set(Number(m[1]), m[2]);
        }
        return out;
      }
    }
  }
  return null;
}

function buildEnrichedDispCatalog() {
  const generatedPath = path.join(editorAbs, "docs/generated/disp-catalog.json");
  const appPath = path.join(editorAbs, "src/editor/app.js");

  let baseDisplays = [];
  if (fs.existsSync(generatedPath)) {
    const raw = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
    baseDisplays = Array.isArray(raw.displays) ? raw.displays : [];
  } else if (fs.existsSync(appPath)) {
    const src = fs.readFileSync(appPath, "utf8");
    const nameMap = extractObjectMap(src, "const DISP_NAME_MAP = Object.freeze({");
    if (!nameMap) {
      console.error("[sync-editor-ai-bundle] DISP_NAME_MAP not found and no generated catalog to fall back on.");
      return null;
    }
    baseDisplays = [...nameMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([disp, name]) => ({ disp, name }));
  } else {
    console.warn("[sync-editor-ai-bundle] no editor disp source found, skipping disp catalog.");
    return null;
  }

  let zhCommentMap = new Map();
  if (fs.existsSync(appPath)) {
    const src = fs.readFileSync(appPath, "utf8");
    zhCommentMap = extractObjectMap(src, "const DISP_COMMENT_ZH_MAP = Object.freeze({") ?? new Map();
  }

  const displays = baseDisplays.map((row) => ({
    disp: Number(row.disp),
    name: String(row.name ?? ""),
    description_zh: zhCommentMap.get(Number(row.disp)) ?? "",
    hints: row.hints ?? null
  }));

  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    source: {
      editorRepo: "divoom-watchface-visual-editor",
      base: "src/editor/app.js (DISP_NAME_MAP + DISP_COMMENT_ZH_MAP)",
      generated: fs.existsSync(generatedPath) ? "docs/generated/disp-catalog.json" : null,
      counts: { total: displays.length }
    },
    notes: [
      "`disp` is the firmware-side display element id consumed by ItemList[i].disp / ItemPatchList[i].patch.disp.",
      "`description_zh` mirrors the editor's DISP_COMMENT_ZH_MAP — keep it as authoritative human description.",
      "`hints.likelyUsesRasterOrAssetLayer = true` means the slot usually expects an image_addr asset (image/GIF/PNG); `font` may be ignored by the firmware.",
      "`hints.oftenUsesVectorFontForText = true` means the slot is text-driven — combine with watchface_font_catalog (script: cjk/latin/digits) to pick a font id.",
      "Special slot 204 (SUNRISE_SUNSET_TIME): firmware now displays sunset between today's sunrise/sunset window, otherwise the next sunrise — describe as 'sunrise OR sunset (auto-switch by current time)' in any user-facing UI.",
      "`typography` (merged after running scripts/build-templates-and-typography.mjs) summarizes size/x/y/w/h quantiles and frequent colors mined from bundled marketplace templates — heuristic layout hints only, not enforced by firmware."
    ],
    displays
  };
}

function syncFontCatalog() {
  const cfg = path.join(editorAbs, "public/font/font_info.cfg");
  if (!fs.existsSync(cfg)) {
    console.warn(`[sync-editor-ai-bundle] skip font catalog: missing ${cfg}`);
    return;
  }
  const builder = path.join(__dirname, "build-font-catalog.mjs");
  const r = spawnSync(process.execPath, [builder, cfg], {
    stdio: "inherit",
    cwd: repoRoot
  });
  if (r.status !== 0) {
    console.error("[sync-editor-ai-bundle] font catalog build failed");
    process.exit(r.status ?? 1);
  }
}

function mergeTypographyIntoCatalog(catalog, overlay) {
  if (!catalog?.displays || !overlay?.byDisp || typeof overlay.byDisp !== "object") return;
  for (const row of catalog.displays) {
    const block = overlay.byDisp[String(row.disp)];
    if (block) row.typography = block;
  }
}

function main() {
  ensureDir(resourcesRoot);

  copyIfExists(
    "docs/watchface-config.schema.json",
    "watchface-config.schema.json",
    "watchface JSON Schema"
  );
  copyIfExists(
    "docs/examples/ai-minimal-watchface.json",
    "examples/ai-minimal-watchface.json",
    "minimal watchface example"
  );
  copyIfExists("docs/AI_WATCHFACE_GUIDE.md", "ai-watchface-guide.md", "editor AI guide");
  copyIfExists(
    "docs/generated/ai-font-guide.md",
    "ai-font-guide.md",
    "editor AI font guide (visual style + use cases per font id)"
  );

  syncFontCatalog();

  const dispCatalog = buildEnrichedDispCatalog();
  const dispPath = path.join(resourcesRoot, "disp-catalog.json");
  if (dispCatalog) {
    fs.writeFileSync(dispPath, JSON.stringify(dispCatalog, null, 2) + "\n");
    console.log(
      `[sync-editor-ai-bundle] wrote resources/disp-catalog.json (${dispCatalog.displays.length} disps, pre-typography)`
    );
  }

  const typographyScript = path.join(__dirname, "build-templates-and-typography.mjs");
  const ty = spawnSync(process.execPath, [typographyScript, editorAbs], {
    stdio: "inherit",
    cwd: repoRoot
  });
  if (ty.status !== 0) {
    console.error("[sync-editor-ai-bundle] build-templates-and-typography failed");
    process.exit(ty.status ?? 1);
  }

  if (dispCatalog) {
    const overlayPath = path.join(resourcesRoot, "disp-typography-overlay.json");
    if (fs.existsSync(overlayPath)) {
      try {
        const overlay = JSON.parse(fs.readFileSync(overlayPath, "utf8"));
        mergeTypographyIntoCatalog(dispCatalog, overlay);
        fs.writeFileSync(dispPath, JSON.stringify(dispCatalog, null, 2) + "\n");
        console.log("[sync-editor-ai-bundle] merged typography into disp-catalog.json");
      } catch (e) {
        console.warn("[sync-editor-ai-bundle] typography merge skipped:", e);
      }
    }
  }

  console.log("[sync-editor-ai-bundle] done. Editor repo:", editorAbs);
}

main();
