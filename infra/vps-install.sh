#!/bin/bash
# infra/vps-install.sh — S2/S3 : la pile NIKA sur le VPS (exécuté PAR CLAUDE via le tailnet).
# Idempotent : relançable sans casse. Prérequis : cloud-init-vps.yaml a déjà fait S1.
set -euo pipefail

echo "═══ installation pile NIKA — $(date '+%F %H:%M') ═══"

# Node 22 (nodesource, arm64 géré) + claude CLI
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm install -g @anthropic-ai/claude-code >/dev/null

# Dépôt : clone en lecture seule via la deploy key (déposée par Claude en ~/.ssh/nika_deploy)
if [ ! -d ~/NIKA ]; then
  GIT_SSH_COMMAND='ssh -i ~/.ssh/nika_deploy -o IdentitiesOnly=yes' \
    git clone git@github.com:nikka77/NIKA.git ~/NIKA
fi
cd ~/NIKA
git config core.sshCommand 'ssh -i ~/.ssh/nika_deploy -o IdentitiesOnly=yes'
git pull --ff-only
npm ci --no-audit --no-fund

# .env.local : copié À LA MAIN par Claude via scp (jamais dans git) — on vérifie seulement.
[ -f .env.local ] || { echo '⚠ .env.local absent — scp requis avant d'"'"'armer les services'; exit 1; }

# Services systemd (secrétaire continu + nuit 2 h 30 + audit dimanche 9 h)
sudo cp infra/systemd/*.service infra/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nika-secretaire.service
sudo systemctl enable --now nika-nuit.timer nika-audit.timer
echo "═══ pile installée — services : ═══"
systemctl --no-pager --type=service --state=running | grep nika || true
systemctl --no-pager list-timers | grep nika || true
