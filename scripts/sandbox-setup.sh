#!/bin/bash
# MAGoCo Sandbox Setup Script
# Run this in the Daytona Sandbox

set -e

echo "=== MAGoCo Sandbox Setup ==="
echo "Working directory: $(pwd)"

# Step 1: Clone repository
if [ ! -d "MAGoCo-Self-Evo" ]; then
    echo "Cloning repository..."
    git clone https://github.com/mrh000mrh/MAGoCo-Self-Evo.git MAGoCo-Self-Evo
fi

cd MAGoCo-Self-Evo

# Step 2: Install dependencies
echo "Installing dependencies..."
pnpm install

# Step 3: Build project
echo "Building project..."
pnpm run build

# Step 4: Create server scripts
echo "Creating server scripts..."

cat > /tmp/server.js << 'JSEOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: Math.floor(process.uptime()), version: '0.1.0', timestamp: Date.now() }));
    return;
  }

  let url = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join('/workspace/magoco/packages/ui', url);
  
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard running at http://0.0.0.0:${PORT}`);
});
JSEOF

cat > /tmp/mock_ollama.py << 'PYEOF'
#!/usr/bin/env python3
import http.server
import json

PORT = 11435

class MockOllamaHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/tags':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'models': [{'name': 'llama3:8b', 'model': 'llama3:8b', 'modified_at': '2024-01-01T00:00:00Z', 'size': 4683087672, 'digest': 'sha256:abc123'}]}
            self.wfile.write(json.dumps(response).encode())
        elif self.path == '/api/version':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'version': '0.1.0'}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path in ['/api/generate', '/api/chat']:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            if '/api/chat' in self.path:
                response = {'model': 'llama3:8b', 'message': {'role': 'assistant', 'content': 'Hello! I am a mock LLM response.'}, 'done': True}
            else:
                response = {'model': 'llama3:8b', 'response': 'This is a mock response from the Ollama-compatible server.', 'done': True}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', PORT), MockOllamaHandler)
    print(f'Mock Ollama running at http://0.0.0.0:{PORT}')
    server.serve_forever()
PYEOF

# Step 5: Run servers in background
echo "Starting servers..."
nohup node /tmp/server.js > /tmp/dashboard.log 2>&1 &
nohup python3 /tmp/mock_ollama.py > /tmp/ollama.log 2>&1 &

# Wait for servers to start
sleep 3

# Check if servers are running
echo ""
echo "=== Server Status ==="
echo "Dashboard (port 3000):"
curl -s http://localhost:3000/api/health || echo "Not running"
echo ""
echo "Ollama (port 11435):"
curl -s http://localhost:11435/api/tags || echo "Not running"

echo ""
echo "=== Setup Complete ==="
echo "Dashboard URL: http://localhost:3000"
echo "Ollama URL: http://localhost:11435"
