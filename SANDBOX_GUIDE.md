# MAGoCo Sandbox Quick Reference

## Sandbox Details
- **UUID**: `2e11e61a-99ff-4063-9fc3-8a4e1d006ea1`
- **URL**: https://2e11e61a-99ff-4063-9fc3-8a4e1d006ea1.app-eu.daytona.io
- **SSH**: `ssh 2e11e61a-99ff-4063-9fc3-8a4e1d006ea1@ssh.app-eu.daytona.io`

## Quick Start
```bash
# SSH to sandbox
ssh 2e11e61a-99ff-4063-9fc3-8a4e1d006ea1@ssh.app-eu.daytona.io

# Run setup script
cd /workspace/magoco && bash scripts/sandbox-setup.sh
```

## Services
| Service | Port | URL |
|---------|------|-----|
| Dashboard | 3000 | http://localhost:3000 |
| Mock Ollama | 11435 | http://localhost:11435 |

## Check Status
```bash
curl -s http://localhost:3000/api/health
curl -s http://localhost:11435/api/tags
```

## View Logs
```bash
tail -f /tmp/dashboard.log
tail -f /tmp/ollama.log
```

## In Dashboard Settings
Add Model Provider:
- **Name**: Local Mock LLM
- **Type**: OpenAI-compatible (Local)
- **Base URL**: http://localhost:11435
- **Model Name**: llama3:8b
