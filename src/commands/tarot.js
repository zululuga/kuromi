const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { spendCoins } = require('../services/economy');
const { BRIBE_COST, bribeKuromi, drawTarot, hasActiveDraw } = require('../services/tarot');
const { formatCoins } = require('./economyHelpers');
const { TAROT_IMAGE_BASE_URL } = require('../config');

const name = 'tarot';
const BUTTON_PREFIX = `${name}:`;

function buildTarotEmbed(result) {
  const { card } = result;
  const embed = new EmbedBuilder()
    .setColor(result.orientation === 'REVERSED' ? '#7c3aed' : '#e60067')
    .setTitle(`🌙 Luna's Kuromi Tarot • ${result.orientation}`)
    .setDescription(`**${card.name}**\n\n${result.orientation === 'REVERSED' ? card.reversed : card.upright}`)
    .addFields(
      { name: 'Palavras-chave', value: card.keywords.join(' • ') },
      { name: 'Suborno', value: `Uma nova leitura custa ${formatCoins(BRIBE_COST)}.` }
    )
    .setFooter({ text: 'Sua leitura é privada • O destino também gosta de suspense.' })
    .setTimestamp();

  if (TAROT_IMAGE_BASE_URL) {
    embed.setImage(`${TAROT_IMAGE_BASE_URL.replace(/\/$/, '')}/${card.image}`);
  }

  return embed;
}

function buildBribeRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}bribe:${userId}`)
      .setLabel('Não gostou da sua tiragem para o dia? Suborne a Kuromi!')
      .setStyle(ButtonStyle.Secondary)
  );
}

async function sendDraw({ interaction, userId, result, logTarotResult }) {
  if (!result.drawn && !result.bribed) {
    await interaction.editReply({ content: '🔮 Você já tirou seu Tarot do dia. Amanhã as cartas podem tentar de novo.', components: [] });
    return;
  }

  await interaction.editReply({
    embeds: [buildTarotEmbed(result)],
    components: result.paid ? [] : [buildBribeRow(userId)],
  });
  await logTarotResult({ user: interaction.user, result });
}

function isTarotButton(interaction) {
  return interaction.isButton() && interaction.customId.startsWith(`${BUTTON_PREFIX}bribe:`);
}

async function executeButton({ interaction, logTarotResult }) {
  const [, action, ownerId] = interaction.customId.split(':');
  if (action !== 'bribe' || ownerId !== interaction.user.id) {
    await interaction.reply({ content: 'Essa oferta pertence a outra pessoa.', ephemeral: true });
    return;
  }

  if (!hasActiveDraw(interaction.user.id)) {
    await interaction.reply({ content: 'A leitura do dia não está mais disponível.', ephemeral: true });
    return;
  }

  const payment = spendCoins(interaction.user.id, BRIBE_COST);
  if (!payment.spent) {
    await interaction.reply({ content: `❌ A Kuromi exige ${formatCoins(BRIBE_COST)}. Seu saldo é ${formatCoins(payment.balance)}.`, ephemeral: true });
    return;
  }

  const result = bribeKuromi(interaction.user.id);
  if (!result.bribed) {
    await interaction.reply({ content: 'A leitura do dia não está mais disponível.', ephemeral: true });
    return;
  }

  await interaction.reply({ embeds: [buildTarotEmbed(result)], ephemeral: true });
  await logTarotResult({ user: interaction.user, result });
}

module.exports = {
  name,
  buildTarotEmbed,
  isTarotButton,
  executeButton,
  data: new SlashCommandBuilder()
    .setName(name)
    .setDescription('Receba uma tiragem privada do Luna\'s Kuromi Tarot.'),
  async executeSlash({ interaction, logTarotResult }) {
    await sendDraw({ interaction, userId: interaction.user.id, result: drawTarot(interaction.user.id), logTarotResult });
  },
};