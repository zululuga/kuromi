# 📚 Manual Oficial de Comandos — Pyxie

A **Pyxie** suporta comandos modernos via **Slash Commands (`/`)** e comandos tradicionais de texto com o prefixo **`py!`** (ou **`ku!`**).

---

## 🧭 Sumário de Módulos
1. [🐾 Pymons, Tamagotchi & Masmorras](#-1-pymons-tamagotchi--masmorras)
2. [🪙 Economia, Lojinha & Profissões](#-2-economia-lojinha--profissões)
3. [🔮 Tarot, Amor & Social](#-3-tarot-amor--social)
4. [👑 Perfil, Títulos & Cosméticos](#-4-perfil-títulos--cosméticos)
5. [⚙️ Utilidades & Administração](#-5-utilidades--administração)

---

## 🐾 1. Pymons, Tamagotchi & Masmorras

### `/py-pymons` (ou `py!pymons`)
Abre o painel central Tamagotchi do seu Pymon ativo. Permite:
- **Cuidar:** Alimentar, dar carinho, colocar para dormir e recuperar energia.
- **Chocadeira:** Chocar ovos em ninhos temporais com cálculo delta-time.
- **Mochila & Loja:** Utilizar itens consumíveis, rações e poções diretamente no pet.
- **Subcomandos:** `/py-pymons painel` e `/py-pymons renomear [novo_nome]`.

### `/py-dex` (ou `py!dex`)
Exibe o compêndio completo de todas as 10 espécies oficiais de Pymons. Criaturas já descobertas aparecem coloridas com dados de raridade e elemento; espécies ainda não possuídas ficam em silhueta misteriosa. Permite inspecionar versões normais, Shiny e ALPHA.

### `/py-explorar [zona]` (ou `py!explorar`)
Inicia uma expedição em masmorras procedurais 2D onde você controla seu Pymon usando botões direcionais (D-Pad) em busca de baús de tesouro, combates contra monstros e ovos raros.

### `/py-expedicao [duracao]` (ou `py!expedicao [2|4|8]`)
Envia seu Pymon em uma expedição passiva (AFK) enquanto você estuda, trabalha ou joga:
- 🟢 **2 Horas:** 150-300 XP • 200-400 🪙 • Comida
- 🟡 **4 Horas:** 400-700 XP • 500-900 🪙 • Poção + 15% Chance de Ovo
- 🟣 **8 Horas:** 900-1600 XP • 1200-2200 🪙 • Banquete + 10% Feijão 🌱 + 25% Ovo Raro 🥚✨

### `/py-duelo [oponente] [aposta]` (ou `py!duelo @usuario [aposta]`)
Desafia outro treinador para uma batalha RPG por turnos na arena:
- **Limite:** Até 3 duelos por dia por jogador.
- **Aposta:** Opcional (0 a 50.000 moedas).
- **Atributos:** ATK, DEF e VEL influenciam no dano e na chance de esquiva.
- **Vantagens Elementais:** Causam +25% de dano e reduzem em 20% o dano recebido.

### `/py-boss [subcomando]` (ou `py!boss`)
Enfrente o **World Boss Semanal ALPHA** em cooperação com todos os servidores do Discord:
- `/py-boss status`: Mostra a barra de vida, elemento, aura avermelhada e ranking de dano atual.
- `/py-boss atacar`: Desfere um ataque poderoso com seu Pymon ativo (Cooldown: 10 min).
- `/py-boss ranking`: Lista os maiores causadores de dano contra o titã.
- 🎁 **Recompensa do MVP:** O jogador #1 em dano recebe o próprio **Pymon versão ALPHA (🔴 Aura Avermelhada)** + 3 🌱 Feijões Mágicos + 3.000 🪙.

---

##  2. Economia, Lojinha & Profissões

### `/py-diario` (ou `py!diario`)
Resgata sua recompensa diária em Moedinhas (com 1% de chance de obter 1 Feijão Mágico 🌱).
- Inclui botão direto para votar na Pyxie no Top.gg e dobrar seus bônus nos fins de semana!

### `/py-carteira [usuario]` (ou `py!carteira [@usuario]`)
Consulta seus saldos de Moedinhas, Feijões Mágicos e sua posição no ranking de riqueza.

### `/py-ranking [categoria]` (ou `py!ranking`)
Exibe a classificação global e do servidor nas categorias de Moedas, Feijões Mágicos e Nível de Pymons.

### `/py-loja`, `/py-comprar [item]`, `/py-vender [item]`, `/py-inventario`, `/py-usar [item]`
Gerencie seu inventário de itens, compre rações e poções na loja, venda itens coletados em dungeons ou consuma itens no seu Pymon ativo.

### `/py-trocar [usuario] [tipo] [identificador] [quantidade]` (ou `py!trocar @usuario`)
Inicia uma proposta de troca segura e bilateral de itens, moedas ou Pymons com outro membro:
- **Segurança:** Ambos os jogadores devem clicar em "Confirmar Troca" para a transferência ocorrer.
- **Cooldown:** 30 minutos após cada troca concluída.

### `/py-profissao [profissao]` (ou `py!profissao`)
Escolha sua vocação (Programador, Alquimista, Músico, Explorador, Cozinheiro, etc.). A primeira escolha é gratuita; trocar custa 50 Moedinhas.

### `/py-trabalho` (ou `py!trabalho`)
Mini-game interativo de decisões técnicas relacionadas à sua carreira (a cada 3 horas), com remuneração em Moedinhas e 2% de chance de bônus em Feijão Mágico 🌱.

### `/py-votar` (ou `py!votar`)
Exibe o link oficial de votação no Top.gg para resgatar Moedinhas gratuitas, Rações e XP a cada 12 horas (recompensas em dobro no fim de semana).

---

##  3. Tarot, Amor & Social

### `/py-tarot` (ou `py!tarot`)
Realize uma tiragem mística diária privada com renderização visual nativa em Canvas de 78 cartas arcanas (Maiores e Menores), com interpretações diretas e invertidas.

### `/py-casal [usuario1] [usuario2]` (ou `py!casal`)
Calcula a afinidade amorosa entre dois membros com cartão ilustrado em tempo real.

### `/py-casamento [usuario]` e `/py-divorcio`
Peça um usuário em casamento por 1.000 moedas com consentimento mútuo, ou encerre um relacionamento por 500 moedas.

### `/py-sixseven` (ou `py!sixseven`)
Mini-game casual da comunidade.

---

## 👑 4. Perfil, Títulos & Cosméticos

### `/py-perfil [usuario]` (ou `py!perfil [@usuario]`)
Exibe o cartão completo de aventureiro com seu companheiro Pymon, cônjuge, saldos, carreira e compêndio:
- **Títulos de Prestígio:** Compre e equipe títulos raros usando Feijões Mágicos 🌱.
- **Temas & Cores Visuais:** Desbloqueie temas de cores (*Ouro Real, Esmeralda Mística, Nebulosa Cósmica, Rosa Neon, Fogo Carmesim*).

### `/py-idioma [idioma]` (ou `py!idioma [en|pt]`)
Altera o idioma de exibição do bot para o servidor atual (Inglês ou Português).

---

## ⚙️ 5. Utilidades & Administração

### `/py-ping` e `/py-status`
Verifica a latência da conexão e o status operacional da Pyxie.

### `/py-ajuda [modulo]`
Menu interativo de ajuda com navegação temática por botões e menus de seleção.

### `/py-convite` (ou `py!convite`)
Gera o link de convite oficial para adicionar a Pyxie a qualquer servidor com permissões mínimas seguras.

### `/py-boasvindas [#canal]` *(Admin)*
Define o canal onde as mensagens de boas-vindas ilustradas serão enviadas.

### `/py-configeconomia [min] [max]` *(Admin)*
Configura o intervalo de moedas do comando `/py-diario` para o seu servidor.

### `/py-setareconomia [usuario] [quantidade]` *(Admin)*
Define manualmente o saldo de moedas de um usuário.

### `/py-resetareconomia [usuario]` *(Admin)*
Zera as moedas e o cooldown diário de um usuário.

### `/py-agenda` *(Admin)*
Exibe as próximas tarefas agendadas e automações em execução.

### `/py-emojis` *(Admin)*
Exporta um catálogo em JSON com todos os emojis customizados do servidor.
