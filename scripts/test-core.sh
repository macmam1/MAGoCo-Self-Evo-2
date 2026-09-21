#!/usr/bin/env bash
# Runs the whole suite: core, agents, web and ui.
# Live suites (third-party and local-LLM) are excluded — a flaky external
# service must never break `pnpm test`.
set -euo pipefail
cd "$(dirname "$0")/.."

total=0
for pkg in core agents web ui sandbox; do
  echo "────────── $pkg ──────────"
  if [ -d "packages/$pkg/test" ]; then
    out=$( cd "packages/$pkg" && node --test --import tsx ./test/*.test.ts 2>&1 )
    echo "$out" | grep -aE "^(ℹ tests|ℹ pass|ℹ fail|✖)" || true
    # node:test prints `ℹ pass <n>`; awk sees "ℹ" and "pass" as separate
    # fields, so pull the trailing digits instead of trusting field numbers.
    n=$( echo "$out" | grep -a "^ℹ pass" | grep -aoE "[0-9]+$" )
    fails=$( echo "$out" | grep -a "^ℹ fail" | grep -aoE "[0-9]+$" )
    if [ "${fails:-0}" != "0" ]; then echo "!! $pkg has $fails failing tests"; fi
    echo "$pkg: ${n:-0} passing"
    total=$((total + n))
  else
    echo "$pkg: no tests"
  fi
done
echo "════════════════════════════"
echo "TOTAL TESTS: $total"
