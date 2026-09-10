const { SlashCommandBuilder } = require('discord.js');
const { claimDaily } = require('../services/economy');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { DAILY } = require('./commandNames');

function buildDailyReply(result) {
  if (!result.claimed) {
    return `⏳ Você já pegou sua recompensa diária hoje. Espere **${formatRemaining(result.remainingMs)}** para resgatar novamente!`;
  }

  let text = `🪙 **Recompensa Diária Coletada!**\nVocê recebeu **${formatCoins(result.amount)}**! (Saldo atual: **${formatCoins(result.balance)}**)`;
  if (result.magicBeanBonus) {
    text += `\n\n✨ **SORTE ÉPICA (1% de Chance)!** 🌱 Você encontrou **1x Feijão Mágico** reluzente no seu caminho! (Total: **${result.magicBeans} 🌱**)`;
  }
  return text;
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