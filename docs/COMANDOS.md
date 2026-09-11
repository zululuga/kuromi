# 📚 Manual Oficial de Comandos — Pyxie

A **Pyxie** suporta comandos modernos via **Slash Commands (`/`)** e comandos tradicionais de texto com o prefixo **`py!`**.

---

## 🧭 Sumário de Módulos
1. [🐾 Pymons & Tamagotchi](#-1-pymons--tamagotchi)
2. [⚔️ Combates, Duelos & World Boss](#️-2-combates-duelos--world-boss)
3. [🧭 Exploração & Dungeons](#-3-exploração--dungeons)
4. [🪙 Economia, Profissões & Mercado](#-4-economia-profissões--mercado)
5. [👑 Perfil, Títulos & Cosméticos](#-5-perfil-títulos--cosméticos)
6. [🔮 Tarot & Interações Sociais](#-6-tarot--interações-sociais)
7. [⚙️ Utilidades & Administração](#-7-utilidades--administração)

---

## 🐾 1. Pymons & Tamagotchi

### `/pymons` (ou `py!pymons`)
Abre o painel central do seu Pymon. Permite alimentar, fazer carinho, colocar para dormir, gerenciar a chocadeira de ovos e acessar a loja de itens.

### `/dex` (ou `py!dex`)
Exibe o compêndio completo de todas as 10 espécies de Pymons. Criaturas já descobertas aparecem coloridas com dados de raridade e elemento; espécies ainda não possuídas ficam em silhueta misteriosa. Permite inspecionar versões normais, Shiny e ALPHA.

### `/adocao [especie]` (ou `py!adocao [especie]`)
Adota o seu primeiro Pymon inicial (**Cinna**, **Bonorka** ou **Pomcorin**).

---

## ⚔️ 2. Combates, Duelos & World Boss

### `/duelo [oponente] [aposta]` (ou `py!duelo @usuario [aposta]`)
Desafia outro treinador para uma batalha RPG por turnos na arena.
- **Limite:** Até 3 duelos por dia por jogador.
- **Aposta:** Opcional (0 a 50.000 moedas).
- **Atributos:** ATK, DEF e VEL influenciam no dano e na chance de esquiva.
- **Vantagens Elementais:** Causam +25% de dano e reduzem em 20% o dano recebido.

### `/boss [subcomando]` (ou `py!boss`)
Enfrente o **World Boss Semanal ALPHA** em cooperação com todos os servidores do Discord.
- `/boss status`: Mostra a barra de vida, elemento, aura avermelhada e ranking de dano atual.
- `/boss atacar`: Desfere um ataque poderoso com seu Pymon ativo (Cooldown: 10 min).
- `/boss ranking`: Lista os maiores causadores de dano contra o titã.
- 🎁 **Recompensa do MVP:** O jogador #1 em dano recebe o próprio **Pymon versão ALPHA (🔴 Aura Avermelhada)** + 3 🌱 Feijões Mágicos + 3.000 🪙.

---

## 🧭 3. Exploração & Dungeons

### `/petexplorar` (ou `py!petexplorar`)
Inicia uma masmorra procedural 2D onde você controla seu Pymon usando botões direcionais (D-Pad) em busca de baús de tesouro, combates contra monstros e ovos raros.

### `/expedicao [duracao]` (ou `py!expedicao [2|4|8]`)
Envia seu Pymon em uma expedição passiva (AFK) enquanto você estuda, trabalha ou joga.
- 🟢 **2 Horas:** 150-300 XP • 200-400 🪙 • Comida
- 🟡 **4 Horas:** 400-700 XP • 500-900 🪙 • Poção + 15% Chance de Ovo
- 🟣 **8 Horas:** 900-1600 XP • 1200-2200 🪙 • Banquete + 10% Feijão 🌱 + 25% Ovo Raro 🥚✨

---

## 🪙 4. Economia, Profissões & Mercado

### `/diario` (ou `py!diario`)
Resgata sua recompensa diária em Moedinhas (com 1% de chance de obter 1 Feijão Mágico 🌱).
- **Bônus Patrocinado (+50%):** Clique no botão após o resgate e aguarde alguns segundos na página do anúncio para receber +50% de moedas automaticamente em sua conta via LootLabs.

### `/carteira [usuario]` (ou `py!carteira [@usuario]`)
Consulta seus saldos de Moedinhas, Feijões Mágicos e posição no ranking de riqueza.

### `/ranking [categoria]` (ou `py!ranking [coins|beans|pets|dex]`)
Exibe a classificação global e do servidor nas categorias:
- 🪙 **Moedas:** Os magnatas mais ricos.
- 🌱 **Feijões:** Os maiores acumuladores de Feijões Mágicos.
- 🐾 **Pets:** Os Pymons de nível mais alto.
- 📖 **Dex:** Os exploradores com mais espécies registradas.

### `/trocar [usuario] [tipo] [identificador] [quantidade]` (ou `py!trocar @usuario item|moedas|pet`)
Inicia uma proposta de troca segura e bilateral de itens, moedas ou Pymons com outro membro.
- **Segurança:** Ambos os jogadores devem clicar em "Confirmar Troca" para a transferência ocorrer.
- **Cooldown:** 30 minutos após cada troca concluída.

### `/profissao [carreira]` (ou `py!profissao [carreira]`)
Escolha sua vocação (Programador, Alquimista, Músico, Explorador, etc.).

### `/trabalho` (ou `py!trabalho`)
Mini-game interativo de digitação ou desafios relacionados à sua carreira (a cada 3 horas).

### `/loja`, `/comprar [item]`, `/vender [item]`, `/inventario`
Gerencie seus itens consumíveis, poções, pedras mágicas, sementes e ovos.

---

## 👑 5. Perfil, Títulos & Cosméticos

### `/perfil [usuario]` (ou `py!perfil [@usuario]`)
Exibe o cartão completo de aventureiro com seu companheiro Pymon, cônjuge, saldo, carreira e compêndio.
- **Títulos de Prestígio:** Compre e equipe títulos raros usando Feijões Mágicos 🌱.
- **Temas & Cores Visuais:** Desbloqueie temas de cores (*Ouro Real, Esmeralda Mística, Nebulosa Cósmica, Rosa Neon, Fogo Carmesim*) para personalizar o visual do seu perfil.
- **Editar Bio:** Defina uma frase de destaque personalizada.

---

## 🔮 6. Tarot & Interações Sociais

### `/tarot`
Realize uma tiragem mística diária com renderização visual em Canvas nativo de 78 cartas arcanas.

### `/casal [@usuario]` (ou `py!casal`)
Calcula a afinidade amorosa entre dois membros com cartão ilustrado de corações.

### `/casamento [usuario]` e `/divorcio`
Peça um usuário em casamento por 1.000 moedas ou encerre um relacionamento por 500 moedas.

---

## ⚙️ 7. Utilidades & Administração

### `/convite` (ou `py!convite`)
Gera o link de convite oficial para adicionar a Pyxie a qualquer servidor com permissões mínimas seguras (sem exigir privilégios de Administrador).

### `/ping` e `/status`
Verifica a latência da conexão e o status operacional da Pyxie.

### `/boasvindas [#canal]` *(Admin)*
Define o canal de recepção para novos membros com embeds ilustrados.

### `/configeconomia [min] [max]` *(Admin)*
Configura o intervalo de moedas diárias para o seu servidor.
