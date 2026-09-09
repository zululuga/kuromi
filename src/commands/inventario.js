const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getUserInventory, getItemDefinition, sellItem, openChest } = require('../services/inventory');
const { useItemOnActivePet, getActivePet } = require('../services/pets');
const { formatCoins } = require('./economyHelpers');
const { INVENTORY } = require('./commandNames');

function buildInventoryEmbed(userId, userTag, selectedItemId = null) {
  const inv = getUserInventory(userId);
  const entries = Object.entries(inv).filter(([, count]) => count > 0);
  const activePet = getActivePet(userId);

  const embed = new EmbedBuilder()
    .setColor('#C084FC')
    .setTitle(`🎒  ✦  Mochila de ${userTag}`)
    .setDescription(
      `**Pet Ativo:** ${activePet ? `${activePet.emoji} **${activePet.name}** (Lv ${activePet.level})` : '*Nenhum pet ativo*'}\n\n` +
      'Selecione um item no menu abaixo para usar no seu pet ou vender.'
    )
    .setFooter({ text: 'Cringelândia • Inventário Pessoal • Cuide bem dos seus pertences' })
    .setTimestamp();

  if (entries.length === 0) {
    embed.addFields({
      name: 'Mochila Vazia',
      value: 'Você ainda não possui nenhum item. Visite a `/loja` ou envie seu pet para `/petexplorar`!',
    });
  } else {
    entries.forEach(([itemId, count]) => {
      const item = getItemDefinition(itemId);
      if (item) {
        const isSelected = item.id === selectedItemId;
        const pointer = isSelected ? '👉 ' : '';
        embed.addFields({
          name: `${pointer}${item.emoji} ${item.name} (x${count})`,
          value: `> *${item.description}*\n> Categoria: \`${item.category}\` • Valor de Venda: **${formatCoins(item.sellPrice || 0)}**`,
          inline: false,
        });
      }
    });
  }

  return embed;
}

function buildInventoryComponents(userId, selectedItemId = null) {
  const inv = getUserInventory(userId);
  const entries = Object.entries(inv).filter(([, count]) => count > 0);

  if (entries.length === 0) {
    return [];
  }

  const options = entries.slice(0, 25).map(([itemId, count]) => {
    const item = getItemDefinition(itemId);
    return {
      label: `${item ? item.name : itemId} (x${count})`,
      value: itemId,
      emoji: item ? item.emoji : '📦',
      description: item ? item.description.slice(0, 50) : '',
      default: itemId === selectedItemId,
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`inv_select:${userId}`)
    .setPlaceholder('🎒 Selecione um item da sua mochila...')
    .addOptions(options);

  const rows = [new ActionRowBuilder().addComponents(selectMenu)];

  if (selectedItemId) {
    const selectedItem = getItemDefinition(selectedItemId);
    const actionButtons = [];

    if (selectedItem?.effects?.isChest) {
      actionButtons.push(
        new ButtonBuilder()
          .setCustomId(`inv_chest:${userId}:${selectedItemId}`)
          .setLabel(`Abrir ${selectedItem.name}`)
          .setEmoji('🔓')
          .setStyle(ButtonStyle.Success)
      );
    } else {
      actionButtons.push(
        new ButtonBuilder()
          .setCustomId(`inv_use:${userId}:${selectedItemId}`)
          .setLabel(`Usar no Pet (${selectedItem?.name || 'Item'})`)
          .setEmoji('✨')
          .setStyle(ButtonStyle.Primary)
      );
    }

    if (selectedItem?.sellPrice) {
      actionButtons.push(
        new ButtonBuilder()
          .setCustomId(`inv_sell:${userId}:${selectedItemId}:1`)
          .setLabel(`Vender 1x (+${selectedItem.sellPrice}🪙)`)
          .setEmoji('🪙')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (actionButtons.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(actionButtons));
    }
  }

  return rows;
}

function isInventoryInteraction(interaction) {
  return (
    (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_select:')) ||
    (interaction.isButton() &&
      (interaction.customId.startsWith('inv_use:') ||
        interaction.customId.startsWith('inv_sell:') ||
        interaction.customId.startsWith('inv_chest:')))
  );
}

async function handleInventoryInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const ownerId = parts[1];

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: '❌ Você não pode mexer na mochila de outra pessoa!',
      ephemeral: true,
    });
    return;
  }

  // 1. Seleção de Item
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_select:')) {
    const selectedItemId = interaction.values[0];
    const embed = buildInventoryEmbed(ownerId, interaction.user.displayName, selectedItemId);
    const components = buildInventoryComponents(ownerId, selectedItemId);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  // 2. Usar Item no Pet
  if (interaction.isButton() && interaction.customId.startsWith('inv_use:')) {
    const itemId = parts[2];
    const result = useItemOnActivePet(ownerId, itemId);

    if (!result.success) {
      if (result.reason === 'no_pet') {
        await interaction.reply({ content: '❌ Você precisa de um pet ativo para usar este item! Adote com `/adocao`.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Você não possui este item ou ele não pode ser usado.', ephemeral: true });
      }
      return;
    }

    let extraMsg = '';
    if (result.leveledUp) {
      extraMsg = `\n🎉 **LEVEL UP!** Seu pet atingiu o **Nível ${result.newLevel}**! Seus atributos aumentaram!`;
    }

    const embed = buildInventoryEmbed(ownerId, interaction.user.displayName, null);
    const components = buildInventoryComponents(ownerId, null);

    await interaction.update({ embeds: [embed], components });
    await interaction.followUp({
      content: `✨ Você usou **${result.item.emoji} ${result.item.name}** no seu pet **${result.pet?.name || 'Pet'}**!${extraMsg}`,
      ephemeral: true,
    });
    return;
  }

  // 3. Abrir Baú
  if (interaction.isButton() && interaction.customId.startsWith('inv_chest:')) {
    const chestId = parts[2];
    const result = openChest(ownerId, chestId);

    if (!result.success) {
      await interaction.reply({ content: '❌ Não foi possível abrir o baú.', ephemeral: true });
      return;
    }

    const dropText = result.droppedItem ? `\n🎁 Item bônus encontrado: **${result.droppedItem.emoji} ${result.droppedItem.name}**!` : '';
    const embed = buildInventoryEmbed(ownerId, interaction.user.displayName, null);
    const components = buildInventoryComponents(ownerId, null);

    await interaction.update({ embeds: [embed], components });
    await interaction.followUp({
      content: `🔓 Você abriu o **${result.chest.name}** e encontrou **+${formatCoins(result.coinsAwarded)}**!${dropText}`,
      ephemeral: true,
    });
    return;
  }

  // 4. Vender Item
  if (interaction.isButton() && interaction.customId.startsWith('inv_sell:')) {
    const itemId = parts[2];
    const amount = Number(parts[3] || 1);
    const result = sellItem(ownerId, itemId, amount);

    if (!result.success) {
      await interaction.reply({ content: '❌ Não foi possível vender este item.', ephemeral: true });
      return;
    }

    const embed = buildInventoryEmbed(ownerId, interaction.user.displayName, null);
    const components = buildInventoryComponents(ownerId, null);

    await interaction.update({ embeds: [embed], components });
    await interaction.followUp({
      content: `🪙 Você vendeu **${amount}x ${result.item.emoji} ${result.item.name}** por **+${formatCoins(result.earnings)}**! Saldo: **${formatCoins(result.balance)}**.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  name: INVENTORY,
  aliases: ['mochila', 'bag', 'itens', 'inv'],
  data: new SlashCommandBuilder()
    .setName(INVENTORY)
    .setDescription('Exibe sua mochila de itens com menu interativo e opções de uso/venda'),
  async executePrefix({ message }) {
    await message.reply({
      embeds: [buildInventoryEmbed(message.author.id, message.author.displayName)],
      components: buildInventoryComponents(message.author.id),
    });
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({
      embeds: [buildInventoryEmbed(interaction.user.id, interaction.user.displayName)],
      components: buildInventoryComponents(interaction.user.id),
    });
  },
  isInventoryInteraction,
  handleInventoryInteraction,
};
