const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const {
  getUserAccount,
  getUserRank,
  getTitlesCatalog,
  getUserTitles,
  buyTitle,
  equipTitle,
  unequipTitle,
} = require('../services/economy');
const { getSpouseId } = require('../services/marriage');
const { getActivePet, getUserDex } = require('../services/pets');
const professions = require('../services/professions');
const { buildProfileEmbed } = require('./economyHelpers');
const { PROFILE } = require('./commandNames');
const { KUROMI_COLORS } = require('../utils/kuromiVoice');

function getTargetUser(source) {
  return source.options?.getUser('usuario') || source.user || source.author;
}

function buildProfileView(targetUser, viewerId) {
  const account = getUserAccount(targetUser.id);
  const spouseId = getSpouseId(targetUser.id);
  const rank = getUserRank(targetUser.id);
  const activePet = getActivePet(targetUser.id);
  const userDex = getUserDex(targetUser.id);
  const titlesCatalog = getTitlesCatalog();
  const equippedTitle = account.equippedTitle ? titlesCatalog[account.equippedTitle] : null;

  const unlockedCount = Object.keys(userDex?.unlocked || {}).length;
  const shiniesCount = Object.keys(userDex?.unlockedShiny || {}).length;
  const dexStats = {
    totalUnlocked: unlockedCount,
    totalSpecies: 10,
    totalShinies: shiniesCount,
  };

  const professionLabel = professions[account.profession]?.label || null;

  const embed = buildProfileEmbed({
    user: targetUser,
    account,
    spouse: spouseId ? `<@${spouseId}>` : null,
    rankPosition: rank?.position || null,
    professionLabel,
    activePet,
    dexStats,
    equippedTitle,
  });

  const components = [];
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_open_titles:${targetUser.id}:${viewerId}`)
      .setLabel('Títulos & Cosméticos')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`profile_refresh:${targetUser.id}:${viewerId}`)
      .setLabel('Atualizar')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary)
  );

  components.push(actionRow);

  return { embeds: [embed], components };
}

function buildTitlesView(targetUser, viewerId) {
  const account = getUserAccount(targetUser.id);
  const titlesCatalog = getTitlesCatalog();
  const ownedTitles = account.titles || [];
  const equippedId = account.equippedTitle;

  const embed = new EmbedBuilder()
    .setColor(KUROMI_COLORS.gold || '#facc15')
    .setTitle(`👑  ✦  Galeria de Títulos — ${targetUser.displayName || targetUser.username}`)
    .setDescription(
      `Personalize o cabeçalho do seu perfil com títulos de prestígio!\n` +
      `🌱 **Seu Saldo de Feijões Mágicos:** **${account.magicBeans || 0} 🌱**\n\n` +
      `**Título Equipado:** ${equippedId && titlesCatalog[equippedId] ? `${titlesCatalog[equippedId].emoji} **${titlesCatalog[equippedId].name}**` : '*Nenhum (Padrão)*'}\n\n` +
      `*Selecione um título no menu abaixo para comprar ou equipar:*`
    )
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: 'Títulos de Prestígio • Adquira com Feijões Mágicos (/diario ou Pymon Nv. 100)' })
    .setTimestamp();

  const options = Object.values(titlesCatalog).map((title) => {
    const isEquipped = equippedId === title.id;
    const isOwned = ownedTitles.includes(title.id);

    let statusTag = '';
    let desc = '';
    let val = '';

    if (isEquipped) {
      statusTag = ' [EQUIPADO]';
      desc = 'Atualmente em exibição no seu perfil';
      val = `equipped:${title.id}`;
    } else if (isOwned) {
      statusTag = ' [ADQUIRIDO]';
      desc = 'Clique para equipar este título';
      val = `equip:${title.id}`;
    } else {
      statusTag = ` [${title.cost} 🌱]`;
      desc = `Comprar por ${title.cost} Feijão(ões) Mágico(s)`;
      val = `buy:${title.id}`;
    }

    return {
      label: `${title.name}${statusTag}`.slice(0, 100),
      description: desc.slice(0, 100),
      value: val,
      emoji: title.emoji,
      default: isEquipped,
    };
  });

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`profile_select_title:${targetUser.id}:${viewerId}`)
      .setPlaceholder('👑 Escolha um título para comprar ou equipar...')
      .addOptions(options)
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_view_main:${targetUser.id}:${viewerId}`)
      .setLabel('Voltar ao Perfil')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`profile_unequip:${targetUser.id}:${viewerId}`)
      .setLabel('Desequipar Título')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!equippedId)
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

  // 1. Validar autoridade da interação
  if (interaction.user.id !== ownerId && interaction.user.id !== targetId) {
    return interaction.reply({
      content: '❌ Apenas o dono deste perfil pode alterar seus títulos ou configurações.',
      flags: 64,
    });
  }

  // 2. Voltar para o Perfil Principal / Atualizar
  if (action === 'profile_view_main' || action === 'profile_refresh') {
    const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
    const view = buildProfileView(targetUser, interaction.user.id);
    return interaction.update(view);
  }

  // 3. Abrir Galeria de Títulos
  if (action === 'profile_open_titles') {
    const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
    const view = buildTitlesView(targetUser, interaction.user.id);
    return interaction.update(view);
  }

  // 4. Desequipar Título
  if (action === 'profile_unequip') {
    unequipTitle(targetId);
    const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
    const view = buildTitlesView(targetUser, interaction.user.id);
    return interaction.update(view);
  }

  // 5. Seleção de Título no Dropdown (Comprar / Equipar)
  if (action === 'profile_select_title') {
    const selectedVal = interaction.values[0];
    const [operation, titleId] = selectedVal.split(':');

    if (operation === 'equipped') {
      // Já está equipado, não faz nada ou informa
      return interaction.reply({ content: '👑 Este título já está equipado no seu perfil!', flags: 64 });
    }

    if (operation === 'equip') {
      const res = equipTitle(targetId, titleId);
      const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
      const view = buildTitlesView(targetUser, interaction.user.id);
      return interaction.update(view);
    }

    if (operation === 'buy') {
      const res = buyTitle(targetId, titleId);
      if (!res.success) {
        return interaction.reply({ content: `❌ ${res.message}`, flags: 64 });
      }
      const targetUser = await interaction.client.users.fetch(targetId).catch(() => interaction.user);
      const view = buildTitlesView(targetUser, interaction.user.id);
      return interaction.update(view);
    }
  }
}

module.exports = {
  name: PROFILE,
  buildProfileView,
  buildTitlesView,
  isProfileInteraction,
  handleProfileInteraction,
  data: new SlashCommandBuilder()
    .setName(PROFILE)
    .setDescription('Exibe seu perfil com títulos customizáveis, Pymon ativo, moedas e Feijões Mágicos.')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuário para consultar').setRequired(false)),
  async executePrefix({ message }) {
    const target = message.mentions.users.first() || message.author;
    const view = buildProfileView(target, message.author.id);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const target = getTargetUser(interaction);
    const view = buildProfileView(target, interaction.user.id);
    await interaction.editReply(view);
  },
};