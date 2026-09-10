const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const {
  adoptPet,
  PETS_CATALOG,
  getStarters,
  getUserPets,
  getActivePet,
} = require('../services/pets');
const { createPetAttachment, createPokedexAttachment } = require('../services/petRenderer');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');
const { ADOPTION } = require('./commandNames');

const STARTER_KEYS = ['cinna', 'bonorka', 'pomcorin'];

function buildPokedexEmbed(selectedKey = 'cinna') {
  const starter = PETS_CATALOG[selectedKey] || PETS_CATALOG.cinna;

  const colorMap = {
    CHARME: PYXIE_COLORS.neonPink,
    ORVALHO: PYXIE_COLORS.cyan,
    SILVESTRE: PYXIE_COLORS.emerald,
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[starter.element] || PYXIE_COLORS.lilac)
    .setTitle(`📖  ✦  Pokédex PixelMonsters — Escolha seu Inicial!`)
    .setDescription(
      `Escolha o seu companheiro inicial para começar sua jornada no Reino de Pyxie!\n\n` +
      `✨ **PROBABILIDADE SHINY:** Há **5% de chance** do seu inicial nascer **SHINY RARO**!\n` +
      `🔒 **REGRA DE ADOÇÃO:** Você só pode escolher **1 inicial**. Após a escolha, novos PixelMonsters só poderão ser obtidos encontrando ovos em **Dungeons** e chocando na **Chocadeira**!\n\n` +
      `**Monstro Selecionado:** ${starter.emoji} **${starter.name}** (\`${starter.element}\`)\n` +
      `> *"${starter.description}"*\n\n` +
      `💖 HP: **${starter.baseStats.hp}** | ⚔️ ATK: **${starter.baseStats.atk}** | 🛡️ DEF: **${starter.baseStats.def}** | 💨 SPD: **${starter.baseStats.spd}**`
    )
    .setImage('attachment://pokedex_entry.png')
    .setFooter({ text: pyxieFooter('Pokédex PixelMonsters • 5% Taxa de Shiny Inicial') })
    .setTimestamp();

  return embed;
}

function buildPokedexComponents(userId, selectedKey = 'cinna') {
  const starters = getStarters();

  // Botões de Navegação Pokédex entre os 3 iniciais
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
      .setLabel(`Escolher ${selectedMonster.name} como meu Inicial!`)
      .setEmoji('✨')
      .setStyle(ButtonStyle.Success)
  );

  return [navRow, actionRow];
}

function buildAdoptedLockedView(userId, userPets) {
  const active = userPets[0];
  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle('🔒  ✦  Centro de Adoção PixelMonsters — Adoção Concluída')
    .setDescription(
      `Olá, aventureiro! Você já escolheu seu PixelMonster inicial (**${active ? active.name : 'Seu Inicial'}**).\n\n` +
      `🌟 **Como conseguir mais PixelMonsters?**\n` +
      `O Centro de Adoção é exclusivo para tutores iniciantes. Para expandir sua coleção com novas espécies e variantes raras:\n\n` +
      `1. 🗺️ Aventure-se nas **Dungeons** com \`/pixelmonsters\` para encontrar **Ovos Misteriosos**;\n` +
      `2. 🥚 Coloque os ovos na sua **Chocadeira** e acelere o tempo de choco;\n` +
      `3. 🐣 Quebre a casca para despertar novas criaturas autorais com **até 20% de chance Shiny**!`
    )
    .setFooter({ text: pyxieFooter('Adoção Bloqueada • Obtenha mais monstros via Dungeons') })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel('Meu PixelMonster')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:dungeon:${userId}`)
      .setLabel('Explorar Dungeons')
      .setEmoji('🗺️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`hub_tab:incubator:${userId}`)
      .setLabel('Ver Chocadeira')
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
      content: '❌ Este Pokédex pertence a outro aventureiro. Use `/adocao` para abrir o seu!',
      flags: 64,
    });
  }

  const userId = interaction.user.id;
  const userPets = getUserPets(userId);

  // Se já tiver pet e tentar interagir
  if (userPets.length > 0 && action === 'adopt_confirm') {
    return interaction.reply({
      content: '🔒 Você já possui um PixelMonster inicial! Obtenha novos monstros explorando Dungeons e chocando ovos.',
      flags: 64,
    });
  }

  // 1. Navegar entre os 3 iniciais na Pokédex
  if (action === 'adopt_preview') {
    const selectedKey = parts[1] || 'cinna';
    const monster = PETS_CATALOG[selectedKey] || PETS_CATALOG.cinna;
    const embed = buildPokedexEmbed(selectedKey);
    const components = buildPokedexComponents(userId, selectedKey);
    const attachment = createPokedexAttachment(monster, false);

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
    const shinyBanner = adopted.shiny
      ? '✨✨ **PARABÉNS! SEU INICIAL NASCEU SHINY (5% DE CHANCE)!** ✨✨\n\n'
      : '';

    const embed = new EmbedBuilder()
      .setColor(adopted.shiny ? '#facc15' : PYXIE_COLORS.emerald)
      .setTitle(`🎉  ✦  Você escolheu ${adopted.name} como seu PixelMonster!`)
      .setDescription(
        `${shinyBanner}` +
        `O seu companheiro **${adopted.name}** ${adopted.emoji} já está aos seus cuidados!\n\n` +
        `• **Elemento:** \`${adopted.element}\`\n` +
        `• **Nível Inicial:** **1**\n` +
        `• **Vida:** **${adopted.stats.hp}/${adopted.stats.maxHp}**  |  ⚡ **Energia:** **${adopted.energy}%**\n\n` +
        `🎁 **Kit de Sobrevivência Entregue:** Você recebeu 2x Ração da Floresta, 1x Curativo e 1x Baú Rústico na Mochila!\n\n` +
        `*Acesse o painel principal com \`/pixelmonsters\` para alimentá-lo, treinar e desbravar as Dungeons!*`
      )
      .setImage('attachment://pet_card.png')
      .setFooter({ text: pyxieFooter('PixelMonster Adotado • Centro de Adoção Trancado') })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_pet_feed:${userId}`)
        .setLabel('Alimentar')
        .setEmoji('🍖')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`hub_pet_carinho:${userId}`)
        .setLabel('Carinho')
        .setEmoji('💖')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:dungeon:${userId}`)
        .setLabel('Explorar Dungeons')
        .setEmoji('🗺️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:pet:${userId}`)
        .setLabel('Abrir PixelMonsters')
        .setEmoji('🎮')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({
      embeds: [embed],
      components: [actionRow],
      files: [createPetAttachment(adopted)],
    });
  }
}

module.exports = {
  name: ADOPTION,
  data: new SlashCommandBuilder()
    .setName(ADOPTION)
    .setDescription('Abre a Pokédex de escolha do seu PixelMonster Inicial (Cinna, Bonorka ou Pomcorin).'),
  aliases: ['adotar', 'adote', 'inicial', 'starters', 'starter'],
  isAdoptionInteraction,
  handleAdoptionInteraction,
  buildPokedexEmbed,
  buildPokedexComponents,
  buildAdoptedLockedView,
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const userPets = getUserPets(userId);

    if (userPets.length > 0) {
      const lockedView = buildAdoptedLockedView(userId, userPets);
      return interaction.editReply(lockedView);
    }

    const defaultKey = 'cinna';
    const monster = PETS_CATALOG[defaultKey];
    const embed = buildPokedexEmbed(defaultKey);
    const components = buildPokedexComponents(userId, defaultKey);
    const attachment = createPokedexAttachment(monster, false);

    await interaction.editReply({
      embeds: [embed],
      components,
      files: [attachment],
    });
  },
  async executePrefix({ message }) {
    const userId = message.author.id;
    const userPets = getUserPets(userId);

    if (userPets.length > 0) {
      const lockedView = buildAdoptedLockedView(userId, userPets);
      return message.reply(lockedView);
    }

    const defaultKey = 'cinna';
    const monster = PETS_CATALOG[defaultKey];
    const embed = buildPokedexEmbed(defaultKey);
    const components = buildPokedexComponents(userId, defaultKey);
    const attachment = createPokedexAttachment(monster, false);

    await message.reply({
      embeds: [embed],
      components,
      files: [attachment],
    });
  },
};