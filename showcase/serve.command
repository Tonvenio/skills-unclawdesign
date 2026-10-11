#!/bin/zsh
# Tidewater showcase (unclawdesign) — serves this folder on your tailnet only.
# Double-click in Finder, or run in Terminal:  showcase/serve.command
cd "${0:A:h}"
PORT=8787
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is already in use:"; lsof -nP -iTCP:$PORT -sTCP:LISTEN; exit 1
fi
TS="$(command -v tailscale 2>/dev/null)"
[[ -z "$TS" ]] && TS="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
IP="$("$TS" ip -4 2>/dev/null | head -1)"
if [[ -z "$IP" ]]; then
  echo "Tailscale isn't running or isn't signed in on this Mac."; exit 1
fi
NAME="$("$TS" status --json 2>/dev/null | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null)"
# Bound to the Tailscale address only: reachable from your tailnet devices, not from the LAN or the internet.
nohup /usr/bin/python3 -m http.server $PORT --bind "$IP" >/tmp/unclawdesign-showcase.log 2>&1 &
disown
sleep 1
echo ""
echo "Tidewater showcase is live on your tailnet:"
[[ -n "$NAME" ]] && echo "  http://$NAME:$PORT/"
echo "  http://$IP:$PORT/"
echo ""
echo "Stop it with:  pkill -f 'http.server $PORT'"
