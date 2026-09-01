# SmartSplit — Sui Payment Coordination & Expense Sharing

## Sui Development MCP & Skills

### Sui MCP Server
Connect the Sui documentation MCP server (`https://sui.mcp.kapa.ai`) for live, up-to-date documentation search and retrieval:
- **Claude Code**: `claude mcp add --transport http sui-docs https://sui.mcp.kapa.ai`
- **Cursor**: Configured in `.cursor/mcp.json`
- **VS Code**: Configured in `.vscode/mcp.json`
- **Antigravity / Gemini**: Configured in `.agents/mcp_config.json`

### Sui Development Skills
Install community-maintained skills for Sui development:
```sh
npx skills https://github.com/MystenLabs/skills
```

## Sui SDK Reference
Every `@mysten/*` package ships LLM documentation in its `docs/` directory. When working with these packages, find the relevant docs by looking for `docs/llms-index.md` files inside `node_modules/@mysten/*/`. Read the index first to find the page you need, then read that page for details.

## Official Resources
When unsure about Move patterns or Sui APIs, consult these sources:
- Move Book: https://move-book.com (use https://move-book.com/llms.txt)
- Sui Docs: https://docs.sui.io (use https://docs.sui.io/llms.txt)
- Sui Move examples: https://github.com/MystenLabs/sui/tree/main/examples/move

## Project Structure
- `smartsplit/` — Sui Move smart contract package (`smartsplit::smartsplit`), unit tests (`tests/smartsplit_tests.move`), `Move.toml`, `Published.toml`
- `frontend/` — React 19 + TypeScript + Vite + `@mysten/dapp-kit-react` non-custodial dApp
- `backend/` — Express + Firebase/Firestore backend for off-chain community & user profile indexing

## Key Workflows & Commands
- **Build Move Contracts**: `cd smartsplit && sui move build`
- **Run Move Tests**: `cd smartsplit && sui move test`
- **Build Frontend**: `cd frontend && npm run build`
- **Run Frontend Dev**: `cd frontend && npm run dev`
- **Run Backend**: `cd backend && npm run dev`
