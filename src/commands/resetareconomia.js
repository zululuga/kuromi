const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { resetUserEconomy } = require('../services/economy');
const { formatCoins } = require('./economyHelpers');
const { RESET_ECONOMY } = require('./commandNames');
const { t } = require('../utils/i18n');

function isManager(source) {
  return source.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function getTargetUser(source, args = []) {
  return source.options?.getUser('usuario') || source.options?.getUser('user') || source.mentions.users.first() || source.guild?.members.cache.get(args[0])?.user;
}

module.exports = {
  name: RESET_ECONOMY,
  aliases: ['reseteconomia', 'resetareconomia'],
  data: new SlashCommandBuilder()
    .setName(RESET_ECONOMY)
    .setDescription('Reset a user\'s Coins and daily cooldown.')
    .setDescriptionLocalizations({
      'pt-BR': 'Zera as Moedinhas e o cooldown diário de um usuário.',
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
    ),
  async executePrefix({ message, args }) {
    if (!isManager(message)) return message.reply(t('admin.noPermission', message));
    const target = getTargetUser(message, args);
    if (!target) return message.reply(t('admin.resetEconomyInvalid', message));
    resetUserEconomy(target.id);
    await message.reply(
      t('admin.resetEconomySuccess', message, {
        user: target.displayName || target.username || target,
        coins: formatCoins(0, message),
      })
    );
  },
  async executeSlash({ interaction }) {
    if (!isManager(interaction)) return interaction.editReply(t('admin.noPermission', interaction));
    const target = getTargetUser(interaction);
    resetUserEconomy(target.id);
    await interaction.editReply(
      t('admin.resetEconomySuccess', interaction, {
        user: target.displayName || target.username || target,
        coins: formatCoins(0, interaction),
      })
    );
  },
};