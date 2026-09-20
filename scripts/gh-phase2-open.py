"""Open Phase 2 milestone + issues on GitHub, from the actual spec."""
import json, urllib.request

TOKEN = open('/opt/data/.env').read().split('GITHUB_API_KEY=')[1].split('\n')[0].strip().strip('"')
REPO = 'macmam1/MAGoCo-Self-Evo-2'


def api(path, data=None, method=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        f'https://api.github.com/repos/{REPO}/{path}',
        data=body, method=method,
        headers={'Authorization': f'Bearer {TOKEN}', 'User-Agent': 'magoco',
                 'Accept': 'application/vnd.github+json'})
    return json.load(urllib.request.urlopen(req))


MILESTONE = 'Phase 2 — Minimal visible interface'
BODY = ('docs/phase-2-spec.md §3: the server. HTTP + WebSocket, session lifecycle, '
        'streaming, termination watchdog, export.')

ISSUES = [
    ('A', 'web: HTTP + WebSocket server (magoco.web.serve)',
     'docs/phase-2-spec.md §2/§6.1. Node http, hand-rolled RFC 6455 (~150 lines), '
     'zero runtime deps, binds 127.0.0.1 only. Static serving of packages/ui/dist.\n\n'
     'Tests: T-W1 ws handshake/frame/ping, T-W2 server static+404+bind-assert.'),
    ('B', 'web: chat session lifecycle (magoco.web.session.*)',
     'docs/phase-2-spec.md §3.1. create/list/send/export/search. Every state change '
     'goes out as an event, never as a return value the caller must poll.\n\n'
     'Tests: T-W3 happy path on a real socket, T-W7 two sessions multiplexed, '
     'ordering by seq.'),
    ('C', 'web: streaming contract + termination watchdog',
     'docs/phase-2-spec.md §4 + §5. Ordering, single terminal event, no duplication. '
     'sessionTimeoutMs (300s) force-fails hung providers; idleSocketMs closes '
     'leaked sockets.\n\n'
     'Tests: T-W4 hung provider -> failed, T-W6 kill+reconnect+resume by seq.'),
    ('D', 'ui: chat view + streaming + markdown + code highlight',
     'docs/phase-2-spec.md §1.1 C. Plain DOM, no bundler, no framework. Pure '
     '(state) -> HTML views so the same node --test harness works.\n\n'
     'Tests: T-U1 views, T-U6 reducer is a pure function over the event log.'),
    ('E', 'ui: tool cards inline (pending/running/ok/error + latency)',
     'docs/phase-2-spec.md §1.1 D. Renders magoco.session.tool.call / tool.done. '
     'Must not re-render on every token — the card is keyed by callId.\n\n'
     'Tests: T-U2.'),
    ('F', 'ui: thinking blocks + i18n (fa/en, RTL)',
     'docs/phase-2-spec.md §1.1 E + I. Reasoning in a collapsible region, separate '
     'from the answer. Every user-visible string in both languages; RTL flips '
     'layout direction, not just text alignment.\n\n'
     'Tests: T-U3, T-U4.'),
    ('G', 'ui: command palette (Cmd+K) + themes + model switch + export',
     'docs/phase-2-spec.md §1.1 G/H/K/L. Palette: model switch, settings, clear, '
     'export. Light/dark + 3 accents, persisted. Model switch mid-conversation.\n\n'
     'Tests: T-U5, plus the export round-trip in T-W5.'),
    ('H', 'profiles: `web` profile boots server + UI plugins',
     'docs/phase-2-spec.md §1.1 N + §9. MAGOCO_ROOT bootstrap: profiles/web.yaml '
     'enables the web+ui plugins. Open question in §9: is `web` the new default or '
     'explicit?\n\n'
     'Comes with docs/phase-2-spec.md §1.1 J (Adaptive Canvas level 1: panels '
     'collapse, chat is the canvas).'),
    ('E2E', 'e2e: real browser run of `magoco --profile web`',
     'docs/phase-2-spec.md §7 T-E2E + §10. Headless Chromium via CDP (or scripted DOM '
     'driver if unavailable): open page, type "count letters in MAGOCO", watch the '
     'letters tool card appear, see 6 stream back.\n\n'
     'This is the §5 gate: must pass from a fresh clone of main, alongside the full '
     '88-test existing suite and clean tsc for all four packages.'),
]

ms = api('milestones?state=all&per_page=100')
milestone = next(m for m in ms if m['title'] == MILESTONE)
mid = milestone['number']
print(f'milestone M{mid}: {MILESTONE} (already open, {milestone["state"]})')

for letter, title, body in ISSUES:
    issue = api('issues',
                {'title': f'[{letter}] {title}', 'body': body, 'milestone': mid},
                'POST')
    print(f"  #{issue['number']} [{letter}] {title}")
