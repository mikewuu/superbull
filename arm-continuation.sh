#!/bin/zsh
# arm-continuation.sh — arm the 3:10am bullwatch build-continuation launchd job.
# Run once from the project dir:  zsh arm-continuation.sh
# Cancel later with:              launchctl bootout gui/$(id -u)/studio.wu.bullwatch-continue
set -e

REPO="/Users/mike/Code/bullwatch"
LABEL="studio.wu.bullwatch-continue"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

chmod +x "$REPO/bin/continue-build.sh"
mkdir -p "$REPO/logs"

# Commit the scaffold + runner so the tree is clean (non-fatal if nothing to commit).
( cd "$REPO" && git add -A && git commit -m "chore: add resumable build-continuation runner" ) || true

# Write the launchd job.
cat > "$PLIST" <<'PLIST_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>studio.wu.bullwatch-continue</string>
  <key>ProgramArguments</key><array>
    <string>/bin/zsh</string><string>/Users/mike/Code/bullwatch/bin/continue-build.sh</string>
  </array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>10</integer></dict>
  <key>StandardOutPath</key><string>/Users/mike/Code/bullwatch/logs/launchd.out.log</string>
  <key>StandardErrorPath</key><string>/Users/mike/Code/bullwatch/logs/launchd.err.log</string>
  <key>RunAtLoad</key><false/>
</dict></plist>
PLIST_EOF

# (Re)load it.
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  echo "armed — fires daily 03:10 JST until $REPO/.build-complete exists"
  echo "test now with: launchctl kickstart -k gui/$(id -u)/$LABEL"
else
  echo "not loaded — check: launchctl print gui/$(id -u)/$LABEL"
fi
