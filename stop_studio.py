#!/usr/bin/env python3
"""Stop ModelScope Studio."""
import os
import sys
import requests

token = os.environ.get('MODELSCOPE_TOKEN_MAGIGI', '').strip()
if not token:
    print("Error: MODELSCOPE_TOKEN_MAGIGI not set")
    sys.exit(1)

owner = "magigi"
repo_name = "MAGoCo-s-SandBox"
base_url = "https://www.modelscope.ai/openapi/v1"
stop_url = f"{base_url}/studios/{owner}/{repo_name}/stop"
headers = {"Authorization": f"Bearer {token}"}

try:
    response = requests.post(stop_url, headers=headers, timeout=30)
    print(f"Stop response: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
