const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getItemsByCategory, getItemDefinition, buyItem, formatItemEffects } = require('../services/inventory');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');
const { formatCoins } = require('./economyHelpers');
const { SHOP } = require('./commandNames');

const CATEGORIES = [
  { label: 'Comidas & Nutrição', value: 'comida', emoji: '🍖', desc: 'Rações e petiscos para o pet' },
  { label: 'Cura & Estamina', value: 'cura', emoji: '🩹', desc: 'Curativos e poções de estamina' },
  { label: 'Utilitários & Aceleração', value: 'utilitario', emoji: '⏳', desc: 'Ampulhetas de choco e elixires' },
  { label: 'Baús Misteriosos', value: 'bau', emoji: '📦', desc: 'Baús com moedas e itens raros' },
  { label: 'Melhorias & Ninhos', value: 'melhoria', emoji: '🏡', desc: 'Ninhos e expansões de mochila' },
];

function buildShopEmbed(category = 'comida') {
  const items = getItemsByCategory(category);
  const catInfo = CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold)
    .setTitle(`${catInfo.emoji}  ✦  Lojinha da Pyxie — ${catInfo.label}`)
    .setDescription(
      `*${catInfo.desc}*\n\n` +
      'Escolha a categoria no menu abaixo ou compre usando o menu de compra rápida.\n' +
      'Pyxie não dá fiado nem aceita choro.'
    )
    .setFooter({ text: pyxieFooter('Preços Oficiais • 1-Clique Acessível') })
    .setTimestamp();

  if (items.length === 0) {
    embed.addFields({ name: 'Vazio', value: 'Nenhum item disponível nesta categoria no momento.' });
  } else {
    items.forEach((item) => {
      const priceTag = item.buyPrice ? `**${formatCoins(item.buyPrice)}**` : '*Item raro de dungeon*';
      const fxText = formatItemEffects(item);
      const fxLine = fxText ? `\n> 📊 **Efeito:** ${fxText}` : '';
      embed.addFields({
        name: `${item.emoji} ${item.name} — ${priceTag}`,
        value: `> ${item.description}${fxLine}\n> *ID para compra:* \`${item.id}\``,
        inline: false,
      });
    });
  }

  return embed;
}

function buildShopComponents(currentCategory = 'comida', userId = '') {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`shop_category_select:${userId}`)
    .setPlaceholder('📂 Escolha uma categoria da loja...')
    .addOptions(
      CATEGORIES.map((cat) => ({
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
      .setPlaceholder('🛒 Comprar item com 1 clique...')
      .addOptions(
        items.map((i) => ({
          label: `${i.name} (${formatCoins(i.buyPrice)})`,
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
      .setLabel('Abrir Mochila')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel('Ver Meu Pet')
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
      content: '❌ Esta lojinha pertence a outro aventureiro. Use `/loja` para abrir a sua!',
      flags: 64,
    });
  }

  const userId = interaction.user.id;

  if (action === 'shop_category_select') {
    const selectedCategory = interaction.values[0];
    const embed = buildShopEmbed(selectedCategory);
    const components = buildShopComponents(selectedCategory, userId);
    return interaction.update({ embeds: [embed], components });
  }

  if (action === 'shop_buy_select') {
    const itemId = interaction.values[0];
    const buyResult = buyItem(userId, itemId, 1);

    if (!buyResult.success) {
      if (buyResult.reason === 'insufficient_coins') {
        return interaction.reply({
          content: `❌ Você precisa de **${formatCoins(buyResult.price)}**, mas só tem **${formatCoins(buyResult.currentCoins)}**!`,
          flags: 64,
        });
      }
      return interaction.reply({
        content: `❌ ${buyResult.message || 'Falha ao comprar o item.'}`,
        flags: 64,
      });
    }

    const itemDef = getItemDefinition(itemId);
    const embed = buildShopEmbed(itemDef ? itemDef.category : 'comida');
    const components = buildShopComponents(itemDef ? itemDef.category : 'comida', userId);

    return interaction.update({
      content: `🎉 **Compra Realizada!** Você comprou 1x ${itemDef ? itemDef.emoji : '📦'} **${itemDef ? itemDef.name : itemId}** por **${formatCoins(buyResult.totalCost)}**! (Saldo restante: **${formatCoins(buyResult.remainingCoins)}**)`,
      embeds: [embed],
      components,
    });
  }
}

module.exports = {
  name: SHOP,
  data: new SlashCommandBuilder()
    .setName(SHOP)
    .setDescription('Abre a Lojinha de Mascotes e Itens de Pyxie com categorias e compras em 1 clique.')
    .addStringOption((option) =>
      option
        .setName('categoria')
        .setDescription('Categoria da loja para abrir diretamente')
        .setRequired(false)
        .addChoices(
          { name: 'Comidas & Nutrição', value: 'comida' },
          { name: 'Cura & Estamina', value: 'cura' },
          { name: 'Utilitários & Ampulhetas', value: 'utilitario' },
          { name: 'Baús Misteriosos', value: 'bau' },
          { name: 'Melhorias & Ninhos', value: 'melhoria' }
        )
    ),
  aliases: ['lojinha', 'mercado', 'mercadinho', 'shop'],
  isShopInteraction,
  handleShopInteraction,
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const directCat = interaction.options?.getString('categoria') || 'comida';
    const embed = buildShopEmbed(directCat);
    const components = buildShopComponents(directCat, userId);
    await interaction.editReply({ embeds: [embed], components });
  },
  async executePrefix({ message, args }) {
    const userId = message.author.id;
    const cat = args && args[0] ? args[0].toLowerCase() : 'comida';
    const validCat = CATEGORIES.some((c) => c.value === cat) ? cat : 'comida';
    const embed = buildShopEmbed(validCat);
    const components = buildShopComponents(validCat, userId);
    await message.reply({ embeds: [embed], components });
  },
};
