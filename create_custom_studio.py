import os
import requests
import sys

token = os.environ.get('MODELSCOPE_TOKEN_MAGIGI', '').strip()
if not token:
    print("Error: Token not found")
    sys.exit(1)

owner = "magigi"
base_url = "https://www.modelscope.ai/openapi/v1"
headers = {"Authorization": f"Bearer {token}"}

# Try creating a new studio
repo_name = "MAGoCo-s-Custom"
create_payload = {
    "repo_name": repo_name,
    "sdk_type": "custom",
    "base_image": "node:20-alpine",
    "visibility": "public"
}

print("Creating new studio...")
r = requests.post(f"{base_url}/studios", json=create_payload, headers=headers, timeout=30)
print(f"Status: {r.status_code}")
print(f"Response: {r.text[:500]}")
