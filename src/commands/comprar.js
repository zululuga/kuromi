const { SlashCommandBuilder } = require('discord.js');
const { buyItem, getAllItems } = require('../services/inventory');
const { formatCoins, t } = require('../utils/i18n');
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

function buildReply(result, source = null) {
  if (!result.success) {
    if (result.reason === 'insufficient_funds') {
      return t('buy.insufficientFunds', source, {
        cost: formatCoins(result.totalCost, source),
        balance: formatCoins(result.balance, source),
      });
    }
    return t('buy.invalidItem', source);
  }

  return t('buy.success', source, {
    amount: result.amount,
    emoji: result.item.emoji,
    name: result.item.name,
    cost: formatCoins(result.totalCost, source),
    balance: formatCoins(result.balance, source),
  });
}

module.exports = {
  name: BUY,
  aliases: ['buy'],
  buildReply,
  data: new SlashCommandBuilder()
    .setName(BUY)
    .setDescription('Buy an item directly from the shop / Compra um item diretamente da loja.')
    .setDescriptionLocalizations({
      'pt-BR': 'Compra um item diretamente da loja.',
    })
    .addStringOption((opt) =>
      opt
        .setName('item')
        .setDescription('Item you want to buy / Item que você deseja comprar')
        .setRequired(true)
        .addChoices(...getItemChoices())
    )
    .addIntegerOption((opt) =>
      opt
        .setName('quantidade')
        .setNameLocalizations({
          'en-US': 'amount',
          'en-GB': 'amount',
          'pt-BR': 'quantidade',
        })
        .setDescription('Quantity to purchase / Quantidade a comprar')
        .setMinValue(1)
        .setMaxValue(99)
        .setRequired(false)
    ),
  async executePrefix({ message, args }) {
    if (!args[0]) {
      await message.reply(t('buy.needIdPrefix', message));
      return;
    }
    const itemId = args[0].toLowerCase();
    const amount = Number(args[1]) || 1;
    await message.reply(buildReply(buyItem(message.author.id, itemId, amount), message));
  },
  async executeSlash({ interaction }) {
    const itemId = interaction.options.getString('item');
    const amount = interaction.options.getInteger('quantidade') || interaction.options.getInteger('amount') || 1;
    await interaction.editReply(buildReply(buyItem(interaction.user.id, itemId, amount), interaction));
  },
};
