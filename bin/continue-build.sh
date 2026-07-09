#!/bin/zsh
# bullwatch build continuation — run headless by launchd (daily 03:10 local) until done.
# Reads AGENT_HANDOFF.md and continues the implementation, committing atomically.
# Resumable + self-terminating: exits early once .build-complete exists, and re-arms
# each day otherwise. Provisions a local Redis on 6379 for the test suite.

set -u
export HOME="/Users/mike"
export PATH="/Users/mike/.local/bin:/Users/mike/.nvm/versions/node/v24.13.1/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="/Users/mike/Code/bullwatch"
cd "$REPO" || exit 1

LOGDIR="$REPO/logs"
mkdir -p "$LOGDIR"

# Already finished — self-disable and stop re-running.
if [ -f "$REPO/.build-complete" ]; then
  launchctl bootout "gui/$(id -u)/studio.wu.bullwatch-continue" 2>/dev/null
  exit 0
fi

# Single-instance lock (mkdir is atomic).
LOCK="$LOGDIR/.continue.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date) another run in progress, skipping" >> "$LOGDIR/skips.log"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# Ensure a Redis is listening on 6379 for the test suite (idempotent).
if ! redis-cli ping >/dev/null 2>&1; then
  command -v redis-server >/dev/null 2>&1 || brew install redis >/dev/null 2>&1
  redis-server --daemonize yes --save '' --appendonly no >/dev/null 2>&1
  sleep 2
fi

TS="$(date +%Y-%m-%dT%H-%M-%S)"
LOG="$LOGDIR/continue-$TS.log"

PROMPT='You are continuing the bullwatch build unattended. Read AGENT_HANDOFF.md in this repo
IN FULL first, then continue from the "Current status" checklist through all "Remaining work" in
the suggested build order until the entire thing is implemented and well tested. Reference repos
are local: /Users/mike/Code/bull-board (architecture + tests to port), /Users/mike/Code/trigger.dev
(UI patterns), /Users/mike/Code/dub (light-theme visual target — the handoff has the full spec),
/Users/mike/Code/bullmq (library). Rules: make ATOMIC conventional commits as Mike Wu (never as
Claude/AI, no Co-Authored-By trailers); NEVER push; follow the owner conventions in the handoff and
/Users/mike/.claude/CLAUDE.md; keep the AGENT_HANDOFF.md checklist updated as you finish sections.
The goal state: pnpm install && pnpm build && pnpm typecheck && pnpm test ALL pass green (Redis is
running locally on 6379). ONLY when all four pass, create the marker file .build-complete at the repo
root (this stops the scheduled job). If you run low on context, commit your progress, update the
checklist, and stop — the job re-runs tomorrow and resumes.'

claude -p "$PROMPT" --dangerously-skip-permissions > "$LOG" 2>&1
echo "$(date) exit=$? log=$LOG" >> "$LOGDIR/runs.log"
