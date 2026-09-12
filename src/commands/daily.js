const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { claimDaily } = require('../services/economy');
const { getVoteUrl } = require('../services/topgg');
const { t } = require('../utils/i18n');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { DAILY } = require('./commandNames');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function isWeekend() {
  const day = new Date().getUTCDay();
  return day === 0 || day === 5 || day === 6;
}

function buildDailyView(userId, guildOrSource = null, clientId = null) {
  const result = claimDaily(userId);
  const voteUrl = getVoteUrl(clientId);
  const weekend = isWeekend();

  const voteBonusText = weekend
    ? t('daily.voteWeekendBonus', guildOrSource)
    : t('daily.voteWeekdayBonus', guildOrSource);

  if (!result.claimed) {
    const desc = [
      t('daily.descCooldown', guildOrSource, { time: formatRemaining(result.remainingMs) }),
      '',
      voteBonusText,
      '',
      t('vote.cta', guildOrSource),
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.violet || '#8b5cf6')
      .setTitle(t('daily.titleCooldown', guildOrSource))
      .setDescription(desc)
      .setFooter({ text: pyxieFooter(t('daily.footerCooldown', guildOrSource)) })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(t('daily.btnLabelCooldown', guildOrSource))
        .setEmoji('🗳️')
        .setStyle(ButtonStyle.Link)
        .setURL(voteUrl)
    );

    return { embeds: [embed], components: [row] };
  }

  const desc = [
    t('daily.descClaimed', guildOrSource),
    '',
    t('daily.summaryTitle', guildOrSource),
    t('daily.collected', guildOrSource, { amount: formatCoins(result.amount) }),
    t('daily.balance', guildOrSource, { balance: formatCoins(result.balance) }),
    result.magicBeanBonus ? t('daily.magicBean', guildOrSource, { total: result.magicBeans }) : '',
    '',
    voteBonusText,
    '',
    t('vote.cta', guildOrSource),
  ].filter(Boolean).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold || '#facc15')
    .setTitle(t('daily.titleClaimed', guildOrSource))
    .setDescription(desc)
    .setFooter({ text: pyxieFooter(t('daily.footer', guildOrSource)) })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(t('daily.btnLabel', guildOrSource))
      .setEmoji('🗳️')
      .setStyle(ButtonStyle.Link)
      .setURL(voteUrl)
  );

  return { embeds: [embed], components: [buttonRow] };
}

module.exports = {
  name: DAILY,
  aliases: ['daily', 'diaria'],
  buildDailyView,
  data: new SlashCommandBuilder()
    .setName(DAILY)
    .setDescription('Claim daily coins & unlock Top.gg voting bonus / Resgate moedas diárias e bônus no Top.gg'),
  async executePrefix({ message, client }) {
    const view = buildDailyView(message.author.id, message.guild?.id, client?.user?.id);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const view = buildDailyView(interaction.user.id, interaction.guild?.id, interaction.client?.user?.id);
    await interaction.editReply(view);
  },
};