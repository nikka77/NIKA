#!/bin/bash
# NIKA OPS — installe Postgres + PostgREST sur le VPS et y monte la base de travail.
# Idempotent : relançable sans casse. À lancer sur le VPS : sudo bash installer.sh
# Secrets : générés ICI, écrits dans /home/nika/.nika-ops-db.env (jamais dans le dépôt,
# jamais dans une conversation). La clé service (JWT) s'affiche UNE fois en fin de script
# pour être recopiée dans le .env.local du Mac — via presse-papiers, pas par chat.
set -euo pipefail

DB=nika_ops
ENVF=/home/nika/.nika-ops-db.env
PGREST_VER=v12.2.3

# ── 1. Postgres ──────────────────────────────────────────────────────────────
if ! command -v psql >/dev/null; then
  apt-get update -qq && apt-get install -y -qq postgresql postgresql-contrib
fi
systemctl enable --now postgresql

# ── 2. Secrets (générés une seule fois) ──────────────────────────────────────
if [ ! -f "$ENVF" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  AUTH_PASS=$(openssl rand -hex 24)
  cat > "$ENVF" <<EOF
NIKA_OPS_JWT_SECRET=$JWT_SECRET
NIKA_OPS_AUTH_PASS=$AUTH_PASS
EOF
  chown nika:nika "$ENVF" && chmod 600 "$ENVF"
fi
# shellcheck disable=SC1090
source "$ENVF"

# ── 3. Rôles + base ─────────────────────────────────────────────────────────
sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
do \$\$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls; end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit password '$NIKA_OPS_AUTH_PASS';
  else
    alter role authenticator with password '$NIKA_OPS_AUTH_PASS';
  end if;
end \$\$;
grant anon, service_role to authenticator;
select 'create database $DB' where not exists (select from pg_database where datname = '$DB') \gexec
EOF

# ── 4. Schéma ───────────────────────────────────────────────────────────────
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$(dirname "$0")/schema.sql"

# ── 5. PostgREST (binaire officiel) ─────────────────────────────────────────
if [ ! -x /usr/local/bin/postgrest ]; then
  cd /tmp
  curl -sL "https://github.com/PostgREST/postgrest/releases/download/${PGREST_VER}/postgrest-${PGREST_VER}-linux-static-x86-64.tar.xz" -o pgrest.tar.xz
  tar xf pgrest.tar.xz && install -m 755 postgrest /usr/local/bin/postgrest
fi

cat > /etc/postgrest.conf <<EOF
db-uri = "postgres://authenticator:${NIKA_OPS_AUTH_PASS}@127.0.0.1:5432/${DB}"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "${NIKA_OPS_JWT_SECRET}"
# tailnet + localhost uniquement : le pare-feu Hetzner ne laisse entrer que l'UDP 41641
# (tailscale), donc 0.0.0.0 n'expose rien au public — et le VPS sert ses propres workers.
server-host = "0.0.0.0"
server-port = 3001
db-pool = 12
EOF
chmod 600 /etc/postgrest.conf

cat > /etc/systemd/system/nika-ops-db-api.service <<'EOF'
[Unit]
Description=NIKA OPS — PostgREST (API REST de la base de travail)
After=postgresql.service
Requires=postgresql.service

[Service]
ExecStart=/usr/local/bin/postgrest /etc/postgrest.conf
Restart=always
RestartSec=3
User=nika

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now nika-ops-db-api

# ── 6. Purge quotidienne de l'archive (cron système) ────────────────────────
cat > /etc/cron.daily/nika-ops-purge-archive <<EOF
#!/bin/sh
sudo -u postgres psql -d $DB -c "select public.ops_purge_archive();" >/dev/null 2>&1
EOF
chmod 755 /etc/cron.daily/nika-ops-purge-archive

# ── 7. Clé service (JWT HS256, 10 ans) — recopier dans les .env, PAS en chat ─
SERVICE_JWT=$(node -e "
const c = require('node:crypto');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const h = b64({ alg: 'HS256', typ: 'JWT' });
const p = b64({ role: 'service_role', iss: 'nika-ops', exp: Math.floor(Date.now()/1000) + 315360000 });
const sig = c.createHmac('sha256', process.env.NIKA_OPS_JWT_SECRET).update(h + '.' + p).digest('base64url');
console.log(h + '.' + p + '.' + sig);
")
grep -q NIKA_OPS_SERVICE_KEY "$ENVF" || echo "NIKA_OPS_SERVICE_KEY=$SERVICE_JWT" >> "$ENVF"

echo
echo "✓ Base $DB + PostgREST prêts sur :3001 (tailnet). Clé service dans $ENVF"
echo "  Test local : curl -s http://127.0.0.1:3001/agent_results?limit=1 -H \"Authorization: Bearer \$NIKA_OPS_SERVICE_KEY\""
