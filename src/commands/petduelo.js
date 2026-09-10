const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createDuelChallenge, resolveDuelChallenge } = require('../services/petDuels');
const { formatCoins } = require('./economyHelpers');
const { PET_DUEL } = require('./commandNames');

function isDuelInteraction(interaction) {
  return interaction.isButton() && (interaction.customId.startsWith('duel_accept:') || interaction.customId.startsWith('duel_decline:'));
}

async function handleDuelInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const duelId = parts[1];
  const targetId = parts[2];

  if (interaction.user.id !== targetId) {
    await interaction.reply({
      content: '❌ Este desafio de duelo não foi enviado para você!',
      ephemeral: true,
    });
    return;
  }

  if (action === 'duel_decline') {
    resolveDuelChallenge(duelId, targetId, false);
    await interaction.update({
      content: `🏳️ <@${targetId}> recusou o desafio de duelo com medo de passar vergonha.`,
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
    } else {
      await interaction.update({ content: '❌ Não foi possível realizar o combate.', embeds: [], components: [] });
    }
    return;
  }

  const betText = result.betAmount > 0 ? `💰 **Aposta Disputada:** **${formatCoins(result.betAmount)}**` : '🕊️ *Duelo Amigável*';
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
    .setColor('#f43f5e')
    .setTitle('⚔️  ✦  Coliseu de Pymons — Resultado do Combate')
    .setDescription(desc)
    .setFooter({ text: `${interaction.guild?.name || 'Servidor'} • Arena de Duelos de Pymons` })
    .setTimestamp();

  await interaction.update({ embeds: [duelEmbed], components: [] });
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
    '',
    `⏳ <@${targetId}>, responda ao desafio nos botões abaixo em até **60 segundos**:`,
  ].join('\n');

  return new EmbedBuilder()
    .setColor('#f43f5e')
    .setTitle('⚔️  ✦  Desafio de Duelo no Coliseu!')
    .setDescription(desc)
    .setFooter({ text: `${guildName || 'Servidor'} • Arena de Duelos de Pymons` })
    .setTimestamp();
}

module.exports = {
  name: PET_DUEL,
  aliases: ['duelo', 'batalha', 'combate', 'duel'],
  data: new SlashCommandBuilder()
    .setName(PET_DUEL)
    .setDescription('Desafia outro jogador para um combate RPG de pets na arena com apostas opcionais')
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
      await message.reply('❌ Mencione o usuário que deseja desafiar para o duelo. Exemplo: `ku!petduelo @amigo 100`.');
      return;
    }
    const bet = Number(args[1]) || 0;
    const challengeRes = createDuelChallenge(message.author.id, target.id, bet);

    if (!challengeRes.success) {
      if (challengeRes.reason === 'self_duel') {
        await message.reply('❌ Você não pode duelar contra si mesmo. Procure outro oponente.');
        return;
      }
      if (challengeRes.reason === 'challenger_no_pet') {
        await message.reply('❌ Você precisa ter um Pymon ativo para duelar! Inicie sua jornada com `/pymons`.');
        return;
      }
      if (challengeRes.reason === 'target_no_pet') {
        await message.reply(`❌ ${target} ainda não possui nenhum Pymon ativo.`);
        return;
      }
      if (challengeRes.reason === 'challenger_insufficient_funds') {
        await message.reply(`❌ Você não tem moedas suficientes para apostar ${formatCoins(challengeRes.bet)} (Seu saldo: ${formatCoins(challengeRes.balance)}).`);
        return;
      }
      if (challengeRes.reason === 'target_insufficient_funds') {
        await message.reply(`❌ ${target} não tem moedas suficientes para cobrir essa aposta.`);
        return;
      }
      if (challengeRes.reason === 'challenger_hungry') {
        await message.reply('❌ Seu Pymon está com muita fome (< 15%) para lutar! Alimente-o antes.');
        return;
      }
      await message.reply('❌ Não foi possível criar o duelo.');
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
        .setStyle(ButtonStyle.Secondary)
    );

    await message.reply({ embeds: [challengeEmbed], components: [buttons] });
  },
  async executeSlash({ interaction }) {
    const target = interaction.options.getUser('oponente');
    const bet = interaction.options.getInteger('aposta') || 0;

    const challengeRes = createDuelChallenge(interaction.user.id, target.id, bet);

    if (!challengeRes.success) {
      if (challengeRes.reason === 'self_duel') {
        await interaction.editReply({ content: '❌ Você não pode duelar contra si mesmo. Procure outro oponente.' });
        return;
      }
      if (challengeRes.reason === 'challenger_no_pet') {
        await interaction.editReply({ content: '❌ Você precisa ter um Pymon ativo para duelar! Inicie sua jornada com `/pymons`.' });
        return;
      }
      if (challengeRes.reason === 'target_no_pet') {
        await interaction.editReply({ content: `❌ ${target} ainda não possui nenhum Pymon ativo.` });
        return;
      }
      if (challengeRes.reason === 'challenger_insufficient_funds') {
        await interaction.editReply({ content: `❌ Você não tem moedas suficientes para apostar ${formatCoins(challengeRes.bet)} (Seu saldo: ${formatCoins(challengeRes.balance)}).` });
        return;
      }
      if (challengeRes.reason === 'target_insufficient_funds') {
        await interaction.editReply({ content: `❌ ${target} não tem moedas suficientes para cobrir essa aposta.` });
        return;
      }
      if (challengeRes.reason === 'challenger_hungry') {
        await interaction.editReply({ content: '❌ Seu Pymon está com muita fome (< 15%) para lutar! Alimente-o antes.' });
        return;
      }
      await interaction.editReply({ content: '❌ Não foi possível criar o duelo.' });
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
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [challengeEmbed], components: [buttons] });
  },
  isDuelInteraction,
  handleDuelInteraction,
};

