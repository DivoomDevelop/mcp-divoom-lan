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
| `generated/disp-catalog.json` | Every `disp` id + symbolic name + heuristic hints for models |
| `generated/ai-context-bundle.meta.json` | Short pointer doc for tooling |

## What to give an LLM (recommended bundle)

1. **`docs/generated/ai-font-catalog.json`** — constrain `font` to **`allowedFontIds`** only.  
2. **`docs/generated/disp-catalog.json`** — pick valid **`disp`** values; read **`hints`** as soft guidance only.  
3. **`docs/watchface-config.schema.json`** — shape of root config + `ItemList[]`.  
4. **`docs/examples/ai-minimal-watchface.json`** — tiny valid example (replace `font` with an id still present in your catalog after regen).

## Coordinate & canvas conventions

- Positions **`x`, `y`, `w`, `h`** are in **logical pixels**. This editor often uses **800×1280** preview; keep elements inside that rectangle unless you target another resolution by agreement.
- **`ItemIdList`** should stay in sync with **`item_id`** order (the editor normalizes this on load).

## Font rules (critical)

- **`font` is always an integer id**, not a CSS font name.  
- **`type: "vector_ttf"`** (`type` 1 in cfg): normal text styling (`size`, `color_*`, `sep`, …) applies in preview.  
- **`type: "image_glyph"`** (`type` 0): glyph atlas; preview hides non-layout style fields — prioritize **`x,y,w,h,alig`** and correct **`font`** id.  
- Do **not** invent ids: always copy from **`allowedFontIds`** in `ai-font-catalog.json`.

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
