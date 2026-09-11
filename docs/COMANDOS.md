# 📚 Comandos da Cringelândia
# 📚 Manual Oficial de Comandos — Pyxie

## 🔧 Painel de Controle Local
Acesse em: **http://localhost:3000**
A **Pyxie** suporta comandos modernos via **Slash Commands (`/`)** e comandos tradicionais de texto com o prefixo **`py!`**.

### Funções do Painel
- **Start**: Inicia o bot
- **Restart**: Reinicia o bot
- **Stop**: Para o bot
- **Register Slash**: Registra ou atualiza os comandos slash no Discord
- **Quit**: Para o bot e fecha

---

## ⚡ Comandos com Prefixo (Padrão: `ku!`)
## 🧭 Sumário de Módulos
1. [🐾 Pymons & Tamagotchi](#-1-pymons--tamagotchi)
2. [⚔️ Combates, Duelos & World Boss](#️-2-combates-duelos--world-boss)
3. [🧭 Exploração & Dungeons](#-3-exploração--dungeons)
4. [🪙 Economia, Profissões & Mercado](#-4-economia-profissões--mercado)
5. [👑 Perfil, Títulos & Cosméticos](#-5-perfil-títulos--cosméticos)
6. [🔮 Tarot & Interações Sociais](#-6-tarot--interações-sociais)
7. [⚙️ Utilidades & Administração](#-7-utilidades--administração)

Use qualquer um desses comandos digitando a mensagem no Discord:
---

### `ku!ping`
Responde com "pong!" para confirmar que o bot está online.
```
Uso: ku!ping
Resposta: pong! 🏓
```
## 🐾 1. Pymons & Tamagotchi

### `ku!status`
Mostra o status do bot e informações do servidor.
```
Uso: ku!status
Resposta: Embed com status online
```
### `/pymons` (ou `py!pymons`)
Abre o painel central do seu Pymon. Permite alimentar, fazer carinho, colocar para dormir, gerenciar a chocadeira de ovos e acessar a loja de itens.

### `ku!ajuda`
Lista todos os comandos e funções disponíveis.
```
Uso: ku!ajuda [pagina]
Resposta: Embed com lista de comandos
```
### `/dex` (ou `py!dex`)
Exibe o compêndio completo de todas as 10 espécies de Pymons. Criaturas já descobertas aparecem coloridas com dados de raridade e elemento; espécies ainda não possuídas ficam em silhueta misteriosa. Permite inspecionar versões normais, Shiny e ALPHA.

A ajuda exibe até 10 comandos por página. Use `ku!ajuda 1` ou `/ajuda pagina:1` para escolher a página.
### `/adocao [especie]` (ou `py!adocao [especie]`)
Adota o seu primeiro Pymon inicial (**Cinna**, **Bonorka** ou **Pomcorin**).

### `ku!boasvindas #canal`
Define o canal onde a mensagem de boas-vindas será enviada.
```
Uso: ku!boasvindas #bem-vindos
Resposta: Canal de boas-vindas configurado para #bem-vindos
```
---

### `ku!diario`
Resgata uma quantidade aleatória de Moedinhas. O resgate pode ser feito uma vez a cada 24 horas.
## ⚔️ 2. Combates, Duelos & World Boss

### `ku!carteira [@usuário]`
Exibe todos os saldos e a colocação de um usuário. As moedas exibidas são compartilhadas com o perfil.
### `/duelo [oponente] [aposta]` (ou `py!duelo @usuario [aposta]`)
Desafia outro treinador para uma batalha RPG por turnos na arena.
- **Limite:** Até 3 duelos por dia por jogador.
- **Aposta:** Opcional (0 a 50.000 moedas).
- **Atributos:** ATK, DEF e VEL influenciam no dano e na chance de esquiva.
- **Vantagens Elementais:** Causam +25% de dano e reduzem em 20% o dano recebido.

### `ku!perfil [@usuário]`
Exibe o cônjuge, todos os saldos e a colocação de um usuário.
### `/boss [subcomando]` (ou `py!boss`)
Enfrente o **World Boss Semanal ALPHA** em cooperação com todos os servidores do Discord.
- `/boss status`: Mostra a barra de vida, elemento, aura avermelhada e ranking de dano atual.
- `/boss atacar`: Desfere um ataque poderoso com seu Pymon ativo (Cooldown: 10 min).
- `/boss ranking`: Lista os maiores causadores de dano contra o titã.
- 🎁 **Recompensa do MVP:** O jogador #1 em dano recebe o próprio **Pymon versão ALPHA (🔴 Aura Avermelhada)** + 3 🌱 Feijões Mágicos + 3.000 🪙.

### `ku!casamento @usuário`
Solicita uma cerimônia de casamento por 1000 Moedinhas. O usuário escolhido deve aceitar ou recusar o pedido.
---

### `ku!ranking`
Exibe os usuários com mais Moedinhas e a sua colocação.
## 🧭 3. Exploração & Dungeons

### `ku!configeconomia <mínimo> <máximo>`
Configura a faixa do comando `diario`. Disponível para administradores.
### `/petexplorar` (ou `py!petexplorar`)
Inicia uma masmorra procedural 2D onde você controla seu Pymon usando botões direcionais (D-Pad) em busca de baús de tesouro, combates contra monstros e ovos raros.

### `ku!setareconomia @usuário <quantidade>`
Define o saldo de Moedinhas de um usuário. Disponível para administradores.
### `/expedicao [duracao]` (ou `py!expedicao [2|4|8]`)
Envia seu Pymon em uma expedição passiva (AFK) enquanto você estuda, trabalha ou joga.
- 🟢 **2 Horas:** 150-300 XP • 200-400 🪙 • Comida
- 🟡 **4 Horas:** 400-700 XP • 500-900 🪙 • Poção + 15% Chance de Ovo
- 🟣 **8 Horas:** 900-1600 XP • 1200-2200 🪙 • Banquete + 10% Feijão 🌱 + 25% Ovo Raro 🥚✨

### `ku!resetareconomia @usuário`
Zera as Moedinhas e o cooldown diário de um usuário. Disponível para administradores.

### `ku!agenda`
Mostra as próximas verificações e disparos automáticos do bot, com horário de Brasília, canal, frequência e contagem regressiva. Disponível para administradores.

### `ku!emojis`
Baixa um arquivo JSON com a lista de emojis customizados do servidor, incluindo URLs, IDs e quais são animados. Disponível para administradores.

### `ku!profissao <profissão>`
Escolhe uma profissão. A primeira escolha é gratuita; trocar custa 50 Moedinhas.

### `ku!trabalho`
Inicia um desafio de cinco palavras relacionadas à sua profissão. O trabalho pode ser feito a cada 3 horas e paga de 5 a 50 Moedinhas.

### `ku!divorcio`
Encerra seu casamento por 500 Moedinhas.
```

---

## 💬 Comandos Slash (Recomendado)
## 🪙 4. Economia, Profissões & Mercado

Use os comandos digitando `/` no Discord:
### `/diario` (ou `py!diario`)
Resgata sua recompensa diária em Moedinhas (com 1% de chance de obter 1 Feijão Mágico 🌱).
- **Bônus Patrocinado (+50%):** Clique no botão após o resgate e aguarde alguns segundos na página do anúncio para receber +50% de moedas automaticamente em sua conta via LootLabs.

### `/ping`
Responde com "pong!" para confirmar que o bot está online.
```
Uso: /ping
Resposta: pong! 🏓
```
### `/carteira [usuario]` (ou `py!carteira [@usuario]`)
Consulta seus saldos de Moedinhas, Feijões Mágicos e posição no ranking de riqueza.

### `/status`
Mostra o status do bot e informações do servidor.
```
Uso: /status
Resposta: Embed com status online
```
### `/ranking [categoria]` (ou `py!ranking [coins|beans|pets|dex]`)
Exibe a classificação global e do servidor nas categorias:
- 🪙 **Moedas:** Os magnatas mais ricos.
- 🌱 **Feijões:** Os maiores acumuladores de Feijões Mágicos.
- 🐾 **Pets:** Os Pymons de nível mais alto.
- 📖 **Dex:** Os exploradores com mais espécies registradas.

### `/ajuda`
Lista todos os comandos e funções disponíveis em mensagem privada/efêmera com botões de navegação.
```
Uso: /ajuda [pagina]
Resposta: Embed interativo com lista de comandos, botões de paginação (◀️ / ▶️) e visibilidade apenas para quem executou.
```
### `/trocar [usuario] [tipo] [identificador] [quantidade]` (ou `py!trocar @usuario item|moedas|pet`)
Inicia uma proposta de troca segura e bilateral de itens, moedas ou Pymons com outro membro.
- **Segurança:** Ambos os jogadores devem clicar em "Confirmar Troca" para a transferência ocorrer.
- **Cooldown:** 30 minutos após cada troca concluída.

### `/boasvindas #canal`
Define o canal onde a mensagem de boas-vindas será enviada.
```
Uso: /boasvindas #bem-vindos
Resposta: Canal de boas-vindas configurado para #bem-vindos
```
### `/profissao [carreira]` (ou `py!profissao [carreira]`)
Escolha sua vocação (Programador, Alquimista, Músico, Explorador, etc.).

### `/diario`
Resgata uma quantidade aleatória de Moedinhas uma vez a cada 24 horas.
### `/trabalho` (ou `py!trabalho`)
Mini-game interativo de digitação ou desafios relacionados à sua carreira (a cada 3 horas).

### `/carteira [usuário]`
Exibe todos os saldos e a colocação de um usuário. As moedas exibidas são compartilhadas com o perfil.
### `/loja`, `/comprar [item]`, `/vender [item]`, `/inventario`
Gerencie seus itens consumíveis, poções, pedras mágicas, sementes e ovos.

### `/perfil [usuário]`
Exibe o cônjuge, todos os saldos e a colocação de um usuário.
---

### `/casamento usuario:@usuário`
Solicita uma cerimônia de casamento por 1000 Moedinhas. O usuário escolhido deve aceitar ou recusar o pedido.
## 👑 5. Perfil, Títulos & Cosméticos

### `/ranking`
Exibe o ranking de Moedinhas.
### `/perfil [usuario]` (ou `py!perfil [@usuario]`)
Exibe o cartão completo de aventureiro com seu companheiro Pymon, cônjuge, saldo, carreira e compêndio.
- **Títulos de Prestígio:** Compre e equipe títulos raros usando Feijões Mágicos 🌱.
- **Temas & Cores Visuais:** Desbloqueie temas de cores (*Ouro Real, Esmeralda Mística, Nebulosa Cósmica, Rosa Neon, Fogo Carmesim*) para personalizar o visual do seu perfil.
- **Editar Bio:** Defina uma frase de destaque personalizada.

### `/configeconomia`
Configura os valores mínimo e máximo do `diario`. Disponível para administradores.
---

### `/setareconomia usuario quantidade`
Define o saldo de Moedinhas de um usuário. Disponível para administradores.
## 🔮 6. Tarot & Interações Sociais

### `/resetareconomia usuario`
Zera as Moedinhas e o cooldown diário de um usuário. Disponível para administradores.
### `/tarot`
Realize uma tiragem mística diária com renderização visual em Canvas nativo de 78 cartas arcanas.

### `/agenda`
Mostra as próximas verificações e disparos automáticos do bot. Disponível para administradores.
### `/casal [@usuario]` (ou `py!casal`)
Calcula a afinidade amorosa entre dois membros com cartão ilustrado de corações.

### `/emojis`
Baixa a lista de emojis customizados do servidor em JSON. Disponível para administradores.
### `/casamento [usuario]` e `/divorcio`
Peça um usuário em casamento por 1.000 moedas ou encerre um relacionamento por 500 moedas.

### `/profissao profissao`
Escolhe uma profissão. A primeira escolha é gratuita; trocar custa 50 Moedinhas.

### `/trabalho`
Inicia um desafio de cinco palavras relacionadas à sua profissão. O trabalho pode ser feito a cada 3 horas e paga de 5 a 50 Moedinhas.

### `/divorcio`
Encerra seu casamento por 500 Moedinhas.

### `ku!adocao <pet>`
Adota um dos 24 pets disponíveis pelo custo base. Pets Shiny têm 5% de chance e valem 4x nas explorações. Trocar o pet custa mais 100 Moedinhas.

### `ku!petexplorar`
Envia seu pet para uma exploração a cada 12 horas. A recompensa usa o valor do pet e pode receber bônus de monstro ou redução por machucado.

### `/adocao pet`
Adota um dos 24 pets disponíveis pelo custo base. Pets Shiny têm 5% de chance e valem 4x nas explorações. Trocar o pet custa mais 100 Moedinhas.

### `/petexplorar`
Envia seu pet para uma exploração a cada 12 horas. A recompensa usa o valor do pet e pode receber bônus de monstro ou redução por machucado.

---

## 🎯 Como Registrar Slash Commands
## ⚙️ 7. Utilidades & Administração

1. Inicie o painel local: **http://localhost:3000**
2. Clique em **Register Slash**
3. Aguarde a mensagem de confirmação
4. Os slash commands estarão disponíveis no Discord após o registro
### `/convite` (ou `py!convite`)
Gera o link de convite oficial para adicionar a Pyxie a qualquer servidor com permissões mínimas seguras (sem exigir privilégios de Administrador).

> ⚠️ **Nota:** Se os slash commands não aparecerem imediatamente no Discord, é normal. Discord leva alguns segundos a alguns minutos para sincronizar.
### `/ping` e `/status`
Verifica a latência da conexão e o status operacional da Pyxie.

---
### `/boasvindas [#canal]` *(Admin)*
Define o canal de recepção para novos membros com embeds ilustrados.

## 📋 Configurações Disponíveis no Painel

### Economia
O intervalo do `daily` também fica salvo em `data/settings.json`. Os saldos e os horários do último resgate ficam em `data/economy.json`.

### Canal de Boas-vindas
Configure o canal para receber mensagens de boas-vindas. Aceita:
- ID do canal (ex: `123456789`)
- Menção do canal (ex: `#bem-vindos`)
- Link do Discord (ex: `https://discord.com/channels/...`)

---

## 🚀 Dicas

- Use slash commands (`/`) para uma experiência mais moderna
- Use comandos com prefixo (`ku!`) se preferir, ou se o bot tiver problemas com slash commands
- O prefixo é global, afeta todos os servidores
- O canal de boas-vindas é configurado por servidor

---

**Cringelândia** 💗 — Seu lugar de ser você
### `/configeconomia [min] [max]` *(Admin)*
Configura o intervalo de moedas diárias para o seu servidor.
