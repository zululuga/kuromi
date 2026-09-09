const { SlashCommandBuilder } = require('discord.js');
const { sellItem, getAllItems } = require('../services/inventory');
const { formatCoins } = require('./economyHelpers');
const { SELL } = require('./commandNames');

function getItemChoices() {
  return getAllItems()
    .filter((item) => Boolean(item.sellPrice))
    .slice(0, 25)
    .map((item) => ({
      name: `${item.emoji} ${item.name} (+${formatCoins(item.sellPrice)})`,
      value: item.id,
    }));
}

function buildReply(result) {
  if (!result.success) {
    if (result.reason === 'insufficient_items') {
      return `❌ Você não possui itens suficientes na sua mochila (Você tem: **${result.currentCount}x**).`;
    }
    if (result.reason === 'untradable') {
      return '❌ Este item não pode ser vendido.';
    }
    return '❌ Item inválido ou não encontrado.';
  }

  return `🪙 Você vendeu **${result.amount}x ${result.item.emoji} ${result.item.name}** e recebeu **+${formatCoins(result.earnings)}**!\nNovo saldo: **${formatCoins(result.balance)}**.`;
}

module.exports = {
  name: SELL,
  aliases: ['sell'],
  data: new SlashCommandBuilder()
    .setName(SELL)
    .setDescription('Vende itens da sua mochila por moedinhas')
    .addStringOption((opt) =>
      opt
        .setName('item')
        .setDescription('Item que você deseja vender')
        .setRequired(true)
        .addChoices(...getItemChoices())
    )
    .addIntegerOption((opt) =>
      opt
        .setName('quantidade')
        .setDescription('Quantidade a ser vendida (padrão: 1)')
        .setMinValue(1)
        .setMaxValue(99)
        .setRequired(false)
    ),
  async executePrefix({ message, args }) {
    if (!args[0]) {
      await message.reply('❌ Informe o item que deseja vender. Use `ku!inventario` para ver o que você possui.');
      return;
    }
    const itemId = args[0].toLowerCase();
    const amount = Number(args[1]) || 1;
    await message.reply(buildReply(sellItem(message.author.id, itemId, amount)));
  },
  async executeSlash({ interaction }) {
    const itemId = interaction.options.getString('item');
    const amount = interaction.options.getInteger('quantidade') || 1;
    await interaction.editReply(buildReply(sellItem(interaction.user.id, itemId, amount)));
  },
};
