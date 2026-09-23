# Adding Product Support

Store each product's reference data in its own `resources/<model>/` directory. The current product directories are `timesframe` and `astrotoo`; shared protocol guidance belongs in `resources/common`.

## Product registry

Register the Hardware values, canvas size, and resource directory in `PRODUCTS` in `src/devices.ts`, then update `resources/products.json` to match. A Hardware value may belong to only one product. Every online device operation starts with `Device/GetHardwareVersion`; unknown Hardware values are rejected.

## Directory layout

Each product directory must provide at least:

- `clock-catalog.json`: watchface IDs, Chinese and English names, fonts, `disp`, `item_id`, and source summaries.
- `clock-configs.json`: complete configurations indexed by ClockId.
- `font-catalog.json`: font IDs and names for that product.
- `disp-catalog.json`: the `disp` values actually supported by that product's firmware.
- `templates-curated.json`: templates generated only from that product's configurations.
- `watchface-config.schema.json`: canvas and field constraints for that product.
- `example-minimal.json`: a minimal example for that product.

A product-specific `guide.md` and other supporting files may also be added. Runtime loaders read only `PRODUCTS[model].resourceDir`; they must never fall back to another product's directory when data is missing.

## Integration checklist

1. Add the Hardware mapping and product resource directory.
2. Prepare independent data for `watchface_clock_catalog`, fonts, `disp`, templates, and the schema.
3. Add public resource URIs while preserving the meaning of existing URIs.
4. Add tests for automatic identification, directory selection, isolation of duplicate names or IDs, and rejection of unknown Hardware values.
5. Run type checking, MCP protocol tests, and resource generators, then validate on the corresponding physical device.

Never identify a product from `DeviceType`, an IP address, a previous device result, or a commonly used ClockId alone.
