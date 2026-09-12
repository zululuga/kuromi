# 💖 Cringelândia — Seu lugar de ser você & Painel Web
# 💖 Kuromi — Bot Oficial da Cringelândia & Painel Web


# 🌸 Pyxie — O Universo Encantado de Pymons & RPG para Discord

Um bot de Discord simples e elegante construído em Node.js (`discord.js` v14), acompanhado de um **Painel de Controle Web** interativo em Express.js e scripts de gerenciamento via terminal Windows.
> *"Estou online, monitorando o servidor e pronta para ajudar. Não faça essa cara; eu também senti sua falta."* — Kuromi
<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-blue?style=for-the-badge&logo=node.js" alt="Node Version">
  <img src="https://img.shields.io/badge/discord.js-v14-purple?style=for-the-badge&logo=discord" alt="Discord.js">
  <img src="https://img.shields.io/badge/Status-Produção_Online-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Licença-MIT-pink?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Licença-Source--Available-pink?style=for-the-badge" alt="License">
</p>

A identidade completa da personagem, incluindo voz, fontes, paleta e regras de tom, está documentada em [docs/KUROMI-IDENTIDADE.md](docs/KUROMI-IDENTIDADE.md).
Bem-vindo ao repositório da **Kuromi**, o bot oficial do servidor **Cringelândia** no Discord! 
Este projeto combina uma experiência interativa no Discord (com comandos de texto e Slash Commands) e um **Painel de Controle Web** intuitivo construído em Node.js e Express.
A **Pyxie** é uma aplicação completa de entretenimento, economia virtual e RPG de criaturas mágicas (**Pymons**) para comunidades no Discord. Com mecânicas de Tamagotchi em tempo real, masmorras procedurais em 2D, batalhas multiplayer e monetização não-intrusiva, o projeto foi projetado para alta escalabilidade e retenção de usuários.

> ⚖️ **Aviso Legal & Propriedade Intelectual:**  
> A Pyxie é uma obra 100% original e proprietária. Embora concebida sob inspiração visual da estética *kawaii* e da cultura de mascotes carismáticos, **todas as ilustrações, criaturas (Pymons), nomes, sistemas, diálogos e códigos-fonte são criações autorais exclusivas**, sem vínculo, afiliação ou infração de direitos de marcas comerciais de terceiros.

---

## 🚀 Como Colocar o Site / Painel Web no Ar
## ✨ Funcionalidades Principais
## ✨ Recursos em Destaque

O painel web permite ligar/desligar o bot pelo navegador, ver logs em tempo real, monitorar estatísticas e enviar embeds customizados.
- 🔮 **Tarot Cringelândia:** Baralho completo com 78 cartas arcanas, renderização visual nativa em Canvas (sem arquivos pesados), leituras privadas, sorteio diário automático à meia-noite e logs públicos com humor.
- 💑 **Amor, Casamentos & Ships:** Sorteie casais (`/ship`) com geração de cartões ilustrados em tempo real, peça pessoas em casamento (`/casamento`) e gerencie divórcios.
- 🪙 **Economia & Profissões:** Resgate moedas diárias (`/daily`), escolha uma carreira (`/profissao`), trabalhe (`/trabalho`) e dispute o topo do ranking de riqueza (`/ranking`).
- 🐾 **Pets & Explorações:** Adote animais de estimação (`/adocao`), encontre versões *Shiny* raras e envie-os em expedições diárias (`/petexplorar`) em busca de tesouros.
- 🌐 **Painel Web em Tempo Real:** Dashboard acessível pelo navegador para iniciar/parar o bot, visualizar logs ao vivo, consultar estatísticas de uso e disparar avisos e embeds personalizados.
- ⚡ **Otimizado para Nuvem Gratuita:** Arquitetura leve com baixo consumo de memória (~40MB a 70MB de RAM) e I/O reduzido, perfeita para instâncias restritas (GCP Free Tier `e2-micro`).
### 🐾 1. Tamagotchi & Criação de Pymons
- **10 Espécies Originais:** Do companheiro inicial ao misterioso *Bakuphant* e *Kerobola*.
- **Cuidados em Tempo Real:** Fome, energia e humor atualizados dinamicamente via *delta-time*.
- **Chocadeira de Ovos:** Choque ovos comuns, raros e ancestrais com aceleradores temporais.
- **Formas Raras:** Versões **Shiny** (douradas/cintilantes) e **ALPHA** (com aura avermelhada).
- **Compêndio / Dex:** Galeria visual com silhuetas sombreadas para criaturas não descobertas.

Para iniciar o **Painel Web**:
---
### 🧭 2. Dungeons Procedurais & Expedições AFK
- **Masmorras 2D:** Mapas procedurais exploráveis por botões direcionais (D-Pad).
- **Expedições Passivas (AFK):** Envie seu Pymon em missões de **2h, 4h ou 8h** para coletar XP, moedas e itens enquanto você estuda ou trabalha.

## 🚀 Como Rodar o Projeto (Guia Rápido)
### ⚔️ 3. Coliseu de Duelos & World Boss Semanal
- **Duelos Entre Jogadores (`/duelo`):** Combates por turnos com apostas opcionais, vantagens elementais e limite balanceado de 3 duelos diários.
- **World Boss Semanal ALPHA (`/boss`):** Titã colossal enfrentado coletivamente por todos os servidores; o maior causador de dano (**MVP**) recebe o próprio Boss na versão **ALPHA 🔴**.

Não precisa ser especialista para colocar o projeto para funcionar. Siga os 3 passos abaixo:
### 🪙 4. Economia Mágica, Profissões & Monetização
- **Sistema Monetário:** Moedinhas Mágicas 🪙 e Feijões Mágicos 🌱 (moeda nobre rara).
- **Mini-games de Trabalho (`/trabalho`):** Escolha sua profissão e participe de desafios interativos.
- **Mercado & Trocas Seguras (`/trocar`):** Sistema com confirmação bilateral e cooldown de 30 minutos.
- **Monetização Otimizada (LootLabs):** Bônus opcional de +50% no `/diario` com páginas leves de espera de segundos, rastreamento por `puid` e **idempotência estrita** contra transações duplicadas.

### 1️⃣ Instale as Dependências
Certifique-se de ter o [Node.js](https://nodejs.org/) (versão 18 ou superior) instalado no computador e execute:
```bash
npm run web
npm install
```
ou
### 👑 5. Customização & Tarot
- **Personalização de Perfil:** Títulos raros e temas visuais coloridos (*Ouro Real, Esmeralda, Nebulosa, Rosa Neon*) compráveis com Feijões Mágicos.
- **Tarot Místico:** 78 arcanos ilustrados com renderização gráfica nativa em Canvas de alto desempenho.

### 2️⃣ Configure as Chaves (`.env`)
Copie o arquivo de exemplo `.env.example` e renomeie para `.env`:
```bash
npm run dev
cp .env.example .env
```
Abra o `.env` e coloque o seu **`DISCORD_TOKEN`** e o **`DISCORD_CLIENT_ID`** obtidos no [Discord Developer Portal](https://discord.com/developers/applications).

---
### 3️⃣ Inicie a Aplicação
Escolha a forma que preferir:

| O que você quer abrir? | Comando | No Windows | O que acontece |
| :--- | :--- | :--- | :--- |
| **Painel Web + Bot** | `npm run web` | Dê 2 cliques em `start.bat` | Abre o site em `http://localhost:3000` e inicia o bot |
| **Apenas o Bot** | `npm start` | — | Roda somente o bot no terminal |
| **Registrar Comandos** | `npm run register` | — | Atualiza os Slash Commands no Discord |
| **Rodar Testes** | `npm test` | — | Executa os testes automatizados |
## 🔒 Arquitetura, Segurança e Multi-Servidor

Em seguida, acesse no navegador: **[http://localhost:3000](http://localhost:3000)**
- **Menor Privilégio no Convite:** Permissões estritas (`378880`) sem solicitação de *Administrador*.
- **Isolamento por Servidor:** Configurações de canal de boas-vindas e faixas econômicas armazenadas por `guild_id`.
- **Painel Web Protegido:** Endpoints administrativos no Express (`server.js`) protegidos por autenticação de token (`API_SECRET_TOKEN`).
- **Otimizado para Nuvem Gratuita:** Consumo estável de apenas **~49 MB de RAM**, perfeito para instâncias `e2-micro` no **Google Cloud Platform (GCP Always Free Tier)**.

---

## ⚡ Formas de Execução
## 📁 Entendendo as Pastas do Projeto
## 🚀 Como Iniciar o Projeto

| Ação | Comando npm | Atalho Windows | O que faz |
|---|---|---|---|
| **Painel Web (Site)** | `npm run web` | `start.bat` (2 cliques) | Inicia o servidor web e abre `http://localhost:3000` |
| **Bot (Direto)** | `npm start` | — | Inicia somente o bot do Discord |
| **Registrar Comandos Slash** | `npm run register` | — | Atualiza a lista de comandos no Discord |
| **Rodar Testes** | `npm test` | — | Executa a suíte de testes unitários |
Para quem está abrindo o repositório pela primeira vez, aqui está a explicação de cada parte:
### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior.
- Git instalado.

---
### 1. Clonar e Instalar
```bash
git clone https://github.com/zululuga/kuromi.git
cd kuromi
npm install
```

## ⚙️ Configuração de Variáveis de Ambiente (`.env`)

Crie ou edite o arquivo `.env` na raiz do projeto com o seguinte formato:

### 2. Configurar Variáveis de Ambiente (`.env`)
Crie o arquivo `.env` na raiz do projeto:
```env
DISCORD_TOKEN=seu_token_do_bot_aqui
DISCORD_CLIENT_ID=seu_client_id_aqui
DISCORD_TOKEN=seu_discord_bot_token
DISCORD_CLIENT_ID=seu_client_id
LOOT_LABS_API_KEY=sua_chave_do_lootlabs
API_SECRET_TOKEN=sua_chave_secreta_para_o_painel_web
PORT=3000
# URL pública que contém os PNGs referenciados em src/data/tarot.json
TAROT_IMAGE_BASE_URL=https://seu-host/tarot
```

---

## 📁 Estrutura de Arquivos e Pastas

```
e:/botMelody/
├── index.js                  # Ponto de entrada principal do bot no Discord
├── server.js                 # Servidor Express do Painel Web (http://localhost:3000)
├── start.bat                 # Atalho de inicialização rápida para Windows
├── start.ps1                 # Script interativo PowerShell do Painel CLI
├── package.json              # Configurações do projeto e scripts npm
├── COMANDOS.md               # Documentação detalhada dos comandos
├── README.md                 # Guia principal de manutenção (este arquivo)
```text
botMelody/
├── index.js                  # Ponto de entrada do Bot no Discord (eventos, mensagens, comandos)
├── server.js                 # Servidor do Painel Web (Express + API de controle)
├── ecosystem.config.js       # Configuração de processos e limite de memória do PM2
├── deploy.sh                 # Script seguro de atualização na máquina de produção (VM)
├── start.bat / start.ps1     # Atalhos práticos para iniciar no Windows
├── package.json              # Lista de bibliotecas e scripts do projeto
│
├── src/                      # Código-fonte organizado da aplicação
│   ├── config.js             # Carrega variáveis do .env e constantes
│   ├── registerSlashCommands.js # Registra os comandos na API do Discord
│   ├── commands/
│   │   ├── commandNames.js   # Nomes oficiais de todos os comandos
│   │   ├── index.js          # Registro único usado pelo bot e pelos slash commands
│   │   ├── commandHelpers.js # Construtores de embeds de ajuda
│   │   ├── ping.js           # Comando ping
│   │   ├── status.js         # Status e presença informativa
│   │   ├── help.js           # Lista de comandos
│   │   ├── setwelcome.js     # Configuração de boas-vindas
│   │   ├── sixseven.js       # Imagem sixseven
│   │   └── ship.js           # Sorteio de casal
│   ├── services/
│   │   ├── database.js       # Leitura e escrita em data/settings.json
│   │   └── logging.js        # Gravação de logs e estatísticas de uso
│   └── utils/
│       └── botUtils.js       # Sistema de lock de processo e prefixo
├── src/                      # Código-fonte organizado
│   ├── config.js             # Configurações gerais, IDs de canais e variáveis
│   ├── registerSlashCommands.js # Publicador de comandos slash na API do Discord
│   ├── commands/             # Todos os comandos do bot (cada comando em um arquivo)
│   ├── services/             # Lógica de negócios (banco de dados, economia, tarot, renderizadores)
│   └── utils/                # Funções utilitárias (lock de processo, formatação, emojis)
│
├── public/                   # Frontend do Painel Web
│   └── index.html            # Dashboard responsivo com tema Cringelândia
│
├── data/                     # Armazenamento de dados locais (JSON)
│   ├── settings.json         # Configurações por servidor (canais de boas-vindas)
│   ├── logs.json             # Histórico de logs persistentes
│   └── stats.json            # Contadores de mensagens, comandos e usuários
│
└── tests/                    # Suíte de testes unitários
    └── botUtils.test.js      # Testes de lock, banco de dados e ajuda
├── public/                   # Arquivos visuais do Painel Web (HTML, CSS e JavaScript do navegador)
├── data/                     # Banco de dados local em formato JSON (economia, logs, casamentos)
├── docs/                     # Documentações detalhadas e manuais técnicos
│   ├── COMANDOS.md           # Guia completo de todos os comandos e parâmetros
│   ├── VM-ATUALIZACAO.md     # Manual de deploy, backup e configuração da VM
│   └── KUROMI-IDENTIDADE.md  # Identidade visual, tom de voz e regras da personagem
└── tests/                    # Testes de verificação automática
```

---

## 💬 Comandos Suportados
## 📖 Documentação Detalhada

| Comando | Descrição | Exemplo com Prefixo |
|---|---|---|
| `/ping` | Verifica a resposta do bot | `ku!ping` |
| `/status` | Mostra status online e informações | `ku!status` |
| `/ajuda` | Exibe a lista de comandos | `ku!ajuda` |
| `/boasvindas` | Define o canal de boas-vindas | `ku!boasvindas #entrada` |
| `/sixseven` | Envia a imagem do sixseven | `ku!sixseven` |
| `/casal` | Sorteia dois membros e calcula a porcentagem de amor | `ku!casal` |
| `/diario` | Resgata Moedinhas uma vez a cada 24 horas | `ku!diario` |
| `/carteira` | Exibe seu saldo de Moedinhas | `ku!carteira` |
| `/ranking` | Exibe o ranking de Moedinhas | `ku!ranking` |
| `/configeconomia` | Configura o mínimo e máximo do diário (administradores) | `ku!configeconomia 0 100` |
| `/tarot` | Faz uma tiragem privada diária; uma nova custa 350 Moedinhas | — |
| `/agenda` | Mostra os próximos disparos e verificações automáticas (administradores) | `ku!agenda` |
| `/emojis` | Baixa a lista de emojis customizados em JSON (administradores) | `ku!emojis` |
Para instruções mais aprofundadas, consulte a nossa pasta [`docs/`](docs/):

Além dos comandos, a Kuromi responde a qualquer mensagem que contenha `viadinho fofinho` com uma reação 🏳️‍🌈 e um GIF de Gacha Life.
- 📜 **[Catálogo de Comandos](docs/COMANDOS.md):** Lista completa de comandos com prefixo (`ku!`) e comandos de barra (`/`).
- ☁️ **[Guia de Deploy na VM](docs/VM-ATUALIZACAO.md):** Instruções de publicação em produção, rotina de backup e otimização para GCP Free Tier.
- 🖤 **[Identidade e Tom de Voz](docs/KUROMI-IDENTIDADE.md):** Diretrizes de personalidade sarcástica e afetuosa da Kuromi.

### Guia de apoio da comunidade

A Kuromi publica automaticamente, a cada 12 horas, um embed no canal configurado para explicar como ajudar a Cringelândia com bumps no DISBOARD, Canudinho, Discadia, votos no Top.gg e reviews.

---

## 🧪 Rodando os Testes
## 🛡️ Licença e Comunidade

Para garantir que o lock de instância única e os serviços de banco de dados funcionem como esperado:

### 3. Iniciar a Aplicação
```bash
npm test
```
# Iniciar o painel web + bot
npm run web

---
# Ou iniciar apenas o bot
npm start

## Atualizando a VM de Producao
# Registrar Slash Commands no Discord
npm run register

A VM usa o projeto em `~/kuromi`, com o processo `kuromi` gerenciado pelo PM2. O fluxo completo esta em [VM-ATUALIZACAO.md](VM-ATUALIZACAO.md).

### 1. Testar e publicar o commit

No PowerShell, dentro de `E:\botMelody`:

```powershell
# Executar suíte completa de testes unitários
npm test
git add <arquivos-alterados>
git commit -m "Descreve a alteracao"
git push origin main
```

O commit e o `push` devem acontecer antes do deploy. O script da VM nao cria commits; ele apenas baixa uma versao ja publicada no Git.
Acesse o painel administrativo em: **`http://localhost:3000`**

### 2. Executar o deploy na VM
---

```powershell
ssh kuromi
```
## 📂 Estrutura do Repositório

Na VM:

```bash
cd ~/kuromi
chmod +x deploy.sh
./deploy.sh
```text
botMelody/
├── index.js                  # Ponto de entrada do Bot no Discord (eventos e IPC)
├── server.js                 # Servidor Express do Painel Web e Webhooks (LootLabs)
├── package.json              # Dependências e scripts npm
├── ecosystem.config.js       # Configurações de processo PM2 para produção
├── deploy.sh                 # Script seguro de deploy e backup na VM
│
├── src/                      # Código-fonte principal
│   ├── config.js             # Configurações de ambiente
│   ├── registerSlashCommands.js # Publicador de comandos slash na API do Discord
│   ├── commands/             # Todos os comandos modulares (/duelo, /boss, /trocar, etc.)
│   ├── services/             # Lógica de negócios (Pymons, Duelos, Economia, LootLabs, Boss)
│   ├── data/                 # Catálogos estáticos (Pymons, Itens, Tarot)
│   ├── pets/                 # Sprites e ilustrações em Pixel Art dos Pymons
│   └── utils/                # Cooldowns, formatação de voz e lock de processo
│
├── public/                   # Frontend do painel web administrativo
├── data/                     # Banco de dados local em formato JSON
├── docs/                     # Manuais técnicos detalhados
│   ├── COMANDOS.md           # Guia completo de comandos e parâmetros
│   ├── VM-ATUALIZACAO.md     # Manual de deploy na VM e configuração de Swap
│   └── Pyxie-IDENTIDADE.md   # Diretrizes de marca e personalidade da Pyxie
│
└── tests/                    # Suíte completa de 7 arquivos de testes automatizados
```

O script cria um backup da `data/`, guarda temporariamente alteracoes locais, executa `git pull --ff-only`, restaura os dados da VM, instala dependencias e reinicia apenas o processo `kuromi`. A `data/` local da VM e sempre preservada; ela nao precisa ser commitada.

### 3. Validar o processo

```bash
pm2 status
pm2 logs kuromi --lines 50
```

Confirme no Discord que o bot responde e que os dados existentes continuam preservados.

### Dados que nunca devem ser enviados

Nao copie nem sobrescreva na VM:

- `.env`
- `data/settings.json`
- `data/economy.json`
- `data/marriages.json`
- `data/logs.json`
- `data/stats.json`
- `prefix.json`, se existir

O deploy manual ou por `scp` deve enviar apenas codigo. Nunca use uma copia recursiva da pasta inteira do projeto, pois isso pode substituir o banco de producao.

---

## 📄 Licença
## 📄 Licença & Propriedade Intelectual

Este projeto é distribuído sob a licença [MIT](LICENSE).
Este projeto é disponibilizado sob a **Custom Source-Available License**.
- ✅ **Permitido:** Leitura, auditoria de segurança, estudo educacional e testes em instâncias locais/privadas.
- ❌ **Proibido:** Hospedagem pública concorrente no Discord, cobrança financeira de usuários, criação de bots derivados para fins comerciais ou distribuição não autorizada.

Desenvolvido com carinho e pitadas de sarcasmo para a comunidade **Cringelândia**.
Sinta-se livre para sugerir melhorias e criar novas funcionalidades!
## 📜 Licença
Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais detalhes.
Consulte o arquivo [LICENSE](LICENSE) para os termos jurídicos completos.
