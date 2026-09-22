# ModelScope Studio Deployment Guide

## Status
- Studio: `magigi/MAGoCo-s-SandBox`
- Current Issue: Studio deployed with Gradio SDK, but our app is Node.js

## Solution: Reconfigure for Custom Service

### Option 1: Use `ms_deploy.json` (Recommended)

The `ms_deploy.json` file defines:
- Runtime: Custom (Node.js)
- Port: 8080
- Build: `pnpm install && pnpm build`
- Start: `pnpm start`

### Option 2: Create New Studio

1. Go to https://modelscope.ai/studios
2. Click "Create Studio"
3. Choose "Programmatic Studio"
4. Switch to "Quick Deploy" mode
5. Select repo: `macmam1/MAGoCo-Self-Evo-2`
6. Select branch: `test`
7. Set SDK: **Custom** (not Gradio)
8. Add environment variables:
   - MODELSCOPE_TOKEN_MAGIGI=your_token
   - NODE_ENV=production

### Option 3: Docker-based Deploy

1. Build image:
   ```bash
   docker build -t magoco:latest .
   ```
2. Push to ModelScope registry
3. Update studio with new image

## Environment Variables Needed
| Key | Value |
|---|---|
| MODELSCOPE_TOKEN_MAGIGI | From /opt/data/.env |
| NODE_ENV | production |
| PORT | 8080 |

## Notes
- Studio uses `host` field: https://magigi-magoco-s-sandbox.ms.fun
- If Gradio is required, create a wrapper
- For Node.js apps, use "Custom" runtime
