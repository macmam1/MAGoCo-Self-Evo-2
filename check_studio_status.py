#!/usr/bin/env python3
"""Check ModelScope Studio status."""
import os
import sys
import requests
import time

# Load token
token = os.environ.get('MODELSCOPE_TOKEN_MAGIGI', '').strip()
if not token:
    print("Error: MODELSCOPE_TOKEN_MAGIGI not set")
    sys.exit(1)

# Studio details
owner = "magigi"
repo_name = "MAGoCo-s-SandBox"
base_url = "https://www.modelscope.ai/openapi/v1"
studio_url = f"{base_url}/studios/{owner}/{repo_name}"
headers = {"Authorization": f"Bearer {token}"}

max_checks = 60  # 5 minutes total
for i in range(max_checks):
    try:
        response = requests.get(studio_url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            status = data.get('status', 'unknown')
            print(f"[{i+1}/{max_checks}] Status: {status}")
            if status.lower() in ['running', 'ready', 'done']:
                print("✓ Studio is ready!")
                print(f"  URL: {data.get('url', 'N/A')}")
                break
            elif status.lower() in ['failed', 'error']:
                print("✗ Deployment failed!")
                print(f"  Message: {data.get('message', 'N/A')}")
                break
        else:
            print(f"Error: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")
    
    time.sleep(5)

print("\nDeployment complete!")
