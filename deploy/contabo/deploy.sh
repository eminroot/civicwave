#!/usr/bin/env bash
# Deploys CivicWave (server + command center) to the Contabo box at /opt/civicwave.
#
#   bash deploy.sh          code only: keeps the reports and photos already on the server
#   bash deploy.sh --data   also replaces the server's data with demo-video/screens-data (the seeded demo)
#
# Needs server.env next to this file (see README.md) and root SSH with ~/.ssh/id_ed25519.
set -euo pipefail
HOST=root@173.212.195.158
SSH=(ssh -i "$HOME/.ssh/id_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes "$HOST")
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)                  # HarAI-main
SCREENS=$(cd "$REPO/../demo-video/screens-data" 2>/dev/null && pwd || true)
WITH_DATA=0; [ "${1:-}" = "--data" ] && WITH_DATA=1
[ -f "$HERE/server.env" ] || { echo "server.env is missing (see README.md)"; exit 1; }

STAGE="$HERE/.stage"; rm -rf "$STAGE"; mkdir -p "$STAGE"
tar -C "$REPO" -czf "$STAGE/code.tgz" server/package.json server/src ZengeZurwebsite
if [ $WITH_DATA = 1 ]; then
  mkdir -p "$STAGE/data/uploads"
  # a consistent copy even while a local server has the database open
  python -I -c "import sqlite3,sys; s=sqlite3.connect(sys.argv[1]); d=sqlite3.connect(sys.argv[2]); s.backup(d); d.execute('pragma journal_mode=wal'); d.close()" \
    "$SCREENS/civicwave.db" "$STAGE/data/civicwave.db"
  cp "$SCREENS"/uploads/* "$STAGE/data/uploads/"
  tar -C "$STAGE" -czf "$STAGE/data.tgz" data
fi

"${SSH[@]}" "mkdir -p /opt/civicwave /tmp/civicwave-up"
for f in code.tgz $( [ $WITH_DATA = 1 ] && echo data.tgz ); do
  "${SSH[@]}" "cat > /tmp/civicwave-up/$f" < "$STAGE/$f"
done
"${SSH[@]}" "cat > /tmp/civicwave-up/server.env" < "$HERE/server.env"
"${SSH[@]}" "cat > /opt/civicwave/compose.yaml" < "$HERE/compose.yaml"

"${SSH[@]}" WITH_DATA=$WITH_DATA bash -s <<'REMOTE'
set -euo pipefail
cd /opt/civicwave
docker compose stop >/dev/null 2>&1 || true
rm -rf server/src ZengeZurwebsite
tar -xzf /tmp/civicwave-up/code.tgz -C /opt/civicwave
install -m 600 -o 1000 -g 1000 /tmp/civicwave-up/server.env server/.env
if [ "$WITH_DATA" = 1 ]; then
  if [ -d data ]; then mv data "data.before-$(date +%Y%m%d-%H%M%S)"; fi
  tar -xzf /tmp/civicwave-up/data.tgz -C /opt/civicwave
fi
mkdir -p data/uploads
chown -R 1000:1000 data
rm -rf /tmp/civicwave-up
docker compose up -d
sleep 2
docker logs --tail 12 civicwave
REMOTE
rm -rf "$STAGE"
