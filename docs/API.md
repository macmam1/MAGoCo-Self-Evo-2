# MAGoCo API Reference

Base URL: `http://127.0.0.1:9119`

---

## Health

### GET /api/health

Liveness and readiness probe.

**Response 200**
```json
{
  "status": "healthy",
  "uptime": 142,
  "version": "0.1.0",
  "timestamp": 1727013346000
}
```

| Field | Type | Description |
|---|---|---|
| status | `"healthy" \| "degraded" \| "unhealthy"` | Current health state |
| uptime | number | Seconds since process start |
| version | string | Application version |
| timestamp | number | Unix ms |

---

## Code Execution

### POST /api/run

Run a code snippet in the sandbox and return its output.

**Request**
```json
{
  "source": "print('hello')",
  "language": "py"
}
```

| Field | Type | Values |
|---|---|---|
| source | string | Source code to run |
| language | string | `"js"` or `"py"` |

**Response 200**
```json
{
  "code": 0,
  "stdout": "hello\n",
  "stderr": ""
}
```

**Response 400** — invalid request body or unsupported language.

---

## File Editing

### POST /api/edit

Atomically write one or more files.

**Request**
```json
{
  "files": [
    { "path": "src/foo.ts", "content": "export const x = 1;" }
  ]
}
```

**Response 200**
```json
{
  "results": [
    { "path": "src/foo.ts", "success": true }
  ]
}
```

On per-file failure:
```json
{ "path": "src/foo.ts", "success": false, "error": "permission denied" }
```

**Response 400** — `files` is not an array.

---

## WebSocket Channels

Connect to `ws://127.0.0.1:9119/ws` for the chat protocol.

All frames are JSON. The server sends a `hello` frame immediately on connect:
```json
{ "t": "hello", "sessionId": null, "version": 1 }
```

### Client → Server commands

| `type` | Payload | Description |
|---|---|---|
| `chat` | `{ message: string }` | Send a user message |
| `cancel` | — | Cancel the current agent turn |

### Server → Client frames

| `t` | Payload | Description |
|---|---|---|
| `hello` | `{ sessionId, version }` | Sent once on connect |
| `token` | `{ text: string }` | Streaming LLM token |
| `tool_call` | `{ name, args }` | Agent invoking a tool |
| `tool_result` | `{ name, result }` | Tool execution result |
| `done` | `{ usage }` | Turn complete |
| `error` | `{ message }` | Recoverable error |

---

## Filesystem WebSocket

Connect to `ws://127.0.0.1:9119/fs` for file system operations.

### Commands

| `type` | Payload |
|---|---|
| `fs/read` | `{ path: string }` |
| `fs/write` | `{ path: string, content: string }` |
| `fs/list` | `{ path: string }` |
| `fs/watch` | `{ path: string }` |

### Frames

| `type` | Payload |
|---|---|
| `fs/read/result` | `{ path, content }` |
| `fs/write/result` | `{ path, success }` |
| `fs/list/result` | `{ path, entries: FsEntry[] }` |
| `fs/change` | `{ path, kind: "created"\|"modified"\|"deleted" }` |

---

## Terminal WebSocket

Connect to `ws://127.0.0.1:9119/terminal` for a raw PTY session.

- Server → Client: raw bytes (UTF-8 text chunks from the shell)
- Client → Server: raw bytes (keystrokes forwarded to the PTY)
