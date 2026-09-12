const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getItemsByCategory, getItemDefinition, buyItem, formatItemEffects } = require('../services/inventory');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');
const { formatCoins } = require('./economyHelpers');
const { SHOP } = require('./commandNames');
const { getLanguage, t } = require('../utils/i18n');

const CATEGORY_KEYS = [
  { key: 'comida', emoji: '🍖' },
  { key: 'cura', emoji: '🩹' },
  { key: 'utilitario', emoji: '⏳' },
  { key: 'bau', emoji: '📦' },
  { key: 'melhoria', emoji: '🏡' },
];

function getCategories(source = null) {
  return CATEGORY_KEYS.map((cat) => ({
    value: cat.key,
    emoji: cat.emoji,
    label: t(`shop.categories.${cat.key}.label`, source),
    desc: t(`shop.categories.${cat.key}.desc`, source),
  }));
}

function buildShopEmbed(category = 'comida', source = null) {
  const isEn = getLanguage(source) === 'en';
  const categories = getCategories(source);
  const items = getItemsByCategory(category);
  const catInfo = categories.find((c) => c.value === category) || categories[0];

  const itemLines = items.length === 0
    ? [t('shop.empty', source)]
    : items.map((item) => {
        const priceTag = item.buyPrice
          ? `🪙 **${formatCoins(item.buyPrice, source)}**`
          : (isEn ? '*Rare dungeon item*' : '*Item raro de dungeon*');
        const fxText = formatItemEffects(item);
        const effectLabel = isEn ? 'Effect' : 'Efeito';
        const fxLine = fxText ? `\n> 📊 **${effectLabel}:** ${fxText}` : '';
        return `**${item.emoji} ${item.name}** — ${priceTag}\n> *${item.description}*${fxLine}\n> 🏷️ *ID:* \`${item.id}\``;
      });

  const desc = [
    `*« ${catInfo.desc} »*`,
    '',
    t('shop.catalogHeader', source),
    '',
    itemLines.join('\n\n'),
    '',
    t('shop.tip', source),
  ].join('\n');

  return new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold || '#f6c343')
    .setTitle(t('shop.title', source, { emoji: catInfo.emoji, label: catInfo.label }))
    .setDescription(desc)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();
}

function buildShopComponents(currentCategory = 'comida', userId = '', source = null) {
  const categories = getCategories(source);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`shop_category_select:${userId}`)
    .setPlaceholder(t('shop.selectCatPlaceholder', source))
    .addOptions(
      categories.map((cat) => ({
        label: cat.label,
        value: cat.value,
        description: cat.desc,
        emoji: cat.emoji,
        default: cat.value === currentCategory,
      }))
    );

  const items = getItemsByCategory(currentCategory).filter((i) => i.buyPrice);
  const components = [new ActionRowBuilder().addComponents(selectMenu)];

  if (items.length > 0) {
    const buyMenu = new StringSelectMenuBuilder()
      .setCustomId(`shop_buy_select:${userId}`)
      .setPlaceholder(t('shop.buySelectPlaceholder', source))
      .addOptions(
        items.map((i) => ({
          label: `${i.name} (${formatCoins(i.buyPrice, source)})`,
          description: (i.description || '').slice(0, 45),
          value: i.id,
          emoji: i.emoji,
        }))
      );
    components.push(new ActionRowBuilder().addComponents(buyMenu));
  }

  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:inventory:${userId}`)
      .setLabel(t('shop.btnBackpack', source))
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel(t('shop.btnPet', source))
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Secondary)
  );

  components.push(buttonsRow);

  return components;
}

function isShopInteraction(interaction) {
  if (!interaction.customId) return false;
  return (
    interaction.customId.startsWith('shop_category_select') ||
    interaction.customId.startsWith('shop_buy_select')
  );
}

async function handleShopInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const targetUserId = parts[1];

  if (targetUserId && targetUserId !== interaction.user.id) {
    return interaction.reply({
      content: t('common.onlyOwner', interaction),
      flags: 64,
    });
  }

  const userId = interaction.user.id;

  if (action === 'shop_category_select') {
    const selectedCategory = interaction.values[0];
    const embed = buildShopEmbed(selectedCategory, interaction);
    const components = buildShopComponents(selectedCategory, userId, interaction);
    return interaction.update({ embeds: [embed], components });
  }

  if (action === 'shop_buy_select') {
    const itemId = interaction.values[0];
    const buyResult = buyItem(userId, itemId, 1);

    if (!buyResult.success) {
      if (buyResult.reason === 'insufficient_coins') {
        return interaction.reply({
          content: t('shop.insufficientCoins', interaction, {
            needed: formatCoins(buyResult.price, interaction),
            current: formatCoins(buyResult.currentCoins, interaction),
          }),
          flags: 64,
        });
      }
      return interaction.reply({
        content: `❌ ${buyResult.message || 'Falha ao comprar o item.'}`,
        flags: 64,
      });
    }

    const itemDef = getItemDefinition(itemId);
    const embed = buildShopEmbed(itemDef ? itemDef.category : 'comida', interaction);
    const components = buildShopComponents(itemDef ? itemDef.category : 'comida', userId, interaction);

    return interaction.update({
      content: t('shop.buySuccess', interaction, {
        emoji: itemDef ? itemDef.emoji : '📦',
        name: itemDef ? itemDef.name : itemId,
        cost: formatCoins(buyResult.totalCost, interaction),
        balance: formatCoins(buyResult.remainingCoins, interaction),
      }),
      embeds: [embed],
      components,
    });
  }
}

module.exports = {
  name: SHOP,
  data: new SlashCommandBuilder()
    .setName(SHOP)
    .setDescription('Open creature & items shop / Abre a Lojinha de Mascotes e Itens de Pyxie.')
    .setDescriptionLocalizations({
      'pt-BR': 'Abre a Lojinha de Mascotes e Itens de Pyxie.',
    })
    .addStringOption((option) =>
      option
        .setName('categoria')
        .setNameLocalizations({
          'en-US': 'category',
          'en-GB': 'category',
          'pt-BR': 'categoria',
        })
        .setDescription('Category of the shop / Categoria da loja para abrir')
        .setRequired(false)
        .addChoices(
          { name: '🍖 Comidas / Food', value: 'comida' },
          { name: '🩹 Cura & Estamina / Healing & Energy', value: 'cura' },
          { name: '⏳ Utilitários / Utilities', value: 'utilitario' },
          { name: '📦 Baús / Mystery Chests', value: 'bau' },
          { name: '🏡 Melhorias & Ninhos / Upgrades & Nests', value: 'melhoria' }
        )
    ),
  aliases: ['lojinha', 'mercado', 'mercadinho', 'shop', 'store'],
  isShopInteraction,
  handleShopInteraction,
  buildShopEmbed,
  buildShopComponents,
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const directCat = interaction.options?.getString('categoria') || interaction.options?.getString('category') || 'comida';
    const embed = buildShopEmbed(directCat, interaction);
    const components = buildShopComponents(directCat, userId, interaction);
    await interaction.editReply({ embeds: [embed], components });
  },
  async executePrefix({ message, args }) {
    const userId = message.author.id;
    const cat = args && args[0] ? args[0].toLowerCase() : 'comida';
    const validCat = CATEGORY_KEYS.some((c) => c.key === cat) ? cat : 'comida';
    const embed = buildShopEmbed(validCat, message);
    const components = buildShopComponents(validCat, userId, message);
    await message.reply({ embeds: [embed], components });
  },
};
