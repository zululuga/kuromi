const readline = require('node:readline');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { acquireBotLock, releaseBotLock, getPrefix } = require('./src/utils/botUtils');
const { getWelcomeChannel, normalizeChannelValue } = require('./src/services/database');
const { commandsByName, slashCommands } = require('./src/commands');
const marriageCommand = require('./src/commands/casamento');
const tarotCommand = require('./src/commands/tarot');
const {
  DISCORD_TOKEN,
  STARTUP_CHANNEL_ID,
  STATUS_IMAGE_URL,
  BUMP_GUIDE_CHANNEL_ID,
  BUMP_GUIDE_INTERVAL_MS,
  SERVER_REVIEW_URL,
  WELCOME_ROLE_ID,
  RULES_CHANNEL_ID,
  GUIDES_CHANNEL_ID,
  COLORS_CHANNEL_ID,
  TAROT_CHANNEL_ID,
  TAROT_LOG_CHANNEL_ID,
  TAROT_ROLE_ID,
} = require('./src/config');
const { incrementCommand, incrementMessages, recordUniqueUser } = require('./src/services/logging');
const { getBrasiliaDate, resetDailyDraws } = require('./src/services/tarot');

const welcomeHeartReactions = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '🩵', '🖤', '🤍', '🤎'];
const CRINGE_PHRASE_COOLDOWN_MS = 60 * 1000;
const cringePhraseCooldowns = new Map();

function getRandomWelcomeHeart() {
  return welcomeHeartReactions[Math.floor(Math.random() * welcomeHeartReactions.length)];
}

// Protege o bot contra duas instâncias rodando ao mesmo tempo.
const lockAcquired = acquireBotLock();
if (!lockAcquired) {
  console.error('Outra instância da Kuromiga já está em execução. Encerrando este processo...');
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
    .setTitle('✨ Kuromiga conectada com sucesso!')
    .setDescription('O bot está online, monitorando o servidor e pronto para ajudar.')
    .addFields(
      { name: '🔗 Painel de Controle', value: 'Acesse: http://localhost:3000', inline: false },
      { name: '📍 Servidor', value: channel.guild?.name || 'Desconhecido', inline: true },
      { name: '✅ Status', value: 'Online e funcional', inline: true },
      { name: '📚 Próximos passos', value: 'Use `/help` para ver os comandos disponíveis ou acesse o painel para configurar o bot.', inline: false }
    )
    .setImage(STATUS_IMAGE_URL)
    .setTimestamp()
    .setFooter({ text: 'Cringelândia • Seu lugar de ser você' });

  await channel.send({ embeds: [startupEmbed] }).catch((error) => {
    console.error('Erro ao enviar aviso de inicialização:', error);
  });
}

function buildBumpGuideEmbed() {
  return new EmbedBuilder()
    .setColor('#E60067')
    .setTitle('🚀 Como ajudar a Cringelândia')
    .setDescription(
      'Cada interação aumenta a visibilidade do servidor e ajuda novas pessoas a encontrarem a nossa comunidade. Escolha uma ou mais formas de apoiar:'
    )
    .addFields(
      {
        name: '📌 DISBOARD — `/bump`',
        value: 'Use o comando **/bump** quando o DISBOARD permitir. Depois, aguarde o cooldown indicado pelo bot para fazer outro bump.',
      },
      {
        name: '🐢 Canudinho — `/bump`',
        value: 'O Canudinho também pode registrar o bump do servidor. Execute **/bump** e siga a confirmação enviada pelo bot.',
      },
      {
        name: '💜 Discadia — `/bump`',
        value: 'No Discadia, use **/bump** quando estiver disponível. Cada bump ajuda a Cringelândia a subir na lista pública de servidores.',
      },
      {
        name: '🗳️ Top.gg — `/votar`',
        value: 'Use o comando **/votar** para receber o link oficial do Top.gg, abra a página e confirme seu voto. Normalmente, o voto pode ser repetido após o período indicado pela plataforma.',
      },
      {
        name: '⭐ Review no DISBOARD',
        value: 'Uma avaliação sincera também ajuda muito: conte como tem sido sua experiência na Cringelândia.',
      }
    )
    .setFooter({ text: 'Cringelândia • Seu lugar de ser você' })
    .setTimestamp();
}

function buildBumpGuideComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Deixar review')
        .setStyle(ButtonStyle.Link)
        .setURL(SERVER_REVIEW_URL),
      new ButtonBuilder()
        .setLabel('Abrir DISBOARD')
        .setStyle(ButtonStyle.Link)
        .setURL('https://disboard.org/pt-br/server/1453890868980482090')
    ),
  ];
}

async function postBumpGuide() {
  const channel = await client.channels.fetch(BUMP_GUIDE_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    console.warn(`Canal do guia de bump não encontrado ou inválido: ${BUMP_GUIDE_CHANNEL_ID}`);
    return;
  }

  const recentMessages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const lastGuide = recentMessages?.find(
    (message) =>
      message.author.id === client.user.id &&
      message.embeds.some((embed) => embed.title === '🚀 Como ajudar a Cringelândia')
  );

  if (lastGuide && Date.now() - lastGuide.createdTimestamp < BUMP_GUIDE_INTERVAL_MS) {
    return;
  }

  await channel.send({
    embeds: [buildBumpGuideEmbed()],
    components: buildBumpGuideComponents(),
    allowedMentions: { parse: [] },
  });
  console.log('Guia de bump publicado com sucesso.');
}

function startBumpGuideScheduler() {
  postBumpGuide().catch((error) => {
    console.error('Erro ao publicar o guia de bump:', error);
  });

  setInterval(() => {
    postBumpGuide().catch((error) => {
      console.error('Erro ao publicar o guia de bump:', error);
    });
  }, BUMP_GUIDE_INTERVAL_MS);
}

function buildTarotDailyEmbed() {
  return new EmbedBuilder()
    .setColor('#e60067')
    .setTitle("🌙 Luna's Kuromi Tarot")
    .setDescription('Uma carta por dia para iluminar seus caminhos. A leitura é privada e pode ser feita pelo botão ou por `/tarot`.')
    .setFooter({ text: 'Luna observa. Kuromi julga. As cartas respondem.' })
    .setTimestamp();
}

function buildTarotDailyComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tarot:draw')
        .setLabel('Tirar Tarot do Dia')
        .setStyle(ButtonStyle.Primary)
    ),
  ];
}

async function postTarotDailyAnnouncement(now = Date.now()) {
  resetDailyDraws(now);
  const channel = await client.channels.fetch(TAROT_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.warn(`Canal do Tarot não encontrado ou inválido: ${TAROT_CHANNEL_ID}`);
    return;
  }

  await channel.send({
    content: `<@&${TAROT_ROLE_ID}>`,
    embeds: [buildTarotDailyEmbed()],
    components: buildTarotDailyComponents(),
    allowedMentions: { roles: [TAROT_ROLE_ID] },
  });
}

function startTarotScheduler() {
  const currentCycle = getBrasiliaDate();
  const nextMidnightUtc = Date.parse(`${currentCycle}T03:00:00.000Z`) + 24 * 60 * 60 * 1000;
  const delay = Math.max(1000, nextMidnightUtc - Date.now());

  setTimeout(() => {
    postTarotDailyAnnouncement().catch((error) => console.error('Erro no anúncio diário do Tarot:', error));
    setInterval(() => {
      postTarotDailyAnnouncement().catch((error) => console.error('Erro no anúncio diário do Tarot:', error));
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

async function logTarotResult({ user, result }) {
  const channel = await client.channels.fetch(TAROT_LOG_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const prefix = result.paid ? 'ué... Que estranho... Jurava que tinha lido outra coisa...' : '';
  const embed = new EmbedBuilder()
    .setColor(result.paid ? '#7c3aed' : '#e60067')
    .setTitle('🌙 Registro de tiragem')
    .setDescription(`${prefix}${prefix ? '\n\n' : ''}<@${user.id}> tirou **${result.card.name}** (${result.orientation}).`)
    .setTimestamp();

  await channel.send({
    content: prefix || undefined,
    embeds: [embed],
    allowedMentions: { users: [] },
  });
}

async function handleCringePhrase(message) {
  if (!/\bviadinho\s+fofinho\b/i.test(message.content)) return false;

  const lastTriggeredAt = cringePhraseCooldowns.get(message.author.id) || 0;
  if (Date.now() - lastTriggeredAt < CRINGE_PHRASE_COOLDOWN_MS) {
    await message.react('🍅').catch(() => null);
    return true;
  }

  cringePhraseCooldowns.set(message.author.id, Date.now());

  await message.react('🌈').catch(() => null);
  await message.reply('https://klipy.com/gifs/gacha-life-gacha-boy');
  return true;
}

client.once('ready', async () => {
  // Sinal de que o bot já conectou e está pronto para receber eventos.
  console.log(`Kuromiga conectada como ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'Sendo cringe.', type: ActivityType.Watching }],
    status: 'online',
  });

  await sendStartupAnnouncement();
  startBumpGuideScheduler();
  startTarotScheduler();
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
    .setTitle('🎉 Uma nova pessoa chegou!')
    .setDescription(`Que bom ter você aqui, **${member.displayName}**! A Cringelândia fica mais acolhedora com a sua presença.`)
    .addFields(
      {
        name: '📜 Comece pelas regras',
        value: `Consulte <#${RULES_CHANNEL_ID}> para conhecer a casa e manter o ambiente seguro.`,
      },
      {
        name: '🧭 Explore o servidor',
        value: `Veja vantagens e tutoriais em <#${GUIDES_CHANNEL_ID}>.`,
      },
      {
        name: '🎨 Personalize sua experiência',
        value: `Confira as cores disponíveis em <#${COLORS_CHANNEL_ID}>.`,
      }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setImage('https://cdn.discordapp.com/attachments/1533657882862686218/1541908904487690321/dhj7hfn-842bcc59-b41f-4ef3-888b-dbfc210f4a5c.gif?ex=6a9b2b92&is=6a99da12&hm=7a41318a2f477b04a295a5b209c43de9517cfa47ac6ecf15e351c045aa104714&')
    .setFooter({ text: 'Cringelândia • Seu lugar de ser você • Acolhimento em primeiro lugar' })
    .setTimestamp();

  try {
    if (welcomeChannel) {
      const welcomeMessage = await welcomeChannel.send({
        content: `${member} chegou! <@&${WELCOME_ROLE_ID}>, recebam nossa nova pessoa com carinho 💗`,
        embeds: [welcomeEmbed],
        allowedMentions: {
          users: [member.id],
          roles: [WELCOME_ROLE_ID],
        },
      });

      await welcomeMessage.react(getRandomWelcomeHeart()).catch((error) => {
        console.warn('Não foi possível reagir à mensagem de boas-vindas:', error.message);
      });
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

  if (await handleCringePhrase(message)) {
    return;
  }

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
  if (tarotCommand.isTarotButton(interaction)) {
    incrementCommand();
    recordUniqueUser(interaction.user.id);
    await tarotCommand.executeButton({ interaction, logTarotResult });
    return;
  }

  if (interaction.isButton() && interaction.customId === 'tarot:draw') {
    incrementCommand();
    recordUniqueUser(interaction.user.id);
    await interaction.deferReply({ ephemeral: true });
    await tarotCommand.executeSlash({ interaction, logTarotResult });
    return;
  }

  if (marriageCommand.isMarriageButton(interaction)) {
    incrementCommand();
    recordUniqueUser(interaction.user.id);
    await marriageCommand.executeButton({ interaction });
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  incrementCommand();
  recordUniqueUser(interaction.user.id);

  const command = commandsByName.get(interaction.commandName);
  await interaction.deferReply({ ephemeral: command?.name === 'tarot' });
  if (!command || typeof command.executeSlash !== 'function') {
    await interaction.editReply({ content: 'Esse comando ainda não está disponível.' });
    return;
  }

  await command.executeSlash({ interaction, logTarotResult });
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
      .setFooter({ text: 'Cringelândia • Seu lugar de ser você' });

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
