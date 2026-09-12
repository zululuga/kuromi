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
const { TAROT } = require('./commandNames');
const { t } = require('../utils/i18n');

const name = TAROT || 'py-tarot';

function getDisplayCardName(card) {
  if (!card) return 'Desconhecida';
  return card.num ? `${card.num}. ${card.name}` : card.name;
}

function getDisplayOrientation(orientation, source = null) {
  return orientation === 'REVERSED'
    ? t('tarot.orientationReversed', source)
    : t('tarot.orientationUpright', source);
}

function buildBribeRow(source = null) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tarot_subornar')
      .setLabel(t('tarot.bribeBtn', source))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔮')
  );
}

function buildTarotEmbed(result, guildOrSource) {
  const { card, orientation, paid } = result;
  const isReversed = orientation === 'REVERSED';
  const guild = guildOrSource?.guild || (guildOrSource?.name ? guildOrSource : null);
  const guildName = guild?.name || '';

  const desc = [
    `🔮 **${t('tarot.cardLabel', guildOrSource)}:** **${card.num ? `${card.num}. ` : ''}${card.name}**  (\`${getDisplayOrientation(orientation, guildOrSource)}\`)`,
    '',
    `✨ **${t('tarot.keywords', guildOrSource)}**`,
    `> *${card.keywords.join('  •  ')}*`,
    '',
    `📜 **${t('tarot.destinyMessage', guildOrSource)}**`,
    `> "${isReversed ? card.reversed : card.upright}"`,
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(isReversed ? '#f43f5e' : '#c084fc')
    .setTitle(`${getAnimatedEmoji(guild, ['moon', 'tarot', 'magic'], '🌙')}  ✦  ${t('tarot.title', guildOrSource)}${guildName ? ` — ${guildName}` : ''}`)
    .setDescription(desc)
    .setImage('attachment://tarot_cringelandia.png')
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  return embed;
}

function buildAlreadyDrawnEmbed(remainingTime, guildOrSource) {
  const guild = guildOrSource?.guild || (guildOrSource?.name ? guildOrSource : null);
  const guildName = guild?.name || '';
  const desc = [
    t('tarot.alreadyDrawnTitle', guildOrSource),
    '',
    `⏳ **${t('tarot.nextFree', guildOrSource)}**`,
    `> ${t('tarot.nextFreeDesc', guildOrSource, { time: remainingTime.formatted })}`,
    '',
    `✨ **${t('tarot.bribeSection', guildOrSource)}**`,
    `> ${t('tarot.bribeSectionDesc', guildOrSource)}`,
  ].join('\n');

  return new EmbedBuilder()
    .setColor('#a855f7')
    .setTitle(`${getAnimatedEmoji(guild, ['moon', 'tarot', 'magic'], '🌙')}  ✦  ${t('tarot.title', guildOrSource)}${guildName ? ` — ${guildName}` : ''}`)
    .setDescription(desc)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();
}

async function logTarotToPublicChannel(client, { user, result, guild }) {
  try {
    const channel = await client.channels.fetch(TAROT_LOG_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const attachment = createTarotAttachment(result.card, result.orientation, guild);
    const isReversed = result.orientation === 'REVERSED';
    const guildName = guild?.name || '';
    const prefixHumor = result.paid
      ? t('tarot.publicHumor', guild)
      : '';

    const publicEmbed = new EmbedBuilder()
      .setColor(result.paid ? '#8b5cf6' : (isReversed ? '#f43f5e' : '#c084fc'))
      .setTitle(t('tarot.publicTitle', guild, { guild: guildName ? ` — ${guildName}` : '' }))
      .setDescription(
        t('tarot.publicDesc', guild, {
          humor: prefixHumor,
          user: user.id,
          card: result.card.name,
          orientation: getDisplayOrientation(result.orientation, guild),
        })
      )
      .setImage('attachment://tarot_cringelandia.png')
      .setFooter({ text: 'Pyxie' })
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

  // 1. Botão de Suborno / Nova Tiragem
  if (customId === 'tarot_subornar' || customId.startsWith('tarot:bribe')) {
    const result = bribeKuromi(interaction.user.id);

    if (!result.bribed) {
      if (result.reason === 'insufficient_funds') {
        await interaction.reply({
          content: t('tarot.insufficientBribe', interaction, {
            cost: formatCoins(BRIBE_COST, interaction),
            balance: formatCoins(result.balance, interaction),
          }),
          flags: 64,
        });
        return;
      }
      await interaction.reply({
        content: t('tarot.bribeUnavailable', interaction),
        flags: 64,
      });
      return;
    }

    const attachment = createTarotAttachment(result.card, result.orientation, interaction);
    const embed = buildTarotEmbed(result, interaction);

    await interaction.reply({
      embeds: [embed],
      files: [attachment],
      components: [buildBribeRow(interaction)],
      flags: 64,
    });

    await logTarotToPublicChannel(interaction.client, { user: interaction.user, result, guild: interaction.guild });
    return;
  }

  // 2. Botão de Tiragem Diária
  if (customId === 'tarot_tirar_dia' || customId === 'tarot:draw') {
    await interaction.deferReply({ flags: 64 });

    const result = drawTarot(interaction.user.id);

    if (!result.drawn) {
      const remaining = getTimeUntilMidnight();
      await interaction.editReply({
        embeds: [buildAlreadyDrawnEmbed(remaining, interaction)],
        components: [buildBribeRow(interaction)],
      });
      return;
    }

    const attachment = createTarotAttachment(result.card, result.orientation, interaction);
    const embed = buildTarotEmbed(result, interaction);

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [buildBribeRow(interaction)],
    });

    await logTarotToPublicChannel(interaction.client, { user: interaction.user, result, guild: interaction.guild });
  }
}

module.exports = {
  name,
  aliases: ['tarot'],
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
    .setDescription('Draw a daily Tarot card rendered in Canvas / Tiragem do Tarot.')
    .setDescriptionLocalizations({
      'pt-BR': 'Receba uma tiragem privada do Tarot da Cringelândia renderizada na hora.',
    }),
  async executeSlash({ interaction }) {
    const result = drawTarot(interaction.user.id);

    if (!result.drawn) {
      const remaining = getTimeUntilMidnight();
      await interaction.editReply({
        embeds: [buildAlreadyDrawnEmbed(remaining, interaction)],
        components: [buildBribeRow(interaction)],
      });
      return;
    }

    const attachment = createTarotAttachment(result.card, result.orientation, interaction);
    const embed = buildTarotEmbed(result, interaction);

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [buildBribeRow(interaction)],
    });

    await logTarotToPublicChannel(interaction.client, { user: interaction.user, result, guild: interaction.guild });
  },
};