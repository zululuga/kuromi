# 💖 Kuromi — Bot Oficial da Cringelândia & Painel Web

> *"Estou online, monitorando o servidor e pronta para ajudar. Não faça essa cara; eu também senti sua falta."* — Kuromi

Bem-vindo ao repositório da **Kuromi**, o bot oficial do servidor **Cringelândia** no Discord! 
Este projeto combina uma experiência interativa no Discord (com comandos de texto e Slash Commands) e um **Painel de Controle Web** intuitivo construído em Node.js e Express.

---

## ✨ Funcionalidades Principais

- 🔮 **Tarot Cringelândia:** Baralho completo com 78 cartas arcanas, renderização visual nativa em Canvas (sem arquivos pesados), leituras privadas, sorteio diário automático à meia-noite e logs públicos com humor.
- 💑 **Amor, Casamentos & Ships:** Sorteie casais (`/ship`) com geração de cartões ilustrados em tempo real, peça pessoas em casamento (`/casamento`) e gerencie divórcios.
- 🪙 **Economia & Profissões:** Resgate moedas diárias (`/daily`), escolha uma carreira (`/profissao`), trabalhe (`/trabalho`) e dispute o topo do ranking de riqueza (`/ranking`).
- 🐾 **Pets & Explorações:** Adote animais de estimação (`/adocao`), encontre versões *Shiny* raras e envie-os em expedições diárias (`/petexplorar`) em busca de tesouros.
- 🌐 **Painel Web em Tempo Real:** Dashboard acessível pelo navegador para iniciar/parar o bot, visualizar logs ao vivo, consultar estatísticas de uso e disparar avisos e embeds personalizados.
- ⚡ **Otimizado para Nuvem Gratuita:** Arquitetura leve com baixo consumo de memória (~40MB a 70MB de RAM) e I/O reduzido, perfeita para instâncias restritas (GCP Free Tier `e2-micro`).

---

## 🚀 Como Rodar o Projeto (Guia Rápido)

Não precisa ser especialista para colocar o projeto para funcionar. Siga os 3 passos abaixo:

### 1️⃣ Instale as Dependências
Certifique-se de ter o [Node.js](https://nodejs.org/) (versão 18 ou superior) instalado no computador e execute:
```bash
npm install
```

### 2️⃣ Configure as Chaves (`.env`)
Copie o arquivo de exemplo `.env.example` e renomeie para `.env`:
```bash
cp .env.example .env
```
Abra o `.env` e coloque o seu **`DISCORD_TOKEN`** e o **`DISCORD_CLIENT_ID`** obtidos no [Discord Developer Portal](https://discord.com/developers/applications).

### 3️⃣ Inicie a Aplicação
Escolha a forma que preferir:

| O que você quer abrir? | Comando | No Windows | O que acontece |
| :--- | :--- | :--- | :--- |
| **Painel Web + Bot** | `npm run web` | Dê 2 cliques em `start.bat` | Abre o site em `http://localhost:3000` e inicia o bot |
| **Apenas o Bot** | `npm start` | — | Roda somente o bot no terminal |
| **Registrar Comandos** | `npm run register` | — | Atualiza os Slash Commands no Discord |
| **Rodar Testes** | `npm test` | — | Executa os testes automatizados |

---

## 📁 Entendendo as Pastas do Projeto

Para quem está abrindo o repositório pela primeira vez, aqui está a explicação de cada parte:

```text
botMelody/
├── index.js                  # Ponto de entrada do Bot no Discord (eventos, mensagens, comandos)
├── server.js                 # Servidor do Painel Web (Express + API de controle)
├── ecosystem.config.js       # Configuração de processos e limite de memória do PM2
├── deploy.sh                 # Script seguro de atualização na máquina de produção (VM)
├── start.bat / start.ps1     # Atalhos práticos para iniciar no Windows
├── package.json              # Lista de bibliotecas e scripts do projeto
│
├── src/                      # Código-fonte organizado
│   ├── config.js             # Configurações gerais, IDs de canais e variáveis
│   ├── registerSlashCommands.js # Publicador de comandos slash na API do Discord
│   ├── commands/             # Todos os comandos do bot (cada comando em um arquivo)
│   ├── services/             # Lógica de negócios (banco de dados, economia, tarot, renderizadores)
│   └── utils/                # Funções utilitárias (lock de processo, formatação, emojis)
│
├── public/                   # Arquivos visuais do Painel Web (HTML, CSS e JavaScript do navegador)
├── data/                     # Banco de dados local em formato JSON (economia, logs, casamentos)
├── docs/                     # Documentações detalhadas e manuais técnicos
│   ├── COMANDOS.md           # Guia completo de todos os comandos e parâmetros
│   ├── VM-ATUALIZACAO.md     # Manual de deploy, backup e configuração da VM
│   └── KUROMI-IDENTIDADE.md  # Identidade visual, tom de voz e regras da personagem
└── tests/                    # Testes de verificação automática
```

---

## 📖 Documentação Detalhada

Para instruções mais aprofundadas, consulte a nossa pasta [`docs/`](docs/):

- 📜 **[Catálogo de Comandos](docs/COMANDOS.md):** Lista completa de comandos com prefixo (`ku!`) e comandos de barra (`/`).
- ☁️ **[Guia de Deploy na VM](docs/VM-ATUALIZACAO.md):** Instruções de publicação em produção, rotina de backup e otimização para GCP Free Tier.
- 🖤 **[Identidade e Tom de Voz](docs/KUROMI-IDENTIDADE.md):** Diretrizes de personalidade sarcástica e afetuosa da Kuromi.

---

## 🛡️ Licença e Comunidade

Desenvolvido com carinho e pitadas de sarcasmo para a comunidade **Cringelândia**.
Sinta-se livre para sugerir melhorias e criar novas funcionalidades!
