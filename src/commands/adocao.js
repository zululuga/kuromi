const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const {
  adoptPet,
  PETS_CATALOG,
  getStarters,
  getUserPets,
} = require('../services/pets');
const { createPetAttachment, createDexAttachment } = require('../services/petRenderer');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');
const { t, getLanguage, PET_DESCRIPTIONS_EN, ELEMENT_NAMES } = require('../utils/i18n');

function buildDexEmbed(selectedKey = 'cinna', source = null) {
  const starter = PETS_CATALOG[selectedKey] || PETS_CATALOG.cinna;
  const lang = getLanguage(source);

  const colorMap = {
    CHARME: PYXIE_COLORS.neonPink,
    ORVALHO: PYXIE_COLORS.cyan,
    SILVESTRE: PYXIE_COLORS.emerald,
  };

  const descText = (lang === 'en' && PET_DESCRIPTIONS_EN[selectedKey])
    ? PET_DESCRIPTIONS_EN[selectedKey]
    : starter.description;

  const elemName = (ELEMENT_NAMES[lang] && ELEMENT_NAMES[lang][starter.element])
    ? ELEMENT_NAMES[lang][starter.element]
    : starter.element;

  const desc = t('adoption.dexDesc', source, {
    name: starter.name.toUpperCase(),
    emoji: starter.emoji,
    element: elemName,
    desc: descText,
    hp: starter.baseStats.hp,
    atk: starter.baseStats.atk,
    def: starter.baseStats.def,
    spd: starter.baseStats.spd,
  });

  const embed = new EmbedBuilder()
    .setColor(colorMap[starter.element] || PYXIE_COLORS.lilac)
    .setTitle(t('adoption.dexTitle', source))
    .setDescription(desc)
    .setImage('attachment://dex_entry.png')
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  return embed;
}

function buildDexComponents(userId, selectedKey = 'cinna', source = null) {
  const starters = getStarters();

  // Botões de Navegação Dex entre os 3 iniciais
  const navRow = new ActionRowBuilder();
  for (const st of starters) {
    const isSelected = st.key === selectedKey;
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`adopt_preview:${st.key}:${userId}`)
        .setLabel(st.name)
        .setEmoji(st.emoji)
        .setStyle(isSelected ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
  }

  // Botão de Confirmação de Adoção
  const selectedMonster = PETS_CATALOG[selectedKey] || PETS_CATALOG.cinna;
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`adopt_confirm:${selectedMonster.key}:${userId}`)
      .setLabel(t('adoption.btnChoose', source, { name: selectedMonster.name }))
      .setEmoji('✨')
      .setStyle(ButtonStyle.Success)
  );

  return [navRow, actionRow];
}

function buildAdoptedLockedView(userId, userPets, source = null) {
  const active = userPets[0];
  const petName = active ? active.name : (getLanguage(source) === 'en' ? 'Your Starter' : 'Seu Inicial');

  const desc = t('adoption.lockedDesc', source, { name: petName });

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle(t('adoption.lockedTitle', source))
    .setDescription(desc)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel(t('adoption.btnMyPet', source))
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:dungeon:${userId}`)
      .setLabel(t('adoption.btnExploreDungeons', source))
      .setEmoji('🗺️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`hub_tab:incubator:${userId}`)
      .setLabel(t('adoption.btnIncubator', source))
      .setEmoji('🥚')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row], files: [] };
}

function isAdoptionInteraction(interaction) {
  if (!interaction.customId) return false;
  return (
    interaction.customId.startsWith('adopt_preview:') ||
    interaction.customId.startsWith('adopt_confirm:')
  );
}

async function handleAdoptionInteraction(interaction) {
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
  const userPets = getUserPets(userId);

  // Se já tiver pet e tentar interagir
  if (userPets.length > 0 && action === 'adopt_confirm') {
    return interaction.reply({
      content: t('adoption.alreadyHasPet', interaction),
      flags: 64,
    });
  }

  // 1. Navegar entre os 3 iniciais na Dex
  if (action === 'adopt_preview') {
    const selectedKey = parts[1] || 'cinna';
    const monster = PETS_CATALOG[selectedKey] || PETS_CATALOG.cinna;
    const embed = buildDexEmbed(selectedKey, interaction);
    const components = buildDexComponents(userId, selectedKey, interaction);
    const attachment = createDexAttachment(monster, false, true, false, interaction);

    return interaction.update({
      embeds: [embed],
      components,
      files: [attachment],
    });
  }

  // 2. Confirmar escolha do Inicial
  if (action === 'adopt_confirm') {
    const selectedKey = parts[1] || 'cinna';
    const result = adoptPet(userId, selectedKey);

    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.message}`,
        flags: 64,
      });
    }

    const adopted = result.pet;
    const lang = getLanguage(interaction);
    const elemName = (ELEMENT_NAMES[lang] && ELEMENT_NAMES[lang][adopted.element])
      ? ELEMENT_NAMES[lang][adopted.element]
      : adopted.element;

    const shinyBonus = adopted.shiny ? t('adoption.congratsShiny', interaction) : '';
    const desc = shinyBonus + t('adoption.adoptedDesc', interaction, {
      name: adopted.name,
      emoji: adopted.emoji,
      element: elemName,
      hp: adopted.stats.hp,
      maxHp: adopted.stats.maxHp,
      energy: adopted.energy,
    });

    const embed = new EmbedBuilder()
      .setColor(adopted.shiny ? '#facc15' : PYXIE_COLORS.emerald)
      .setTitle(t('adoption.adoptedTitle', interaction, { name: adopted.name }))
      .setDescription(desc)
      .setImage('attachment://pet_card.png')
      .setFooter({ text: 'Pyxie' })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_pet_feed:${userId}`)
        .setLabel(t('hub.feed', interaction))
        .setEmoji('🍖')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`hub_pet_carinho:${userId}`)
        .setLabel(t('hub.petAction', interaction))
        .setEmoji('💖')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:dungeon:${userId}`)
        .setLabel(t('hub.dungeon', interaction))
        .setEmoji('🗺️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:pet:${userId}`)
        .setLabel(t('adoption.btnOpenPymons', interaction))
        .setEmoji('🎮')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({
      embeds: [embed],
      components: [actionRow],
      files: [createPetAttachment(adopted, interaction)],
    });
  }
}

module.exports = {
  isAdoptionInteraction,
  handleAdoptionInteraction,
  buildDexEmbed,
  buildDexComponents,
  buildPokedexEmbed: buildDexEmbed,
  buildPokedexComponents: buildDexComponents,
  buildAdoptedLockedView,
};