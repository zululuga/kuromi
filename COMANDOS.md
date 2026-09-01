# 📚 Comandos do Kuromi

## 🔧 Painel de Controle Local
Acesse em: **http://localhost:3000**

### Funções do Painel
- **Start**: Inicia o bot
- **Restart**: Reinicia o bot
- **Stop**: Para o bot
- **Register Slash**: Registra ou atualiza os comandos slash no Discord
- **Quit**: Para o bot e fecha

---

## ⚡ Comandos com Prefixo (Padrão: `!`)

Use qualquer um desses comandos digitando a mensagem no Discord:

### `!ping`
Responde com "pong!" para confirmar que o bot está online.
```
Uso: !ping
Resposta: pong! 🏓
```

### `!status`
Mostra o status do bot e informações do servidor.
```
Uso: !status
Resposta: Embed com status online
```

### `!help`
Lista todos os comandos e funções disponíveis.
```
Uso: !help
Resposta: Embed com lista de comandos
```

### `!prefix [novo]`
Altera o prefixo do bot.
```
Uso: !prefix ?
Resposta: Prefixo alterado para ?
Depois use: ?ping, ?status, etc.
```

### `!setwelcome #canal`
Define o canal onde a mensagem de boas-vindas será enviada.
```
Uso: !setwelcome #bem-vindos
Resposta: Canal de boas-vindas configurado para #bem-vindos
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

### `/help`
Lista todos os comandos e funções disponíveis.
```
Uso: /help
Resposta: Embed com lista de comandos
```

### `/prefix [valor]`
Altera o prefixo do bot.
```
Uso: /prefix ?
Resposta: Prefixo alterado para ?
Depois use: ?ping, ?status, etc.
```

### `/setwelcome #canal`
Define o canal onde a mensagem de boas-vindas será enviada.
```
Uso: /setwelcome #bem-vindos
Resposta: Canal de boas-vindas configurado para #bem-vindos
```

---

## 🎯 Como Registrar Slash Commands

1. Inicie o painel local: **http://localhost:3000**
2. Clique em **Register Slash**
3. Aguarde a mensagem de confirmação
4. Os slash commands estarão disponíveis no Discord após o registro

> ⚠️ **Nota:** Se os slash commands não aparecerem imediatamente no Discord, é normal. Discord leva alguns segundos a alguns minutos para sincronizar.

---

## 📋 Configurações Disponíveis no Painel

### Prefixo
Altere o prefixo do bot na seção de configuração (padrão: `!`)

### Canal de Boas-vindas
Configure o canal para receber mensagens de boas-vindas. Aceita:
- ID do canal (ex: `123456789`)
- Menção do canal (ex: `#bem-vindos`)
- Link do Discord (ex: `https://discord.com/channels/...`)

---

## 🚀 Dicas

- Use slash commands (`/`) para uma experiência mais moderna
- Use comandos com prefixo (`!`) se preferir, ou se o bot tiver problemas com slash commands
- O prefixo é global, afeta todos os servidores
- O canal de boas-vindas é configurado por servidor

---

**Kuromi** 💗 — Bot oficial da Cringelândia
