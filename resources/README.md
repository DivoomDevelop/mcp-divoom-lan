# Product resources

Product-specific data lives under one directory per product:

- `timesframe/`: Hardware 510, 511 and 512.
- `astrotoo/`: Hardware 530.
- `common/`: protocol material shared by every product.

Each product directory owns its clock IDs and names, fonts, `disp` meanings, element IDs, schemas, examples and templates. Do not resolve a resource by falling back to another product directory. Add a future product to `src/devices.ts` and `products.json`, then supply that product's directory before enabling its hardware code.

Public MCP resource URIs remain stable. The runtime maps those URIs to these directories internally.
