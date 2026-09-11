const { SlashCommandBuilder } = require('discord.js');
const { getCurrencyBalances, getUserRank } = require('../services/economy');
const { buildWalletEmbed } = require('./economyHelpers');
const { WALLET } = require('./commandNames');

function getTargetUser(source) {
  return source.options?.getUser('usuario') || source.user || source.author;
}

module.exports = {
  name: WALLET,
  data: new SlashCommandBuilder()
    .setName(WALLET)
    .setDescription('Exibe a quantidade de Moedinhas de um usuário. A Kuromi confere, sem tocar no seu dinheiro.')
    .setDescription('Exibe a quantidade de Moedinhas e Feijões Mágicos de um usuário.')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuário para consultar').setRequired(false)),
  async executePrefix({ message }) {
    const target = message.mentions.users.first() || message.author;
    const rank = getUserRank(target.id);
    await message.reply({ embeds: [buildWalletEmbed(target, getCurrencyBalances(target.id), rank?.position)] });
  },
  async executeSlash({ interaction }) {
    const target = getTargetUser(interaction);
    const rank = getUserRank(target.id);
    await interaction.editReply({ embeds: [buildWalletEmbed(target, getCurrencyBalances(target.id), rank?.position)] });
  },
};