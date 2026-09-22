import os
import requests
import sys

token = os.environ.get('MODELSCOPE_TOKEN_MAGIGI', '').strip()
if not token:
    try:
        with open('/opt/data/.env') as f:
            for line in f:
                if 'MODELSCOPE_TOKEN_MAGIGI=' in line:
                    token = line.split('=')[1].strip()
                    break
    except: pass

if not token:
    print("Error: Token not found")
    sys.exit(1)

owner = "magigi"
repo_name = "MAGoCo-s-SandBox"
base_url = "https://www.modelscope.ai/openapi/v1"

# Try updating config
studio_url = f"{base_url}/studios/{owner}/{repo_name}"
headers = {"Authorization": f"Bearer {token}"}

# Option 1: PATCH /settings
print("Trying to update studio settings...")
update_payload = {
    "runtime": {
        "sdk_type": "custom"
    }
}

r = requests.patch(f"{studio_url}/settings", json=update_payload, headers=headers, timeout=10)
print(f"PATCH /settings: {r.status_code} - {r.text[:200]}")

# Option 2: Re-deploy
print("\nTrying re-deploy...")
d = requests.post(f"{studio_url}/deploy", headers=headers, timeout=10)
print(f"POST /deploy: {d.status_code} - {d.text[:200]}")
