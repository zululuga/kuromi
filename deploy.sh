#!/usr/bin/env bash
set -Eeuo pipefail

cd "$HOME/kuromi"

if [ "$(git branch --show-current)" != "main" ]; then
  echo "ERRO: a branch atual nao e main."
  exit 1
fi

BACKUP="$HOME/backups/kuromi/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp -a data "$BACKUP/"
[ -f .env ] && cp -a .env "$BACKUP/"
[ -f prefix.json ] && cp -a prefix.json "$BACKUP/"
echo "Backup criado em $BACKUP"

# Nao atualiza se a copia local ou a versao remota alterar dados persistidos.
git fetch origin
if [ -n "$(git status --porcelain -- data)" ]; then
  echo "ERRO: existem alteracoes locais em data/."
  echo "Backup preservado em: $BACKUP"
  exit 1
fi

if git diff --name-only HEAD origin/main -- data | grep -q '^data/'; then
  echo "ERRO: o repositorio remoto altera arquivos em data/."
  echo "Backup preservado em: $BACKUP"
  exit 1
fi

git pull --ff-only origin main
npm ci --omit=dev
pm2 restart kuromi --update-env
pm2 save
pm2 status

echo "Atualizacao concluida. Backup: $BACKUP"
