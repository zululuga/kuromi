const { SlashCommandBuilder } = require('discord.js');
const { explorePet, PET_EXPLORE_COOLDOWN_MS } = require('../services/pets');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { PET_EXPLORE } = require('./commandNames');

function buildReply(result) {
  if (!result.explored) {
    if (result.reason === 'no-pet') return '❌ Você precisa adotar um pet primeiro com `/adocao`.';
    return `⏳ Seu pet precisa descansar. Tente novamente em **${formatRemaining(result.remainingMs)}**.`;
  }

  const events = [];
  if (result.monster) events.push('👹 Você encontrou um monstro: +50 Moedinhas.');
  if (result.injured) events.push('🩹 Seu pet se machucou: a recompensa foi reduzida pela metade.');
  const eventText = events.length ? `\n${events.join('\n')}` : '';
  return `🧭 Exploração concluída! Você recebeu **${formatCoins(result.reward)}**.\nAventuras concluídas: **${result.totalAventuras}**. Saldo: **${formatCoins(result.balance)}**.${eventText}`;
}

module.exports = {
  name: PET_EXPLORE,
  cooldown: PET_EXPLORE_COOLDOWN_MS,
  data: new SlashCommandBuilder().setName(PET_EXPLORE).setDescription('Envia seu pet para explorar e receber moedas.'),
  async executePrefix({ message }) {
    await message.reply(buildReply(explorePet(message.author.id)));
  },
  async executeSlash({ interaction }) {
    await interaction.editReply(buildReply(explorePet(interaction.user.id)));
  },
};