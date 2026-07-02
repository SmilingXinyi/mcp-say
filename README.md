# mcp-say

[![npm version](https://img.shields.io/npm/v/mcp-say.svg)](https://www.npmjs.com/package/mcp-say)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

macOS `say` command exposed as an MCP server. Use it from Cursor, Claude Code, Codex, or any MCP client to list voices, speak text, or return synthesized audio.

## Requirements

- **macOS** — the `say` command is only available on macOS
- **Node.js 18+** — required when installing from npm
- **ffmpeg** (optional) — required for mp3, re-encoded wav, pcm, ogg, opus, aac output

## Install

### Run with npx (recommended)

No global install needed:

```bash
npx -y mcp-say
```

MCP clients should use the same command in their server config (see below).

### Install globally

```bash
npm install -g mcp-say
# or
pnpm add -g mcp-say
```

Then run:

```bash
mcp-say
```

### Install from source

```bash
git clone https://github.com/SmilingXinyi/mcp-say.git
cd mcp-say
pnpm install
pnpm build
node build/index.js
```

## MCP configuration

`mcp-say` uses **stdio** by default. Point your MCP client at `npx -y mcp-say`, or at `mcp-say` if installed globally.

After editing a config file, restart the client (or start a new Claude Code / Codex session) so the server reloads.

### Cursor

Config file locations:

- Global: `~/.cursor/mcp.json`
- Project: `.cursor/mcp.json`

```json
{
    "mcpServers": {
        "mcp-say": {
            "command": "npx",
            "args": ["-y", "mcp-say"]
        }
    }
}
```

Global install variant:

```json
{
    "mcpServers": {
        "mcp-say": {
            "command": "mcp-say",
            "args": []
        }
    }
}
```

Verify in **Settings → Tools & MCP**. The server should show a green connected status. If `npx` is not found from the Cursor GUI, use the full path from `which npx`.

### Claude Code

Project config (recommended for teams — commit `.mcp.json` to the repo):

Create `.mcp.json` in the project root:

```json
{
    "mcpServers": {
        "mcp-say": {
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "mcp-say"]
        }
    }
}
```

Or add via CLI:

```bash
claude mcp add mcp-say --scope project -- npx -y mcp-say
```

User-wide config (all projects, only on your machine):

```bash
claude mcp add mcp-say --scope user -- npx -y mcp-say
```

Check status with `/mcp` inside Claude Code. Project-scoped servers require a one-time approval on first use.

### Codex

Config file locations:

- Global: `~/.codex/config.toml`
- Project: `.codex/config.toml` (trusted projects only)

```toml
[mcp_servers.mcp-say]
command = "npx"
args = ["-y", "mcp-say"]
enabled = true
```

Or add via CLI:

```bash
codex mcp add mcp-say -- npx -y mcp-say
```

Verify with:

```bash
codex mcp list
```

Inside a Codex session, run `/mcp` to inspect connected servers and tools.

### Remote SSE mode (optional)

For HTTP clients instead of stdio, run the server separately and connect over SSE:

```bash
MCP_TRANSPORT=sse MCP_PORT=3000 npx -y mcp-say
```

Cursor example (remote URL):

```json
{
    "mcpServers": {
        "mcp-say": {
            "url": "http://localhost:3000/mcp"
        }
    }
}
```

Claude Code example:

```json
{
    "mcpServers": {
        "mcp-say": {
            "type": "http",
            "url": "http://localhost:3000/mcp"
        }
    }
}
```

Codex example:

```toml
[mcp_servers.mcp-say]
url = "http://localhost:3000/mcp"
enabled = true
```

Endpoints:

- `GET /mcp` or `GET /sse` — establish SSE session
- `POST /messages?sessionId=<id>` — send MCP messages

| Variable         | Default     | Description                                        |
| ---------------- | ----------- | -------------------------------------------------- |
| `MCP_TRANSPORT`  | `stdio`     | `stdio`, `sse`, or `remote`                        |
| `MCP_HOST`       | `localhost` | Bind host for SSE mode                             |
| `MCP_PORT`       | `3000`      | Bind port for SSE mode                             |
| `MCP_AUTH_TOKEN` | —           | When set, requires `Authorization: Bearer <token>` |

**Security notes for SSE mode**

- Keep the server bound to `localhost` unless you explicitly need remote access.
- Always set `MCP_AUTH_TOKEN` when exposing SSE beyond your machine.
- `say_to_file` can write to any absolute path the server process can access; only enable this server in trusted environments.

## Tools

| Tool           | Description                                            | Best for                         |
| -------------- | ------------------------------------------------------ | -------------------------------- |
| `list_voices`  | List installed TTS voices with locale filter           | Discovering available voices     |
| `say`          | Speak text through the server speakers                 | Local stdio / server-side alerts |
| `say_to_file`  | Write audio to a server filesystem path                | Persisting files on the server   |
| `say_to_audio` | Return synthesized audio as MCP audio content (base64) | Remote SSE clients               |

### Choosing a tool

**Local stdio (Cursor / Claude Code / Codex)**

- Quick playback → `say`
- Save to disk → `say_to_file`
- Agent needs audio bytes → `say_to_audio`

**Remote SSE client**

- Use `say_to_audio` — the client receives base64 audio in the tool result and decodes it locally
- `say_to_file` writes to the **server** path; remote clients cannot read those files
- `say` plays on the **server** speakers only

## Develop

```bash
pnpm install
pnpm build
pnpm debug
# or: npx @modelcontextprotocol/inspector node build/index.js
```

## Test

```bash
pnpm test              # all tests
pnpm test:unit         # unit tests only
pnpm test:integration  # integration tests only
```

macOS-only integration tests (real `say` / `ffmpeg`) run automatically on darwin and are skipped on other platforms.

## Publish to npm

The package ships compiled JavaScript (`build/`), not the Bun binary.

```bash
pnpm build
npm publish --access public
```

`prepublishOnly` runs `pnpm build` automatically before publish. The `files` field ensures only `build/` and `README.md` are included in the tarball.

## Optional: local binary bundle

For a standalone executable without Node at runtime, see [bundle.sh](bundle.sh) after installing [bun](https://bun.sh):

```bash
pnpm build:bin
./mcp-say
```

This is intended for local distribution. The npm package uses `build/index.js` via the `bin` field.
