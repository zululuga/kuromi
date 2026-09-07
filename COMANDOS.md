# 📚 Comandos da Kuromiga

## 🔧 Painel de Controle Local
Acesse em: **http://localhost:3000**

### Funções do Painel
- **Start**: Inicia o bot
- **Restart**: Reinicia o bot
- **Stop**: Para o bot
- **Register Slash**: Registra ou atualiza os comandos slash no Discord
- **Quit**: Para o bot e fecha

---

## ⚡ Comandos com Prefixo (Padrão: `ku!`)

Use qualquer um desses comandos digitando a mensagem no Discord:

### `ku!ping`
Responde com "pong!" para confirmar que o bot está online.
```
Uso: ku!ping
Resposta: pong! 🏓
```

### `ku!status`
Mostra o status do bot e informações do servidor.
```
Uso: ku!status
Resposta: Embed com status online
```

### `ku!ajuda`
Lista todos os comandos e funções disponíveis.
```
Uso: ku!ajuda [pagina]
Resposta: Embed com lista de comandos
```

A ajuda exibe até 10 comandos por página. Use `ku!ajuda 1` ou `/ajuda pagina:1` para escolher a página.

### `ku!boasvindas #canal`
Define o canal onde a mensagem de boas-vindas será enviada.
```
Uso: ku!boasvindas #bem-vindos
Resposta: Canal de boas-vindas configurado para #bem-vindos
```

### `ku!diario`
Resgata uma quantidade aleatória de Moedinhas. O resgate pode ser feito uma vez a cada 24 horas.

### `ku!carteira [@usuário]`
Exibe todos os saldos e a colocação de um usuário. As moedas exibidas são compartilhadas com o perfil.

### `ku!perfil [@usuário]`
Exibe o cônjuge, todos os saldos e a colocação de um usuário.

### `ku!casamento @usuário`
Solicita uma cerimônia de casamento por 1000 Moedinhas. O usuário escolhido deve aceitar ou recusar o pedido.

### `ku!ranking`
Exibe os usuários com mais Moedinhas e a sua colocação.

### `ku!configeconomia <mínimo> <máximo>`
Configura a faixa do comando `diario`. Disponível para administradores.

### `ku!setareconomia @usuário <quantidade>`
Define o saldo de Moedinhas de um usuário. Disponível para administradores.

### `ku!resetareconomia @usuário`
Zera as Moedinhas e o cooldown diário de um usuário. Disponível para administradores.

### `ku!profissao <profissão>`
Escolhe uma profissão. A primeira escolha é gratuita; trocar custa 50 Moedinhas.

### `ku!trabalho`
Inicia um desafio de cinco palavras relacionadas à sua profissão. O trabalho pode ser feito a cada 3 horas e paga de 5 a 50 Moedinhas.

### `ku!divorcio`
Encerra seu casamento por 500 Moedinhas.
```

---

## 💬 Comandos Slash (Recomendado)

Use os comandos digitando `/` no Discord:

### `/ping`
Responde com "pong!" para confirmar que o bot está online.
```
Uso: /ping
Resposta: pong! 🏓
```

### `/status`
Mostra o status do bot e informações do servidor.
```
Uso: /status
Resposta: Embed com status online
```

### `/ajuda`
Lista todos os comandos e funções disponíveis.
```
Uso: /ajuda [pagina]
Resposta: Embed com lista de comandos
```

### `/boasvindas #canal`
Define o canal onde a mensagem de boas-vindas será enviada.
```
Uso: /boasvindas #bem-vindos
Resposta: Canal de boas-vindas configurado para #bem-vindos
```

### `/diario`
Resgata uma quantidade aleatória de Moedinhas uma vez a cada 24 horas.

### `/carteira [usuário]`
Exibe todos os saldos e a colocação de um usuário. As moedas exibidas são compartilhadas com o perfil.

### `/perfil [usuário]`
Exibe o cônjuge, todos os saldos e a colocação de um usuário.

### `/casamento usuario:@usuário`
Solicita uma cerimônia de casamento por 1000 Moedinhas. O usuário escolhido deve aceitar ou recusar o pedido.

### `/ranking`
Exibe o ranking de Moedinhas.

### `/configeconomia`
Configura os valores mínimo e máximo do `diario`. Disponível para administradores.

### `/setareconomia usuario quantidade`
Define o saldo de Moedinhas de um usuário. Disponível para administradores.

### `/resetareconomia usuario`
Zera as Moedinhas e o cooldown diário de um usuário. Disponível para administradores.

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

1. Inicie o painel local: **http://localhost:3000**
2. Clique em **Register Slash**
3. Aguarde a mensagem de confirmação
4. Os slash commands estarão disponíveis no Discord após o registro

> ⚠️ **Nota:** Se os slash commands não aparecerem imediatamente no Discord, é normal. Discord leva alguns segundos a alguns minutos para sincronizar.

---

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

**Kuromiga** 💗 — sua amiga cringe da Cringelândia
