const { SlashCommandBuilder } = require('discord.js');
const { adoptPet, PETS_CATALOG } = require('../services/pets');
const { formatCoins } = require('./economyHelpers');
const { ADOPTION } = require('./commandNames');

function getChoices() {
  return Object.values(PETS_CATALOG)
    .slice(0, 25)
    .map((pet) => ({
      name: `${pet.emoji} ${pet.name} — ${formatCoins(pet.baseCost)}`,
      value: pet.key,
    }));
}

function buildReply(result) {
  if (!result.success) {
    if (result.reason === 'invalid_species') {
      return '❌ Escolha uma espécie de pet válida. Eu não consigo adotar sua indecisão.';
    }
    if (result.reason === 'slots_full') {
      return `❌ Sua mochila de pets está cheia (${result.currentCount}/${result.maxSlots} slots)! Compre uma **Expansão de Canil** na \`/loja\` para ter mais vagas.`;
    }
    if (result.reason === 'insufficient_funds') {
      return `❌ Você precisa de **${formatCoins(result.cost)}**. Seu saldo é **${formatCoins(result.balance)}**. Faça as contas antes do drama.`;
    }
    return '❌ Não foi possível adotar este pet no momento.';
  }

  const shinyLabel = result.shiny ? ' ✨ **Shiny!**' : result.corrupt ? ' 🖤 **Corrompido!**' : '';
  return `✅ Parabéns! Você adotou **${result.pet.emoji} ${result.pet.name}**${shinyLabel} por **${formatCoins(result.pet.baseCost || 0)}**!\nSaldo restante: **${formatCoins(result.balance)}**.\nUse \`/pet\` para visualizar seu novo companheiro!`;
}

function normalizePet(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
  name: ADOPTION,
  aliases: ['adotar'],
  data: new SlashCommandBuilder()
    .setName(ADOPTION)
    .setDescription('Adota um novo companheiro para a sua coleção de pets')
    .addStringOption((option) =>
      option
        .setName('pet')
        .setDescription('Espécie que você deseja adotar')
        .setRequired(true)
        .addChoices(...getChoices())
    ),
  async executePrefix({ message, args }) {
    if (!args[0]) {
      await message.reply('❌ Informe o pet que deseja adotar. Exemplo: `ku!adocao gato`. Use `ku!ajuda` para ver mais.');
      return;
    }
    await message.reply(buildReply(adoptPet(message.author.id, normalizePet(args[0]))));
  },
  async executeSlash({ interaction }) {
    const petKey = interaction.options.getString('pet');
    await interaction.editReply(buildReply(adoptPet(interaction.user.id, petKey)));
  },
};