#!/usr/bin/env bash
set -Eeuo pipefail

cd "$HOME/kuromi"

if [ "$(git branch --show-current)" != "main" ]; then
  echo "ERRO: a branch atual nao e main."
  exit 1
fi

BACKUP="$HOME/backups/kuromi/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
if [ ! -d data ]; then
  echo "ERRO: a pasta data/ nao existe na VM. Deploy abortado."
  exit 1
fi
cp -a data "$BACKUP/"
[ -f .env ] && cp -a .env "$BACKUP/"
[ -f prefix.json ] && cp -a prefix.json "$BACKUP/"
echo "Backup criado em $BACKUP"

# A VM e a fonte de verdade dos dados. Guarde qualquer estado local antes do pull;
# ele nao deve impedir a atualizacao nem ser enviado para o repositorio.
git fetch origin
git stash push -u -m "deploy-pre-$BACKUP"

git pull --ff-only origin main

# O pull atualiza o codigo, mas os dados continuam sendo os da VM.
rm -rf data
cp -a "$BACKUP/data" data
[ -f "$BACKUP/.env" ] && cp -a "$BACKUP/.env" .env
[ -f "$BACKUP/prefix.json" ] && cp -a "$BACKUP/prefix.json" prefix.json

npm ci --omit=dev
pm2 restart kuromi --update-env
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save
pm2 status

echo "Atualizacao concluida. Backup: $BACKUP"
