const { SlashCommandBuilder } = require('discord.js');
const { claimDaily } = require('../services/economy');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { DAILY } = require('./commandNames');

function buildDailyReply(result) {
  if (!result.claimed) {
    return `⏳ Você já resgatou suas Moedinhas hoje. Tente novamente em **${formatRemaining(result.remainingMs)}**.`;
  }

  return `🪙 Você recebeu **${formatCoins(result.amount)}**! Seu saldo agora é **${formatCoins(result.balance)}**.`;
}

module.exports = {
  name: DAILY,
  aliases: ['daily'],
  data: new SlashCommandBuilder()
    .setName(DAILY)
    .setDescription('Resgata suas Moedinhas diárias.'),
  async executePrefix({ message }) {
    await message.reply(buildDailyReply(claimDaily(message.author.id)));
  },
  async executeSlash({ interaction }) {
    await interaction.editReply(buildDailyReply(claimDaily(interaction.user.id)));
  },
};