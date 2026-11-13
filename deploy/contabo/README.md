# CivicWave on the Contabo server

Live at **https://aidin.173.212.195.158.sslip.io**: the API the AIDIN app talks to, and the Zəngəzur
command center (sign in once with the `STAFF_KEY` from `server.env`).

On the server: `/opt/civicwave` (code, `data/` with the database and photos, `compose.yaml`), one Docker
container `civicwave` (node:24-slim) on 127.0.0.1:8120, nginx site `/etc/nginx/sites-available/aidin.conf`
(from `aidin.nginx.conf`) with a Let's Encrypt certificate from certbot.

## Deploy

    bash deploy.sh          # code and website only, keeps the server's reports and photos
    bash deploy.sh --data   # also replaces the data with demo-video/screens-data (the seeded demo);
                            # the previous data folder is kept as data.before-<date> on the server

`server.env` (git-ignored) becomes `/opt/civicwave/server/.env`: PUBLIC_URL, TRUST_PROXY=1, STAFF_KEY and
OPENAI_API_KEY. To change the staff key, edit it there and run `bash deploy.sh`.

## The app

`ZengeZur/civicwave/.env` points the app at the server (`EXPO_PUBLIC_API_URL`); restart `npx expo start`
after changing it. The line for a server on this PC is kept there, commented out.

## Useful on the server

    cd /opt/civicwave && docker compose logs -f      # requests as they come in
    docker compose restart                            # after editing server/.env by hand
