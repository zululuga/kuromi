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
const { DEX } = require('./commandNames');

/**
 * Constrói a linha padrão de navegação do Hub para a Dex.
 */
function buildDexHubHeaderRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel('Meu Pymon')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:incubator:${userId}`)
      .setLabel('Chocadeira')
      .setEmoji('🥚')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:dungeon:${userId}`)
      .setLabel('Dungeons')
      .setEmoji('🗺️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:dex:${userId}`)
      .setLabel('Dex')
      .setEmoji('📖')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:inventory:${userId}`)
      .setLabel('Mochila')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Constrói a visão interativa da Dex para um Pymon selecionado.
 */
function buildDexView(userId, userTag, selectedKey = 'cinna', viewShiny = false) {
  const catalog = getPetsCatalog();
  const catalogKeys = Object.keys(catalog);
  if (!catalogKeys.includes(selectedKey)) {
    selectedKey = catalogKeys[0] || 'cinna';
  }

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
        : `🔒  ✦  Dex #${currentIndex + 1} — ??? (Criatura Misteriosa)`
    )
    .setImage('attachment://dex_entry.png')
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  if (isUnlocked) {
    const shinyStatusText = isShinyUnlocked
      ? (currentViewShiny ? '🌟 **Exibindo Versão Shiny**' : '✨ **Shiny Desbloqueado!** *(Clique em Alternar Shiny)*')
      : '🔒 *Shiny ainda não descoberto*';

    const desc = [
      `📖 **COMPÊNDIO OFICIAL DE PYMONS**`,
      `> 👤 **Explorador:** ${userTag}`,
      `> 📊 **Progresso Geral:** **${discoveredCount}/${totalCount} Descobertos**  •  ✨ **${discoveredShinyCount} Shinies**`,
      '',
      `🐾 **ESPÉCIE #${currentIndex + 1}: ${monsterDef.name.toUpperCase()}**`,
      `> ✨ **Raridade:** \`${monsterDef.rarity || 'COMUM'}\`  •  🔮 **Elemento:** \`${monsterDef.element}\``,
      `> *"${monsterDef.description}"*`,
      '',
      '📊 **ATRIBUTOS DE COMBATE BASE**',
      `> ❤️ **HP:** ${monsterDef.baseStats?.hp || 55}  •  ⚔️ **ATK:** ${monsterDef.baseStats?.atk || 12}`,
      `> 🛡️ **DEF:** ${monsterDef.baseStats?.def || 12}  •  💨 **SPD:** ${monsterDef.baseStats?.spd || 12}`,
      '',
      '✨ **VARIANTE SHINY**',
      `> ${shinyStatusText}`,
    ].join('\n');

    embed.setDescription(desc);
  } else {
    const desc = [
      `📖 **COMPÊNDIO OFICIAL DE PYMONS**`,
      `> 👤 **Explorador:** ${userTag}`,
      `> 📊 **Progresso Geral:** **${discoveredCount}/${totalCount} Descobertos**  •  ✨ **${discoveredShinyCount} Shinies**`,
      '',
      `🐾 **ESPÉCIE #${currentIndex + 1}: ??? (${monsterDef.name[0]}???)**`,
      `> ✨ **Raridade:** \`???\`  •  🔮 **Elemento:** \`???\``,
      `> *"Esta criatura misteriosa ainda não foi registrada em sua jornada. Explore Dungeons ou choque ovos na Chocadeira para desvendar este Pymon!"*`,
      '',
      '📊 **ATRIBUTOS DE COMBATE BASE**',
      `> ❤️ **HP:** \`???\`  •  ⚔️ **ATK:** \`???\``,
      `> 🛡️ **DEF:** \`???\`  •  💨 **SPD:** \`???\``,
      '',
      '✨ **VARIANTE SHINY**',
      '> 🔒 *Espécie não descoberta*',
    ].join('\n');

    embed.setDescription(desc);
  }

  // Row 1: Menu Dropdown de Seleção de Pymon
  const selectOptions = catalogKeys.map((key, idx) => {
    const pDef = catalog[key];
    const uEntry = userDex[key];
    const unlocked = Boolean(uEntry?.discovered);
    const hasShiny = Boolean(uEntry?.shinyDiscovered);

    return {
      label: unlocked ? `#${idx + 1} - ${pDef.name} (${pDef.element})` : `#${idx + 1} - ??? (Não Descoberto)`,
      description: unlocked
        ? `${pDef.rarity || 'Pymon'} • ${hasShiny ? '✨ Shiny Registrado' : 'Normal'}`
        : '🔒 Encontre ovos ou explore para revelar',
      value: key,
      emoji: unlocked ? (pDef.emoji || '🐾') : '❓',
      default: key === selectedKey,
    };
  });

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`dex_select:${userId}`)
      .setPlaceholder('📖 Escolha um Pymon para inspecionar na Dex...')
      .addOptions(selectOptions.slice(0, 25))
  );

  // Row 2: Botões de Navegação & Shiny Toggle
  const prevIndex = (currentIndex - 1 + totalCount) % totalCount;
  const nextIndex = (currentIndex + 1) % totalCount;
  const prevKey = catalogKeys[prevIndex];
  const nextKey = catalogKeys[nextIndex];

  const shinyToggleBtn = new ButtonBuilder()
    .setCustomId(`dex_toggle_shiny:${selectedKey}:${currentViewShiny ? '0' : '1'}:${userId}`)
    .setLabel(currentViewShiny ? 'Ver Normal' : 'Ver Shiny')
    .setEmoji(currentViewShiny ? '🐾' : '✨')
    .setStyle(currentViewShiny ? ButtonStyle.Primary : ButtonStyle.Secondary)
    .setDisabled(!isShinyUnlocked);

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dex_nav:${prevKey}:0:${userId}`)
      .setLabel('Anterior')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
    shinyToggleBtn,
    new ButtonBuilder()
      .setCustomId(`dex_nav:${nextKey}:0:${userId}`)
      .setLabel('Próximo')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
  );

  const components = [
    buildDexHubHeaderRow(userId),
    selectRow,
    navRow,
  ];

  const attachment = createDexAttachment(monsterDef, currentViewShiny, isUnlocked, isShinyUnlocked);

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
      content: '❌ Esta Dex pertence a outro aventureiro. Use `/dex` para abrir a sua própria!',
      flags: 64,
    });
  }

  const userId = interaction.user.id;
  const userTag = interaction.user.displayName || interaction.user.username;

  if (action === 'hub_tab' && parts[1] === 'dex') {
    const view = buildDexView(userId, userTag, 'cinna', false);
    return interaction.update(view);
  }

  if (action === 'dex_select') {
    const selectedKey = interaction.values[0];
    const view = buildDexView(userId, userTag, selectedKey, false);
    return interaction.update(view);
  }

  if (action === 'dex_nav') {
    const targetKey = parts[1] || 'cinna';
    const viewShiny = parts[2] === '1';
    const view = buildDexView(userId, userTag, targetKey, viewShiny);
    return interaction.update(view);
  }

  if (action === 'dex_toggle_shiny') {
    const currentKey = parts[1] || 'cinna';
    const shouldViewShiny = parts[2] === '1';
    const view = buildDexView(userId, userTag, currentKey, shouldViewShiny);
    return interaction.update(view);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName(DEX)
    .setDescription('Consulte a Dex oficial com todos os Pymons, formas Shiny e silhuetas de criaturas.')
    .addStringOption((option) =>
      option
        .setName('pymon')
        .setDescription('Nome ou chave do Pymon que deseja inspecionar na Dex')
        .setRequired(false)
    ),
  name: DEX,
  aliases: ['pymondex', 'pokedex'],
  description: 'Consulte a Dex com todos os Pymons, formas Shiny e criaturas descobertas.',
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

    const view = buildDexView(userId, userTag, initialKey, false);
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

    const view = buildDexView(userId, userTag, initialKey, false);
    await message.reply(view);
  },
  buildDexView,
  isDexInteraction,
  handleDexInteraction,
};

