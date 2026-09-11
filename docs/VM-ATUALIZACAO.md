# Atualizacao segura da Kuromiga na VM
# ☁️ Guia de Atualização & Manutenção da VM (Produção)

Este documento descreve como publicar alteracoes feitas em `E:\botMelody` na VM sem substituir o banco JSON que ja esta em producao.
Este manual orienta como publicar atualizações com total segurança na máquina virtual (VM) do **Google Cloud Platform (GCP)** sem risco de perda de dados do banco de dados em produção.

## Regra principal
---

Os dados de producao ficam na pasta `data/`. Nunca copie a pasta `data/` do computador local para a VM.
## 🔒 Regra de Ouro da Produção
> **Nunca copie a pasta `data/` nem o arquivo `.env` do computador local para a VM.**  
> Os dados de saldo, Pymons, casamentos e transações de produção vivem exclusivamente na VM. O script de deploy cuida de fazer backup e preservar todos os dados automaticamente.

Tambem nunca substitua estes arquivos da VM:
---

## ⚡ Passo a Passo Rápido para Atualizar

O `settings.json` possui cache em memoria, gravação por arquivo temporario e backup `.bak`, mas isso nao substitui o backup externo antes de uma atualizacao.

## Procedimento automatico recomendado

O arquivo `deploy.sh` executa o fluxo de backup, verificacao, atualizacao e reinicio. Ele nao cria commits: as alteracoes precisam ser testadas, commitadas e enviadas ao Git antes de executa-lo. A `data/` da VM e sempre a fonte de verdade; o script faz backup e a restaura depois do `git pull`.

```bash
cd ~/kuromi
chmod +x deploy.sh
./deploy.sh
```

O script aborta se a branch da VM nao for `main` ou se a pasta `data/` nao existir. Alteracoes locais em `data/`, `.env` e `prefix.json` sao preservadas automaticamente e nao entram no commit.

Antes do primeiro uso, publique o script junto com as alteracoes:

### 1️⃣ No seu Computador (Local)
No terminal PowerShell da pasta do projeto:
```powershell
git add deploy.sh VM-ATUALIZACAO.md
git commit -m "Adiciona deploy seguro da VM"
git push origin main
```
# 1. Executa todos os testes unitários
npm test

## Passo a passo para atualizacoes futuras

Use este fluxo normal depois de terminar uma alteracao:

### 1. Testar e publicar localmente

No PowerShell, dentro de `E:\botMelody`:

```powershell
npm test
git status
git add <arquivos-alterados>
git commit -m "Descreve a alteracao"
# 2. Salva e envia as alterações para o GitHub
git add .
git commit -m "Novas funcionalidades da Pyxie"
git push origin main
```

Nao inclua `.env`, chaves SSH ou a pasta `data/` no commit.

### 2. Entrar na VM

### 2️⃣ Conectar na VM e Atualizar
```powershell
# Conectar via SSH
ssh kuromi
```

### 3. Atualizar com backup e protecao do banco

Na VM, depois que o commit estiver no Git remoto:

Dentro da VM no terminal Linux:
```bash
cd ~/kuromi
./deploy.sh
```

Se aparecer `Permission denied`, habilite o script uma vez:

### 3️⃣ Confirmar o Status
```bash
chmod +x deploy.sh
./deploy.sh
```

O script nao pede para apagar ou commitar `data/`. Ele cria um backup, guarda temporariamente o estado local para liberar o `git pull`, atualiza apenas o codigo e restaura os dados da VM.

### 4. Validar o bot

```bash
pm2 status
pm2 logs kuromi --lines 50
pm2 logs pyxie --lines 30
```
Pressione `Ctrl+C` para sair dos logs. O bot continuará rodando em segundo plano.

Confirme no Discord que o bot responde e que um saldo, prefixo ou configuracao existente continua preservado.
---

Se o script abortar, nao force o Git. O caminho do backup sera mostrado na tela; investigue a mensagem antes de tentar novamente.
## 🛠️ Otimização de Memória na VM (Swap de 2 GB)

## Referencia manual detalhada
A máquina gratuita do Google Cloud (`e2-micro`) possui 1 GB de RAM física. Para garantir que ela nunca sofra quedas por falta de memória (OOM) durante a geração de imagens em Canvas ou duelos simultâneos, execute o comando abaixo **uma única vez** na VM:

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
# 1. Cria e ativa um arquivo de Swap de 2GB
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

Confira se os arquivos importantes existem:
# 2. Configura para persistir após reinicializações
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

```bash
find "$BACKUP/data" -maxdepth 1 -type f -printf '%f\n'
```
# 3. Otimiza a prioridade de uso de Swap (swappiness = 10)
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

Nao continue se o backup nao foi criado ou estiver vazio.

### Conferir o estado do bot

```bash
pm2 status
pm2 describe kuromi
cd ~/kuromi
git status --short
git branch --show-current
# 4. Verifica se o Swap foi ativado com sucesso
free -h
```

Se o processo tiver outro nome, use o nome exibido por `pm2 status` nos comandos seguintes.
---

### Atualizar somente o codigo
## 🔄 Comandos Úteis do Dia a Dia na VM

O repositorio deste projeto e `https://github.com/zululuga/kuromi.git`.
| Ação | Comando na VM |
| :--- | :--- |
| **Ver status do bot** | `pm2 status` |
| **Ver logs em tempo real** | `pm2 logs pyxie` |
| **Reiniciar o bot** | `pm2 restart pyxie --update-env` |
| **Parar o bot** | `pm2 stop pyxie` |
| **Monitor de CPU e Memória** | `pm2 monit` |

```bash
cd ~/kuromi
git fetch origin
BACKUP="$HOME/backups/kuromi/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp -a data "$BACKUP/"
git stash push -u -m "deploy-pre-$BACKUP"
git pull --ff-only origin main
rm -rf data
cp -a "$BACKUP/data" data
```
---

`git pull --ff-only` evita criar merge inesperado. O fluxo acima preserva a `data/` da VM mesmo quando ela foi alterada pelo uso normal do bot. Se aparecer conflito no codigo, pare e nao use `git reset --hard`; primeiro preserve o estado e investigue:
## 🆘 Recuperação de Emergência (Rollback)

Se uma atualização apresentar erros inesperados:
```bash
git status
```

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
pm2 stop pyxie
git log --oneline -5
pm2 stop kuromi
git checkout <COMMIT_ANTERIOR> -- index.js server.js package.json package-lock.json src public
git checkout HEAD~1 -- index.js server.js src package.json
npm ci --omit=dev
pm2 start kuromi
pm2 start pyxie
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

## Otimizações de Recursos para GCP Free Tier (e2-micro)

A instância gratuita do Google Cloud (`e2-micro`) possui **1 GB de RAM compartilhada** e limite de I/O em disco. Para evitar travamentos e quedas por falta de memória (OOM):

1. **Configuração do PM2 via `ecosystem.config.js`:**
   - Limite de heap do V8: `--max-old-space-size=192`
   - Reinício automático se passar de 200MB: `max_memory_restart: '200M'`
2. **Ativação recomendada de Swap na VM (executar uma única vez na VM):**
   ```bash
   # Cria um arquivo de Swap de 1GB no disco
   sudo fallocate -l 1G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   # Adiciona ao fstab para persistir após reinicializações
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
3. **Monitoramento rápido:**
   ```bash
   pm2 monit
   free -m
   ```

## Comandos rapidos do dia a dia

```bash
ssh kuromi
cd ~/kuromi
pm2 status
pm2 logs kuromi --lines 50
pm2 restart kuromi --update-env
./deploy.sh
```

O IP externo atual e temporario. O alias `kuromi` e preferivel ao uso direto do IP, desde que o `HostName` no arquivo SSH esteja atualizado.

Isso retornará ao código estável anterior mantendo todos os arquivos de `data/` 100% intactos.
