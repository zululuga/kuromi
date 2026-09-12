const { SlashCommandBuilder } = require('discord.js');
const { sellItem, getAllItems } = require('../services/inventory');
const { formatCoins, t } = require('../utils/i18n');
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

function buildReply(result, source = null) {
  if (!result.success) {
    if (result.reason === 'insufficient_items') {
      return t('sell.insufficientItems', source, { count: result.currentCount });
    }
    if (result.reason === 'untradable') {
      return t('sell.untradable', source);
    }
    return t('sell.invalidItem', source);
  }

  return t('sell.success', source, {
    amount: result.amount,
    emoji: result.item.emoji,
    name: result.item.name,
    earnings: formatCoins(result.earnings, source),
    balance: formatCoins(result.balance, source),
  });
}

module.exports = {
  name: SELL,
  aliases: ['sell', 'vender'],
  buildReply,
  data: new SlashCommandBuilder()
    .setName(SELL)
    .setDescription('Sell items from your backpack for coins / Vende itens da mochila por moedas.')
    .setDescriptionLocalizations({
      'pt-BR': 'Vende itens da sua mochila por moedinhas.',
    })
    .addStringOption((opt) =>
      opt
        .setName('item')
        .setDescription('Item you want to sell / Item que deseja vender')
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
        .setDescription('Quantity to sell / Quantidade a vender')
        .setMinValue(1)
        .setMaxValue(99)
        .setRequired(false)
    ),
  async executePrefix({ message, args }) {
    if (!args[0]) {
      await message.reply(t('sell.needIdPrefix', message));
      return;
    }
    const itemId = args[0].toLowerCase();
    const amount = Number(args[1]) || 1;
    await message.reply(buildReply(sellItem(message.author.id, itemId, amount), message));
  },
  async executeSlash({ interaction }) {
    const itemId = interaction.options.getString('item');
    const amount = interaction.options.getInteger('quantidade') || interaction.options.getInteger('amount') || 1;
    await interaction.editReply(buildReply(sellItem(interaction.user.id, itemId, amount), interaction));
  },
};
