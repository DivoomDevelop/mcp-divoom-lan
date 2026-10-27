# Adding Product Support

Store each product's reference data in its own `resources/<model>/` directory: `timesframe`, `astrotoo`, `pixoo64` and `timegate`. Shared guidance belongs in `resources/common`.

## Product registry

Register Hardware values, per-screen canvas, screen count and resource directory in `PRODUCTS`, then update `resources/products.json`. A Hardware value belongs to one product only. TimesFrame/AstroToo query `Device/GetHardwareVersion`; PIXOO64/TimeGate use fresh discovery or explicit profiles. Reject returned unknown Hardware. Keep product transports, authentication and field semantics separate; TimeGate tokens must not leak across hosts.

## Directory layout

Each watchface-authoring product directory must provide at least:

- `clock-catalog.json`: watchface IDs, Chinese and English names, fonts, `disp`, `item_id`, and source summaries.
- `clock-configs.json`: complete configurations indexed by ClockId.
- `font-catalog.json`: font IDs and names for that product.
- `disp-catalog.json`: the `disp` values actually supported by that product's firmware.
- `templates-curated.json`: templates generated only from that product's configurations.
- `watchface-config.schema.json`: canvas and field constraints for that product.
- `example-minimal.json`: a minimal example for that product.

A product-specific `guide.md` and supporting files may also be added. PIXOO64/TimeGate use guides and display-list examples, without fabricated watchface-authoring catalogs. Runtime loaders must never fall back to another product's directory when data is missing.

## Integration checklist

1. Add the Hardware mapping and product resource directory.
2. Prepare independent data for `watchface_clock_catalog`, fonts, `disp`, templates, and the schema.
3. Add public resource URIs while preserving the meaning of existing URIs.
4. Add tests for automatic identification, the no-response TimesFrame fallback, directory selection, isolation of duplicate names or IDs, and rejection of returned unknown Hardware values.
5. Run type checking, MCP protocol tests, and resource generators, then validate on the corresponding physical device.

Never identify a product from `DeviceType`, an IP address, a previous device result, or a commonly used ClockId alone.
