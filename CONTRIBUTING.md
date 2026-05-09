# Contributing

Thanks for contributing to `mcp-divoom-lan`.

## Scope

Contributions are welcome for:

- MCP tool quality and reliability
- protocol safety constraints
- docs and examples
- compatibility with MCP clients

## Development Setup

```bash
npm install
npm run check
npm run build
```

## Pull Request Guidelines

1. Keep changes focused and reviewable.
2. Update `README.md` when behavior or config changes.
3. Add/update `CHANGELOG.md` under `Unreleased` or next target version.
4. Preserve wire-level compatibility with Divoom LAN API:
   - request `ReturnCode` must stay `0`
   - multipart must include `filename="..."` and per-part `Content-Length`
5. Never commit secrets, private IP inventories, or production credentials.

## Testing Expectations

Before opening PR:

- `npm run check`
- `npm run build`
- `npm pack --dry-run`

For endpoint changes, include at least one real or simulated request/response example in the PR description.

## Commit Messages

Use concise, purpose-oriented messages, for example:

- `feat: add market list tool wrapper`
- `fix: enforce multipart filename header`
- `docs: clarify reset command risk`
