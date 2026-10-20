#!/usr/bin/env bash
# Start the open-source Chromium (chrome-headless-shell) for automation.
#
# Why not the user's Brave: it is their personal browser and it was
# explicitly off limits. Why not obscura: its JS engine does not load ES
# modules, so every modern single-page app (Substack, Gumroad, Pixelfed,
# Hashnode, dev.to) renders as a blank page. chrome-headless-shell is
# Chromium built for exactly this, it is headless-only so it can never
# disturb a human session, and it speaks the same CDP the driver already
# speaks.
set -u
DIR="C:/Users/Admin/Desktop/Best/tools/chrome"
PORT="${CDP_PORT:-9333}"
cd "$DIR" || exit 1

if curl -s -m 4 "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
  echo "already running on $PORT"; exit 0
fi

VER=$(./chrome-headless-shell-win64/chrome-headless-shell.exe --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
[ -z "$VER" ] && VER=155.0.0.0
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/$VER Safari/537.36"

OBSCURA_TIMEZONE=Asia/Karachi nohup ./chrome-headless-shell-win64/chrome-headless-shell.exe \
  --remote-debugging-port="$PORT" \
  --user-data-dir="C:/Users/Admin/AppData/Local/Temp/chs-profile" \
  --no-first-run --no-default-browser-check --disable-gpu \
  --disable-blink-features=AutomationControlled \
  --user-agent="$UA" \
  --window-size=1440,900 \
  about:blank > /tmp/chs.log 2>&1 &

for i in $(seq 1 20); do
  sleep 1
  if curl -s -m 3 "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
    echo "chrome-headless-shell up on $PORT (UA $UA)"
    curl -s -m 5 "http://127.0.0.1:$PORT/json/version" | head -c 220
    exit 0
  fi
done
echo "FAILED to start; log:"; tail -20 /tmp/chs.log
exit 1
