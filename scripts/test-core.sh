#!/usr/bin/env bash
# Run every core contract test and fail loudly if any assertion breaks.
set -euo pipefail
cd "$(dirname "$0")/.."
cd packages/core

fail=0
for t in test/*.test.ts; do
  name=$(basename "$t" .test.ts)
  if out=$(node --import tsx/esm "$t" 2>&1); then :; fi
  summary=$(printf '%s' "$out" | grep -E '^ℹ (tests|pass|fail)' | tr '\n' ' ' | tr -s ' ')
  printf '%-12s %s\n' "$name" "$summary"
  if printf '%s' "$out" | grep -qE '^ℹ fail [1-9]'; then
    fail=1
  fi
done

echo "--- typecheck ---"
if ! node_modules/.bin/tsc --noEmit -p .; then
  echo "TYPECHECK FAILED"
  fail=1
fi

if [ "$fail" -eq 0 ]; then echo "ALL GREEN"; else echo "FAILURES PRESENT"; exit 1; fi
