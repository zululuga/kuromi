# ☁️ Guia de Atualização & Manutenção da VM (Produção)

Este manual orienta como publicar atualizações com total segurança na máquina virtual (VM) do **Google Cloud Platform (GCP)** sem risco de perda de dados do banco de dados em produção.

---

## 🔒 Regra de Ouro da Produção
> **Nunca copie a pasta `data/` nem o arquivo `.env` do computador local para a VM.**  
> Os dados de saldo, Pymons, casamentos e transações de produção vivem exclusivamente na VM. O script de deploy cuida de fazer backup e preservar todos os dados automaticamente.

---

## ⚡ Passo a Passo Rápido para Atualizar

### 1️⃣ No seu Computador (Local)
No terminal PowerShell da pasta do projeto:
```powershell
# 1. Executa todos os testes unitários
npm test

# 2. Salva e envia as alterações para o GitHub
git add .
git commit -m "Novas funcionalidades da Pyxie"
git push origin main
```

### 2️⃣ Conectar na VM e Atualizar
```powershell
# Conectar via SSH
ssh kuromi
```

Dentro da VM no terminal Linux:
```bash
cd ~/kuromi
./deploy.sh
```

### 3️⃣ Confirmar o Status
```bash
pm2 status
pm2 logs pyxie --lines 30
```
Pressione `Ctrl+C` para sair dos logs. O bot continuará rodando em segundo plano.

---

## 🛠️ Otimização de Memória na VM (Swap de 2 GB)

A máquina gratuita do Google Cloud (`e2-micro`) possui 1 GB de RAM física. Para garantir que ela nunca sofra quedas por falta de memória (OOM) durante a geração de imagens em Canvas ou duelos simultâneos, execute o comando abaixo **uma única vez** na VM:

```bash
# 1. Cria e ativa um arquivo de Swap de 2GB
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. Configura para persistir após reinicializações
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Otimiza a prioridade de uso de Swap (swappiness = 10)
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# 4. Verifica se o Swap foi ativado com sucesso
free -h
```

---

## 🔄 Comandos Úteis do Dia a Dia na VM

| Ação | Comando na VM |
| :--- | :--- |
| **Ver status do bot** | `pm2 status` |
| **Ver logs em tempo real** | `pm2 logs pyxie` |
| **Reiniciar o bot** | `pm2 restart pyxie --update-env` |
| **Parar o bot** | `pm2 stop pyxie` |
| **Monitor de CPU e Memória** | `pm2 monit` |

---

## 🆘 Recuperação de Emergência (Rollback)

Se uma atualização apresentar erros inesperados:
```bash
cd ~/kuromi
pm2 stop pyxie
git log --oneline -5
git checkout HEAD~1 -- index.js server.js src package.json
npm ci --omit=dev
pm2 start pyxie
```
Isso retornará ao código estável anterior mantendo todos os arquivos de `data/` 100% intactos.
