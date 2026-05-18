#!/usr/bin/env node
/**
 * Scan the visual editor's bundled marketplace templates (`public/template/config/*.cfg`)
 * to derive:
 *   1) Per-disp typography statistics (merged into disp-catalog by sync-editor-ai-bundle).
 *   2) A small curated template library for AI agents (`resources/templates-curated.json`).
 *
 * Usage:
 *   node scripts/build-templates-and-typography.mjs [path/to/divoom-watchface-visual-editor]
 *
 * Resolution order for editor root: argv[2], DIVOOM_EDITOR_REPO, sibling ../divoom-watchface-visual-editor
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const resourcesRoot = path.join(repoRoot, "resources");

const SPLIT_TIME_DISPS = new Set([406, 407, 408, 409]);
const LUNAR_DISPS = new Set([20, 21, 22, 23, 24, 25, 26, 216, 217]);
const WEATHER_DISPS = new Set([18, 52, 53, 54, 81, 85, 89, 93]);
const CJK_TEXT_DISPS = new Set([12, 49, 56, 154, 155, 171, 178, 179, 219, 220]);

function resolveEditorRoot() {
  const explicit = process.argv[2];
  const fromEnv = process.env.DIVOOM_EDITOR_REPO;
  const sibling = path.resolve(repoRoot, "../divoom-watchface-visual-editor");
  return [explicit, fromEnv, sibling].filter(Boolean).find((p) => fs.existsSync(p));
}

function stripBom(raw) {
  if (raw.charCodeAt(0) === 0xfeff) return raw.slice(1);
  return raw;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sorted[base];
  const b = sorted[base + 1];
  if (b === undefined) return Math.round(a);
  return Math.round(a + rest * (b - a));
}

function modeOf(nums) {
  if (!nums.length) return null;
  const counts = new Map();
  for (const n of nums) {
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  let best = null;
  let bestN = -1;
  for (const [k, c] of counts) {
    if (c > bestN || (c === bestN && best !== null && k < best)) {
      best = k;
      bestN = c;
    }
  }
  return best;
}

function topKStrings(countsMap, k) {
  return [...countsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([value]) => value);
}

function loadJsonOptional(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function loadDispRasterHints() {
  const cat = loadJsonOptional(path.join(resourcesRoot, "disp-catalog.json"));
  const hints = new Map();
  if (!cat?.displays) return hints;
  for (const row of cat.displays) {
    const d = Number(row.disp);
    hints.set(d, row.hints?.likelyUsesRasterOrAssetLayer === true);
  }
  return hints;
}

function loadFontTagIndex() {
  const cat = loadJsonOptional(path.join(resourcesRoot, "font-catalog.json"));
  const byId = new Map();
  if (!cat?.fonts) return byId;
  for (const f of cat.fonts) {
    byId.set(Number(f.id), new Set((f.style_tags ?? []).map((t) => String(t).toLowerCase())));
  }
  return byId;
}

function isAssetSlot(item, dispRasterHint) {
  const addr = String(item.image_addr ?? "").trim();
  if (addr && !/^https?:\/\//i.test(addr)) return true;
  return dispRasterHint === true;
}

function deriveItemIdList(cfg) {
  if (Array.isArray(cfg.ItemIdList) && cfg.ItemIdList.length > 0) {
    return cfg.ItemIdList.map((x) => String(x));
  }
  const items = cfg.ItemList ?? [];
  return items.map((it) => String(it.item_id ?? ""));
}

function analyzeTemplate(cfg, rasterHints, fontTags) {
  const items = Array.isArray(cfg.ItemList) ? cfg.ItemList : [];
  const clockId = Number(cfg.ClockId);
  const disps = items.map((it) => Number(it.disp));
  const dispSet = new Set(disps);

  let assetSlots = 0;
  const fontCounts = new Map();
  for (const it of items) {
    const d = Number(it.disp);
    if (isAssetSlot(it, rasterHints.get(d))) assetSlots++;
    const fid = Number(it.font);
    if (!Number.isFinite(fid)) continue;
    fontCounts.set(fid, (fontCounts.get(fid) ?? 0) + 1);
  }
  const rasterRatio = items.length ? assetSlots / items.length : 0;

  let dominantFont = null;
  let dominantShare = 0;
  for (const [fid, c] of fontCounts) {
    const share = items.length ? c / items.length : 0;
    if (share > dominantShare || (share === dominantShare && fid < (dominantFont ?? Infinity))) {
      dominantFont = fid;
      dominantShare = share;
    }
  }

  const tags = new Set();
  if (items.length <= 6) tags.add("sparse_layout");
  if (items.length >= 16) tags.add("dense_layout");
  for (const d of dispSet) {
    if (SPLIT_TIME_DISPS.has(d)) tags.add("split_time_digits");
    if (LUNAR_DISPS.has(d)) tags.add("lunar_calendar");
    if (WEATHER_DISPS.has(d)) tags.add("weather");
    if (CJK_TEXT_DISPS.has(d)) tags.add("cjk_text");
  }
  const heroTime = items.some((it) => {
    const d = Number(it.disp);
    const sz = Number(it.size);
    return (d === 4 || d === 5) && sz >= 44;
  });
  if (heroTime) tags.add("large_time");

  if (rasterRatio >= 0.35) tags.add("asset_heavy");

  const domTags = dominantFont != null ? fontTags.get(dominantFont) : null;
  if (domTags?.has("pixel")) tags.add("pixel_theme");
  if (domTags?.has("digital")) tags.add("digital_theme");

  const cjkSlots = items.filter((it) => CJK_TEXT_DISPS.has(Number(it.disp))).length;
  if (cjkSlots >= 2) tags.add("cjk_heavy");

  return {
    clockId,
    nameCn: String(cfg.NameCn ?? ""),
    nameEn: String(cfg.NameEn ?? ""),
    itemCount: items.length,
    uniqueDisps: dispSet.size,
    dispSet,
    tags: [...tags],
    rasterRatio,
    dominantFonts:
      dominantFont == null
        ? []
        : [{ id: dominantFont, share: Number(dominantShare.toFixed(3)) }],
    cfg,
  };
}

function pickCurated(metas, maxTemplates) {
  const picked = new Set();
  const out = [];

  function candidates(pred) {
    return metas.filter((m) => !picked.has(m.clockId) && pred(m));
  }

  function take(label, pred, sortFn) {
    const pool = candidates(pred);
    pool.sort(sortFn);
    const ch = pool[0];
    if (!ch) return;
    picked.add(ch.clockId);
    out.push({ ...ch, bucket: label });
  }

  take(
    "split_time_digits",
    (m) => m.tags.includes("split_time_digits"),
    (a, b) => b.itemCount - a.itemCount || a.clockId - b.clockId,
  );
  take(
    "lunar_calendar",
    (m) => m.tags.includes("lunar_calendar"),
    (a, b) => b.itemCount - a.itemCount || a.clockId - b.clockId,
  );
  take(
    "weather",
    (m) => m.tags.includes("weather"),
    (a, b) => b.itemCount - a.itemCount || a.clockId - b.clockId,
  );
  take(
    "asset_heavy",
    (m) => m.rasterRatio >= 0.35,
    (a, b) => b.rasterRatio - a.rasterRatio || a.clockId - b.clockId,
  );
  take(
    "pixel_theme",
    (m) => m.tags.includes("pixel_theme"),
    (a, b) => b.itemCount - a.itemCount || a.clockId - b.clockId,
  );
  take(
    "digital_theme",
    (m) => m.tags.includes("digital_theme"),
    (a, b) => b.itemCount - a.itemCount || a.clockId - b.clockId,
  );
  take(
    "cjk_heavy",
    (m) => m.tags.includes("cjk_heavy"),
    (a, b) => b.itemCount - a.itemCount || a.clockId - b.clockId,
  );
  take(
    "large_time",
    (m) => m.tags.includes("large_time"),
    (a, b) => b.itemCount - a.itemCount || a.clockId - b.clockId,
  );
  take(
    "sparse_layout",
    (m) => m.tags.includes("sparse_layout"),
    (a, b) => a.itemCount - b.itemCount || a.clockId - b.clockId,
  );
  take(
    "dense_layout",
    (m) => m.tags.includes("dense_layout"),
    (a, b) => b.itemCount - a.itemCount || a.clockId - b.clockId,
  );

  const unionTags = () => {
    const s = new Set();
    for (const row of out) for (const t of row.tags) s.add(t);
    return s;
  };

  while (out.length < maxTemplates) {
    const used = unionTags();
    let best = null;
    let bestScore = -1;
    for (const m of metas) {
      if (picked.has(m.clockId)) continue;
      let gain = 0;
      for (const t of m.tags) if (!used.has(t)) gain++;
      gain += m.uniqueDisps * 0.01;
      if (gain > bestScore || (gain === bestScore && best && m.clockId < best.clockId)) {
        bestScore = gain;
        best = m;
      }
    }
    if (!best) break;
    picked.add(best.clockId);
    out.push({ ...best, bucket: "diverse_fill" });
  }

  out.sort((a, b) => a.clockId - b.clockId);
  return out;
}

function buildTypographyByDisp(allItemsByDisp) {
  const byDisp = {};
  for (const [dispStr, samples] of Object.entries(allItemsByDisp)) {
    const sizes = [...samples.sizes].sort((a, b) => a - b);
    const xs = [...samples.x].sort((a, b) => a - b);
    const ys = [...samples.y].sort((a, b) => a - b);
    const ws = [...samples.w].sort((a, b) => a - b);
    const hs = [...samples.h].sort((a, b) => a - b);
    const aligs = samples.aligs;
    const n = sizes.length;
    const typography = {
      sampleCount: n,
      size: { p10: quantile(sizes, 0.1), p50: quantile(sizes, 0.5), p90: quantile(sizes, 0.9) },
      box: {
        x: { p10: quantile(xs, 0.1), p50: quantile(xs, 0.5), p90: quantile(xs, 0.9) },
        y: { p10: quantile(ys, 0.1), p50: quantile(ys, 0.5), p90: quantile(ys, 0.9) },
        w: { p10: quantile(ws, 0.1), p50: quantile(ws, 0.5), p90: quantile(ws, 0.9) },
        h: { p10: quantile(hs, 0.1), p50: quantile(hs, 0.5), p90: quantile(hs, 0.9) },
      },
      colorHints: {
        color_1_common: topKStrings(samples.c1, 3),
        color_2_common: topKStrings(samples.c2, 3),
      },
    };
    const aligMode = modeOf(aligs);
    if (aligMode !== null) typography.alig = { mode: aligMode };
    byDisp[dispStr] = typography;
  }
  return byDisp;
}

function main() {
  const editorRoot = resolveEditorRoot();
  if (!editorRoot) {
    console.error(
      "[build-templates-and-typography] editor repo not found. Pass path, set DIVOOM_EDITOR_REPO, or place repo next to mcp-divoom-lan.",
    );
    process.exit(2);
  }
  const editorAbs = path.resolve(editorRoot);
  const cfgDir = path.join(editorAbs, "public/template/config");
  if (!fs.existsSync(cfgDir)) {
    console.error("[build-templates-and-typography] missing:", cfgDir);
    process.exit(2);
  }

  fs.mkdirSync(resourcesRoot, { recursive: true });

  const rasterHints = loadDispRasterHints();
  const fontTags = loadFontTagIndex();

  const files = fs.readdirSync(cfgDir).filter((f) => f.endsWith(".cfg"));
  const metas = [];
  const itemsByDisp = {};

  let parsedOk = 0;
  for (const fn of files) {
    const fp = path.join(cfgDir, fn);
    let raw;
    try {
      raw = stripBom(fs.readFileSync(fp, "utf8"));
      const cfg = JSON.parse(raw);
      if (!cfg || typeof cfg !== "object") continue;
      parsedOk++;
      const meta = analyzeTemplate(cfg, rasterHints, fontTags);
      metas.push(meta);

      for (const it of cfg.ItemList ?? []) {
        const disp = Number(it.disp);
        if (!Number.isFinite(disp)) continue;
        const key = String(disp);
        if (!itemsByDisp[key]) {
          itemsByDisp[key] = {
            sizes: [],
            x: [],
            y: [],
            w: [],
            h: [],
            aligs: [],
            c1: new Map(),
            c2: new Map(),
          };
        }
        const bucket = itemsByDisp[key];
        const sz = Number(it.size);
        const x = Number(it.x);
        const y = Number(it.y);
        const w = Number(it.w);
        const h = Number(it.h);
        const alig = Number(it.alig);
        if (Number.isFinite(sz)) bucket.sizes.push(sz);
        if (Number.isFinite(x)) bucket.x.push(x);
        if (Number.isFinite(y)) bucket.y.push(y);
        if (Number.isFinite(w)) bucket.w.push(w);
        if (Number.isFinite(h)) bucket.h.push(h);
        if (Number.isFinite(alig)) bucket.aligs.push(alig);
        const c1 = String(it.color_1 ?? "").trim();
        const c2 = String(it.color_2 ?? "").trim();
        if (c1) bucket.c1.set(c1, (bucket.c1.get(c1) ?? 0) + 1);
        if (c2) bucket.c2.set(c2, (bucket.c2.get(c2) ?? 0) + 1);
      }
    } catch (e) {
      console.warn("[build-templates-and-typography] skip", fn, String(e));
    }
  }

  const byDisp = buildTypographyByDisp(itemsByDisp);
  const overlayPath = path.join(resourcesRoot, "disp-typography-overlay.json");
  fs.writeFileSync(
    overlayPath,
    JSON.stringify(
      {
        schema: 1,
        generatedAt: new Date().toISOString(),
        source: {
          editorRepo: "divoom-watchface-visual-editor",
          templateDir: "public/template/config",
          cfgFilesRead: files.length,
          cfgFilesParsed: parsedOk,
        },
        notes: [
          "Aggregated from bundled marketplace template JSON files shipped with the HTML editor (not live cloud inventory).",
          "Use p50 (median) as the first guess for size/x/y/w/h when authoring a new Item row; p10–p90 captures typical spread on 800×1280-style layouts.",
          "alig.mode is the majority alignment among templates (3=center, 4=left, 5=right).",
          "colorHints lists the most frequent color_1/color_2 hex strings for this disp — stylistic hints only.",
        ],
        byDisp,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("[build-templates-and-typography] wrote", overlayPath, "disp keys:", Object.keys(byDisp).length);

  const CURATED = 20;
  const curatedMeta = pickCurated(metas, CURATED);
  const tagIndex = {};
  const templates = curatedMeta.map((m) => {
    for (const t of m.tags) {
      if (!tagIndex[t]) tagIndex[t] = [];
      tagIndex[t].push(m.clockId);
    }
    const wf = {
      ClockId: m.clockId,
      NameCn: m.nameCn,
      NameEn: m.nameEn,
      ItemIdList: deriveItemIdList(m.cfg),
      ItemList: m.cfg.ItemList ?? [],
    };
    return {
      bucket: m.bucket,
      clockId: m.clockId,
      nameCn: m.nameCn,
      nameEn: m.nameEn,
      tags: m.tags,
      stats: {
        itemCount: m.itemCount,
        uniqueDisps: m.uniqueDisps,
        rasterSlotRatio: Number(m.rasterRatio.toFixed(3)),
        dominantFonts: m.dominantFonts,
      },
      watchface: wf,
    };
  });

  const curatedPath = path.join(resourcesRoot, "templates-curated.json");
  fs.writeFileSync(
    curatedPath,
    JSON.stringify(
      {
        schema: 1,
        generatedAt: new Date().toISOString(),
        source: {
          editorRepo: "divoom-watchface-visual-editor",
          templateDir: "public/template/config",
          cfgFilesParsed: parsedOk,
          curatedCount: templates.length,
        },
        notes: [
          "Clone a template's watchface JSON as the skeleton, then swap fonts via watchface_font_catalog and tune colors; keep ItemIdList parallel to item_id.",
          "These templates omit DeviceImageUrl / preview URLs — restore artwork via user assets or PatchLocalClockInfo + multipart bundle as usual.",
          "Always validate device-side fonts with watchface_get_fonts_local before patching.",
        ],
        tagIndex,
        templates,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("[build-templates-and-typography] wrote", curatedPath, "templates:", templates.length);

  console.log("[build-templates-and-typography] done. Editor:", editorAbs);
}

main();
