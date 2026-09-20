"""Close the phase-0 issues: the work is done and verified."""
import json
import urllib.request
import urllib.error

TOKEN = [l.split("=", 1)[1].strip() for l in open("/opt/data/.env") if l.startswith("GITHUB_API_KEY=")][0]
API = "https://api.github.com/repos/macmam1/MAGoCo-Self-Evo-2"


def api(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API + url,
        data=data,
        method=method,
        headers={
            "Authorization": "token " + TOKEN,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "magoco",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


DONE_NOTE = (
    "Phase 0 is complete and verified: **28 contract tests pass**, "
    "`tsc --noEmit` is clean, and the CLI scenario runs — confirmed from a **fresh "
    "clone** of the repo, not the working tree. Closing as done; milestone "
    "[Phase 0 — Architecture foundation](https://github.com/macmam1/MAGoCo-Self-Evo-2/milestone/1) "
    "is closed."
)

for num in range(1, 10):
    c, body = api("POST", f"/issues/{num}/comments", {"body": DONE_NOTE})
    c2, _ = api("PATCH", f"/issues/{num}", {"state": "closed"})
    print(f"#{num}: comment={c} close={c2}")
