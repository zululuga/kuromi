const { SlashCommandBuilder } = require('discord.js');
const { claimDaily } = require('../services/economy');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { DAILY } = require('./commandNames');

function buildDailyReply(result) {
  if (!result.claimed) {
    return `⏳ Você já pegou suas Moedinhas hoje. Espere **${formatRemaining(result.remainingMs)}**; até a minha paciência tem cooldown.`;
  }

  return `🪙 Você recebeu **${formatCoins(result.amount)}**. Não diga que eu nunca faço nada por você. Saldo: **${formatCoins(result.balance)}**.`;
}

module.exports = {
  name: DAILY,
  aliases: ['daily'],
  data: new SlashCommandBuilder()
    .setName(DAILY)
    .setDescription('Resgata suas Moedinhas diárias. Venha buscar seu agrado e finja que não ficou feliz.'),
  async executePrefix({ message }) {
    await message.reply(buildDailyReply(claimDaily(message.author.id)));
  },
  async executeSlash({ interaction }) {
    await interaction.editReply(buildDailyReply(claimDaily(interaction.user.id)));
  },
};