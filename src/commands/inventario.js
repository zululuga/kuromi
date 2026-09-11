const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getUserInventory, getItemDefinition, sellItem, openChest, formatItemEffects } = require('../services/inventory');
const { useItemOnActivePet, getActivePet, hasClaimedStarterKit, claimStarterKit, putEggInIncubator, getIncubator } = require('../services/pets');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');
const { formatCoins } = require('./economyHelpers');
const { INVENTORY } = require('./commandNames');

function buildInventoryEmbed(userId, userTag, selectedItemId = null) {
  const inv = getUserInventory(userId);
  const entries = Object.entries(inv).filter(([, count]) => count > 0);
  const activePet = getActivePet(userId);

  const petLine = activePet
    ? `> ${activePet.emoji} **${activePet.name}** (Nv. ${activePet.level})`
    : '> *Nenhum Pymon ativo no momento*';

  const itemLines = entries.length === 0
    ? ['> *Sua mochila está vazia! Visite a `/loja` ou explore as dungeons com seu pet.*']
    : entries.map(([itemId, count]) => {
        const item = getItemDefinition(itemId);
        if (!item) return `> • \`${itemId}\`: **${count}x**`;
        const isSelected = item.id === selectedItemId;
        const pointer = isSelected ? '👉 ' : '';
        const fxText = formatItemEffects(item);
        const fxLine = fxText ? `\n> 📊 **Efeito:** ${fxText}` : '';
        return `**${pointer}${item.emoji} ${item.name}** (x${count})\n> *${item.description}*${fxLine}\n> 🏷️ Categoria: \`${item.category}\`  •  🪙 Venda: **${formatCoins(item.sellPrice || 0)}**`;
      });

  const desc = [
    '🐾 **COMPANHEIRO ATIVO**',
    petLine,
    '',
    '📦 **ITENS GUARDADOS NA MOCHILA**',
    '',
    itemLines.join('\n\n'),
    '',
    '💡 *Selecione um item no menu suspenso abaixo para usá-lo ou vendê-lo:*',
  ].join('\n');

  return new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta)
    .setTitle(`🎒  ✦  Mochila de ${userTag}`)
    .setDescription(desc)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();
}

function buildInventoryComponents(userId, selectedItemId = null) {
  const inv = getUserInventory(userId);
  const entries = Object.entries(inv).filter(([, count]) => count > 0);

  if (entries.length === 0) {
    const emptyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_tab:shop:${userId}`)
        .setLabel('Visitar Loja')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:dungeon:${userId}`)
        .setLabel('Explorar Dungeons')
        .setEmoji('🧭')
        .setStyle(ButtonStyle.Primary)
    );

    if (!hasClaimedStarterKit(userId)) {
      emptyRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`hub_claim_kit:${userId}`)
          .setLabel('Resgatar Kit Inicial')
          .setEmoji('🎁')
          .setStyle(ButtonStyle.Success)
      );
    }

    return [emptyRow];
  }

  const selectOptions = entries.slice(0, 25).map(([itemId, count]) => {
    const item = getItemDefinition(itemId);
    return {
      label: `${item ? item.name : itemId} (x${count})`,
      value: itemId,
      description: item ? item.description.slice(0, 50) : `Quantidade: ${count}`,
      emoji: item ? item.emoji : '📦',
      default: itemId === selectedItemId,
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`inv_item_select:${userId}`)
    .setPlaceholder('📦 Selecione um item da sua mochila...')
    .addOptions(selectOptions);

  const actionRow = new ActionRowBuilder();

  if (selectedItemId) {
    const item = getItemDefinition(selectedItemId);
    const count = inv[selectedItemId] || 0;

    if (item && count > 0) {
      if (item.effects && item.effects.isChest) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_open_chest:${selectedItemId}:${userId}`)
            .setLabel(`Abrir ${item.name}`)
            .setEmoji('🔓')
            .setStyle(ButtonStyle.Success)
        );
      } else if (item.effects && item.effects.isEgg) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_place_egg:${selectedItemId}:${userId}`)
            .setLabel(`Colocar na Chocadeira`)
            .setEmoji('🪺')
            .setStyle(ButtonStyle.Success)
        );
      } else {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_use_item:${selectedItemId}:${userId}`)
            .setLabel(`Usar no Pet Ativo`)
            .setEmoji('✨')
            .setStyle(ButtonStyle.Success)
        );
      }

      if (item.sellPrice) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_sell_item:${selectedItemId}:${userId}`)
            .setLabel(`Vender 1x (${formatCoins(item.sellPrice)})`)
            .setEmoji('🪙')
            .setStyle(ButtonStyle.Secondary)
        );
      }
    }
  } else {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_hint:${userId}`)
        .setLabel('Selecione um item acima')
        .setEmoji('☝️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  }

  actionRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel('Ver Meu Pymon')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Primary)
  );

  return [new ActionRowBuilder().addComponents(selectMenu), actionRow];
}

function isInventoryInteraction(interaction) {
  if (!interaction.customId) return false;
  return (
    interaction.customId.startsWith('inv_item_select') ||
    interaction.customId.startsWith('inv_use_item') ||
    interaction.customId.startsWith('inv_open_chest') ||
    interaction.customId.startsWith('inv_place_egg') ||
    interaction.customId.startsWith('inv_sell_item')
  );
}

async function handleInventoryInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const targetUserId = parts[parts.length - 1];

  if (targetUserId && targetUserId !== interaction.user.id) {
    return interaction.reply({
      content: '❌ Esta mochila pertence a outro aventureiro. Use `/inventario` para abrir a sua!',
      flags: 64,
    });
  }

  const userId = interaction.user.id;
  const userTag = interaction.user.displayName || interaction.user.username;

  // 1. Selecionar Item no menu
  if (action === 'inv_item_select') {
    const selectedItemId = interaction.values[0];
    const embed = buildInventoryEmbed(userId, userTag, selectedItemId);
    const components = buildInventoryComponents(userId, selectedItemId);
    return interaction.update({ embeds: [embed], components });
  }

  // 2. Usar Item no pet ativo
  if (action === 'inv_use_item') {
    const itemId = parts[1];
    const result = useItemOnActivePet(userId, itemId);

    if (!result.success) {
      if (result.reason === 'no_active_pet') {
        return interaction.reply({
          content: '❌ Você precisa de um pet ativo para usar itens consumíveis!',
          flags: 64,
        });
      }
      return interaction.reply({
        content: `❌ ${result.message || 'Não foi possível usar este item.'}`,
        flags: 64,
      });
    }

    const embed = buildInventoryEmbed(userId, userTag, null);
    const components = buildInventoryComponents(userId, null);
    const fxSummary = result.effectsSummary ? ` (${result.effectsSummary})` : '';

    return interaction.update({
      content: `✨ Você usou 1x **${result.item ? result.item.name : itemId}** no seu pet!${fxSummary}`,
      embeds: [embed],
      components,
    });
  }

  // 3. Colocar ovo na chocadeira
  if (action === 'inv_place_egg') {
    const eggId = parts[1];
    const incubator = getIncubator(userId);
    const emptySlot = incubator.slots.find((s) => s.empty);
    if (!emptySlot) {
      return interaction.reply({
        content: '❌ Não há ninhos vazios na sua chocadeira! Aguarde um ovo chocar ou expanda seus ninhos.',
        flags: 64,
      });
    }
    const res = putEggInIncubator(userId, eggId, emptySlot.slotIndex);
    if (!res.success) {
      return interaction.reply({ content: `❌ ${res.message}`, flags: 64 });
    }
    const embed = buildInventoryEmbed(userId, userTag, null);
    const components = buildInventoryComponents(userId, null);
    return interaction.update({
      content: res.message,
      embeds: [embed],
      components,
    });
  }

  // 4. Abrir Baú
  if (action === 'inv_open_chest') {
    const chestId = parts[1];
    const openRes = openChest(userId, chestId);

    if (!openRes.success) {
      return interaction.reply({
        content: '❌ Não foi possível abrir o baú.',
        flags: 64,
      });
    }

    const embed = buildInventoryEmbed(userId, userTag, null);
    const components = buildInventoryComponents(userId, null);
    const itemsWonStr = openRes.itemsWon.length > 0 ? ` + itens: ${openRes.itemsWon.join(', ')}` : '';

    return interaction.update({
      content: `🔓 **Baú Aberto!** Você encontrou **+${formatCoins(openRes.coinsWon)}**${itemsWonStr}!`,
      embeds: [embed],
      components,
    });
  }

  // 5. Vender Item
  if (action === 'inv_sell_item') {
    const itemId = parts[1];
    const sellRes = sellItem(userId, itemId, 1);

    if (!sellRes.success) {
      return interaction.reply({
        content: `❌ ${sellRes.message || 'Falha ao vender.'}`,
        flags: 64,
      });
    }

    const embed = buildInventoryEmbed(userId, userTag, null);
    const components = buildInventoryComponents(userId, null);

    return interaction.update({
      content: `🪙 Você vendeu 1x **${sellRes.item.name}** por **${formatCoins(sellRes.totalCoins)}**!`,
      embeds: [embed],
      components,
    });
  }
}

module.exports = {
  name: INVENTORY,
  data: new SlashCommandBuilder()
    .setName(INVENTORY)
    .setDescription('Visualiza e gerencia a sua mochila de itens e ovos.'),
  aliases: ['mochila', 'inv', 'bag'],
  isInventoryInteraction,
  handleInventoryInteraction,
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const userTag = interaction.user.displayName || interaction.user.username;
    const embed = buildInventoryEmbed(userId, userTag, null);
    const components = buildInventoryComponents(userId, null);
    await interaction.editReply({ embeds: [embed], components });
  },
  async executePrefix({ message }) {
    const userId = message.author.id;
    const userTag = message.author.displayName || message.author.username;
    const embed = buildInventoryEmbed(userId, userTag, null);
    const components = buildInventoryComponents(userId, null);
    await message.reply({ embeds: [embed], components });
  },
};
