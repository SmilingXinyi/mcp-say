# mcp-say

Provide professional macOS `say` command MCP services.

## Requirements

- **macOS** — the `say` command is only available on macOS
- **ffmpeg** (optional) — required for mp3, re-encoded wav, pcm, ogg, opus, aac output

## Tools

| Tool           | Description                                            | Best for                         |
| -------------- | ------------------------------------------------------ | -------------------------------- |
| `list_voices`  | List installed TTS voices with locale filter           | Discovering available voices     |
| `say`          | Speak text through the server speakers                 | Local stdio / server-side alerts |
| `say_to_file`  | Write audio to a server filesystem path                | Persisting files on the server   |
| `say_to_audio` | Return synthesized audio as MCP audio content (base64) | Remote SSE clients               |

### Choosing a tool

**Local Cursor / stdio**

- Quick playback → `say`
- Save to disk → `say_to_file`
- Agent needs audio bytes → `say_to_audio`

**Remote SSE client**

- Use `say_to_audio` — the client receives base64 audio in the tool result and decodes it locally
- `say_to_file` writes to the **server** path; remote clients cannot read those files
- `say` plays on the **server** speakers only

## Transport

### stdio (default)

For Cursor, Claude Desktop, or local CLI:

```bash
pnpm build
node build/index.js
# or: pnpm debug
```

### SSE / remote

For HTTP clients connecting over SSE:

```bash
MCP_TRANSPORT=sse MCP_PORT=3000 pnpm exec tsx src/index.ts
# or after build:
MCP_TRANSPORT=sse MCP_PORT=3000 node build/index.js
```

Endpoints:

- `GET /mcp` or `GET /sse` — establish SSE session
- `POST /messages?sessionId=<id>` — send MCP messages

Optional environment variables:

| Variable         | Default     | Description                                        |
| ---------------- | ----------- | -------------------------------------------------- |
| `MCP_TRANSPORT`  | `stdio`     | `stdio`, `sse`, or `remote`                        |
| `MCP_HOST`       | `localhost` | Bind host for SSE mode                             |
| `MCP_PORT`       | `3000`      | Bind port for SSE mode                             |
| `MCP_AUTH_TOKEN` | —           | When set, requires `Authorization: Bearer <token>` |

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

## Optional: binary bundle

See [bundle.sh](bundle.sh) after installing [bun](https://bun.sh):

```bash
pnpm build:bin
```

## Note on demo/

The original prototype in `demo/demo.ts` has been integrated into `src/`. Use `src/index.ts` as the entry point.
