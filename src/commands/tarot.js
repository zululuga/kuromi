const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const {
  BRIBE_COST,
  bribeKuromi,
  drawTarot,
  getTimeUntilMidnight,
  hasActiveDraw,
} = require('../services/tarot');
const { createTarotAttachment } = require('../services/tarotRenderer');
const { formatCoins } = require('./economyHelpers');
const { getAnimatedEmoji } = require('../utils/serverEmojis');
const { TAROT_LOG_CHANNEL_ID } = require('../config');

const name = 'tarot';

function getDisplayCardName(card) {
  if (!card) return 'Desconhecida';
  return card.num ? `${card.num}. ${card.name}` : card.name;
}

function getDisplayOrientation(orientation) {
  return orientation === 'REVERSED' ? 'INVERTIDA' : 'DIRETA';
}

function buildBribeRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tarot_subornar')
      .setLabel('Não gostou? Suborne a Kuromi! (350 🪙)')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💜')
  );
}

function buildTarotEmbed(result, guild) {
  const { card, orientation, paid } = result;
  const isReversed = orientation === 'REVERSED';

  const embed = new EmbedBuilder()
    .setColor(isReversed ? '#f43f5e' : '#c084fc')
    .setTitle(`${getAnimatedEmoji(guild, ['moon', 'tarot', 'magic'], '🌙')}  ✦  Tarot da Cringelândia  ✦  ${getDisplayOrientation(orientation)}`)
    .setDescription(
      `### **${card.num ? `${card.num}. ` : ''}${card.name}**\n\n` +
      `*${card.keywords.join(' • ')}*\n\n` +
      `> "${isReversed ? card.reversed : card.upright}"`
    )
    .setImage('attachment://tarot_cringelandia.png')
    .setFooter({
      text: paid
        ? '👀 *ué... Que estranho... Jurava que tinha lido outra coisa...*'
        : 'Sua leitura é privada • Até o destino gosta de um pouco de drama.',
    })
    .setTimestamp();

  return embed;
}

function buildAlreadyDrawnEmbed(remainingTime, guild) {
  return new EmbedBuilder()
    .setColor('#a855f7')
    .setTitle(`${getAnimatedEmoji(guild, ['moon', 'tarot', 'magic'], '🌙')}  ✦  Tarot da Cringelândia`)
    .setDescription(
      `🔮 Você já tirou sua carta de hoje!\n\n` +
      `Sua próxima tiragem gratuita estará disponível em **${remainingTime.formatted}** (às 00:00 BRT).\n\n` +
      `Se não quiser esperar ou quiser tentar uma nova sorte, você pode subornar a Kuromi clicando no botão abaixo.`
    )
    .setFooter({ text: 'Kuromi adora moedas e finge que muda o destino.' })
    .setTimestamp();
}

async function logTarotToPublicChannel(client, { user, result }) {
  try {
    const channel = await client.channels.fetch(TAROT_LOG_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const attachment = createTarotAttachment(result.card, result.orientation);
    const isReversed = result.orientation === 'REVERSED';
    const prefixHumor = result.paid
      ? '👀 *ué... Que estranho... Jurava que tinha lido outra coisa...*\n\n'
      : '';

    const publicEmbed = new EmbedBuilder()
      .setColor(result.paid ? '#8b5cf6' : (isReversed ? '#f43f5e' : '#c084fc'))
      .setTitle('🔮  ✦  Nova Tiragem no Tarot Cringelândia')
      .setDescription(
        `${prefixHumor}O membro <@${user.id}> tirou a carta **${result.card.name}** (**POSIÇÃO ${getDisplayOrientation(result.orientation)}**)!`
      )
      .setImage('attachment://tarot_cringelandia.png')
      .setFooter({ text: result.paid ? 'Tiragem realizada via suborno da Kuromi (350 🪙)' : 'Tiragem diária gratuita' })
      .setTimestamp();

    await channel.send({
      embeds: [publicEmbed],
      files: [attachment],
      allowedMentions: { users: [] },
    });
  } catch (error) {
    console.error('Erro ao enviar log público do Tarot:', error);
  }
}

function isTarotButton(interaction) {
  if (!interaction.isButton()) return false;
  return (
    interaction.customId === 'tarot_subornar' ||
    interaction.customId === 'tarot_tirar_dia' ||
    interaction.customId === 'tarot:draw' ||
    interaction.customId.startsWith('tarot:')
  );
}

async function executeButton({ interaction, logTarotResult }) {
  const customId = interaction.customId;

  // 1. Botão de Suborno
  if (customId === 'tarot_subornar' || customId.startsWith('tarot:bribe')) {
    const result = bribeKuromi(interaction.user.id);

    if (!result.bribed) {
      if (result.reason === 'insufficient_funds') {
        await interaction.reply({
          content: `❌ A Kuromi consultou seu saldo e fez uma carinha triste. Ela exige **${formatCoins(BRIBE_COST)}** por um suborno, mas você possui apenas **${formatCoins(result.balance)}**.`,
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        content: '❌ Não foi possível realizar o suborno no momento. Tente novamente mais tarde.',
        ephemeral: true,
      });
      return;
    }

    const attachment = createTarotAttachment(result.card, result.orientation);
    const embed = buildTarotEmbed(result, interaction.guild);

    await interaction.reply({
      embeds: [embed],
      files: [attachment],
      components: [buildBribeRow()],
      ephemeral: true,
    });

    await logTarotToPublicChannel(interaction.client, { user: interaction.user, result });
    return;
  }

  // 2. Botão de Tiragem Diária
  if (customId === 'tarot_tirar_dia' || customId === 'tarot:draw') {
    await interaction.deferReply({ ephemeral: true });

    const result = drawTarot(interaction.user.id);

    if (!result.drawn) {
      const remaining = getTimeUntilMidnight();
      await interaction.editReply({
        embeds: [buildAlreadyDrawnEmbed(remaining, interaction.guild)],
        components: [buildBribeRow()],
      });
      return;
    }

    const attachment = createTarotAttachment(result.card, result.orientation);
    const embed = buildTarotEmbed(result, interaction.guild);

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [buildBribeRow()],
    });

    await logTarotToPublicChannel(interaction.client, { user: interaction.user, result });
  }
}

module.exports = {
  name,
  ephemeral: true,
  isTarotButton,
  executeButton,
  buildTarotEmbed,
  buildAlreadyDrawnEmbed,
  buildBribeRow,
  getDisplayOrientation,
  getDisplayCardName,
  logTarotToPublicChannel,
  data: new SlashCommandBuilder()
    .setName(name)
    .setDescription('Receba uma tiragem privada do Tarot da Cringelândia renderizada na hora.'),
  async executeSlash({ interaction }) {
    const result = drawTarot(interaction.user.id);

    if (!result.drawn) {
      const remaining = getTimeUntilMidnight();
      await interaction.editReply({
        embeds: [buildAlreadyDrawnEmbed(remaining, interaction.guild)],
        components: [buildBribeRow()],
      });
      return;
    }

    const attachment = createTarotAttachment(result.card, result.orientation);
    const embed = buildTarotEmbed(result, interaction.guild);

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [buildBribeRow()],
    });

    await logTarotToPublicChannel(interaction.client, { user: interaction.user, result });
  },
};