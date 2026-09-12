const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createDuelChallenge, resolveDuelChallenge, buildDuelGuideEmbed } = require('../services/petDuels');
const { formatCoins, t, getLanguage } = require('../utils/i18n');
const { PET_DUEL } = require('./commandNames');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function isDuelInteraction(interaction) {
  return interaction.isButton() && (
    interaction.customId.startsWith('duel_accept:') ||
    interaction.customId.startsWith('duel_decline:') ||
    interaction.customId.startsWith('duel_guide')
  );
}

async function handleDuelInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const duelId = parts[1];
  const targetId = parts[2];

  if (action === 'duel_guide') {
    return interaction.reply({ embeds: [buildDuelGuideEmbed()], flags: 64 });
  }

  if (interaction.user.id !== targetId) {
    await interaction.reply({
      content: t('duel.errors.notForYou', interaction),
      flags: 64,
    });
    return;
  }

  if (action === 'duel_decline') {
    resolveDuelChallenge(duelId, targetId, false);
    await interaction.update({
      content: t('duel.declined', interaction, { target: targetId }),
      embeds: [],
      components: [],
    });
    return;
  }

  // Aceitar Duelo
  const result = resolveDuelChallenge(duelId, targetId, true);
  if (!result.success) {
    if (result.reason === 'invalid_or_expired') {
      await interaction.update({ content: t('duel.expired', interaction), embeds: [], components: [] });
    } else if (result.reason === 'insufficient_funds_at_execution') {
      await interaction.update({ content: t('duel.insufficientFunds', interaction), embeds: [], components: [] });
    } else if (result.reason === 'pet_on_expedition') {
      await interaction.update({ content: t('duel.petOnExpedition', interaction), embeds: [], components: [] });
    } else {
      await interaction.update({ content: t('duel.combatFailed', interaction), embeds: [], components: [] });
    }
    return;
  }

  const isEn = getLanguage(interaction) === 'en';
  const betText = result.betAmount > 0
    ? t('duel.betInGame', interaction, { bet: formatCoins(result.betAmount, interaction) })
    : t('duel.friendlyDuel', interaction);
  const narrative = result.battleLogs.join('\n\n');

  const winnerMention = `<@${result.winnerUserId}>`;
  const winnerPetName = result.winnerPet.name;
  const winnerLine = isEn
    ? `> 👑 ${winnerMention} with **${winnerPetName}**!`
    : `> 👑 ${winnerMention} com **${winnerPetName}**!`;

  const desc = [
    `${t('duel.fighters', interaction)} <@${result.winnerUserId === result.winnerPet.id ? result.winnerUserId : result.loserUserId}> vs <@${targetId}>`,
    betText,
    '',
    t('duel.report', interaction),
    narrative,
    '',
    t('duel.winner', interaction),
    winnerLine,
    '',
    t('duel.rewards', interaction),
    t('duel.winnerXp', interaction),
    t('duel.loserXp', interaction),
    result.betAmount > 0 ? t('duel.coinsTransferred', interaction, { coins: formatCoins(result.betAmount, interaction) }) : '',
  ].filter(Boolean).join('\n');

  const duelEmbed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta || '#e60067')
    .setTitle(t('duel.embedTitle', interaction))
    .setDescription(desc)
    .setFooter({ text: pyxieFooter(isEn ? 'Pymon Duel Arena • Max 3 per day' : 'Arena de Duelos de Pymons • Máx. 3 por dia') })
    .setTimestamp();

  const guideRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('duel_guide')
      .setLabel(t('duel.guideBtn', interaction))
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [duelEmbed], components: [guideRow] });
}

function buildChallengeEmbed(challengerId, targetId, petA, petB, betAmount, guildName, source = null) {
  const isEn = getLanguage(source) === 'en';
  const betText = betAmount > 0
    ? `> ${t('duel.betInGame', source, { bet: formatCoins(betAmount, source) })}`
    : `> ${t('duel.friendlyDuel', source)}`;

  const desc = [
    isEn
      ? `<@${challengerId}> threw down the gauntlet to <@${targetId}>!`
      : `<@${challengerId}> lançou uma luva de desafio para <@${targetId}>!`,
    '',
    t('duel.clashTitle', source),
    `> 🔵 **${petA.emoji || '🐾'} ${petA.name}** (Nv. ${petA.level || 1} • \`${petA.element || 'Normal'}\`)`,
    `> 🔴 **${petB.emoji || '🐾'} ${petB.name}** (Nv. ${petB.level || 1} • \`${petB.element || 'Normal'}\`)`,
    '',
    t('duel.termsTitle', source),
    betText,
    t('duel.dailyLimit', source),
    '',
    isEn
      ? `⏳ <@${targetId}>, answer the challenge using the buttons below within **60 seconds**:`
      : `⏳ <@${targetId}>, responda ao desafio nos botões abaixo em até **60 segundos**:`,
  ].join('\n');

  return new EmbedBuilder()
    .setColor(PYXIE_COLORS.rose || '#ff8fb3')
    .setTitle(t('duel.challengeTitle', source))
    .setDescription(desc)
    .setFooter({ text: pyxieFooter(isEn ? 'Pymon Duel Arena' : 'Arena de Duelos de Pymons') })
    .setTimestamp();
}

function formatDuelError(challengeRes, target, source = null) {
  const targetTag = target ? `<@${target.id || target}>` : '';
  if (challengeRes.reason === 'self_duel') return t('duel.errors.self', source);
  if (challengeRes.reason === 'challenger_daily_limit_reached') return t('duel.errors.challengerLimit', source);
  if (challengeRes.reason === 'target_daily_limit_reached') return t('duel.errors.targetLimit', source, { target: targetTag });
  if (challengeRes.reason === 'challenger_no_pet') return t('duel.errors.challengerNoPet', source);
  if (challengeRes.reason === 'target_no_pet') return t('duel.errors.targetNoPet', source, { target: targetTag });
  if (challengeRes.reason === 'challenger_on_expedition') return t('duel.errors.challengerOnExpedition', source);
  if (challengeRes.reason === 'target_on_expedition') return t('duel.errors.targetOnExpedition', source, { target: targetTag });
  if (challengeRes.reason === 'challenger_insufficient_funds') return t('duel.errors.challengerInsufficientFunds', source, { bet: formatCoins(challengeRes.bet, source), balance: formatCoins(challengeRes.balance, source) });
  if (challengeRes.reason === 'target_insufficient_funds') return t('duel.errors.targetInsufficientFunds', source, { target: targetTag });
  if (challengeRes.reason === 'challenger_hungry') return t('duel.errors.challengerHungry', source);
  if (challengeRes.reason === 'target_hungry') return t('duel.errors.targetHungry', source, { target: targetTag });
  if (challengeRes.reason === 'challenger_exhausted') return t('duel.errors.challengerExhausted', source);
  if (challengeRes.reason === 'target_exhausted') return t('duel.errors.targetExhausted', source, { target: targetTag });
  return t('duel.errors.generic', source);
}

module.exports = {
  name: PET_DUEL,
  aliases: ['duelo', 'batalha', 'combate', 'duel'],
  data: new SlashCommandBuilder()
    .setName(PET_DUEL)
    .setDescription('Challenge another player to a Pymon RPG duel in the Colosseum (Max 3/day).')
    .setDescriptionLocalizations({
      'pt-BR': 'Desafia outro jogador para um combate RPG de pets no Coliseu (Máx 3x ao dia).',
    })
    .addUserOption((opt) =>
      opt
        .setName('oponente')
        .setNameLocalizations({
          'en-US': 'opponent',
          'en-GB': 'opponent',
          'pt-BR': 'oponente',
        })
        .setDescription('User you want to challenge / Usuário a desafiar')
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('aposta')
        .setNameLocalizations({
          'en-US': 'bet',
          'en-GB': 'bet',
          'pt-BR': 'aposta',
        })
        .setDescription('Amount of coins to bet (optional) / Moedas a apostar')
        .setMinValue(0)
        .setMaxValue(50000)
        .setRequired(false)
    ),
  async executePrefix({ message, args }) {
    const target = message.mentions.users.first();
    if (!target) {
      const guideButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('duel_guide').setLabel(t('duel.guideBtn', message)).setStyle(ButtonStyle.Secondary)
      );
      const isEn = getLanguage(message) === 'en';
      const prompt = isEn
        ? '❌ Mention the user you wish to duel against. Example: `py!petduelo @friend 100`.'
        : '❌ Mencione o usuário que deseja desafiar para o duelo. Exemplo: `py!petduelo @amigo 100`.';
      await message.reply({ content: prompt, components: [guideButton] });
      return;
    }
    const bet = Number(args[1]) || 0;
    const challengeRes = createDuelChallenge(message.author.id, target.id, bet);

    if (!challengeRes.success) {
      await message.reply(formatDuelError(challengeRes, target, message));
      return;
    }

    const { challenge, petA, petB } = challengeRes;
    const challengeEmbed = buildChallengeEmbed(
      message.author.id,
      target.id,
      petA,
      petB,
      challenge.betAmount,
      message.guild?.name,
      message
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`duel_accept:${challenge.id}:${target.id}`)
        .setLabel(t('duel.btnAccept', message))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`duel_decline:${challenge.id}:${target.id}`)
        .setLabel(t('duel.btnDecline', message))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('duel_guide')
        .setLabel(t('hub.elements', message))
        .setStyle(ButtonStyle.Secondary)
    );

    await message.reply({ embeds: [challengeEmbed], components: [buttons] });
  },
  async executeSlash({ interaction }) {
    const target = interaction.options.getUser('oponente') || interaction.options.getUser('opponent');
    const bet = interaction.options.getInteger('aposta') || interaction.options.getInteger('bet') || 0;

    const challengeRes = createDuelChallenge(interaction.user.id, target.id, bet);

    if (!challengeRes.success) {
      await interaction.editReply({ content: formatDuelError(challengeRes, target, interaction) });
      return;
    }

    const { challenge, petA, petB } = challengeRes;
    const challengeEmbed = buildChallengeEmbed(
      interaction.user.id,
      target.id,
      petA,
      petB,
      challenge.betAmount,
      interaction.guild?.name,
      interaction
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`duel_accept:${challenge.id}:${target.id}`)
        .setLabel(t('duel.btnAccept', interaction))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`duel_decline:${challenge.id}:${target.id}`)
        .setLabel(t('duel.btnDecline', interaction))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('duel_guide')
        .setLabel(t('hub.elements', interaction))
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [challengeEmbed], components: [buttons] });
  },
  isDuelInteraction,
  handleDuelInteraction,
};
