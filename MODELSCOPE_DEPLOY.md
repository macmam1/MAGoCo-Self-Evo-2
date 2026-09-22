# ModelScope Studio Deployment Instructions

## 1. Create Studio
1. Go to https://modelscope.ai
2. Click "Create Studio"
3. Name: `MAGoCo-s-SandBox` (or your choice)
4. Select "Empty Studio" or from your repo

## 2. Environment Variables
Add these variables in Studio Settings → Environment:

| Variable | Value |
|---|---|
| `MODELSCOPE_TOKEN_MAGIGI` | Your token (from /opt/data/.env) |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |

## 3. Deploy
1. Click "Deploy" in Studio
2. Select build command: `pnpm install && pnpm run build`
3. Select run command: `pnpm run start`
4. Click "Start Studio"

## 4. Verify
- Studio should start and show logs
- Open Studio URL to test
- Check console for any errors

## Notes
- Studio has 60GB disk, should be enough for this project
- Logs are visible in Studio dashboard
- If build fails, check error logs in Studio

## Troubleshooting
If you see TypeScript errors:
- Run `pnpm run typecheck` locally to verify
- Ensure all dependencies are in package.json

If port issues:
- ModelScope auto-maps ports, don't hardcode 8080
- Use `process.env.PORT || 8080` in server code
