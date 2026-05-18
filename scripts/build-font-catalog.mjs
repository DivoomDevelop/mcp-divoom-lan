#!/usr/bin/env node
/**
 * 由 HTML 编辑器的 `public/font/font_info.cfg` 生成给 AGENT 用的字体目录
 * `resources/font-catalog.json`。
 *
 * 用法：
 *   node scripts/build-font-catalog.mjs [path/to/font_info.cfg]
 *
 * 解析顺序：
 *   1) argv[2] 显式路径
 *   2) 环境变量 DIVOOM_EDITOR_FONT_CFG
 *   3) divoom_app/tools/divoom-watchface-visual-editor/public/font/font_info.cfg
 *      （与 mcp-divoom-lan 同级的本地仓库默认布局）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const explicit = process.argv[2];
const fromEnv = process.env.DIVOOM_EDITOR_FONT_CFG;
const editorRelDefault = path.resolve(
  repoRoot,
  "../divoom-watchface-visual-editor/public/font/font_info.cfg"
);

const cfgCandidates = [explicit, fromEnv, editorRelDefault].filter(Boolean);
let cfgPath = cfgCandidates.find((p) => p && fs.existsSync(p));
if (!cfgPath) {
  console.error(
    "[build-font-catalog] cannot locate font_info.cfg. Tried:\n  " +
      cfgCandidates.join("\n  ")
  );
  process.exit(2);
}
cfgPath = path.resolve(cfgPath);

let raw = fs.readFileSync(cfgPath, "utf8");
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
const list = JSON.parse(raw).FontList ?? JSON.parse(raw).font_list ?? [];
if (!Array.isArray(list) || !list.length) {
  console.error("[build-font-catalog] empty font list");
  process.exit(3);
}

const DIGITS = "0123456789";

/**
 * 由 charset / name 推断字体在 LLM 视角下能用于哪些场景。
 * 一切判定基于"字符可用性 + 视觉风格"两个维度，不臆测设备未公开行为。
 */
function classifyFont(font) {
  const name = String(font.name ?? "").trim();
  const charset = String(font.charset ?? "");
  const lower = name.toLowerCase();
  const isImageFont = Number(font.type) === 0;
  const tags = new Set();

  // ---- 字符集（script） ----
  // 显式 charset 优先；空 charset 视作 "全字符集 by font"，再按名称推断脚本系统
  const hasCjkInName = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(
    name
  );
  const looksCjkByName =
    hasCjkInName ||
    /(sourcehan|harmonyos[_-]?sans|alimama|zcool|思源|阿里巴巴|站酷|京东|优设|字制区|pangmen|aacao|hanamin|soukoumincho|dingtalk[_ ]?jin|汇文|香蕉|喜脉|港黑)/i.test(
      lower
    );
  const charsetIsDigitOnly = charset === DIGITS;
  const charsetCoversDigits = /[0-9]/.test(charset);
  const charsetCoversLatinAlpha = /[A-Za-z]/.test(charset);

  let script;
  if (charsetIsDigitOnly) script = "digits";
  else if (charset && !charsetCoversLatinAlpha && charsetCoversDigits) script = "digits-extended";
  else if (looksCjkByName) script = "cjk";
  else script = "latin";

  if (charsetCoversLatinAlpha && charsetCoversDigits && !looksCjkByName) script = "latin";

  // ---- 风格标签（style tags） ----
  if (isImageFont) tags.add("image-font");
  else tags.add("ttf");

  if (/pixel|silkscreen|proggy[_ ]?clean|8[- ]?bit|arcade|big[_ ]?pixel|square[_ ]?pixel/i.test(lower))
    tags.add("pixel");
  if (
    /script|caveat|pacifico|nickainley|mexican[_ ]?tequila|oleo[_ ]?script|great[_ ]?vibes|dancing[_ ]?script|coiny|bangers|shrikhand|jack[_ ]?armstrong|bukhari|caveat[_ ]?brush|rl[_ ]?madena|hisham|bitrimus/i.test(
      lower
    )
  )
    tags.add("handwriting");
  if (/digital|audiowide|ds[-_ ]?digital|gost|train[_ ]?one|infroman|impr?isha/i.test(lower))
    tags.add("digital");
  if (
    /bebas|league[_ ]?gothic|stencil|condensed|allerta[_ ]?stencil|project[_ ]?space|spectral[_ ]?sc|big[_ ]?shoulders/i.test(
      lower
    )
  )
    tags.add("display");
  if (/serif|playfair|libre[_ ]?baskerville|spectral|sourcehanserif|思源宋|droid[_ ]?serif/i.test(lower))
    tags.add("serif");
  if (/sans|opposans|harmonyos[_-]?sans|sourcehan|alimama|zcool|阿里巴巴|香蕉|站酷|nunito|tahoma|verdana|trueno|krungthep|opensans|opposans/i.test(
      lower
    ))
    tags.add("sans");
  if (/bold|black|heavy|extrabold|semibold/i.test(lower)) tags.add("bold");
  if (/light|thin/i.test(lower)) tags.add("light");
  if (/regular|medium/i.test(lower)) tags.add("regular");
  if (/italic/i.test(lower)) tags.add("italic");
  if (/emoji/i.test(lower)) tags.add("emoji");
  if (/calligraphy|brush|drawn|hand|sketch|铅笔|手绘|手写|手账|涂鸦|朋克|波普|蒸汽波|粘土|橙色|粉色|蓝色|紫|绿/i.test(lower))
    tags.add("decorative");
  if (
    /career|absolute|wander|library|keep[_ ]?calm|smooth|parisish|alpin|bauhs|adrenaline|vinet|verdanaz|messeduesseldorf|oxford|silkscreen|infroman|imprisha/i.test(
      lower
    ) &&
    !tags.has("display")
  )
    tags.add("display");
  if (script === "cjk") tags.add("cjk-capable");
  if (script === "latin" || charsetCoversLatinAlpha) tags.add("latin-capable");
  if (charsetCoversDigits || script === "digits" || script === "digits-extended") tags.add("digits-capable");

  // ---- 推荐场景（与 disp id 关联） ----
  // 命名规约见 src/divoom_light/include/divoom_disp_clock.h
  const recommendedFor = new Set();
  if (script === "digits" || script === "digits-extended") {
    recommendedFor.add("time_digits"); // 1/2/3/4/5/75/76/199/200/201/406/407/408/409
    recommendedFor.add("date_digits"); // 7/8/9/36/153/156/196
    recommendedFor.add("temperature_digits"); // 32/33/96/97/166/238/239/254/339/342
    recommendedFor.add("forecast_digits"); // 82/83/86/87/90/91/94/95/157
    recommendedFor.add("countdown_digits"); // 51/205
  }
  if (charsetCoversLatinAlpha) {
    recommendedFor.add("ampm_marker"); // 15
    recommendedFor.add("weekday_short"); // 6/31/37/80/84/88/92/169/170
    recommendedFor.add("month_abbr_en"); // 27/180/194
  }
  if (script === "cjk" || (charset === "" && tags.has("cjk-capable"))) {
    recommendedFor.add("user_text"); // 49/56/154/155
    recommendedFor.add("weather_text"); // 54/81/85/89/93
    recommendedFor.add("lunar_text"); // 20/21/22/23/24/25/26/216/217
    recommendedFor.add("calendar_event_text"); // 178/179
    recommendedFor.add("song_lyrics"); // 219/220
    recommendedFor.add("weekday_zh"); // 12
  }
  if (script === "latin" && !tags.has("pixel")) {
    recommendedFor.add("user_text");
    recommendedFor.add("weather_text");
    recommendedFor.add("calendar_event_text");
  }
  if (tags.has("pixel")) {
    recommendedFor.add("pixel_theme_dial");
    if (charsetCoversDigits) recommendedFor.add("time_digits");
  }
  if (tags.has("digital")) {
    recommendedFor.add("retro_digital_clock");
    if (charsetCoversDigits) recommendedFor.add("time_digits");
  }
  if (tags.has("handwriting") || tags.has("display") || tags.has("decorative")) {
    recommendedFor.add("decorative_title"); // 35
    recommendedFor.add("song_title"); // 219
    if (charsetCoversLatinAlpha) recommendedFor.add("weekday_short");
  }
  if (tags.has("emoji")) recommendedFor.add("emoji_glyphs");

  // ---- 备注（caveats） ----
  const notes = [];
  if (isImageFont && script === "digits") {
    notes.push(
      "Image font with digit-only glyphs; only the literal characters in `charset` will render — non-digit characters will show as blanks."
    );
  } else if (isImageFont && charset) {
    notes.push(
      `Image font; only characters in charset \"${charset}\" will render. Anything outside this set is invisible.`
    );
  } else if (!isImageFont && charset && charset.length < 80) {
    notes.push(
      `TTF marked with restricted charset \"${charset}\" — treat as a digits/letters-only fallback even though it is a TTF.`
    );
  }
  if (script === "cjk") {
    notes.push("Supports CJK glyphs — safe for Chinese/Japanese strings (e.g., disp 49/56/154/155/178/179/219/220).");
  }
  if (tags.has("emoji")) {
    notes.push("Emoji font — pair with text fields rendering emoji characters; not a body font.");
  }

  return {
    id: Number(font.id),
    type: Number(font.type),
    type_name: isImageFont ? "image" : "ttf",
    name,
    charset,
    script,
    style_tags: [...tags].sort(),
    recommendedFor: [...recommendedFor].sort(),
    notes: notes.join(" ")
  };
}

const fonts = list
  .filter((f) => Number.isFinite(Number(f.id)))
  .map(classifyFont)
  .sort((a, b) => a.id - b.id);

/**
 * Disp id → 推荐字体筛选条件。
 * 字段 `preferTags` 与下面 fonts[].style_tags 对齐，AGENT 可以做交集。
 * `requiredScript`：硬条件（数字位/CJK文本时必须命中），不满足直接淘汰。
 */
const scenarios = {
  time_digits: {
    label: "Hour/min/sec digits",
    description:
      "Pure numeric time slots (sec/min/hour/HH:MM/HH:MM:SS, world clock, love clock, hour/min decade/unit).",
    disp: [1, 2, 3, 4, 5, 75, 76, 199, 200, 201, 406, 407, 408, 409],
    requiredScript: ["digits", "digits-extended", "latin"],
    preferTags: ["digits-capable", "digital", "pixel", "display", "image-font"]
  },
  date_digits: {
    label: "Date numeric",
    description: "Year/month/day numeric slots and combinations (year, mon, day, year-mon-day).",
    disp: [7, 8, 9, 36, 153, 156, 196],
    requiredScript: ["digits", "digits-extended", "latin"],
    preferTags: ["digits-capable", "display", "image-font"]
  },
  temperature_digits: {
    label: "Temperature numeric",
    description: "Temperature numeric variants and humidity/noise digits.",
    disp: [32, 33, 96, 97, 157, 166, 238, 239, 254, 339, 342],
    requiredScript: ["digits", "digits-extended", "latin"],
    preferTags: ["digits-capable", "display", "digital"]
  },
  forecast_digits: {
    label: "Forecast min/max digits",
    description: "Tomorrow / day+2 / day+3 / day+4 min/max digits.",
    disp: [82, 83, 86, 87, 90, 91, 94, 95],
    requiredScript: ["digits", "digits-extended", "latin"],
    preferTags: ["digits-capable", "display"]
  },
  countdown_digits: {
    label: "Countdown digits",
    description: "Countdown days / sunrise-sunset countdown.",
    disp: [51, 205],
    requiredScript: ["digits", "digits-extended", "latin"],
    preferTags: ["digits-capable", "display"]
  },
  ampm_marker: {
    label: "AM/PM marker",
    description: "Literal AM / PM in 12-hour mode.",
    disp: [15],
    requiredScript: ["latin"],
    preferTags: ["latin-capable", "digital", "display", "pixel"]
  },
  weekday_short: {
    label: "Weekday short / English",
    description: "Two-letter, three-letter, full English weekday and tomorrow weekday short.",
    disp: [6, 31, 37, 80, 84, 88, 92, 169, 170, 195],
    requiredScript: ["latin"],
    preferTags: ["latin-capable", "sans", "display"]
  },
  weekday_zh: {
    label: "Weekday Chinese",
    description: "Chinese weekday strings (e.g., 周一 / 星期一).",
    disp: [12, 171],
    requiredScript: ["cjk"],
    preferTags: ["cjk-capable"]
  },
  month_abbr_en: {
    label: "Month abbreviation (English)",
    description: "English month abbreviations (Jan / Feb …) and full English month.",
    disp: [27, 180, 194],
    requiredScript: ["latin"],
    preferTags: ["latin-capable", "sans", "display"]
  },
  weather_text: {
    label: "Weather word",
    description: "Free-form weather word and forecast weather word slots.",
    disp: [54, 81, 85, 89, 93],
    requiredScript: ["cjk", "latin"],
    preferTags: ["sans", "cjk-capable", "latin-capable"]
  },
  user_text: {
    label: "User / app text",
    description:
      "Multi-language free text inputs: user message, multi-text message, network text, user text.",
    disp: [49, 56, 154, 155],
    requiredScript: ["cjk", "latin"],
    preferTags: ["sans", "cjk-capable", "latin-capable"]
  },
  lunar_text: {
    label: "Lunar text",
    description: "Lunar year/month/day, jieqi, good/bad/zodiac (always Chinese).",
    disp: [20, 21, 22, 23, 24, 25, 26, 216, 217],
    requiredScript: ["cjk"],
    preferTags: ["cjk-capable", "serif", "sans"]
  },
  calendar_event_text: {
    label: "Calendar event",
    description: "Calendar event title / time strings.",
    disp: [178, 179],
    requiredScript: ["cjk", "latin"],
    preferTags: ["sans", "cjk-capable", "latin-capable"]
  },
  song_title: {
    label: "Song title",
    description: "Currently playing song title.",
    disp: [219],
    requiredScript: ["cjk", "latin"],
    preferTags: ["sans", "handwriting", "display", "cjk-capable", "latin-capable"]
  },
  song_lyrics: {
    label: "Song lyrics",
    description: "Currently playing song lyrics line.",
    disp: [220],
    requiredScript: ["cjk", "latin"],
    preferTags: ["sans", "cjk-capable", "latin-capable"]
  },
  pixel_theme_dial: {
    label: "Pixel-art themed dials",
    description: "Time/date inside pixel-art watchfaces; match the pixel aesthetic to avoid jaggy mismatch.",
    disp: [1, 2, 3, 4, 5, 7, 8, 9, 36, 156],
    requiredScript: ["digits", "latin"],
    preferTags: ["pixel", "digits-capable"]
  },
  retro_digital_clock: {
    label: "Retro digital clock",
    description: "DS-Digital / Audiowide style digital clock dials (LED look).",
    disp: [1, 2, 3, 4, 5],
    requiredScript: ["digits", "latin"],
    preferTags: ["digital", "digits-capable"]
  },
  decorative_title: {
    label: "Decorative title",
    description:
      "App / message titles where artistic flair is desired (handwriting / display / brush).",
    disp: [35, 49, 219],
    requiredScript: ["latin", "cjk"],
    preferTags: ["display", "handwriting", "decorative"]
  },
  emoji_glyphs: {
    label: "Emoji glyphs",
    description: "Slots whose text intentionally contains emoji codepoints.",
    disp: [49, 56, 154, 155, 219, 220],
    requiredScript: ["latin", "cjk"],
    preferTags: ["emoji"]
  }
};

const counts = {
  total: fonts.length,
  ttf: fonts.filter((f) => f.type_name === "ttf").length,
  image: fonts.filter((f) => f.type_name === "image").length,
  digits_only: fonts.filter((f) => f.script === "digits").length,
  cjk: fonts.filter((f) => f.script === "cjk").length,
  latin: fonts.filter((f) => f.script === "latin").length
};

const out = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  source: {
    file: "divoom-watchface-visual-editor/public/font/font_info.cfg",
    basename: path.basename(cfgPath),
    counts
  },
  notes: [
    "Font ids correspond to ItemList[i].font and ItemPatchList[i].patch.font.",
    "type=1 means TTF (vector outlines); type=0 means image / bitmap font.",
    "An image font with `charset:\"0123456789\"` only renders those literal characters; anything else is invisible.",
    "TTF entries with empty `charset` rely on the embedded glyph coverage of the font file. CJK strings only render correctly when the chosen TTF is CJK-capable.",
    "On the device, the file written for font id N is `(N+1).BIN` — keep this in mind when uploading custom fonts.",
    "Use `Device/GetLocalFontList` (watchface_get_fonts_local) to confirm which font ids are actually installed on the target device before referencing them in ItemList."
  ],
  scenarios,
  fonts
};

const outPath = path.resolve(repoRoot, "resources/font-catalog.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(
  `[build-font-catalog] wrote ${path.relative(repoRoot, outPath)}` +
    `  total=${counts.total} ttf=${counts.ttf} image=${counts.image} digits-only=${counts.digits_only} cjk=${counts.cjk} latin=${counts.latin}` +
    `  source=${out.source.file}`
);
