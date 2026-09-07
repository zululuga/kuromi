# 💖 Kuromi (botMelody) — Bot Oficial da Cringelândia & Painel Web

Um bot de Discord simples e elegante construído em Node.js (`discord.js` v14), acompanhado de um **Painel de Controle Web** interativo em Express.js e scripts de gerenciamento via terminal Windows.

---

## 🚀 Como Colocar o Site / Painel Web no Ar

O painel web permite ligar/desligar o bot pelo navegador, ver logs em tempo real, monitorar estatísticas e enviar embeds customizados.

Para iniciar o **Painel Web**:

```bash
npm run web
```
ou
```bash
npm run dev
```

Em seguida, acesse no navegador: **[http://localhost:3000](http://localhost:3000)**

---

## ⚡ Formas de Execução

| Ação | Comando npm | Atalho Windows | O que faz |
|---|---|---|---|
| **Painel Web (Site)** | `npm run web` | `start.bat` (2 cliques) | Inicia o servidor web e abre `http://localhost:3000` |
| **Bot (Direto)** | `npm start` | — | Inicia somente o bot do Discord |
| **Registrar Comandos Slash** | `npm run register` | — | Atualiza a lista de comandos no Discord |
| **Rodar Testes** | `npm test` | — | Executa a suíte de testes unitários |

---

## ⚙️ Configuração de Variáveis de Ambiente (`.env`)

Crie ou edite o arquivo `.env` na raiz do projeto com o seguinte formato:

```env
DISCORD_TOKEN=seu_token_do_bot_aqui
DISCORD_CLIENT_ID=seu_client_id_aqui
PORT=3000
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
│
├── src/                      # Código-fonte organizado da aplicação
│   ├── config.js             # Carrega variáveis do .env e constantes
│   ├── registerSlashCommands.js # Registra os comandos na API do Discord
│   ├── commands/
│   │   ├── commandNames.js   # Nomes oficiais de todos os comandos
│   │   ├── index.js          # Registro único usado pelo bot e pelos slash commands
│   │   ├── commandHelpers.js # Construtores de embeds (help, prefix status)
│   │   ├── ping.js           # Comando ping
│   │   ├── status.js         # Status e presença informativa
│   │   ├── help.js           # Lista de comandos
│   │   ├── prefix.js         # Alteração do prefixo
│   │   ├── setwelcome.js     # Configuração de boas-vindas
│   │   ├── sixseven.js       # Imagem sixseven
│   │   └── ship.js           # Sorteio de casal
│   ├── services/
│   │   ├── database.js       # Leitura e escrita em data/settings.json
│   │   └── logging.js        # Gravação de logs e estatísticas de uso
│   └── utils/
│       └── botUtils.js       # Sistema de lock de processo e prefixo
│
├── public/                   # Frontend do Painel Web
│   └── index.html            # Dashboard responsivo com tema Kuromi
│
├── data/                     # Armazenamento de dados locais (JSON)
│   ├── settings.json         # Configurações por servidor (canais de boas-vindas)
│   ├── logs.json             # Histórico de logs persistentes
│   └── stats.json            # Contadores de mensagens, comandos e usuários
│
└── tests/                    # Suíte de testes unitários
    └── botUtils.test.js      # Testes de lock, banco de dados e prefixo
```

---

## 💬 Comandos Suportados

| Comando | Descrição | Exemplo com Prefixo |
|---|---|---|
| `/ping` | Verifica a resposta do bot | `ku!ping` |
| `/status` | Mostra status online e informações | `ku!status` |
| `/ajuda` | Exibe a lista de comandos | `ku!ajuda` |
| `/prefixo` | Altera o prefixo do bot | `ku!prefixo ku?` |
| `/boasvindas` | Define o canal de boas-vindas | `ku!boasvindas #entrada` |
| `/sixseven` | Envia a imagem do sixseven | `ku!sixseven` |
| `/casal` | Sorteia dois membros e calcula a porcentagem de amor | `ku!casal` |
| `/diario` | Resgata Moedinhas uma vez a cada 24 horas | `ku!diario` |
| `/carteira` | Exibe seu saldo de Moedinhas | `ku!carteira` |
| `/ranking` | Exibe o ranking de Moedinhas | `ku!ranking` |
| `/configeconomia` | Configura o mínimo e máximo do diário (administradores) | `ku!configeconomia 0 100` |

---

## 🧪 Rodando os Testes

Para garantir que o lock de instância única e os serviços de banco de dados funcionem como esperado:

```bash
npm test
```

---

## 📄 Licença

Este projeto é distribuído sob a licença [MIT](LICENSE).

