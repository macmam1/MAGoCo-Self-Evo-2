# MAGoCo-Self-Evo-2 API Documentation

## Endpoints

### GET /health

Returns application health status.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "version": "0.0.1",
  "timestamp": 1727000000000
}
```

### POST /create

Create a new agent session.

**Request:**
```json
{
  "title": "New Session",
  "modelId": "model-name"
}
```

**Response:**
```json
{
  "t": "session_created",
  "sessionId": "uuid",
  "title": "New Session"
}
```

### POST /send

Send command to session.

**Request:**
```json
{
  "sessionId": "uuid",
  "command": "edit",
  "args": [...]
}
```

**Response:**
```json
{
  "t": "success",
  "result": {...}
}
```

### WebSocket /terminal

Interactive terminal connection.

**Protocol:**
- Connect via WebSocket
- Send commands as JSON
- Receive output stream

### POST /preview

Start preview server.

**Request:**
```json
{
  "sessionId": "uuid",
  "path": "./app"
}
```

**Response:**
```json
{
  "url": "http://localhost:3000"
}
```

---

## Capabilities

### magoco.fs

File system operations.

- `fs.read`: Read file
- `fs.write`: Write file
- `fs.list`: List directory

### magoco.code.run

Execute code.

- `run.js`: Run JavaScript
- `run.py`: Run Python
- `run.sh`: Run Shell

### magoco.edit

Multi-file editing.

### magoco.ai.code

AI code generation and review.

### magoco.browser

Browser automation.

- `browser.navigate`: Navigate to URL
- `browser.screenshot`: Take screenshot

### magoco.preview

Live preview server.

### magoco.health

Health monitoring.

---

## Error Response

```json
{
  "t": "error",
  "message": "Error description"
}
```
