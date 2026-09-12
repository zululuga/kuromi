const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { setUserBalance } = require('../services/economy');
const { formatCoins } = require('./economyHelpers');
const { SET_ECONOMY } = require('./commandNames');
const { t } = require('../utils/i18n');

function isManager(source) {
  return source.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function getTargetUser(source, args = []) {
  return source.options?.getUser('usuario') || source.options?.getUser('user') || source.mentions.users.first() || source.guild?.members.cache.get(args[0])?.user;
}

function parseAmount(value) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function buildReply(target, amount, source = null) {
  return t('admin.setEconomySuccess', source, {
    user: target.displayName || target.username || target,
    coins: formatCoins(amount, source),
  });
}

module.exports = {
  name: SET_ECONOMY,
  aliases: ['seteconomy', 'setareconomia'],
  data: new SlashCommandBuilder()
    .setName(SET_ECONOMY)
    .setDescription('Set a user\'s Coins balance.')
    .setDescriptionLocalizations({
      'pt-BR': 'Define o saldo de Moedinhas de um usuário.',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setNameLocalizations({
          'en-US': 'user',
          'en-GB': 'user',
          'pt-BR': 'usuario',
        })
        .setDescription('Target user / Usuário')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('quantidade')
        .setNameLocalizations({
          'en-US': 'amount',
          'en-GB': 'amount',
          'pt-BR': 'quantidade',
        })
        .setDescription('New balance / Novo saldo')
        .setMinValue(0)
        .setRequired(true)
    ),
  async executePrefix({ message, args }) {
    if (!isManager(message)) return message.reply(t('admin.noPermission', message));
    const target = getTargetUser(message, args);
    const amount = parseAmount(args[1]);
    if (!target || amount === null) return message.reply(t('admin.setEconomyInvalid', message));
    setUserBalance(target.id, amount);
    await message.reply(buildReply(target, amount, message));
  },
  async executeSlash({ interaction }) {
    if (!isManager(interaction)) return interaction.editReply(t('admin.noPermission', interaction));
    const target = getTargetUser(interaction);
    const amount = interaction.options.getInteger('quantidade') ?? interaction.options.getInteger('amount');
    setUserBalance(target.id, amount);
    await interaction.editReply(buildReply(target, amount, interaction));
  },
};