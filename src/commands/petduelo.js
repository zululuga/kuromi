const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createDuelChallenge, resolveDuelChallenge, buildDuelGuideEmbed } = require('../services/petDuels');
const { formatCoins } = require('./economyHelpers');
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
      content: '❌ Este desafio de duelo não foi enviado para você!',
      flags: 64,
    });
    return;
  }

  if (action === 'duel_decline') {
    resolveDuelChallenge(duelId, targetId, false);
    await interaction.update({
      content: `🏳️ <@${targetId}> recusou o desafio de duelo.`,
      embeds: [],
      components: [],
    });
    return;
  }

  // Aceitar Duelo
  const result = resolveDuelChallenge(duelId, targetId, true);
  if (!result.success) {
    if (result.reason === 'invalid_or_expired') {
      await interaction.update({ content: '⏳ O desafio expirou ou já foi finalizado.', embeds: [], components: [] });
    } else if (result.reason === 'insufficient_funds_at_execution') {
      await interaction.update({ content: '❌ Um dos jogadores não possui moedas suficientes para cobrir a aposta!', embeds: [], components: [] });
    } else if (result.reason === 'pet_on_expedition') {
      await interaction.update({ content: '🧭 Um dos Pymons partiu em expedição e não pode lutar no momento!', embeds: [], components: [] });
    } else {
      await interaction.update({ content: '❌ Não foi possível realizar o combate.', embeds: [], components: [] });
    }
    return;
  }

  const betText = result.betAmount > 0 ? `💰 **Aposta Disputada:** **${formatCoins(result.betAmount)}**` : '🕊️ *Duelo Amigável (Sem apostas)*';
  const narrative = result.battleLogs.join('\n\n');

  const desc = [
    `🥊 **LUTADORES:** <@${result.winnerUserId === result.winnerPet.id ? result.winnerUserId : result.loserUserId}> vs <@${targetId}>`,
    betText,
    '',
    '📜 **RELATÓRIO DO COMBATE**',
    narrative,
    '',
    '🏆 **VENCEDOR DO COMBATE**',
    `> 👑 <@${result.winnerUserId}> com **${result.winnerPet.name}**!`,
    '',
    '🎁 **RECOMPENSAS**',
    `> ⭐ **+100 XP** para o vencedor`,
    `> ⭐ **+25 XP** para o perdedor`,
    result.betAmount > 0 ? `> 🪙 **+${formatCoins(result.betAmount)}** transferidos!` : '',
  ].filter(Boolean).join('\n');

  const duelEmbed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta || '#e60067')
    .setTitle('⚔️  ✦  Coliseu de Pymons — Resultado do Combate')
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Arena de Duelos de Pymons • Máx. 3 por dia') })
    .setTimestamp();

  const guideRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('duel_guide')
      .setLabel('📖 Ver Guia de Atributos & Elementos')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [duelEmbed], components: [guideRow] });
}

function buildChallengeEmbed(challengerId, targetId, petA, petB, betAmount, guildName) {
  const betText = betAmount > 0
    ? `> 💰 **Aposta em Jogo:** **${formatCoins(betAmount)}**`
    : '> 🕊️ *Duelo Amigável (Sem apostas)*';

  const desc = [
    `<@${challengerId}> lançou uma luva de desafio para <@${targetId}>!`,
    '',
    '🥊 **CONFRONTO DE PYMONS**',
    `> 🔵 **${petA.emoji} ${petA.name}** (Nv. ${petA.level} • \`${petA.element}\`)`,
    `> 🔴 **${petB.emoji} ${petB.name}** (Nv. ${petB.level} • \`${petB.element}\`)`,
    '',
    '💎 **TERMOS DO COMBATE**',
    betText,
    '> ⏳ *Limite:* Cada treinador pode realizar até 3 duelos por dia.',
    '',
    `⏳ <@${targetId}>, responda ao desafio nos botões abaixo em até **60 segundos**:`,
  ].join('\n');

  return new EmbedBuilder()
    .setColor(PYXIE_COLORS.rose || '#ff8fb3')
    .setTitle('⚔️  ✦  Desafio de Duelo no Coliseu!')
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Arena de Duelos de Pymons') })
    .setTimestamp();
}

function formatDuelError(challengeRes, target) {
  if (challengeRes.reason === 'self_duel') return '❌ Você não pode duelar contra si mesmo. Procure outro oponente.';
  if (challengeRes.reason === 'challenger_daily_limit_reached') return '⏳ Você já atingiu seu limite de **3 duelos hoje**! Volte amanhã para novos combates.';
  if (challengeRes.reason === 'target_daily_limit_reached') return `⏳ ${target} já atingiu o limite de **3 duelos hoje**!`;
  if (challengeRes.reason === 'challenger_no_pet') return '❌ Você precisa ter um Pymon ativo para duelar! Inicie sua jornada com `/pymons`.';
  if (challengeRes.reason === 'target_no_pet') return `❌ ${target} ainda não possui nenhum Pymon ativo.`;
  if (challengeRes.reason === 'challenger_on_expedition') return '🧭 Seu Pymon está atualmente em uma expedição e não pode duelar!';
  if (challengeRes.reason === 'target_on_expedition') return `🧭 O Pymon de ${target} está atualmente em uma expedição e não pode duelar!`;
  if (challengeRes.reason === 'challenger_insufficient_funds') return `❌ Você não tem moedas suficientes para apostar ${formatCoins(challengeRes.bet)} (Seu saldo: ${formatCoins(challengeRes.balance)}).`;
  if (challengeRes.reason === 'target_insufficient_funds') return `❌ ${target} não tem moedas suficientes para cobrir essa aposta.`;
  if (challengeRes.reason === 'challenger_hungry') return '❌ Seu Pymon está com muita fome (< 15%) para lutar! Alimente-o antes.';
  if (challengeRes.reason === 'target_hungry') return `❌ O Pymon de ${target} está com muita fome (< 15%) para lutar!`;
  if (challengeRes.reason === 'challenger_exhausted') return '❌ Seu Pymon está exausto (< 15% de Energia) para lutar!';
  if (challengeRes.reason === 'target_exhausted') return `❌ O Pymon de ${target} está exausto (< 15% de Energia) para lutar!`;
  return '❌ Não foi possível criar o desafio de duelo.';
}

module.exports = {
  name: PET_DUEL,
  aliases: ['duelo', 'batalha', 'combate', 'duel'],
  data: new SlashCommandBuilder()
    .setName(PET_DUEL)
    .setDescription('Desafia outro jogador para um combate RPG de pets no Coliseu (Máx 3x ao dia).')
    .addUserOption((opt) => opt.setName('oponente').setDescription('Usuário que você deseja desafiar').setRequired(true))
    .addIntegerOption((opt) =>
      opt
        .setName('aposta')
        .setDescription('Quantidade de moedinhas a ser apostada (opcional, padrão: 0)')
        .setMinValue(0)
        .setMaxValue(50000)
        .setRequired(false)
    ),
  async executePrefix({ message, args }) {
    const target = message.mentions.users.first();
    if (!target) {
      const guideButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('duel_guide').setLabel('📖 Ver Guia de Atributos & Elementos').setStyle(ButtonStyle.Secondary)
      );
      await message.reply({ content: '❌ Mencione o usuário que deseja desafiar para o duelo. Exemplo: `py!petduelo @amigo 100`.', components: [guideButton] });
      return;
    }
    const bet = Number(args[1]) || 0;
    const challengeRes = createDuelChallenge(message.author.id, target.id, bet);

    if (!challengeRes.success) {
      await message.reply(formatDuelError(challengeRes, target));
      return;
    }

    const { challenge, petA, petB } = challengeRes;
    const challengeEmbed = buildChallengeEmbed(
      message.author.id,
      target.id,
      petA,
      petB,
      challenge.betAmount,
      message.guild?.name
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`duel_accept:${challenge.id}:${target.id}`)
        .setLabel('⚔️ Aceitar Duelo')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`duel_decline:${challenge.id}:${target.id}`)
        .setLabel('🏳️ Recusar')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('duel_guide')
        .setLabel('📖 Elementos')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.reply({ embeds: [challengeEmbed], components: [buttons] });
  },
  async executeSlash({ interaction }) {
    const target = interaction.options.getUser('oponente');
    const bet = interaction.options.getInteger('aposta') || 0;

    const challengeRes = createDuelChallenge(interaction.user.id, target.id, bet);

    if (!challengeRes.success) {
      await interaction.editReply({ content: formatDuelError(challengeRes, target) });
      return;
    }

    const { challenge, petA, petB } = challengeRes;
    const challengeEmbed = buildChallengeEmbed(
      interaction.user.id,
      target.id,
      petA,
      petB,
      challenge.betAmount,
      interaction.guild?.name
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`duel_accept:${challenge.id}:${target.id}`)
        .setLabel('⚔️ Aceitar Duelo')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`duel_decline:${challenge.id}:${target.id}`)
        .setLabel('🏳️ Recusar')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('duel_guide')
        .setLabel('📖 Elementos')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [challengeEmbed], components: [buttons] });
  },
  isDuelInteraction,
  handleDuelInteraction,
};


