const { SlashCommandBuilder } = require('discord.js');
const { getCurrencyBalances, getUserRank } = require('../services/economy');
const { getSpouseId } = require('../services/marriage');
const { buildProfileEmbed } = require('./economyHelpers');
const { PROFILE } = require('./commandNames');

function getTargetUser(source) {
  return source.options?.getUser('usuario') || source.user || source.author;
}

module.exports = {
  name: PROFILE,
  data: new SlashCommandBuilder()
    .setName(PROFILE)
    .setDescription('Exibe o perfil, o cônjuge e todas as suas moedas.')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuário para consultar').setRequired(false)),
  async executePrefix({ message }) {
    const target = message.mentions.users.first() || message.author;
    const spouseId = getSpouseId(target.id);
    const rank = getUserRank(target.id);
    await message.reply({
      embeds: [buildProfileEmbed(target, getCurrencyBalances(target.id), spouseId ? `<@${spouseId}>` : null, rank?.position)],
    });
  },
  async executeSlash({ interaction }) {
    const target = getTargetUser(interaction);
    const spouseId = getSpouseId(target.id);
    const rank = getUserRank(target.id);
    await interaction.editReply({
      embeds: [buildProfileEmbed(target, getCurrencyBalances(target.id), spouseId ? `<@${spouseId}>` : null, rank?.position)],
    });
  },
};