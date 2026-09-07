# Atualizacao segura da Kuromiga na VM

Este documento descreve como publicar alteracoes feitas em `E:\botMelody` na VM sem substituir o banco JSON que ja esta em producao.

## Regra principal

Os dados de producao ficam na pasta `data/`. Nunca copie a pasta `data/` do computador local para a VM.

Tambem nunca substitua estes arquivos da VM:


O `settings.json` possui cache em memoria, gravação por arquivo temporario e backup `.bak`, mas isso nao substitui o backup externo antes de uma atualizacao.

## Procedimento automatico recomendado

O arquivo `deploy.sh` executa o fluxo de backup, verificacao, atualizacao e reinicio. Ele nao cria commits: as alteracoes precisam ser testadas, commitadas e enviadas ao Git antes de executa-lo:

```bash
cd ~/kuromi
chmod +x deploy.sh
./deploy.sh
```

O script aborta se a branch da VM nao for `main`, se houver alteracoes locais em `data/` ou se a versao remota alterar essa pasta. O backup e mantido mesmo quando o deploy e abortado.

Antes do primeiro uso, publique o script junto com as alteracoes:

```powershell
git add deploy.sh VM-ATUALIZACAO.md
git commit -m "Adiciona deploy seguro da VM"
git push origin main
```

## Passo a passo para atualizacoes futuras

Use este fluxo normal depois de terminar uma alteracao:

### 1. Testar e publicar localmente

No PowerShell, dentro de `E:\botMelody`:

```powershell
npm test
git status
git add <arquivos-alterados>
git commit -m "Descreve a alteracao"
git push origin main
```

Nao inclua `.env`, chaves SSH ou a pasta `data/` no commit.

### 2. Entrar na VM

```powershell
ssh kuromi
```

### 3. Atualizar com backup e protecao do banco

Na VM, depois que o commit estiver no Git remoto:

```bash
cd ~/kuromi
./deploy.sh
```

Se aparecer `Permission denied`, habilite o script uma vez:

```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Validar o bot

```bash
pm2 status
pm2 logs kuromi --lines 50
```

Confirme no Discord que o bot responde e que um saldo, prefixo ou configuracao existente continua preservado.

Se o script abortar, nao force o Git. O caminho do backup sera mostrado na tela; investigue a mensagem antes de tentar novamente.

## Referencia manual detalhada

### Finalizar e testar localmente

No PowerShell, dentro de `E:\botMelody`:

```powershell
npm test
git status
```

Confirme que os testes passaram. Nao publique arquivos de segredo, especialmente `.env` ou qualquer chave SSH.

Registre a alteracao no Git:

```powershell
git add index.js server.js package.json package-lock.json src public tests README.md COMANDOS.md VM-ATUALIZACAO.md
git commit -m "Atualiza bot"
git push origin main
```

Inclua no `git add` somente os arquivos realmente alterados. Se a branch local nao for `main`, descubra com:

```powershell
git branch --show-current
```

E use o nome correto no `git push`.

### Conectar na VM

O alias SSH ja configurado e:

```powershell
ssh kuromi
```

Se o IP externo temporario mudar, atualize `HostName` em:

```text
C:\Users\leand\.ssh\config
```

### Fazer backup antes de atualizar

Na VM:

```bash
cd ~/kuromi
mkdir -p ~/backups/kuromi
BACKUP=~/backups/kuromi/$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP"
cp -a data "$BACKUP/"
[ -f .env ] && cp -a .env "$BACKUP/"
[ -f prefix.json ] && cp -a prefix.json "$BACKUP/"
echo "Backup criado em $BACKUP"
```

Confira se os arquivos importantes existem:

```bash
find "$BACKUP/data" -maxdepth 1 -type f -printf '%f\n'
```

Nao continue se o backup nao foi criado ou estiver vazio.

### Conferir o estado do bot

```bash
pm2 status
pm2 describe kuromi
cd ~/kuromi
git status --short
git branch --show-current
```

Se o processo tiver outro nome, use o nome exibido por `pm2 status` nos comandos seguintes.

### Atualizar somente o codigo

O repositorio deste projeto e `https://github.com/zululuga/kuromi.git`.

```bash
cd ~/kuromi
git fetch origin

if ! git diff --quiet -- data; then
	echo "ERRO: existem alteracoes locais em data/. Abortando sem atualizar."
	exit 1
fi

if git diff --name-only HEAD origin/main | grep -q '^data/'; then
	echo "ERRO: a versao remota altera data/. Abortando sem atualizar."
	exit 1
fi

git pull --ff-only origin main
```

`git pull --ff-only` evita criar merge inesperado. Se aparecer conflito ou aviso de alteracoes locais, pare e nao use `git reset --hard`. Primeiro preserve o estado e investigue:

```bash
git status
```

As duas verificacoes anteriores impedem o pull quando ha alteracoes locais ou remotas em `data/`. A causa precisa ser analisada antes de continuar; nao force a substituicao do banco.

Depois do pull, confirme que os dados continuam presentes:

```bash
ls -l data
node -e "for (const file of ['settings.json','economy.json','marriages.json']) { const value = require('./data/' + file); console.log(file, Object.keys(value).length, 'registros'); }"
```

### Atualizar dependencias e reiniciar

Se `package.json` ou `package-lock.json` mudou:

```bash
npm ci --omit=dev
```

Se nenhum desses arquivos mudou, esta etapa pode ser pulada.

Reinicie somente o processo do bot:

```bash
pm2 restart kuromi --update-env
pm2 save
```

Nao use `pm2 delete all`, pois isso pode derrubar outros processos da VM.

### Validar depois da atualizacao

```bash
pm2 status
pm2 logs kuromi --lines 50
```

No Discord, confirme pelo menos:

- o bot ficou online;
- `ku!ping` ou `/ping` responde;
- o prefixo continua correto;
- um saldo existente continua igual;
- o casamento e o pet de uma conta de teste continuam presentes;
- boas-vindas e comandos slash continuam funcionando, quando aplicavel.

Para sair dos logs do PM2, use `Ctrl+C`. Isso nao para o bot.

## Procedimento de emergencia

Se a nova versao falhar, primeiro veja os logs:

```bash
pm2 logs kuromi --lines 100
```

Para voltar ao commit anterior sem apagar o banco:

```bash
cd ~/kuromi
git log --oneline -5
pm2 stop kuromi
git checkout <COMMIT_ANTERIOR> -- index.js server.js package.json package-lock.json src public
npm ci --omit=dev
pm2 start kuromi
```

Substitua `<COMMIT_ANTERIOR>` pelo commit estavel. Esse comando restaura somente arquivos de codigo; nao inclua `data/`, `.env` ou `prefix.json`.

Se um JSON estiver danificado, nao o substitua por uma copia local. Pare o bot e use o backup correspondente:

```bash
pm2 stop kuromi
cp -a ~/backups/kuromi/<DATA_DO_BACKUP>/data/settings.json data/settings.json
pm2 start kuromi
```

Use o arquivo exato afetado e mantenha uma copia do arquivo danificado antes de qualquer recuperacao.

## Atualizacao por copia manual

Use este caminho apenas se nao for usar Git. Transfira somente codigo e configuracao de dependencias:

```powershell
scp -i "$HOME\.ssh\kuromi_access" index.js server.js package.json package-lock.json README.md COMANDOS.md VM-ATUALIZACAO.md kuromi:/home/leandrosdclh/kuromi/
scp -r -i "$HOME\.ssh\kuromi_access" src public tests kuromi:/home/leandrosdclh/kuromi/
```

Nunca use `scp -r E:\botMelody ...` sem excluir `data/` e `.env`, pois isso pode substituir o banco da VM.

## Comandos rapidos do dia a dia

```bash
ssh kuromi
cd ~/kuromi
pm2 status
pm2 logs kuromi --lines 50
pm2 restart kuromi --update-env
```

O IP externo atual e temporario. O alias `kuromi` e preferivel ao uso direto do IP, desde que o `HostName` no arquivo SSH esteja atualizado.
