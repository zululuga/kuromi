const { SlashCommandBuilder } = require('discord.js');
const { getCurrencyBalances, getUserRank } = require('../services/economy');
const { buildWalletEmbed } = require('./economyHelpers');
const { WALLET } = require('./commandNames');

function getTargetUser(source) {
  return source.options?.getUser('usuario') || source.options?.getUser('user') || source.user || source.author;
}

module.exports = {
  name: WALLET,
  data: new SlashCommandBuilder()
    .setName(WALLET)
    .setDescription('View wallet balance of coins and magic beans / Exibe o saldo da carteira.')
    .setDescriptionLocalizations({
      'pt-BR': 'Exibe a quantidade de Moedinhas e Feijões Mágicos de um usuário.',
    })
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setNameLocalizations({
          'en-US': 'user',
          'en-GB': 'user',
          'pt-BR': 'usuario',
        })
        .setDescription('User to check wallet / Usuário para consultar')
        .setRequired(false)
    ),
  async executePrefix({ message }) {
    const target = message.mentions.users.first() || message.author;
    const rank = getUserRank(target.id);
    await message.reply({ embeds: [buildWalletEmbed(target, getCurrencyBalances(target.id, message), rank?.position, message)] });
  },
  async executeSlash({ interaction }) {
    const target = getTargetUser(interaction);
    const rank = getUserRank(target.id);
    await interaction.editReply({ embeds: [buildWalletEmbed(target, getCurrencyBalances(target.id, interaction), rank?.position, interaction)] });
  },
};