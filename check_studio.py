#!/usr/bin/env python3
"""Check ModelScope Studio status."""
import os
import sys
import requests
import time

# Load token
token = os.environ.get('MODELSCOPE_TOKEN_MAGIGI', '').strip()
if not token:
    try:
        with open('/opt/data/.env') as f:
            for line in f:
                if 'MODELSCOPE_TOKEN_MAGIGI=' in line:
                    token = line.split('=')[1].strip()
                    break
    except:
        pass

if not token:
    print("Error: MODELSCOPE_TOKEN_MAGIGI not set")
    sys.exit(1)

owner = "magigi"
repo_name = "MAGoCo-s-SandBox"
base_url = "https://www.modelscope.ai/openapi/v1"
studio_url = f"{base_url}/studios/{owner}/{repo_name}"
headers = {"Authorization": f"Bearer {token}"}

try:
    response = requests.get(studio_url, headers=headers, timeout=10)
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text[:1000]}")
except Exception as e:
    print(f"Error: {e}")
