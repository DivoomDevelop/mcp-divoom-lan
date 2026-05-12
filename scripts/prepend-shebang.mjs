import fs from "node:fs";

const target = new URL("../dist/index.js", import.meta.url);
let text = fs.readFileSync(target, "utf8");
if (text.startsWith("#!")) {
  process.exit(0);
}
fs.writeFileSync(target, `#!/usr/bin/env node\n${text}`);
