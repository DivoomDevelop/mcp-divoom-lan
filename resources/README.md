# Product resources

Product-specific data lives under one directory per product:

- `timesframe/`: Hardware 510, 511 and 512.
- `astrotoo/`: Hardware 530.
- `pixoo64/`: Hardware 90/92/96; independent drawing protocol, guide and element-list example.
- `timegate/`: Hardware 400/402; five 128×128 screens, LocalToken, guide and element-list example.
- `common/`: protocol material shared by every product.

Each product owns its protocol data. TimesFrame/AstroToo provide watchface catalogs, fonts and schemas; PIXOO64/TimeGate provide display-list guidance and examples. Never fall back to another product's resource directory. Register each future product and supply its data before enabling its Hardware.

Public MCP resource URIs remain stable. The runtime maps those URIs to these directories internally.

AstroToo display-element documentation is stored with its product data as `astrotoo/display-elements.en.md` and `astrotoo/display-elements.zh-CN.md` and is exposed through language-specific MCP resource URIs.
