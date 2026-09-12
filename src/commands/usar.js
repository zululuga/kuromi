const { SlashCommandBuilder } = require('discord.js');
const { useItemOnActivePet } = require('../services/pets');
const { getAllItems } = require('../services/inventory');
const { t } = require('../utils/i18n');
const { USE } = require('./commandNames');

function getItemChoices() {
  return getAllItems()
    .slice(0, 25)
    .map((item) => ({
      name: `${item.emoji} ${item.name}`,
      value: item.id,
    }));
}

function buildReply(result, source = null) {
  if (!result.success) {
    if (result.reason === 'no_pet') {
      return t('useCmd.noPet', source);
    }
    if (result.reason === 'no_item') {
      return t('useCmd.noItem', source);
    }
    return t('useCmd.invalid', source);
  }

  let levelMsg = '';
  if (result.leveledUp) {
    levelMsg = t('useCmd.levelUp', source, { level: result.newLevel });
  }

  if (result.applied === 'expansion') {
    return t('useCmd.expansion', source, { item: result.item.name, slots: result.newMaxSlots });
  }

  const effectsText = result.effectsSummary ? t('useCmd.effects', source, { fx: result.effectsSummary }) : '';
  const statusText = result.statusSummary ? t('useCmd.status', source, { name: result.pet?.name, status: result.statusSummary }) : '';

  return t('useCmd.success', source, {
    emoji: result.item ? result.item.emoji : '📦',
    name: result.item ? result.item.name : 'item',
    petName: result.pet?.name || '',
    effects: effectsText,
    status: statusText,
    levelMsg,
  });
}

module.exports = {
  name: USE,
  aliases: ['use', 'consumir', 'usar'],
  buildReply,
  data: new SlashCommandBuilder()
    .setName(USE)
    .setDescription('Use an item from your backpack on your active Pymon / Usa item no pet.')
    .setDescriptionLocalizations({
      'pt-BR': 'Utiliza um item da sua mochila no seu pet ativo.',
    })
    .addStringOption((opt) =>
      opt
        .setName('item')
        .setDescription('Item to be used / Item a ser utilizado')
        .setRequired(true)
        .addChoices(...getItemChoices())
    ),
  async executePrefix({ message, args }) {
    if (!args[0]) {
      await message.reply(t('useCmd.needItemPrefix', message));
      return;
    }
    const itemId = args[0].toLowerCase();
    await message.reply(buildReply(useItemOnActivePet(message.author.id, itemId), message));
  },
  async executeSlash({ interaction }) {
    const itemId = interaction.options.getString('item');
    await interaction.editReply(buildReply(useItemOnActivePet(interaction.user.id, itemId), interaction));
  },
};
