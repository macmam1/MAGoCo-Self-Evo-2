#!/usr/bin/env python3
"""Deploy project to ModelScope Studio using API."""
import os
import sys
import requests
from pathlib import Path

# Load token
token = os.environ.get('MODELSCOPE_TOKEN_MAGIGI', '').strip()
if not token:
    print("Error: MODELSCOPE_TOKEN_MAGIGI not set")
    sys.exit(1)

# Studio details
owner = "magigi"
repo_name = "MAGoCo-s-SandBox"
base_url = "https://www.modelscope.ai/openapi/v1"

# 1. Check if studio exists
studio_url = f"{base_url}/studios/{owner}/{repo_name}"
headers = {"Authorization": f"Bearer {token}"}

try:
    response = requests.get(studio_url, headers=headers, timeout=10)
    if response.status_code == 200:
        print(f"✓ Studio found: {owner}/{repo_name}")
        studio_data = response.json()
        print(f"  Status: {studio_data.get('status', 'unknown')}")
    else:
        print(f"✗ Studio not found (code: {response.status_code})")
        sys.exit(1)
except Exception as e:
    print(f"Error checking studio: {e}")
    sys.exit(1)

# 2. Try to deploy/restart studio
deploy_url = f"{base_url}/studios/{owner}/{repo_name}/deploy"
try:
    response = requests.post(deploy_url, headers=headers, json={}, timeout=30)
    print(f"Deploy response: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error deploying: {e}")

# 3. Alternative: Build and push Docker image
# Note: This requires building Docker image locally and pushing to registry
print("\nNote: For full deployment, you may need to:")
print("1. Build Docker image locally")
print("2. Push to ModelScope registry")
print("3. Update ms_deploy.json with new image")
print("4. Call deploy API again")
