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
const MAJOR_NAMES = [
  'O LOUCO', 'O MAGO', 'A SACERDOTISA', 'A IMPERATRIZ', 'O IMPERADOR', 'O HIEROFANTE',
  'OS ENAMORADOS', 'O CARRO', 'A FORÇA', 'O EREMITA', 'A RODA DA FORTUNA', 'A JUSTIÇA',
  'O ENFORCADO', 'A MORTE', 'A TEMPERANÇA', 'O DIABO', 'A TORRE', 'A ESTRELA',
  'A LUA', 'O SOL', 'O JULGAMENTO', 'O MUNDO',
];
const SUIT_NAMES = { wands: 'PAUS', cups: 'COPAS', swords: 'ESPADAS', pentacles: 'OUROS' };
const RANK_NAMES = { page: 'PAJEM', knight: 'CAVALEIRO', queen: 'RAINHA', king: 'REI' };
const TAROT_COLORS = { upright: '#f59e0b', reversed: '#8b5cf6' };

function getDisplayCardName(card) {
  if (card.id.startsWith('major_')) {
    return MAJOR_NAMES[Number(card.id.slice('major_'.length))] || card.name;
  }

  const [, suit, rank] = card.id.match(/^(wands|cups|swords|pentacles)_(.+)$/) || [];
  if (!suit || !rank) return card.name;
  const translatedRank = RANK_NAMES[rank] || (rank === '01' ? 'ÁS' : rank);
  return `${translatedRank} DE ${SUIT_NAMES[suit]}`;
}

function getDisplayOrientation(orientation) {
  return orientation === 'REVERSED' ? 'INVERTIDA' : 'NORMAL';
}

function buildTarotEmbed(result) {
  const { card } = result;
  const embed = new EmbedBuilder()
    .setColor(result.orientation === 'REVERSED' ? TAROT_COLORS.reversed : TAROT_COLORS.upright)
    .setTitle(`🌙  ✦  Luna's Kuromi Tarot  ✦  ${getDisplayOrientation(result.orientation)}`)
    .setDescription(`**${getDisplayCardName(card)}**\n\n${result.orientation === 'REVERSED' ? card.reversed : card.upright}`)
    .addFields(
      { name: 'Palavras-chave', value: card.keywords.join(' • ') },
      { name: 'Uma ajudinha para a Kuromi', value: `Ela aceita ${formatCoins(BRIBE_COST)} por uma nova leitura.` }
    )
    .setFooter({ text: 'Sua leitura é privada • Até o destino gosta de um pouco de drama.' })
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
      .setLabel('💸 Fazer uma oferenda à Kuromi')
      .setStyle(ButtonStyle.Secondary)
  );
}

async function sendDraw({ interaction, userId, result, logTarotResult }) {
  if (!result.drawn && !result.bribed) {
    await interaction.editReply({ content: '🔮 A carta de hoje já falou com você. Volte amanhã; ela adora suspense.', components: [] });
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
    await interaction.reply({ content: 'Essa oferenda já tem dona. A Kuromi sabe quem clicou primeiro.', ephemeral: true });
    return;
  }

  if (!hasActiveDraw(interaction.user.id)) {
    await interaction.reply({ content: 'A janela da leitura fechou por hoje. Volte amanhã.', ephemeral: true });
    return;
  }

  const payment = spendCoins(interaction.user.id, BRIBE_COST);
  if (!payment.spent) {
    await interaction.reply({ content: `💸 A Kuromi consultou seu saldo e fez uma carinha triste. Ela precisa de ${formatCoins(BRIBE_COST)}; você tem ${formatCoins(payment.balance)}.`, ephemeral: true });
    return;
  }

  const result = bribeKuromi(interaction.user.id);
  if (!result.bribed) {
    await interaction.reply({ content: 'A janela da leitura fechou por hoje. Volte amanhã.', ephemeral: true });
    return;
  }

  await interaction.reply({ embeds: [buildTarotEmbed(result)], ephemeral: true });
  await logTarotResult({ user: interaction.user, result });
}

module.exports = {
  name,
  buildTarotEmbed,
  getDisplayCardName,
  getDisplayOrientation,
  isTarotButton,
  executeButton,
  data: new SlashCommandBuilder()
    .setName(name)
    .setDescription('Receba uma tiragem privada do Luna\'s Kuromi Tarot.'),
  async executeSlash({ interaction, logTarotResult }) {
    await sendDraw({ interaction, userId: interaction.user.id, result: drawTarot(interaction.user.id), logTarotResult });
  },
};