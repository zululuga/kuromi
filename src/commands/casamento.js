const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { getBalance, spendCoins } = require('../services/economy');
const {
  cancelMarriageRequest,
  createMarriageRequest,
  getSpouseId,
  resolveMarriageRequest,
} = require('../services/marriage');
const { MARRIAGE } = require('./commandNames');
const { formatCoins, t } = require('../utils/i18n');

const MARRIAGE_COST = 1000;
const BUTTON_PREFIX = `${MARRIAGE}:`;

function getTargetUser(source) {
  return source.options?.getUser('usuario') || source.options?.getUser('user') || source.mentions?.users?.first();
}

function buildButtons(requestId, source = null) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}aceitar:${requestId}`)
      .setLabel(t('marriage.btnAccept', source))
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}recusar:${requestId}`)
      .setLabel(t('marriage.btnReject', source))
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildRequestEmbed(requester, target, source = null) {
  const desc = t('marriage.proposeDesc', source, {
    target: target.toString(),
    requester: requester.displayName || requester.username,
    cost: formatCoins(MARRIAGE_COST, source),
  });

  return new EmbedBuilder()
    .setColor('#e60067')
    .setTitle(t('marriage.proposeTitle', source))
    .setDescription(desc)
    .setThumbnail(requester.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();
}

function getErrorMessage(reason, source = null) {
  if (reason === 'married') return t('marriage.alreadyMarried', source);
  if (reason === 'pending') return t('marriage.pendingProposal', source);
  return t('marriage.expired', source);
}

async function executeMarriage({ source, reply }) {
  const requester = source.user || source.author;
  const target = getTargetUser(source);
  if (!target) return reply(t('marriage.noTarget', source));
  if (target.bot) return reply(t('marriage.botMarriage', source));
  if (target.id === requester.id) return reply(t('marriage.selfMarriage', source));
  if (getSpouseId(requester.id) || getSpouseId(target.id)) return reply(t('marriage.alreadyMarried', source));

  if (getBalance(requester.id) < MARRIAGE_COST) {
    return reply(t('marriage.insufficientCoins', source, { cost: formatCoins(MARRIAGE_COST, source) }));
  }

  const request = createMarriageRequest(requester.id, target.id, source.guild?.id);
  if (!request.created) return reply(getErrorMessage(request.reason, source));

  const payment = spendCoins(requester.id, MARRIAGE_COST);
  if (!payment.spent) {
    cancelMarriageRequest(request.id, requester.id);
    return reply(t('marriage.insufficientCoins', source, { cost: formatCoins(MARRIAGE_COST, source) }));
  }

  return reply({ embeds: [buildRequestEmbed(requester, target, source)], components: [buildButtons(request.id, source)] });
}

function isMarriageButton(interaction) {
  return interaction.isButton() && interaction.customId.startsWith(BUTTON_PREFIX);
}

async function executeButton({ interaction }) {
  const [, action, requestId] = interaction.customId.split(':');
  const accepted = action === 'aceitar';
  const result = resolveMarriageRequest(requestId, interaction.user.id, accepted);

  if (!result.resolved) {
    await interaction.reply({ content: getErrorMessage(result.reason, interaction), flags: 64 });
    return;
  }

  if (!accepted) {
    await interaction.update({ content: t('marriage.rejectReply', interaction), embeds: [], components: [] });
    return;
  }

  await interaction.update({
    content: t('marriage.acceptReply', interaction, {
      requester: `<@${result.request.requesterId}>`,
      target: `<@${result.request.targetId}>`,
    }),
    embeds: [],
    components: [],
  });
}

module.exports = {
  name: MARRIAGE,
  aliases: ['casamento', 'marry', 'marriage', 'casar', 'propose'],
  MARRIAGE_COST,
  isMarriageButton,
  executeButton,
  data: new SlashCommandBuilder()
    .setName(MARRIAGE)
    .setDescription('Propose marriage for 1000 coins.')
    .setDescriptionLocalizations({
      'pt-BR': 'Solicita uma cerimônia de casamento por 1000 Moedinhas.',
    })
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setNameLocalizations({
          'en-US': 'user',
          'en-GB': 'user',
          'pt-BR': 'usuario',
        })
        .setDescription('User to propose to / Usuário para pedir em casamento')
        .setRequired(true)
    ),
  async executePrefix({ message }) {
    await executeMarriage({ source: message, reply: (content) => message.reply(content) });
  },
  async executeSlash({ interaction }) {
    await executeMarriage({ source: interaction, reply: (content) => interaction.editReply(content) });
  },
};