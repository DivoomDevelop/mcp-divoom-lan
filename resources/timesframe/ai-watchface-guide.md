# AI-assisted watchface authoring

This folder contains **machine-readable catalogs** and a **JSON Schema** so LLMs (or external tools) can generate Divoom-style watchface JSON that matches **this repository’s font list and `disp` enum**.

## Regenerate catalogs

Whenever **`public/font/font_info.cfg`** or **`DISP_NAME_MAP`** in `src/editor/app.js` changes, regenerate artifacts:

```bash
npm run gen:ai-docs
```

**`npm run build`** runs the same generator automatically first (**npm lifecycle `prebuild`**), so CI or packaging stays in sync without extra steps.

Outputs:

| File | Purpose |
|------|---------|
| `generated/ai-font-catalog.json` | Every font id, `type` (0=image glyph, 1=TTF), name, charset preview |
| `generated/ai-font-guide.md` | **Human-readable font guide** — visual style, mood, use cases, scenario index (for LLM context) |
| `generated/disp-catalog.json` | Every `disp` id + symbolic name + heuristic hints for models |
| `generated/ai-context-bundle.meta.json` | Short pointer doc for tooling |

## What to give an LLM (recommended bundle)

1. **`docs/generated/ai-font-guide.md`** — **start here for font choice**: style, effect, scenario table, per-id descriptions.  
2. **`docs/generated/ai-font-catalog.json`** — constrain `font` to **`allowedFontIds`** only (machine-readable).  
3. **`docs/generated/disp-catalog.json`** — pick valid **`disp`** values; read **`hints`** as soft guidance only.  
4. **`docs/watchface-config.schema.json`** — shape of root config + `ItemList[]`.  
5. **`docs/examples/ai-minimal-watchface.json`** — tiny valid example (replace `font` with an id still present in your catalog after regen).

## Coordinate & canvas conventions

- Positions **`x`, `y`, `w`, `h`** are in **logical pixels**. This editor often uses **800×1280** preview; keep elements inside that rectangle unless you target another resolution by agreement.
- **`ItemIdList`** should stay in sync with **`item_id`** order (the editor normalizes this on load).

## Font rules (critical)

- **`font` is always an integer id**, not a CSS font name.  
- **`type: "vector_ttf"`** (`type` 1 in cfg): normal text styling (`size`, `color_*`, `sep`, …) applies in preview.  
- **`type: "image_glyph"`** (`type` 0): glyph atlas; preview hides non-layout style fields — prioritize **`x,y,w,h,alig`** and correct **`font`** id.  
- Do **not** invent ids: always copy from **`allowedFontIds`** in `ai-font-catalog.json`.

## Analog clock hands (`disp` 131 / 132 / 233)

These slots render **bitmap pointers** that rotate around the **center of the element box**:

| `disp` | Role |
|--------|------|
| `131` | Hour (`HOUR_POINT_IMAGE`) |
| `132` | Minute (`MIN_POINT_IMAGE`) |
| `233` | Second (`SECOND_POINT_IMAGE`) |

Authoring rules (mirror firmware/editor preview):

1. **Square artwork**: export pointer PNG/WebP as a **square** canvas (1:1 pixels). Non-square assets stretch into `w×h` and skew rotation.
2. **Square layout box**: use the **same** `x`, `y`, `w`, `h` for all three items with **`w === h`** (e.g. `120,180,560,560`). This aligns pivot and dial overlay like real analog stacks.
3. **Pivot / 12 o’clock**: rotation pivot is `(x + w/2, y + h/2)`. At **12:00** (hour/min tests: minute 0; second tests: second 0) rotation angle is **0°**. Draw the needle so that at **0°** it points **upward** toward −Y on the 800×1280 canvas.
4. **`hier` stacking**: hour smallest → minute middle → second largest so the second hand paints on top (example `hier`: `1`, `2`, `3`).
5. **`image_addr`**: assign your dial-side leaf or CDN URL per slot; all three layers typically share one centered dial region.

See also Chinese descriptions in `DISP_COMMENT_ZH_MAP` inside `src/editor/app.js` for in-editor tooltips.

## `disp` rules

- **`disp`** selects firmware/widget behavior (time string vs weather GIF vs pointer image, etc.).  
- Names containing **`IMAGE` / `GIF` / `PIC`** usually imply **asset** usage (`image_addr`, template slots), not only text fonts.  
- **`hints`** in `disp-catalog.json` are **heuristics** — firmware remains authoritative; validate in the visual editor.

## Validation loop

After generation:

1. Paste/load JSON into the Divoom watchface editor (or merge into a saved local watchface).  
2. Fix console / UI issues (unknown font, bad `disp`, layout spill).  
3. Optionally feed validation errors back to the model for a second pass.

## Related paths in repo

- Runtime font load: `public/font/font_info.cfg`  
- `disp` names in UI: `src/editor/app.js` (`DISP_NAME_MAP`)
