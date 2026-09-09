const { SlashCommandBuilder } = require('discord.js');
const { buyItem, getAllItems } = require('../services/inventory');
const { formatCoins } = require('./economyHelpers');
const { BUY } = require('./commandNames');

function getItemChoices() {
  return getAllItems()
    .filter((item) => Boolean(item.buyPrice))
    .slice(0, 25)
    .map((item) => ({
      name: `${item.emoji} ${item.name} (${formatCoins(item.buyPrice)})`,
      value: item.id,
    }));
}

function buildReply(result) {
  if (!result.success) {
    if (result.reason === 'insufficient_funds') {
      return `❌ Você precisa de **${formatCoins(result.totalCost)}**, mas seu saldo atual é de apenas **${formatCoins(result.balance)}**. Sem dinheiro, sem item.`;
    }
    return '❌ Item inválido ou indisponível para compra na loja.';
  }

  return `✅ Compra realizada com sucesso! Você adquiriu **${result.amount}x ${result.item.emoji} ${result.item.name}** por **${formatCoins(result.totalCost)}**.\nSaldo restante: **${formatCoins(result.balance)}**.`;
}

module.exports = {
  name: BUY,
  aliases: ['buy'],
  data: new SlashCommandBuilder()
    .setName(BUY)
    .setDescription('Compra um item diretamente da loja')
    .addStringOption((opt) =>
      opt
        .setName('item')
        .setDescription('Item que você deseja comprar')
        .setRequired(true)
        .addChoices(...getItemChoices())
    )
    .addIntegerOption((opt) =>
      opt
        .setName('quantidade')
        .setDescription('Quantidade a ser comprada (padrão: 1)')
        .setMinValue(1)
        .setMaxValue(99)
        .setRequired(false)
    ),
  async executePrefix({ message, args }) {
    if (!args[0]) {
      await message.reply('❌ Informe o ID do item que deseja comprar. Use `ku!loja` para ver os itens disponíveis.');
      return;
    }
    const itemId = args[0].toLowerCase();
    const amount = Number(args[1]) || 1;
    await message.reply(buildReply(buyItem(message.author.id, itemId, amount)));
  },
  async executeSlash({ interaction }) {
    const itemId = interaction.options.getString('item');
    const amount = interaction.options.getInteger('quantidade') || 1;
    await interaction.editReply(buildReply(buyItem(interaction.user.id, itemId, amount)));
  },
};
