const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getItemsByCategory, getItemDefinition, buyItem, formatItemEffects } = require('../services/inventory');
const { formatCoins } = require('./economyHelpers');
const { SHOP } = require('./commandNames');

const CATEGORIES = [
  { label: 'Comidas & Nutrição', value: 'comida', emoji: '🍖', desc: 'Rações e guloseimas para saciar a fome do pet' },
  { label: 'Cura & Remédios', value: 'cura', emoji: '🩹', desc: 'Curativos e poções revitalizantes' },
  { label: 'Utilitários & XP', value: 'utilitario', emoji: '⚡', desc: 'Elixires de evolução e aceleradores' },
  { label: 'Baús Misteriosos', value: 'bau', emoji: '📦', desc: 'Baús com moedas, comidas e itens raros' },
  { label: 'Evolução & Melhorias', value: 'evolucao', emoji: '🔮', desc: 'Cristais e expansões de canil' },
];

function buildShopEmbed(category = 'comida') {
  const items = getItemsByCategory(category);
  const catInfo = CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];

  const embed = new EmbedBuilder()
    .setColor('#E60067')
    .setTitle(`${catInfo.emoji}  ✦  Lojinha da Kuromi — ${catInfo.label}`)
    .setDescription(
      `*${catInfo.desc}*\n\n` +
      'Escolha a categoria no menu abaixo ou compre usando `/comprar <item>`.\n' +
      'Kuromi não dá fiado nem aceita choro.'
    )
    .setFooter({ text: 'Cringelândia • Loja Oficial • Preços não negociáveis' })
    .setTimestamp();

  if (items.length === 0) {
    embed.addFields({ name: 'Vazio', value: 'Nenhum item disponível nesta categoria no momento.' });
  } else {
    items.forEach((item) => {
      const priceTag = item.buyPrice ? `**${formatCoins(item.buyPrice)}**` : '*Item não vendível*';
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

function buildShopComponents(currentCategory = 'comida') {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('shop_category_select')
    .setPlaceholder('📂 Escolha uma categoria da loja...')
    .addOptions(
      CATEGORIES.map((cat) => ({
        label: cat.label,
        value: cat.value,
        emoji: cat.emoji,
        description: cat.desc.slice(0, 50),
        default: cat.value === currentCategory,
      }))
    );

  const items = getItemsByCategory(currentCategory).filter((i) => Boolean(i.buyPrice)).slice(0, 5);
  const buyButtons = items.map((item) =>
    new ButtonBuilder()
      .setCustomId(`shop_buy:${item.id}:1`)
      .setLabel(`Comprar ${item.name.slice(0, 15)} (${item.buyPrice}🪙)`)
      .setEmoji(item.emoji)
      .setStyle(ButtonStyle.Secondary)
  );

  const rows = [new ActionRowBuilder().addComponents(selectMenu)];
  if (buyButtons.length > 0) {
    // Quebra botões em linhas de até 3 botões
    rows.push(new ActionRowBuilder().addComponents(buyButtons.slice(0, 3)));
    if (buyButtons.length > 3) {
      rows.push(new ActionRowBuilder().addComponents(buyButtons.slice(3, 5)));
    }
  }

  return rows;
}

function isShopInteraction(interaction) {
  return (
    (interaction.isStringSelectMenu() && interaction.customId === 'shop_category_select') ||
    (interaction.isButton() && interaction.customId.startsWith('shop_buy:'))
  );
}

async function handleShopInteraction(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_category_select') {
    const selectedCategory = interaction.values[0];
    const embed = buildShopEmbed(selectedCategory);
    const components = buildShopComponents(selectedCategory);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('shop_buy:')) {
    const [, itemId, amountStr] = interaction.customId.split(':');
    const amount = Number(amountStr || 1);
    const result = buyItem(interaction.user.id, itemId, amount);

    if (!result.success) {
      if (result.reason === 'insufficient_funds') {
        await interaction.reply({
          content: `❌ Você precisa de **${formatCoins(result.totalCost)}**, mas seu saldo é de apenas **${formatCoins(result.balance)}**. Vá trabalhar com \`/trabalho\` antes de fazer compras.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({ content: '❌ Não foi possível comprar este item.', ephemeral: true });
      }
      return;
    }

    await interaction.reply({
      content: `✅ Você comprou **${amount}x ${result.item.emoji} ${result.item.name}** por **${formatCoins(result.totalCost)}**! Saldo restante: **${formatCoins(result.balance)}**.\nUse \`/inventario\` para visualizar seus itens.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  name: SHOP,
  aliases: ['store', 'mercadinho'],
  data: new SlashCommandBuilder()
    .setName(SHOP)
    .setDescription('Abre o catálogo da Lojinha da Kuromi com botões de compra')
    .addStringOption((opt) =>
      opt
        .setName('categoria')
        .setDescription('Categoria para abrir diretamente')
        .setRequired(false)
        .addChoices(
          { name: 'Comidas & Nutrição', value: 'comida' },
          { name: 'Cura & Remédios', value: 'cura' },
          { name: 'Utilitários & XP', value: 'utilitario' },
          { name: 'Baús Misteriosos', value: 'bau' },
          { name: 'Evolução & Melhorias', value: 'evolucao' }
        )
    ),
  async executePrefix({ message, args }) {
    const cat = args[0] ? args[0].toLowerCase() : 'comida';
    await message.reply({
      embeds: [buildShopEmbed(cat)],
      components: buildShopComponents(cat),
    });
  },
  async executeSlash({ interaction }) {
    const cat = interaction.options.getString('categoria') || 'comida';
    await interaction.editReply({
      embeds: [buildShopEmbed(cat)],
      components: buildShopComponents(cat),
    });
  },
  isShopInteraction,
  handleShopInteraction,
};

