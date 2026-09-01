const readline = require('node:readline');
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, SlashCommandBuilder } = require('discord.js');
const { acquireBotLock, releaseBotLock, getCommandList, getPrefix, setPrefix } = require('./src/utils/botUtils');
const { getWelcomeChannel, setWelcomeChannel, normalizeChannelValue } = require('./src/services/database');
const { buildHelpEmbed, buildPrefixStatusEmbed } = require('./src/commands/commandHelpers');
const { runShipPrefix, runShipInteraction } = require('./src/commands/ship');
const { DISCORD_TOKEN, STARTUP_CHANNEL_ID } = require('./src/config');
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
    .setDescription('O bot está online e pronto para interagir com o servidor.')
    .addFields(
      { name: '🔗 Painel de Controle', value: 'Acesse: http://localhost:3000', inline: false },
      { name: '📍 Servidor', value: channel.guild?.name || 'Desconhecido', inline: true },
      { name: '✅ Status', value: 'Online e funcional', inline: true },
      { name: '📚 Próximos passos', value: 'Use `/help` para ver os comandos disponíveis ou acesse o painel para configurar o bot.', inline: false }
    )
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
    activities: [{ name: 'Ajudando o Cringe (tentando)', type: ActivityType.Watching }],
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
    .setImage('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80')
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

// Lista de comandos que serão registrados no Discord.
const slashCommands = [
  new SlashCommandBuilder().setName('ping').setDescription('Responde com pong para confirmar que o bot está vivo.').toJSON(),
  new SlashCommandBuilder().setName('status').setDescription('Mostra o status do bot e informações do servidor.').toJSON(),
  new SlashCommandBuilder().setName('help').setDescription('Mostra a lista de comandos e funções do bot.').toJSON(),
  new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Altera o prefixo do bot para outro valor.')
    .addStringOption((option) =>
      option.setName('valor').setDescription('Novo prefixo do bot').setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Define o canal onde a mensagem de boas-vindas será enviada.')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal de texto para as boas-vindas')
        .addChannelTypes([0])
        .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder().setName('sixseven').setDescription('Envia a imagem do sixseven no chat.').toJSON(),
  new SlashCommandBuilder().setName('ship').setDescription('Sorteia dois membros aleatórios e calcula a porcentagem de amor entre eles.').toJSON(),
];

// Processa comandos com prefixo em mensagens de texto.
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  incrementMessages();
  recordUniqueUser(message.author.id);

  const prefix = getPrefix();
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  if (cmd === 'ping') {
    incrementCommand();
    await message.reply('pong! 🏓');
    return;
  }

  if (cmd === 'status') {
    const statusEmbed = new EmbedBuilder()
      .setColor('#22c55e')
      .setTitle('✅ Bot online')
      .setDescription('Estou funcionando corretamente e pronto para ajudar!')
      .addFields(
        { name: 'Servidor', value: message.guild?.name || 'N/A' },
        { name: 'Usuário', value: message.author.tag }
      )
      .setTimestamp();

    await message.reply({ embeds: [statusEmbed] });
    return;
  }

  if (cmd === 'help') {
    await message.reply({ embeds: [buildHelpEmbed()] });
    return;
  }

  if (cmd === 'prefix') {
    const newValue = args.join(' ').trim();
    const newPrefix = setPrefix(newValue || prefix);

    await message.reply({
      embeds: [buildPrefixStatusEmbed(message.author.tag, newPrefix)],
    });
    return;
  }

  if (cmd === 'setwelcome') {
    const channel = message.mentions.channels.first() || message.guild?.channels.cache.get(args[0]);

    if (!channel || !channel.isTextBased()) {
      await message.reply('❌ Você precisa indicar um canal de texto válido. Use: `' + prefix + 'setwelcome #canal`');
      return;
    }

    setWelcomeChannel(message.guildId, channel.id);

    await message.reply({
      content: `✅ Canal de boas-vindas configurado para ${channel}.`,
    });
    return;
  }

  if (cmd === 'sixseven') {
    incrementCommand();
    await message.channel.send('https://cdn.discordapp.com/attachments/1457245624792780883/1528147588686020781/1499544593182490777.webp?ex=6a973fd8&is=6a95ee58&hm=25123c3facc397d18cccb75418decb8d17a7b0b1bdeb8f9e8decd57b74fca6d4&');
    return;
  }

  if (cmd === 'ship') {
    incrementCommand();
    await runShipPrefix(message);
    return;
  }
});

// Centraliza a lógica dos slash commands e respostas.
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  incrementCommand();
  recordUniqueUser(interaction.user.id);

  const { commandName, options } = interaction;

  if (commandName === 'ping') {
    await interaction.reply({ content: 'pong! 🏓' });
    return;
  }

  if (commandName === 'status') {
    const statusEmbed = new EmbedBuilder()
      .setColor('#22c55e')
      .setTitle('✅ Bot online')
      .setDescription('Estou funcionando corretamente e pronto para ajudar!')
      .addFields(
        { name: 'Servidor', value: interaction.guild?.name || 'N/A' },
        { name: 'Usuário', value: interaction.user.tag }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [statusEmbed] });
    return;
  }

  if (commandName === 'help') {
    await interaction.reply({ embeds: [buildHelpEmbed()] });
    return;
  }

  if (commandName === 'prefix') {
    const value = options.getString('valor');
    const newPrefix = setPrefix(value || getPrefix());

    await interaction.reply({
      embeds: [buildPrefixStatusEmbed(interaction.user.tag, newPrefix)],
    });
    return;
  }

  if (commandName === 'setwelcome') {
    const channel = options.getChannel('canal');

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: 'Você precisa indicar um canal de texto válido.', ephemeral: true });
      return;
    }

    setWelcomeChannel(interaction.guildId, channel.id);

    await interaction.reply({
      content: `Canal de boas-vindas configurado para ${channel}.`,
    });
    return;
  }

  if (commandName === 'sixseven') {
    await interaction.reply('https://cdn.discordapp.com/attachments/1457245624792780883/1528147588686020781/1499544593182490777.webp?ex=6a973fd8&is=6a95ee58&hm=25123c3facc397d18cccb75418decb8d17a7b0b1bdeb8f9e8decd57b74fca6d4&');
    return;
  }

  if (commandName === 'ship') {
    await runShipInteraction(interaction);
    return;
  }
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
