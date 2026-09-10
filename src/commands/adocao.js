const {
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
const { createPetAttachment, createDexAttachment } = require('../services/petRenderer');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');

const STARTER_KEYS = ['cinna', 'bonorka', 'pomcorin'];

function buildDexEmbed(selectedKey = 'cinna') {
  const starter = PETS_CATALOG[selectedKey] || PETS_CATALOG.cinna;

  const colorMap = {
    CHARME: PYXIE_COLORS.neonPink,
    ORVALHO: PYXIE_COLORS.cyan,
    SILVESTRE: PYXIE_COLORS.emerald,
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[starter.element] || PYXIE_COLORS.lilac)
    .setTitle(`📖  ✦  Dex de Pymons — Escolha seu Inicial!`)
    .setDescription(
      `Escolha o seu companheiro para iniciar sua jornada no Reino de Pyxie!\n\n` +
      `✨ **PROBABILIDADE SHINY**\n` +
      `Há **5% de chance** do seu Pymon inicial nascer em sua forma **Shiny Rara**!\n\n` +
      `🔒 **REGRA DE ADOÇÃO**\n` +
      `Você só pode escolher **1 Pymon inicial**. Após a escolha, novos Pymons só poderão ser obtidos encontrando ovos em **Dungeons** e chocando na **Chocadeira**!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🐾 **Pymon Selecionado:** ${starter.emoji} **${starter.name}** (\`${starter.element}\`)\n` +
      `> *"${starter.description}"*\n\n` +
      `💖 HP: **${starter.baseStats.hp}**  •  ⚔️ ATK: **${starter.baseStats.atk}**  •  🛡️ DEF: **${starter.baseStats.def}**  •  💨 SPD: **${starter.baseStats.spd}**`
      `• 💖 **HP:** ${starter.baseStats.hp}  •  ⚔️ **ATK:** ${starter.baseStats.atk}\n` +
      `• 🛡️ **DEF:** ${starter.baseStats.def}  •  💨 **SPD:** ${starter.baseStats.spd}`
      `• 💖 **HP:** **${starter.baseStats.hp}**  •  ⚔️ **ATK:** **${starter.baseStats.atk}**\n` +
      `• 🛡️ **DEF:** **${starter.baseStats.def}**  •  💨 **SPD:** **${starter.baseStats.spd}**`
    )
    .setImage('attachment://dex_entry.png')
    .setFooter({ text: 'Dex de Pymons • Escolha seu companheiro inicial' })
    .setTimestamp();

  return embed;
}

const buildPokedexEmbed = buildDexEmbed;

function buildDexComponents(userId, selectedKey = 'cinna') {
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
      .setLabel(`Escolher ${selectedMonster.name} como meu Pymon!`)
      .setEmoji('✨')
      .setStyle(ButtonStyle.Success)
  );

  return [navRow, actionRow];
}

const buildPokedexComponents = buildDexComponents;

function buildAdoptedLockedView(userId, userPets) {
  const active = userPets[0];
  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle('🔒  ✦  Centro de Adoção de Pymons — Adoção Concluída')
    .setDescription(
      `Olá, aventureiro! Você já escolheu seu Pymon inicial (**${active ? active.name : 'Seu Inicial'}**).\n\n` +
      `🌟 **Como conseguir mais Pymons?**\n` +
      `O Centro de Adoção é exclusivo para tutores iniciantes. Para expandir sua coleção com novas espécies e variantes raras:\n\n` +
      `1. 🗺️ Aventure-se nas **Dungeons** com \`/pymons\` para encontrar **Ovos Misteriosos**;\n` +
      `2. 🥚 Coloque os ovos na sua **Chocadeira** e acelere o tempo de choco;\n` +
      `1. 🗺️ Aventure-se nas **Dungeons** com \`/pymons\` para encontrar **Ovos Misteriosos**;\n\n` +
      `2. 🥚 Coloque os ovos na sua **Chocadeira** e acompanhe o tempo de choco;\n\n` +
      `3. 🐣 Quebre a casca para despertar novos Pymons autorais com **até 20% de chance Shiny**!`
    )
    .setFooter({ text: 'Adoção Concluída • Obtenha mais Pymons via Dungeons' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel('Meu Pymon')
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
      content: '❌ Esta Dex pertence a outro aventureiro. Use `/pymons` para abrir a sua!',
      flags: 64,
    });
  }

  const userId = interaction.user.id;
  const userPets = getUserPets(userId);

  // Se já tiver pet e tentar interagir
  if (userPets.length > 0 && action === 'adopt_confirm') {
    return interaction.reply({
      content: '🔒 Você já possui um Pymon inicial! Obtenha novos companheiros explorando Dungeons e chocando ovos.',
      flags: 64,
    });
  }

  // 1. Navegar entre os 3 iniciais na Dex
  if (action === 'adopt_preview') {
    const selectedKey = parts[1] || 'cinna';
    const monster = PETS_CATALOG[selectedKey] || PETS_CATALOG.cinna;
    const embed = buildDexEmbed(selectedKey);
    const components = buildDexComponents(userId, selectedKey);
    const attachment = createDexAttachment(monster, false);

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
      .setTitle(`🎉  ✦  Você escolheu ${adopted.name} como seu Pymon!`)
      .setDescription(
        `${shinyBanner}` +
        `O seu companheiro **${adopted.name}** ${adopted.emoji} já está aos seus cuidados!\n\n` +
        `• **Elemento:** \`${adopted.element}\`\n` +
        `• **Nível Inicial:** **1**\n` +
        `• **Vida:** **${adopted.stats.hp}/${adopted.stats.maxHp}**  |  ⚡ **Energia:** **${adopted.energy}%**\n\n` +
        `🎁 **Kit de Sobrevivência Entregue:** Você recebeu 2x Ração da Floresta, 1x Curativo e 1x Baú Rústico na Mochila!\n\n` +
        `• **Vida:** **${adopted.stats.hp}/${adopted.stats.maxHp}**\n` +
        `• **Energia:** **${adopted.energy}%**\n\n` +
        `🎁 **Kit de Sobrevivência Entregue na Mochila:**\n` +
        `• 🪙 **+150 Moedas**\n` +
        `• 🥣 **2x Ração da Floresta**\n` +
        `• 🩹 **1x Curativo**\n` +
        `• 📦 **1x Baú Rústico**\n\n` +
        `*Acesse o painel principal com \`/pymons\` para alimentá-lo, treinar e desbravar as Dungeons!*`
      )
      .setImage('attachment://pet_card.png')
      .setFooter({ text: 'Pymon Adotado • Centro de Adoção Trancado' })
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
        .setLabel('Abrir Pymons')
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
  isAdoptionInteraction,
  handleAdoptionInteraction,
  buildDexEmbed,
  buildDexComponents,
  buildPokedexEmbed: buildDexEmbed,
  buildPokedexComponents: buildDexComponents,
  buildAdoptedLockedView,
};