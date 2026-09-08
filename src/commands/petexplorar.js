const { SlashCommandBuilder } = require('discord.js');
const { explorePet, PET_EXPLORE_COOLDOWN_MS } = require('../services/pets');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { PET_EXPLORE } = require('./commandNames');

function buildReply(result) {
  if (!result.explored) {
    if (result.reason === 'no-pet') return '❌ Você precisa adotar um pet primeiro com `/adocao`. Eu não vou mandar um pet imaginário para a aventura.';
    return `⏳ Seu pet precisa descansar. Tente novamente em **${formatRemaining(result.remainingMs)}**; até heróis fofos precisam de pausa.`;
  }

  const events = [];
  if (result.monster) events.push('👹 Seu pet encontrou um monstro e voltou com +50 Moedinhas. Corajoso. Irritante.');
  if (result.injured) events.push('🩹 Seu pet se machucou; a recompensa foi reduzida pela metade. Cuide dele, ou eu vou ficar sentimental.');
  const eventText = events.length ? `\n${events.join('\n')}` : '';
  return `🧭 Exploração concluída. Você recebeu **${formatCoins(result.reward)}**.\nAventuras concluídas: **${result.totalAventuras}**. Saldo: **${formatCoins(result.balance)}**.${eventText}`;
}

module.exports = {
  name: PET_EXPLORE,
  cooldown: PET_EXPLORE_COOLDOWN_MS,
  data: new SlashCommandBuilder().setName(PET_EXPLORE).setDescription('Envia seu pet para explorar e receber moedas. Eu supervisiono, infelizmente.'),
  async executePrefix({ message }) {
    await message.reply(buildReply(explorePet(message.author.id)));
  },
  async executeSlash({ interaction }) {
    await interaction.editReply(buildReply(explorePet(interaction.user.id)));
  },
};