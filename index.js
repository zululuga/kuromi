const readline = require('node:readline');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  Options,
} = require('discord.js');
const { acquireBotLock, releaseBotLock, getPrefix } = require('./src/utils/botUtils');
const { getWelcomeChannel, normalizeChannelValue } = require('./src/services/database');
const { commandsByName, slashCommands } = require('./src/commands');
const marriageCommand = require('./src/commands/casamento');
const tarotCommand = require('./src/commands/tarot');
const helpCommand = require('./src/commands/help');
const shopCommand = require('./src/commands/loja');
const inventoryCommand = require('./src/commands/inventario');
const petCommand = require('./src/commands/pet');
const adoptionCommand = require('./src/commands/adocao');
const dungeonCommand = require('./src/commands/petexplorar');
const duelCommand = require('./src/commands/petduelo');
const dexCommand = require('./src/commands/dex');
const profileCommand = require('./src/commands/perfil');
const workCommand = require('./src/commands/trabalho');
const { syncApplicationEmojis } = require('./src/utils/appEmojis');
const { registerAutomation, updateAutomation } = require('./src/services/automationSchedule');
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
  KUROMI_STARTUP_EMOJI,
} = require('./src/config');
const { incrementCommand, incrementMessages, recordUniqueUser, flushSync } = require('./src/services/logging');
const { flushInventorySync } = require('./src/services/inventory');
const { flushPetsSync } = require('./src/services/pets');
const { getBrasiliaDate, resetDailyDraws } = require('./src/services/tarot');
const { getAnimatedEmoji } = require('./src/utils/serverEmojis');

const welcomeHeartReactions = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '🩵', '🖤', '🤍', '🤎'];
const CRINGE_PHRASE_COOLDOWN_MS = 60 * 1000;
const cringePhraseCooldowns = new Map();

function getRandomWelcomeHeart() {
  return welcomeHeartReactions[Math.floor(Math.random() * welcomeHeartReactions.length)];
}

// Protege o bot contra duas instâncias rodando ao mesmo tempo.
const lockAcquired = acquireBotLock();
if (!lockAcquired) {
  console.error('Outra instância de Pyxie já está em execução. Ela não divide o palco. Encerrando este processo...');
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
  // Otimização severa de memória para ambientes restritos (GCP e2-micro 1GB RAM)
  makeCache: Options.cacheWithLimits({
    MessageManager: 25, // Mantém apenas 25 mensagens recentes por canal
    StageInstanceManager: 0,
    VoiceStateManager: 0,
    AutoModerationRuleManager: 0,
    GuildScheduledEventManager: 0,
    ThreadMemberManager: 0,
    PresenceManager: 0,
    ReactionManager: 0,
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: {
      interval: 3600, // Limpeza a cada 1 hora
      lifetime: 1800, // Remove mensagens mais antigas que 30 min da RAM
    },
    users: {
      interval: 3600,
      filter: () => (user) => user.id !== client.user?.id,
    },
  },
  rest: {
    timeout: 20000,
    retries: 3,
  },
});

// Envia uma mensagem de inicialização para o canal de alerta do servidor.
async function sendStartupAnnouncement() {
  const channel = await client.channels.fetch(STARTUP_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    console.warn(`Canal de startup não encontrado ou inválido: ${STARTUP_CHANNEL_ID}`);
    return;
  }

  const startupEmbed = new EmbedBuilder()
    .setColor('#5E2B8C')
    .setTitle(`${KUROMI_STARTUP_EMOJI}  ✦  Pyxie entrou em cena`)
    .setDescription('Estou online, monitorando o reino encantado e pronta para aprontar travessuras. Não faça essa cara; eu sei que você sentiu minha falta.')
    .addFields(
      { name: '🔗 Painel de Controle', value: 'Acesse: http://localhost:3000', inline: false },
      { name: '📍 Servidor', value: channel.guild?.name || 'Desconhecido', inline: true },
      { name: '✅ Status', value: 'Online e funcional', inline: true },
      { name: '📚 Próximos passos', value: 'Use `/pet` ou `/ajuda` para ver os mascotes e comandos disponíveis. Leia direito.', inline: false }
    )
    .setImage(STATUS_IMAGE_URL)
    .setTimestamp()
    .setFooter({ text: 'Reino Encantado • Pyxie supervisiona • Não transforme isso em bagunça' });

  await channel.send({
    embeds: [startupEmbed],
    flags: [MessageFlags.SuppressNotifications],
  }).catch((error) => {
    console.error('Erro ao enviar aviso de inicialização:', error);
  });
}

function buildBumpGuideEmbed(guild) {
  return new EmbedBuilder()
    .setColor('#E60067')
    .setTitle(`${getAnimatedEmoji(guild, ['rocket', 'boost', 'star'], '🚀')}  ✦  Como ajudar a Cringelândia`)
    .setDescription(
      'Cada interação aumenta a visibilidade do servidor e ajuda novas pessoas a encontrarem a nossa comunidade. Escolha uma forma de ajudar. Eu estou agradecendo em silêncio, então aproveite:'
    )
    .addFields(
      {
        name: '📌 DISBOARD — `/bump`',
        value: 'Use **/bump** quando o DISBOARD permitir. Depois, aguarde o cooldown. Sim, até divulgar a casa exige paciência.',
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
        value: 'Uma avaliação sincera também ajuda muito. Diga como tem sido sua experiência na Cringelândia; elogios são aceitos, mas não subam à cabeça.',
      }
    )
    .setFooter({ text: 'Cringelândia • Kuromi agradece, mas negará se você perguntar' })
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
      message.embeds.some((embed) => embed.title?.includes('Como ajudar a Cringelândia'))
  );

  if (lastGuide && Date.now() - lastGuide.createdTimestamp < BUMP_GUIDE_INTERVAL_MS) {
    return;
  }

  await channel.send({
    embeds: [buildBumpGuideEmbed(channel.guild)],
    components: buildBumpGuideComponents(),
    allowedMentions: { parse: [] },
  });
  console.log('Guia de bump publicado com sucesso.');
}

function startBumpGuideScheduler() {
  registerAutomation({
    id: 'bump-guide',
    emoji: '🚀',
    name: 'Guia de apoio / bump',
    action: 'verificação',
    nextAt: Date.now() + BUMP_GUIDE_INTERVAL_MS,
    channelId: BUMP_GUIDE_CHANNEL_ID,
    frequency: 'a cada 12 horas',
  });

  postBumpGuide().catch((error) => {
    console.error('Erro ao publicar o guia de bump:', error);
  });

  setInterval(() => {
    updateAutomation('bump-guide', { nextAt: Date.now() + BUMP_GUIDE_INTERVAL_MS });
    postBumpGuide().catch((error) => {
      console.error('Erro ao publicar o guia de bump:', error);
    });
  }, BUMP_GUIDE_INTERVAL_MS);
}

function buildTarotDailyEmbed(guild) {
  return new EmbedBuilder()
    .setColor('#e60067')
    .setColor('#c084fc')
    .setTitle(`${getAnimatedEmoji(guild, ['moon', 'tarot', 'magic'], '🌙')}  ✦  Tarot da Cringelândia  ✦`)
    .setDescription('Uma carta por dia para iluminar seus caminhos. A leitura é privada; escolha o botão ou use `/tarot`.')
    .setDescription(
      'Uma carta por dia para iluminar seus caminhos. A leitura é privada e renderizada especialmente para você!\n\n' +
      'Clique no botão abaixo ou use `/tarot` para receber a sua tiragem de hoje.'
    )
    .setFooter({ text: 'O Tarot embaralha • Kuromi supervisiona • O destino faz suspense.' })
    .setTimestamp();
}

function buildTarotDailyComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tarot:draw')
        .setLabel('Tirar Tarot do Dia')
        .setCustomId('tarot_tirar_dia')
        .setLabel('🔮 Tirar Tarot do Dia')
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
    embeds: [buildTarotDailyEmbed(channel.guild)],
    components: buildTarotDailyComponents(),
    allowedMentions: { roles: [TAROT_ROLE_ID] },
  });
}

function startTarotScheduler() {
  const currentCycle = getBrasiliaDate();
  const nextMidnightUtc = Date.parse(`${currentCycle}T03:00:00.000Z`) + 24 * 60 * 60 * 1000;
  const delay = Math.max(1000, nextMidnightUtc - Date.now());

  registerAutomation({
    id: 'tarot-daily',
    emoji: '🌙',
    name: 'Tarot da Cringelândia',
    action: 'disparo',
    nextAt: Date.now() + delay,
    channelId: TAROT_CHANNEL_ID,
    frequency: 'diário, à 00:00 BRT',
  });

  setTimeout(() => {
    updateAutomation('tarot-daily', { nextAt: Date.now() + 24 * 60 * 60 * 1000 });
    postTarotDailyAnnouncement().catch((error) => console.error('Erro no anúncio diário do Tarot:', error));
    setInterval(() => {
      updateAutomation('tarot-daily', { nextAt: Date.now() + 24 * 60 * 60 * 1000 });
      postTarotDailyAnnouncement().catch((error) => console.error('Erro no anúncio diário do Tarot:', error));
    }, 24 * 60 * 60 * 1000);
  }, delay);
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
  console.log(`Kuromi conectada como ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'Sendo cringe.', type: ActivityType.Watching }],
    status: 'online',
  });

  await sendStartupAnnouncement();
  await syncApplicationEmojis(client).catch(() => null);
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
    .setTitle(`${getAnimatedEmoji(member.guild, ['heart', 'welcome', 'love'], '🎉')}  ✦  Uma nova pessoa chegou`)
    .setDescription(`Que bom ter você aqui, **${member.displayName}**. A Cringelândia ficou mais interessante; não me faça me arrepender.`)
    .addFields(
      {
        name: '📜 Comece pelas regras',
        value: `Consulte <#${RULES_CHANNEL_ID}> para conhecer a casa e manter o ambiente seguro. Eu sei, regras são chatas. Ainda assim.`,
      },
      {
        name: '🧭 Explore o servidor',
        value: `Veja vantagens e tutoriais em <#${GUIDES_CHANNEL_ID}>. Tente não se perder logo de cara.`,
      },
      {
        name: '🎨 Personalize sua experiência',
        value: `Confira as cores disponíveis em <#${COLORS_CHANNEL_ID}>. Até sua estética merece atenção.`,
      }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setImage('https://cdn.discordapp.com/attachments/1533657882862686218/1541908904487690321/dhj7hfn-842bcc59-b41f-4ef3-888b-dbfc210f4a5c.gif?ex=6a9b2b92&is=6a99da12&hm=7a41318a2f477b04a295a5b209c43de9517cfa47ac6ecf15e351c045aa104714&')
    .setFooter({ text: 'Cringelândia • Kuromi finge que não ficou feliz com sua chegada' })
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
  try {
    await command.executePrefix({ message, args, prefix });
  } catch (error) {
    console.error(`Erro ao executar prefix command ${prefix}${cmd}:`, error);
    await message.reply('❌ Ocorreu um erro ao executar este comando. Tente novamente mais tarde.').catch(() => null);
  }
});

// O registro compartilhado também encaminha cada slash command ao próprio arquivo.
client.on('interactionCreate', async (interaction) => {
  try {
    if (tarotCommand.isTarotButton(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await tarotCommand.executeButton({ interaction });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'tarot:draw') {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await interaction.deferReply({ ephemeral: true });
      await tarotCommand.executeSlash({ interaction });
      return;
    }

    if (typeof marriageCommand?.isMarriageButton === 'function' && marriageCommand.isMarriageButton(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await marriageCommand.executeButton({ interaction });
      return;
    }

    if (typeof helpCommand?.isHelpButton === 'function' && helpCommand.isHelpButton(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await helpCommand.executeButton({ interaction });
      return;
    }

    if (typeof shopCommand?.isShopInteraction === 'function' && shopCommand.isShopInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await shopCommand.handleShopInteraction(interaction);
      return;
    }

    if (typeof inventoryCommand?.isInventoryInteraction === 'function' && inventoryCommand.isInventoryInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await inventoryCommand.handleInventoryInteraction(interaction);
      return;
    }

    if (typeof petCommand?.isPetInteraction === 'function' && petCommand.isPetInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await petCommand.handlePetInteraction(interaction);
      return;
    }

    if (typeof dexCommand?.isDexInteraction === 'function' && dexCommand.isDexInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await dexCommand.handleDexInteraction(interaction);
      return;
    }

    if (typeof adoptionCommand?.isAdoptionInteraction === 'function' && adoptionCommand.isAdoptionInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await adoptionCommand.handleAdoptionInteraction(interaction);
      return;
    }

    if (typeof dungeonCommand?.isDungeonInteraction === 'function' && dungeonCommand.isDungeonInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await dungeonCommand.handleDungeonInteraction(interaction);
      return;
    }

    if (typeof duelCommand?.isDuelInteraction === 'function' && duelCommand.isDuelInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await duelCommand.handleDuelInteraction(interaction);
      return;
    }

    if (typeof profileCommand?.isProfileInteraction === 'function' && profileCommand.isProfileInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await profileCommand.handleProfileInteraction(interaction);
      return;
    }

    if (typeof workCommand?.isWorkInteraction === 'function' && workCommand.isWorkInteraction(interaction)) {
      incrementCommand();
      recordUniqueUser(interaction.user.id);
      await workCommand.handleWorkInteraction(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    incrementCommand();
    recordUniqueUser(interaction.user.id);

    const command = commandsByName.get(interaction.commandName);
    const isEphemeral = Boolean(
      command?.ephemeral ||
      command?.name === 'tarot' ||
      command?.name === 'ajuda' ||
      command?.name === 'inventario'
    );
    await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });
    if (!command || typeof command.executeSlash !== 'function') {
      await interaction.editReply({ content: 'Esse comando ainda não está disponível. Não olhe para mim assim; eu também estou investigando.' });
      return;
    }

    await command.executeSlash({ interaction });
  } catch (error) {
    console.error(`Erro ao processar interaction (${interaction.commandName || interaction.customId}):`, error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ Ocorreu um erro ao processar esta ação. Tente novamente mais tarde.' }).catch(() => null);
    } else {
      await interaction.reply({ content: '❌ Ocorreu um erro ao processar esta ação.', flags: MessageFlags.Ephemeral }).catch(() => null);
    }
  }
});

client.on('error', (error) => {
  console.error('Erro do cliente Discord:', error);
});

function handleAppShutdown() {
  flushSync();
  flushInventorySync();
  flushPetsSync();
  releaseBotLock();
}

process.on('SIGINT', () => {
  handleAppShutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  handleAppShutdown();
  process.exit(0);
});

process.on('exit', () => {
  handleAppShutdown();
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
