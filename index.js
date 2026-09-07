const readline = require('node:readline');
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const { acquireBotLock, releaseBotLock, getPrefix } = require('./src/utils/botUtils');
const { getWelcomeChannel, normalizeChannelValue } = require('./src/services/database');
const { commandsByName, slashCommands } = require('./src/commands');
const { DISCORD_TOKEN, STARTUP_CHANNEL_ID, STATUS_IMAGE_URL } = require('./src/config');
const { incrementCommand, incrementMessages, recordUniqueUser } = require('./src/services/logging');

// Protege o bot contra duas instâncias rodando ao mesmo tempo.
const lockAcquired = acquireBotLock();
if (!lockAcquired) {
  console.error('Outra instância do Kuromi já está em execução. Encerrando este processo...');
  process.exit(1);
}

const client = new Client({
  // Permissões mínimas para o bot funcionar com guildas, mensagens e membros.
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Envia uma mensagem de inicialização para o canal de alerta do servidor.
async function sendStartupAnnouncement() {
  const channel = await client.channels.fetch(STARTUP_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    console.warn(`Canal de startup não encontrado ou inválido: ${STARTUP_CHANNEL_ID}`);
    return;
  }

  const startupEmbed = new EmbedBuilder()
    .setColor('#E60067')
    .setTitle('✨ Kuromi conectado com sucesso!')
    .setDescription('O bot está online, monitorando o servidor e pronto para ajudar.')
    .addFields(
      { name: '🔗 Painel de Controle', value: 'Acesse: http://localhost:3000', inline: false },
      { name: '📍 Servidor', value: channel.guild?.name || 'Desconhecido', inline: true },
      { name: '✅ Status', value: 'Online e funcional', inline: true },
      { name: '📚 Próximos passos', value: 'Use `/help` para ver os comandos disponíveis ou acesse o painel para configurar o bot.', inline: false }
    )
    .setImage(STATUS_IMAGE_URL)
    .setTimestamp()
    .setFooter({ text: 'Kuromi • Bot oficial da Cringelândia' });

  await channel.send({ embeds: [startupEmbed] }).catch((error) => {
    console.error('Erro ao enviar aviso de inicialização:', error);
  });
}

client.once('ready', async () => {
  // Sinal de que o bot já conectou e está pronto para receber eventos.
  console.log(`Kuromi conectado como ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'monitorando e ajudando pessoas', type: ActivityType.Watching }],
    status: 'online',
  });

  await sendStartupAnnouncement();
});

// Mensagem de boas-vindas ao entrar no servidor.
client.on('guildMemberAdd', async (member) => {
  const configuredWelcomeChannelId = getWelcomeChannel(member.guild.id);

  const welcomeChannel =
    (configuredWelcomeChannelId && member.guild.channels.cache.get(configuredWelcomeChannelId)) ||
    member.guild.channels.cache.get(member.guild.systemChannelId) ||
    member.guild.channels.cache.find(
      (channel) =>
        channel.isTextBased() &&
        ['welcome', 'bem-vindos', 'entrada', 'chat-geral'].includes(channel.name)
    );

  const welcomeEmbed = new EmbedBuilder()
    .setColor('#8b5cf6')
    .setTitle('🎉 Bem-vindo(a) ao servidor!')
    .setDescription(`Olá ${member.user}, seja muito bem-vindo(a) ao **${member.guild.name}**!`)
    .addFields(
      {
        name: '📜 Regras',
        value: 'Leia as regras e respeite a comunidade antes de interagir.',
      },
      {
        name: '💬 Introdução',
        value: 'Apresente-se no canal de apresentação e aproveite a comunidade!',
      },
      {
        name: '✨ Status',
        value: `Você é o membro número **${member.guild.memberCount}**.`,
      }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setImage('https://cdn.discordapp.com/attachments/1533657882862686218/1541908904487690321/dhj7hfn-842bcc59-b41f-4ef3-888b-dbfc210f4a5c.gif?ex=6a9b2b92&is=6a99da12&hm=7a41318a2f477b04a295a5b209c43de9517cfa47ac6ecf15e351c045aa104714&')
    .setFooter({ text: 'A Cringelândia agradece sua chegada!' })
    .setTimestamp();

  try {
    if (welcomeChannel) {
      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem de boas-vindas:', error);
  }
});

// Procura o comando na pasta commands e mantém o index focado na infraestrutura.
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  incrementMessages();
  recordUniqueUser(message.author.id);

  const prefix = getPrefix();
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  const command = commandsByName.get(cmd);
  if (!command || typeof command.executePrefix !== 'function') return;

  incrementCommand();
  await command.executePrefix({ message, args, prefix });
});

// O registro compartilhado também encaminha cada slash command ao próprio arquivo.
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  incrementCommand();
  recordUniqueUser(interaction.user.id);

  const command = commandsByName.get(interaction.commandName);
  if (!command || typeof command.executeSlash !== 'function') {
    await interaction.editReply({ content: 'Esse comando ainda não está disponível.' });
    return;
  }

  await command.executeSlash({ interaction });
});

client.on('error', (error) => {
  console.error('Erro do cliente Discord:', error);
});

// Libera o lock ao encerrar o processo para permitir reinício limpo.

process.on('SIGINT', () => {
  releaseBotLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  releaseBotLock();
  process.exit(0);
});

process.on('exit', () => {
  releaseBotLock();
});

async function handleSendEmbedCommand(data) {
  const { channelId, title, description, color, fields } = data || {};
  try {
    const normalizedChannelId = normalizeChannelValue(channelId);
    const channel = await client.channels.fetch(normalizedChannelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      console.error(`[IPC] Canal inválido ou não encontrado para envio de embed: ${channelId}`);
      return;
    }

    let embedColor = '#E60067';
    if (color) {
      const cleanColor = String(color).replace('#', '').trim();
      if (/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
        embedColor = `#${cleanColor}`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(embedColor)
      .setTimestamp()
      .setFooter({ text: 'Kuromi • Bot oficial da Cringelândia' });

    if (description && String(description).trim()) {
      embed.setDescription(String(description).trim());
    }

    if (Array.isArray(fields) && fields.length > 0) {
      fields.forEach((f) => {
        if (f && f.name && f.value) {
          embed.addFields({
            name: String(f.name),
            value: String(f.value),
            inline: !!f.inline,
          });
        }
      });
    }

    await channel.send({ embeds: [embed] });
    console.log(`[IPC] Embed enviado com sucesso para o canal ${normalizedChannelId}`);
  } catch (error) {
    console.error('[IPC] Erro ao enviar embed via painel web:', error);
  }
}

if (process.stdin) {
  process.stdin.resume();
  if (typeof process.stdin.setEncoding === 'function') {
    process.stdin.setEncoding('utf8');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on('line', (line) => {
    try {
      const trimmed = line.trim();
      if (!trimmed) return;
      const data = JSON.parse(trimmed);
      if (data && data.type === 'SEND_EMBED') {
        handleSendEmbedCommand(data);
      }
    } catch (error) {
      // Ignora linhas que não sejam comandos JSON válidos
    }
  });
}

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('Falha ao conectar com o Discord:', error.message);
  releaseBotLock();
  process.exit(1);
});

module.exports = {
  client,
  slashCommands,
};
