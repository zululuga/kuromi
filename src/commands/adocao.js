const { SlashCommandBuilder } = require('discord.js');
const { adoptPet, PETS, PET_SWAP_COST } = require('../services/pets');
const { formatCoins } = require('./economyHelpers');
const { ADOPTION } = require('./commandNames');

function getChoices() {
  return PETS.map((pet) => ({ name: `${pet.label} - ${formatCoins(pet.baseCost)}`, value: pet.key }));
}

function buildReply(result) {
  if (!result.adopted) {
    if (result.reason === 'invalid') return '❌ Escolha um pet válido.';
    return `❌ Você precisa de **${formatCoins(result.totalCost)}**. Seu saldo é **${formatCoins(result.balance)}**.`;
  }

  const shinyLabel = result.shiny ? ' ✨ Shiny' : '';
  const swapLabel = result.totalCost > result.pet.baseCost
    ? ` (inclui ${formatCoins(PET_SWAP_COST)} pelo sacrifício do pet anterior)`
    : '';
  return `✅ Você adotou **${result.pet.label}${shinyLabel}** por **${formatCoins(result.totalCost)}**${swapLabel}. Saldo: **${formatCoins(result.balance)}**.`;
}

function normalizePet(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
  name: ADOPTION,
  aliases: ['adotar'],
  data: new SlashCommandBuilder()
    .setName(ADOPTION)
    .setDescription('Adota um pet pelo custo base.')
    .addStringOption((option) => option.setName('pet').setDescription('Pet que você deseja adotar').setRequired(true).addChoices(...getChoices())),
  async executePrefix({ message, args }) {
    await message.reply(buildReply(adoptPet(message.author.id, normalizePet(args[0]))));
  },
  async executeSlash({ interaction }) {
    await interaction.editReply(buildReply(adoptPet(interaction.user.id, interaction.options.getString('pet'))));
  },
};