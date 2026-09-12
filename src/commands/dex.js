const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const {
  getPetsCatalog,
  getUserDex,
} = require('../services/pets');
const { createDexAttachment } = require('../services/petRenderer');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');
const { t, getLanguage, ELEMENT_NAMES, RARITY_NAMES, PET_DESCRIPTIONS_EN } = require('../utils/i18n');
const { DEX } = require('./commandNames');

/**
 * Constrói a linha padrão de navegação do Hub para a Dex.
 */
function buildDexHubHeaderRow(userId, context = null) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel(t('hub.pet', context))
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:incubator:${userId}`)
      .setLabel(t('hub.incubator', context))
      .setEmoji('🥚')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:dungeon:${userId}`)
      .setLabel(t('hub.dungeon', context))
      .setEmoji('🗺️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:dex:${userId}`)
      .setLabel(t('hub.dex', context))
      .setEmoji('📖')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:inventory:${userId}`)
      .setLabel(t('hub.backpack', context))
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Constrói a visão interativa da Dex para um Pymon selecionado.
 */
function buildDexView(userId, userTag, selectedKey = 'cinna', viewShiny = false, context = null) {
  const catalog = getPetsCatalog();
  const catalogKeys = Object.keys(catalog);
  if (!catalogKeys.includes(selectedKey)) {
    selectedKey = catalogKeys[0] || 'cinna';
  }

  const langKey = getLanguage(context);
  const userDex = getUserDex(userId);
  const entry = userDex[selectedKey] || {
    discovered: false,
    shinyDiscovered: false,
  };

  const monsterDef = catalog[selectedKey];
  const isUnlocked = Boolean(entry.discovered);
  const isShinyUnlocked = Boolean(entry.shinyDiscovered);
  const currentViewShiny = Boolean(viewShiny && isShinyUnlocked);

  const totalCount = catalogKeys.length;
  const discoveredCount = Object.values(userDex).filter((e) => e.discovered).length;
  const discoveredShinyCount = Object.values(userDex).filter((e) => e.shinyDiscovered).length;
  const currentIndex = catalogKeys.indexOf(selectedKey);

  const colorMap = {
    CHARME: PYXIE_COLORS.neonPink,
    ORVALHO: PYXIE_COLORS.cyan,
    SILVESTRE: PYXIE_COLORS.emerald,
    TRAVESSURA: PYXIE_COLORS.magenta,
    BRISA: PYXIE_COLORS.gold,
  };

  const themeColor = isUnlocked
    ? (colorMap[monsterDef.element] || PYXIE_COLORS.lilac)
    : PYXIE_COLORS.lilac;

  const embed = new EmbedBuilder()
    .setColor(themeColor)
    .setTitle(
      isUnlocked
        ? `${monsterDef.emoji}  ✦  Dex #${currentIndex + 1} — ${monsterDef.name}${currentViewShiny ? ' ✨ (Shiny)' : ''}`
        : `🔒  ✦  Dex #${currentIndex + 1} — ${t('dexCmd.mysteryCreature', context)}`
    )
    .setImage('attachment://dex_entry.png')
    .setFooter({ text: t('common.footer', context) })
    .setTimestamp();

  if (isUnlocked) {
    const shinyStatusText = isShinyUnlocked
      ? (currentViewShiny ? t('dexCmd.viewingShiny', context) : t('dexCmd.shinyUnlocked', context))
      : t('dexCmd.shinyLocked', context);

    const rarityName = langKey === 'en' ? (RARITY_NAMES.en[monsterDef.rarity] || monsterDef.rarity) : (RARITY_NAMES.pt[monsterDef.rarity] || monsterDef.rarity || 'COMUM');
    const elementName = langKey === 'en' ? (ELEMENT_NAMES.en[monsterDef.element] || monsterDef.element) : (ELEMENT_NAMES.pt[monsterDef.element] || monsterDef.element);
    const descriptionText = (langKey === 'en' && PET_DESCRIPTIONS_EN[monsterDef.key]) || monsterDef.description;

    const desc = [
      t('dexCmd.header', context),
      `> 👤 **${t('dexCmd.explorer', context)}:** ${userTag}`,
      `> 📊 **${t('dexCmd.progress', context)}:** **${discoveredCount}/${totalCount} ${t('dexCmd.discovered', context)}**  •  ✨ **${discoveredShinyCount} ${t('dexCmd.shinies', context)}**`,
      '',
      `🐾 **${t('dexCmd.species', context)} #${currentIndex + 1}: ${monsterDef.name.toUpperCase()}**`,
      `> ✨ **${t('dexCmd.rarity', context)}:** \`${rarityName}\`  •  🔮 **${t('dexCmd.element', context)}:** \`${elementName}\``,
      `> *"${descriptionText}"*`,
      '',
      `📊 **${t('dexCmd.baseStats', context)}**`,
      `> ❤️ **HP:** ${monsterDef.baseStats?.hp || 55}  •  ⚔️ **ATK:** ${monsterDef.baseStats?.atk || 12}`,
      `> 🛡️ **DEF:** ${monsterDef.baseStats?.def || 12}  •  💨 **SPD:** ${monsterDef.baseStats?.spd || 12}`,
      '',
      `✨ **${t('dexCmd.shinyVariant', context)}**`,
      `> ${shinyStatusText}`,
    ].join('\n');

    embed.setDescription(desc);
  } else {
    const desc = [
      t('dexCmd.header', context),
      `> 👤 **${t('dexCmd.explorer', context)}:** ${userTag}`,
      `> 📊 **${t('dexCmd.progress', context)}:** **${discoveredCount}/${totalCount} ${t('dexCmd.discovered', context)}**  •  ✨ **${discoveredShinyCount} ${t('dexCmd.shinies', context)}**`,
      '',
      `🐾 **${t('dexCmd.species', context)} #${currentIndex + 1}: ??? (${monsterDef.name[0]}???)**`,
      `> ✨ **${t('dexCmd.rarity', context)}:** \`???\`  •  🔮 **${t('dexCmd.element', context)}:** \`???\``,
      `> *${t('dexCmd.mysteryDesc', context)}*`,
      '',
      `📊 **${t('dexCmd.baseStats', context)}**`,
      `> ❤️ **HP:** \`???\`  •  ⚔️ **ATK:** \`???\``,
      `> 🛡️ **DEF:** \`???\`  •  💨 **SPD:** \`???\``,
      '',
      `✨ **${t('dexCmd.shinyVariant', context)}**`,
      `> ${t('dexCmd.speciesUndiscovered', context)}`,
    ].join('\n');

    embed.setDescription(desc);
  }

  // Row 1: Menu Dropdown de Seleção de Pymon
  const selectOptions = catalogKeys.map((key, idx) => {
    const pDef = catalog[key];
    const uEntry = userDex[key];
    const unlocked = Boolean(uEntry?.discovered);
    const hasShiny = Boolean(uEntry?.shinyDiscovered);
    const elementName = langKey === 'en' ? (ELEMENT_NAMES.en[pDef.element] || pDef.element) : (ELEMENT_NAMES.pt[pDef.element] || pDef.element);
    const rarityName = langKey === 'en' ? (RARITY_NAMES.en[pDef.rarity] || pDef.rarity) : (RARITY_NAMES.pt[pDef.rarity] || pDef.rarity || 'Pymon');

    return {
      label: unlocked ? `#${idx + 1} - ${pDef.name} (${elementName})` : `#${idx + 1} - ??? (${langKey === 'en' ? 'Undiscovered' : 'Não Descoberto'})`,
      description: unlocked
        ? `${rarityName} • ${hasShiny ? (langKey === 'en' ? '✨ Shiny Registered' : '✨ Shiny Registrado') : 'Normal'}`
        : (langKey === 'en' ? '🔒 Find eggs or explore to reveal' : '🔒 Encontre ovos ou explore para revelar'),
      value: key,
      emoji: unlocked ? (pDef.emoji || '🐾') : '❓',
      default: key === selectedKey,
    };
  });

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`dex_select:${userId}`)
      .setPlaceholder(t('dexCmd.selectPlaceholder', context))
      .addOptions(selectOptions.slice(0, 25))
  );

  // Row 2: Botões de Navegação & Shiny Toggle
  const prevIndex = (currentIndex - 1 + totalCount) % totalCount;
  const nextIndex = (currentIndex + 1) % totalCount;
  const prevKey = catalogKeys[prevIndex];
  const nextKey = catalogKeys[nextIndex];

  const shinyToggleBtn = new ButtonBuilder()
    .setCustomId(`dex_toggle_shiny:${selectedKey}:${currentViewShiny ? '0' : '1'}:${userId}`)
    .setLabel(currentViewShiny ? t('dexCmd.btnViewNormal', context) : t('dexCmd.btnViewShiny', context))
    .setEmoji(currentViewShiny ? '🐾' : '✨')
    .setStyle(currentViewShiny ? ButtonStyle.Primary : ButtonStyle.Secondary)
    .setDisabled(!isShinyUnlocked);

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dex_nav:${prevKey}:0:${userId}`)
      .setLabel(t('dexCmd.btnPrev', context))
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
    shinyToggleBtn,
    new ButtonBuilder()
      .setCustomId(`dex_nav:${nextKey}:0:${userId}`)
      .setLabel(t('dexCmd.btnNext', context))
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
  );

  const components = [
    buildDexHubHeaderRow(userId, context),
    selectRow,
    navRow,
  ];

  const attachment = createDexAttachment(monsterDef, currentViewShiny, isUnlocked, isShinyUnlocked, context);

  return {
    embeds: [embed],
    components,
    files: [attachment],
  };
}

function isDexInteraction(interaction) {
  if (!interaction.customId) return false;
  return (
    interaction.customId.startsWith('dex_select:') ||
    interaction.customId.startsWith('dex_nav:') ||
    interaction.customId.startsWith('dex_toggle_shiny:') ||
    interaction.customId.startsWith('hub_tab:dex:')
  );
}

async function handleDexInteraction(interaction) {
  const customId = interaction.customId;
  const parts = customId.split(':');
  const action = parts[0];
  const targetUserId = parts[parts.length - 1];

  if (targetUserId && targetUserId !== interaction.user.id) {
    return interaction.reply({
      content: t('dexCmd.otherUserDex', interaction),
      flags: 64,
    });
  }

  const userId = interaction.user.id;
  const userTag = interaction.user.displayName || interaction.user.username;

  if (action === 'hub_tab' && parts[1] === 'dex') {
    const view = buildDexView(userId, userTag, 'cinna', false, interaction);
    return interaction.update(view);
  }

  if (action === 'dex_select') {
    const selectedKey = interaction.values[0];
    const view = buildDexView(userId, userTag, selectedKey, false, interaction);
    return interaction.update(view);
  }

  if (action === 'dex_nav') {
    const targetKey = parts[1] || 'cinna';
    const viewShiny = parts[2] === '1';
    const view = buildDexView(userId, userTag, targetKey, viewShiny, interaction);
    return interaction.update(view);
  }

  if (action === 'dex_toggle_shiny') {
    const currentKey = parts[1] || 'cinna';
    const shouldViewShiny = parts[2] === '1';
    const view = buildDexView(userId, userTag, currentKey, shouldViewShiny, interaction);
    return interaction.update(view);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName(DEX)
    .setDescription('Official Pymon Dex with shiny forms and silhouettes / Consulte a Dex oficial.')
    .setDescriptionLocalizations({
      'pt-BR': 'Consulte a Dex oficial com todos os Pymons, formas Shiny e silhuetas de criaturas.',
    })
    .addStringOption((option) =>
      option
        .setName('pymon')
        .setNameLocalizations({
          'en-US': 'pymon',
          'en-GB': 'pymon',
          'pt-BR': 'pymon',
        })
        .setDescription('Name or key of the Pymon / Nome ou chave do Pymon na Dex')
        .setRequired(false)
    ),
  name: DEX,
  aliases: ['pymondex', 'pokedex'],
  description: 'Consulte a Dex com todos os Pymons, formas Shiny e criaturas descobertas.',
  buildDexHubHeaderRow,
  buildDexView,
  isDexInteraction,
  handleDexInteraction,
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const userTag = interaction.user.displayName || interaction.user.username;
    const targetOption = interaction.options?.getString('pymon');

    const catalog = getPetsCatalog();
    let initialKey = 'cinna';

    if (targetOption) {
      const query = targetOption.toLowerCase().trim();
      const matchKey = Object.keys(catalog).find(
        (k) => k === query || catalog[k].name.toLowerCase() === query
      );
      if (matchKey) {
        initialKey = matchKey;
      }
    }

    const view = buildDexView(userId, userTag, initialKey, false, interaction);
    await interaction.editReply(view);
  },
  async executePrefix({ message, args }) {
    const userId = message.author.id;
    const userTag = message.author.displayName || message.author.username;
    const catalog = getPetsCatalog();
    let initialKey = 'cinna';

    if (args && args.length > 0) {
      const query = args[0].toLowerCase().trim();
      const matchKey = Object.keys(catalog).find(
        (k) => k === query || catalog[k].name.toLowerCase() === query
      );
      if (matchKey) {
        initialKey = matchKey;
      }
    }

    const view = buildDexView(userId, userTag, initialKey, false, message);
    await message.reply(view);
  },
};
