const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const {
  getUserAccount,
  getUserRank,
  getTitlesCatalog,
  getUserTitles,
  buyTitle,
  equipTitle,
  unequipTitle,
  getThemesCatalog,
  getUserThemes,
  buyTheme,
  equipTheme,
  setUserBio,
} = require('../services/economy');
const { getSpouseId } = require('../services/marriage');
const { getActivePet, getUserDex } = require('../services/pets');
const professions = require('../services/professions');
const { buildProfileEmbed } = require('./economyHelpers');
const { PROFILE } = require('./commandNames');
const { KUROMI_COLORS } = require('../utils/kuromiVoice');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');
const { getLanguage, t } = require('../utils/i18n');

function getTargetUser(source) {
  return source.options?.getUser('usuario') || source.options?.getUser('user') || source.user || source.author;
}

function buildProfileView(targetUser, viewerId, source = null) {
  const account = getUserAccount(targetUser.id);
  const spouseId = getSpouseId(targetUser.id);
  const rank = getUserRank(targetUser.id);
  const activePet = getActivePet(targetUser.id);
  const userDex = getUserDex(targetUser.id);
  const titlesCatalog = getTitlesCatalog();
  const equippedTitle = account.equippedTitle ? titlesCatalog[account.equippedTitle] : null;

  const dexValues = Object.values(userDex || {});
  const unlockedCount = dexValues.filter((e) => e.discovered).length;
  const shiniesCount = dexValues.filter((e) => e.shinyDiscovered).length;
  const dexStats = {
    totalUnlocked: unlockedCount,
    totalSpecies: dexValues.length || 10,
    totalShinies: shiniesCount,
  };

  const professionKey = account.profession;
  const professionLabel = professionKey
    ? t(`profession.labels.${professionKey}`, source) || professions[professionKey]?.label
    : null;

  const embed = buildProfileEmbed({
    user: targetUser,
    account,
    spouse: spouseId ? `<@${spouseId}>` : null,
    rankPosition: rank?.position || null,
    professionLabel,
    activePet,
    dexStats,
    equippedTitle,
    source,
  });

  const components = [];
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_open_titles:${targetUser.id}:${viewerId}`)
      .setLabel(t('profile.btnTitles', source))
      .setEmoji('👑')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`profile_open_themes:${targetUser.id}:${viewerId}`)
      .setLabel(t('profile.btnThemes', source))
      .setEmoji('🎨')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`profile_open_bio:${targetUser.id}:${viewerId}`)
      .setLabel(t('profile.btnEditBio', source))
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Secondary)
  );

  components.push(actionRow);

  return { embeds: [embed], components };
}

function buildTitlesView(targetUser, viewerId, source = null) {
  const lang = getLanguage(source);
  const isEn = lang === 'en';
  const account = getUserAccount(targetUser.id);
  const titlesCatalog = getTitlesCatalog();
  const ownedTitles = account.titles || [];
  const equippedId = account.equippedTitle;

  const equippedDisplay = equippedId && titlesCatalog[equippedId]
    ? `> ${titlesCatalog[equippedId].emoji} **${titlesCatalog[equippedId].name}**\n> *« ${titlesCatalog[equippedId].desc} »*`
    : (isEn ? '> 🕊️ *No title equipped (Default display)*' : '> 🕊️ *Nenhum título equipado (Exibição padrão)*');

  const desc = isEn
    ? [
        'Customize your profile header with prestige titles!',
        '',
        '🌱 **YOUR BALANCE**',
        `> 🌱 **Magic Beans:** **${account.magicBeans || 0} 🌱**`,
        '',
        '👑 **CURRENTLY EQUIPPED TITLE**',
        equippedDisplay,
        '',
        '✨ **CATALOG & PURCHASES**',
        'Choose a title in the dropdown menu below to **purchase** or **equip**:',
      ].join('\n')
    : [
        'Personalize o cabeçalho do seu perfil com títulos de prestígio!',
        '',
        '🌱 **SEU SALDO**',
        `> 🌱 **Feijões Mágicos:** **${account.magicBeans || 0} 🌱**`,
        '',
        '👑 **TÍTULO ATUALMENTE EQUIPADO**',
        equippedDisplay,
        '',
        '✨ **CATÁLOGO & AQUISIÇÕES**',
        'Escolha um título no menu suspenso abaixo para **comprar** ou **equipar**:',
      ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold || '#facc15')
    .setTitle(isEn ? `👑  ✦  Titles Gallery — ${targetUser.displayName || targetUser.username}` : `👑  ✦  Galeria de Títulos — ${targetUser.displayName || targetUser.username}`)
    .setDescription(desc)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const options = Object.values(titlesCatalog).map((title) => {
    const isEquipped = equippedId === title.id;
    const isOwned = ownedTitles.includes(title.id);

    let statusTag = '';
    let optDesc = '';
    let val = '';

    if (isEquipped) {
      statusTag = isEn ? ' [EQUIPPED]' : ' [EQUIPADO]';
      optDesc = isEn ? 'Currently displayed on your profile' : 'Atualmente em exibição no seu perfil';
      val = `equipped:${title.id}`;
    } else if (isOwned) {
      statusTag = isEn ? ' [OWNED]' : ' [ADQUIRIDO]';
      optDesc = isEn ? 'Click to equip this title' : 'Clique para equipar este título';
      val = `equip:${title.id}`;
    } else {
      statusTag = ` [${title.cost} 🌱]`;
      optDesc = isEn ? `Purchase for ${title.cost} Magic Bean(s)` : `Comprar por ${title.cost} Feijão(ões) Mágico(s)`;
      val = `buy:${title.id}`;
    }

    return {
      label: `${title.name}${statusTag}`.slice(0, 100),
      description: optDesc.slice(0, 100),
      value: val,
      emoji: title.emoji,
      default: isEquipped,
    };
  });

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`profile_select_title:${targetUser.id}:${viewerId}`)
      .setPlaceholder(isEn ? '👑 Choose a title to purchase or equip...' : '👑 Escolha um título para comprar ou equipar...')
      .addOptions(options)
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_view_main:${targetUser.id}:${viewerId}`)
      .setLabel(isEn ? 'Back to Profile' : 'Voltar ao Perfil')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`profile_unequip:${targetUser.id}:${viewerId}`)
      .setLabel(isEn ? 'Unequip Title' : 'Desequipar Título')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!equippedId)
  );

  return { embeds: [embed], components: [selectRow, buttonRow] };
}

function buildThemesView(targetUser, viewerId, source = null) {
  const lang = getLanguage(source);
  const isEn = lang === 'en';
  const account = getUserAccount(targetUser.id);
  const themesCatalog = getThemesCatalog();
  const ownedThemes = account.themes || ['default'];
  const equippedId = account.equippedTheme || 'default';
  const currentTheme = themesCatalog[equippedId] || themesCatalog.default;

  const desc = isEn
    ? [
        'Customize the colors and visual style of your profile cards!',
        '',
        '🌱 **YOUR BALANCE**',
        `> 🌱 **Magic Beans:** **${account.magicBeans || 0} 🌱**`,
        '',
        '🎨 **CURRENT VISUAL THEME**',
        `> ${currentTheme.emoji} **${currentTheme.name}** (\`${currentTheme.color}\`)\n> *« ${currentTheme.desc} »*`,
        '',
        '✨ **THEMES CATALOG**',
        'Choose a theme in the dropdown menu below to **unlock** or **equip**:',
      ].join('\n')
    : [
        'Personalize a cor e o estilo visual dos cartões do seu perfil!',
        '',
        '🌱 **SEU SALDO**',
        `> 🌱 **Feijões Mágicos:** **${account.magicBeans || 0} 🌱**`,
        '',
        '🎨 **TEMA VISUAL ATUAL**',
        `> ${currentTheme.emoji} **${currentTheme.name}** (\`${currentTheme.color}\`)\n> *« ${currentTheme.desc} »*`,
        '',
        '✨ **CATÁLOGO DE TEMAS**',
        'Escolha um tema no menu suspenso abaixo para **desbloquear** ou **equipar**:',
      ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(currentTheme.color || PYXIE_COLORS.magenta)
    .setTitle(isEn ? `🎨  ✦  Profile Themes & Colors — ${targetUser.displayName || targetUser.username}` : `🎨  ✦  Temas & Cores do Perfil — ${targetUser.displayName || targetUser.username}`)
    .setDescription(desc)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const options = Object.values(themesCatalog).map((theme) => {
    const isEquipped = equippedId === theme.id;
    const isOwned = ownedThemes.includes(theme.id);

    let statusTag = '';
    let optDesc = '';
    let val = '';

    if (isEquipped) {
      statusTag = isEn ? ' [EQUIPPED]' : ' [EQUIPADO]';
      optDesc = isEn ? 'Theme currently active on profile' : 'Tema atualmente ativo no perfil';
      val = `equipped:${theme.id}`;
    } else if (isOwned) {
      statusTag = isEn ? ' [OWNED]' : ' [ADQUIRIDO]';
      optDesc = isEn ? 'Click to equip this theme' : 'Clique para equipar este tema';
      val = `equip:${theme.id}`;
    } else {
      statusTag = ` [${theme.cost} 🌱]`;
      optDesc = isEn ? `Unlock for ${theme.cost} Magic Bean(s)` : `Desbloquear por ${theme.cost} Feijão(ões) Mágico(s)`;
      val = `buy:${theme.id}`;
    }

    return {
      label: `${theme.name}${statusTag}`.slice(0, 100),
      description: optDesc.slice(0, 100),
      value: val,
      emoji: theme.emoji,
      default: isEquipped,
    };
  });

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`profile_select_theme:${targetUser.id}:${viewerId}`)
      .setPlaceholder(isEn ? '🎨 Choose a visual theme to equip or buy...' : '🎨 Escolha um tema visual para equipar ou comprar...')
      .addOptions(options)
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_view_main:${targetUser.id}:${viewerId}`)
      .setLabel(isEn ? 'Back to Profile' : 'Voltar ao Perfil')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [selectRow, buttonRow] };
}

function isProfileInteraction(interaction) {
  return typeof interaction.customId === 'string' && interaction.customId.startsWith('profile_');
}

async function handleProfileInteraction(interaction) {
  const customId = interaction.customId;
  const parts = customId.split(':');
  const action = parts[0];
  const targetId = parts[1];
  const ownerId = parts[2] || targetId;
  const isEn = getLanguage(interaction) === 'en';

  // 1. Abrir Modal de Edição de Bio
  if (action === 'profile_open_bio') {
    if (interaction.user.id !== targetId) {
      return interaction.reply({
        content: isEn ? '❌ You can only edit your own profile biography!' : '❌ Você só pode editar a biografia do seu próprio perfil!',
        flags: 64,
      });
    }

    const account = getUserAccount(targetId);
    const modal = new ModalBuilder()
      .setCustomId(`profile_bio_modal:${targetId}:${ownerId}`)
      .setTitle(isEn ? '✏️ Customize Biography' : '✏️ Personalizar Biografia');

    const bioInput = new TextInputBuilder()
      .setCustomId('profile_bio_input')
      .setLabel(isEn ? 'Biography (highlight quote)' : 'Biografia (frase de destaque no perfil)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(isEn ? 'Write something about yourself or your adventures...' : 'Escreva algo sobre você ou suas aventuras...')
      .setMaxLength(120)
      .setRequired(false);

    if (account.bio) {
      bioInput.setValue(account.bio);
    }

    const modalRow = new ActionRowBuilder().addComponents(bioInput);
    modal.addComponents(modalRow);

    return interaction.showModal(modal);
  }

  // 2. Submissão do Modal de Bio
  if (action === 'profile_bio_modal') {
    if (interaction.user.id !== targetId) {
      return interaction.reply({
        content: isEn ? '❌ You can only edit your own profile biography!' : '❌ Você só pode editar a biografia do seu próprio perfil!',
        flags: 64,
      });
    }

    const newBio = interaction.fields.getTextInputValue('profile_bio_input');
    setUserBio(targetId, newBio);

    const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
    const view = buildProfileView(targetUser, interaction.user.id, interaction);
    return interaction.update(view);
  }

  // 3. Validar autoridade da interação para outras ações
  if (interaction.user.id !== ownerId && interaction.user.id !== targetId) {
    return interaction.reply({
      content: isEn ? '❌ Only the owner of this profile can modify its titles or settings.' : '❌ Apenas o dono deste perfil pode alterar seus títulos ou configurações.',
      flags: 64,
    });
  }

  // 4. Voltar para o Perfil Principal
  if (action === 'profile_view_main') {
    const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
    const view = buildProfileView(targetUser, interaction.user.id, interaction);
    return interaction.update(view);
  }

  // 5. Abrir Galeria de Títulos
  if (action === 'profile_open_titles') {
    const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
    const view = buildTitlesView(targetUser, interaction.user.id, interaction);
    return interaction.update(view);
  }

  // 6. Abrir Galeria de Temas
  if (action === 'profile_open_themes') {
    const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
    const view = buildThemesView(targetUser, interaction.user.id, interaction);
    return interaction.update(view);
  }

  // 7. Desequipar Título
  if (action === 'profile_unequip') {
    unequipTitle(targetId);
    const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
    const view = buildTitlesView(targetUser, interaction.user.id, interaction);
    return interaction.update(view);
  }

  // 8. Seleção de Título no Dropdown
  if (action === 'profile_select_title') {
    const selectedVal = interaction.values[0];
    const [operation, titleId] = selectedVal.split(':');

    if (operation === 'equipped') {
      return interaction.reply({
        content: isEn ? '👑 This title is already equipped on your profile!' : '👑 Este título já está equipado no seu perfil!',
        flags: 64,
      });
    }

    if (operation === 'equip') {
      equipTitle(targetId, titleId);
      const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
      const view = buildTitlesView(targetUser, interaction.user.id, interaction);
      return interaction.update(view);
    }

    if (operation === 'buy') {
      const res = buyTitle(targetId, titleId);
      if (!res.success) {
        return interaction.reply({ content: `❌ ${res.message}`, flags: 64 });
      }
      const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
      const view = buildTitlesView(targetUser, interaction.user.id, interaction);
      return interaction.update(view);
    }
  }

  // 9. Seleção de Tema no Dropdown
  if (action === 'profile_select_theme') {
    const selectedVal = interaction.values[0];
    const [operation, themeId] = selectedVal.split(':');

    if (operation === 'equipped') {
      return interaction.reply({
        content: isEn ? '🎨 This visual theme is already active on your profile!' : '🎨 Este tema visual já está ativo no seu perfil!',
        flags: 64,
      });
    }

    if (operation === 'equip') {
      equipTheme(targetId, themeId);
      const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
      const view = buildThemesView(targetUser, interaction.user.id, interaction);
      return interaction.update(view);
    }

    if (operation === 'buy') {
      const res = buyTheme(targetId, themeId);
      if (!res.success) {
        return interaction.reply({ content: `❌ ${res.message}`, flags: 64 });
      }
      const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
      const view = buildThemesView(targetUser, interaction.user.id, interaction);
      return interaction.update(view);
    }
  }
}

module.exports = {
  name: PROFILE,
  buildProfileView,
  buildTitlesView,
  buildThemesView,
  isProfileInteraction,
  handleProfileInteraction,
  data: new SlashCommandBuilder()
    .setName(PROFILE)
    .setDescription('Display your adventurer profile with custom titles, themes, and stats.')
    .setDescriptionLocalizations({
      'pt-BR': 'Exibe seu perfil com títulos e temas customizáveis, Pymon ativo, moedas e Feijões Mágicos.',
    })
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setNameLocalizations({
          'en-US': 'user',
          'en-GB': 'user',
          'pt-BR': 'usuario',
        })
        .setDescription('User to inspect / Usuário para consultar')
        .setRequired(false)
    ),
  async executePrefix({ message }) {
    const target = message.mentions.users.first() || message.author;
    const view = buildProfileView(target, message.author.id, message);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const target = getTargetUser(interaction);
    const view = buildProfileView(target, interaction.user.id, interaction);
    await interaction.editReply(view);
  },
};