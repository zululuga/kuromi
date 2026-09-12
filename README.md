# 🌸 Pyxie — O Universo Encantado de Pymons & RPG para Discord

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-blue?style=for-the-badge&logo=node.js" alt="Node Version">
  <img src="https://img.shields.io/badge/discord.js-v14-purple?style=for-the-badge&logo=discord" alt="Discord.js">
  <img src="https://img.shields.io/badge/Status-Produção_Online-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Licença-Source--Available-pink?style=for-the-badge" alt="License">
</p>

A **Pyxie** é uma aplicação completa de entretenimento, economia virtual e RPG de criaturas mágicas (**Pymons**) para comunidades no Discord. Com mecânicas de Tamagotchi em tempo real, masmorras procedurais em 2D, batalhas multiplayer, sistema de Tarot e painel de controle web em tempo real, o projeto foi projetado para alta escalabilidade e retenção de usuários.

> ⚖️ **Aviso Legal & Propriedade Intelectual:**  
> A Pyxie é uma obra 100% original e proprietária. Embora concebida sob inspiração visual da estética *kawaii* e da cultura de mascotes carismáticos, **todas as ilustrações, criaturas (Pymons), nomes, sistemas, diálogos e códigos-fonte são criações autorais exclusivas**, sem vínculo, afiliação ou infração de direitos de marcas comerciais de terceiros.

---

## ✨ Recursos em Destaque

### 🐾 1. Tamagotchi & Criação de Pymons
- **10 Espécies Oficiais:** Do companheiro inicial ao misterioso *Bakuphant* e *Kerobola*.
- **Cuidados em Tempo Real:** Fome, energia e humor atualizados dinamicamente via *delta-time*.
- **Chocadeira de Ovos:** Choque ovos comuns, raros e ancestrais com aceleradores temporais.
- **Formas Raras:** Versões **Shiny** (douradas/cintilantes) e **ALPHA** (com aura avermelhada).
- **Compêndio / Dex:** Galeria visual com silhuetas sombreadas para criaturas ainda não descobertas.

### 🧭 2. Dungeons Procedurais & Expedições AFK
- **Masmorras 2D:** Mapas procedurais exploráveis por botões direcionais (D-Pad) com consumo de estamina.
- **Expedições Passivas (AFK):** Envie seu Pymon em missões de **2h, 4h ou 8h** para coletar XP, moedas e itens enquanto você estuda ou trabalha.

### ⚔️ 3. Coliseu de Duelos & World Boss Semanal
- **Duelos Entre Jogadores (`/py-duelo`):** Combates por turnos com apostas opcionais, vantagens elementais e limite balanceado de 3 duelos diários.
- **World Boss Semanal ALPHA (`/py-boss`):** Titã colossal enfrentado coletivamente por todos os servidores; o maior causador de dano (**MVP**) recebe o próprio Boss na versão **ALPHA 🔴**.

### 🪙 4. Economia Mágica, Profissões & Recompensas
- **Sistema Monetário:** Moedinhas Mágicas 🪙 e Feijões Mágicos 🌱 (moeda nobre rara).
- **Mini-games de Trabalho (`/py-trabalho`):** Escolha sua profissão e participe de desafios interativos.
- **Mercado & Trocas Seguras (`/py-trocar`):** Sistema com confirmação bilateral e cooldown de 30 minutos.
- **Votação Top.gg (`/py-votar`):** Resgate de moedas e itens com bônus dobrado nos fins de semana.

### 👑 5. Customização & Tarot
- **Personalização de Perfil:** Títulos raros e temas visuais coloridos (*Ouro Real, Esmeralda, Nebulosa, Rosa Neon*) compráveis com Feijões Mágicos.
- **Tarot Místico:** 78 arcanos ilustrados com renderização gráfica nativa em Canvas de alto desempenho.

---

## 🚀 Como Rodar o Projeto (Guia Rápido)

### 1️⃣ Instale as Dependências
Certifique-se de ter o [Node.js](https://nodejs.org/) (versão 18 ou superior) instalado e execute:
```bash
npm install
```

### 2️⃣ Configure as Chaves (`.env`)
Copie o arquivo de exemplo `.env.example` e renomeie para `.env`:
```bash
cp .env.example .env
```
Abra o `.env` e preencha as variáveis:
```env
DISCORD_TOKEN=seu_discord_bot_token
DISCORD_CLIENT_ID=seu_client_id
API_SECRET_TOKEN=sua_chave_secreta_para_o_painel_web
TOPGG_WEBHOOK_SECRET=seu_secret_do_topgg
PORT=3000
```

### 3️⃣ Inicie a Aplicação

| O que você quer abrir? | Comando | No Windows | O que acontece |
| :--- | :--- | :--- | :--- |
| **Painel Web + Bot** | `npm run web` | Dê 2 cliques em `start.bat` | Abre o painel em `http://localhost:3000` e inicia o bot |
| **Apenas o Bot** | `npm start` | — | Roda somente o bot no terminal |
| **Registrar Comandos** | `npm run register` | — | Atualiza os Slash Commands no Discord |
| **Rodar Testes** | `npm test` | — | Executa a suíte de testes unitários |

---

## 📂 Estrutura do Repositório

```text
botMelody/
├── index.js                  # Ponto de entrada do Bot no Discord (eventos e inicialização)
├── server.js                 # Servidor Express do Painel Web e Webhooks (Top.gg)
├── package.json              # Dependências e scripts npm
├── ecosystem.config.js       # Configurações de processo PM2 para produção
├── deploy.sh                 # Script seguro de deploy e backup na VM
│
├── src/                      # Código-fonte principal
│   ├── config.js             # Configurações de ambiente e constantes
│   ├── registerSlashCommands.js # Publicador de comandos slash na API do Discord
│   ├── commands/             # Todos os comandos modulares (/py-duelo, /py-boss, /py-trocar, etc.)
│   ├── services/             # Lógica de negócios (Pymons, Duelos, Economia, Tarot, Boss, Top.gg)
│   ├── data/                 # Catálogos estáticos (Pymons, Itens, Tarot)
│   ├── pets/                 # Sprites e ilustrações em Pixel Art dos Pymons
│   └── utils/                # Cooldowns, formatação de voz, i18n e lock de processo
│
├── public/                   # Frontend do painel web administrativo
├── data/                     # Banco de dados local em formato JSON
├── docs/                     # Manuais técnicos detalhados
│   ├── COMANDOS.md           # Guia completo de comandos e parâmetros
│   └── VM-ATUALIZACAO.md     # Manual de deploy na VM e configuração de Swap
│
└── tests/                    # Suíte completa de 7 arquivos de testes automatizados
```

---

## 🔒 Arquitetura & Segurança

- **Menor Privilégio no Convite:** Permissões estritas (`378880`) sem solicitação de *Administrador*.
- **Isolamento por Servidor:** Configurações de canal de boas-vindas e faixas econômicas armazenadas por `guild_id`.
- **Painel Web Protegido:** Endpoints administrativos no Express (`server.js`) protegidos por autenticação de token (`API_SECRET_TOKEN`).
- **Otimizado para Nuvem Gratuita:** Consumo estável de apenas **~49 MB de RAM**, perfeito para instâncias `e2-micro` no **Google Cloud Platform (GCP Always Free Tier)**.

---

## 📄 Licença & Propriedade Intelectual

Este projeto é disponibilizado sob a **Custom Source-Available License**.
- ✅ **Permitido:** Leitura, auditoria de segurança, estudo educacional e testes em instâncias locais/privadas.
- ❌ **Proibido:** Hospedagem pública concorrente no Discord, cobrança financeira de usuários, criação de bots derivados para fins comerciais ou distribuição não autorizada.

Consulte o arquivo [LICENSE](LICENSE) para os termos jurídicos completos.
