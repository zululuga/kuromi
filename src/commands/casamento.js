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
const { formatCoins } = require('./economyHelpers');
const { MARRIAGE } = require('./commandNames');

const MARRIAGE_COST = 1000;
const BUTTON_PREFIX = `${MARRIAGE}:`;

function getTargetUser(source) {
  return source.options?.getUser('usuario') || source.mentions.users.first();
}

function buildButtons(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}aceitar:${requestId}`)
      .setLabel('Aceitar casamento')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}recusar:${requestId}`)
      .setLabel('Recusar')
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildRequestEmbed(requester, target) {
  return new EmbedBuilder()
    .setColor('#e60067')
    .setTitle('💍 Pedido de casamento')
    .setDescription(`${target}, **${requester.displayName || requester.username}** quer se casar com você!`)
    .addFields({ name: 'Custo', value: formatCoins(MARRIAGE_COST) })
    .setThumbnail(requester.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp();
}

function getErrorMessage(reason) {
  if (reason === 'married') return '❌ Você ou esse usuário já possui um cônjuge.';
  if (reason === 'pending') return '❌ Já existe um pedido de casamento pendente envolvendo um de vocês.';
  return '❌ Esse pedido de casamento não está mais disponível.';
}

async function executeMarriage({ source, reply }) {
  const requester = source.user || source.author;
  const target = getTargetUser(source);
  if (!target) return reply('❌ Escolha um usuário para solicitar o casamento.');
  if (target.bot) return reply('❌ Bots não podem participar de casamentos.');
  if (target.id === requester.id) return reply('❌ Você não pode solicitar casamento a si mesmo.');
  if (getSpouseId(requester.id) || getSpouseId(target.id)) return reply('❌ Você ou esse usuário já possui um cônjuge.');
  if (getBalance(requester.id) < MARRIAGE_COST) {
    return reply(`❌ Você precisa de **${formatCoins(MARRIAGE_COST)}** para fazer o pedido.`);
  }

  const request = createMarriageRequest(requester.id, target.id, source.guild?.id);
  if (!request.created) return reply(getErrorMessage(request.reason));

  const payment = spendCoins(requester.id, MARRIAGE_COST);
  if (!payment.spent) {
    cancelMarriageRequest(request.id, requester.id);
    return reply(`❌ Você precisa de **${formatCoins(MARRIAGE_COST)}** para fazer o pedido.`);
  }

  return reply({ embeds: [buildRequestEmbed(requester, target)], components: [buildButtons(request.id)] });
}

function isMarriageButton(interaction) {
  return interaction.isButton() && interaction.customId.startsWith(BUTTON_PREFIX);
}

async function executeButton({ interaction }) {
  const [, action, requestId] = interaction.customId.split(':');
  const accepted = action === 'aceitar';
  const result = resolveMarriageRequest(requestId, interaction.user.id, accepted);

  if (!result.resolved) {
    await interaction.reply({ content: getErrorMessage(result.reason), ephemeral: true });
    return;
  }

  if (!accepted) {
    await interaction.update({ content: '💔 O pedido de casamento foi recusado.', embeds: [], components: [] });
    return;
  }

  await interaction.update({
    content: `💍 <@${result.request.requesterId}> e <@${result.request.targetId}> agora estão casados!`,
    embeds: [],
    components: [],
  });
}

module.exports = {
  name: MARRIAGE,
  MARRIAGE_COST,
  isMarriageButton,
  executeButton,
  data: new SlashCommandBuilder()
    .setName(MARRIAGE)
    .setDescription('Solicita uma cerimônia de casamento por 1000 Moedinhas.')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuário que você quer pedir em casamento').setRequired(true)),
  async executePrefix({ message }) {
    await executeMarriage({ source: message, reply: (content) => message.reply(content) });
  },
  async executeSlash({ interaction }) {
    await executeMarriage({ source: interaction, reply: (content) => interaction.editReply(content) });
  },
};