const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const {
  adoptPet,
  PETS_CATALOG,
  getPetsByElement,
  hasClaimedStarterKit,
  claimStarterKit,
  getActivePet,
} = require('../services/pets');
const { createPetAttachment } = require('../services/petRenderer');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');
const { formatCoins } = require('./economyHelpers');
const { ADOPTION } = require('./commandNames');

const ELEMENTS = [
  { label: 'Todos os Elementos', value: 'TODOS', emoji: '⭐', desc: 'Ver todas as 18 espécies' },
  { label: 'Elemento Orvalho', value: 'ORVALHO', emoji: '💧', desc: 'Alta defesa e regeneração de HP' },
  { label: 'Elemento Brisa', value: 'BRISA', emoji: '🪶', desc: 'Ágeis com alto ataque e velocidade' },
  { label: 'Elemento Silvestre', value: 'SILVESTRE', emoji: '🌿', desc: 'Equilibrados e resistentes' },
  { label: 'Elemento Charme', value: 'CHARME', emoji: '🌸', desc: 'Foco em carisma e felicidade' },
  { label: 'Elemento Travessura', value: 'TRAVESSURA', emoji: '🔮', desc: 'Místicos com altíssimo dano' },
];

function getChoices() {
  return Object.values(PETS_CATALOG)
    .slice(0, 25)
    .map((pet) => ({
      name: `${pet.emoji} ${pet.name} — ${formatCoins(pet.baseCost)}`,
      value: pet.key,
    }));
}

function buildAdoptionEmbed(selectedElement = 'TODOS', selectedPetKey = null) {
  const isAll = selectedElement === 'TODOS';
  const pets = isAll ? Object.values(PETS_CATALOG) : getPetsByElement(selectedElement);
  const elementInfo = ELEMENTS.find((e) => e.value === selectedElement) || ELEMENTS[0];

  const colorMap = {
    ORVALHO: PYXIE_COLORS.cyan,
    BRISA: '#38bdf8',
    SILVESTRE: PYXIE_COLORS.emerald,
    CHARME: PYXIE_COLORS.neonPink,
    TRAVESSURA: PYXIE_COLORS.violet,
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[selectedElement] || PYXIE_COLORS.lilac)
    .setTitle(`🐾  ✦  Centro de Adoção de Pyxie — ${elementInfo.label}`)
    .setDescription(
      `*${elementInfo.desc}*\n\n` +
      'Escolha um elemento no menu superior e selecione o mascote desejado no menu de espécies.\n' +
      'Todos os pets adotados iniciam no **Nível 1** com atributos base balanceados!'
    )
    .setFooter({ text: pyxieFooter('Adote com 1 clique • Taxa de 5% Shiny na Adoção') })
    .setTimestamp();

  if (selectedPetKey && PETS_CATALOG[selectedPetKey]) {
    const p = PETS_CATALOG[selectedPetKey];
    embed.addFields({
      name: `✨ Mascote Selecionado: ${p.emoji} ${p.name}`,
      value:
        `**Elemento:** \`${p.element}\` | **Raridade:** \`${p.rarity}\` | **Preço:** **${formatCoins(p.baseCost)}**\n` +
        `💖 HP: **${p.baseStats.hp}** | ⚔️ ATK: **${p.baseStats.atk}** | 🛡️ DEF: **${p.baseStats.def}** | 💨 SPD: **${p.baseStats.spd}**\n` +
        `> *"${p.description}"*`,
      inline: false,
    });
  } else {
    pets.slice(0, 8).forEach((p) => {
      embed.addFields({
        name: `${p.emoji} ${p.name} — ${formatCoins(p.baseCost)}`,
        value: `\`${p.element}\` • HP ${p.baseStats.hp} | ATK ${p.baseStats.atk} | DEF ${p.baseStats.def} | SPD ${p.baseStats.spd}`,
        inline: true,
      });
    });
  }

  return embed;
}

function buildAdoptionComponents(userId, selectedElement = 'TODOS', selectedPetKey = null) {
  const isAll = selectedElement === 'TODOS';
  const pets = isAll ? Object.values(PETS_CATALOG) : getPetsByElement(selectedElement);

  // 1. Menu de Seleção de Elemento
  const elementMenu = new StringSelectMenuBuilder()
    .setCustomId(`adopt_elem_select:${userId}`)
    .setPlaceholder('🔮 Filtrar Mascotes por Elemento...')
    .addOptions(
      ELEMENTS.map((el) => ({
        label: el.label,
        value: el.value,
        description: el.desc.slice(0, 50),
        emoji: el.emoji,
        default: el.value === selectedElement,
      }))
    );

  // 2. Menu de Seleção de Pet
  const petOptions = pets.slice(0, 25).map((p) => ({
    label: `${p.name} — ${formatCoins(p.baseCost)}`,
    value: p.key,
    description: `HP: ${p.baseStats.hp} • ATK: ${p.baseStats.atk} • DEF: ${p.baseStats.def} • SPD: ${p.baseStats.spd}`,
    emoji: p.emoji,
    default: p.key === selectedPetKey,
  }));

  const petMenu = new StringSelectMenuBuilder()
    .setCustomId(`adopt_pet_select:${userId}`)
    .setPlaceholder('🐾 Escolha a espécie que deseja adotar...')
    .addOptions(petOptions);

  // 3. Botões de Ação
  const buttonRow = new ActionRowBuilder();

  if (selectedPetKey && PETS_CATALOG[selectedPetKey]) {
    const selectedPet = PETS_CATALOG[selectedPetKey];
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`adopt_confirm:${selectedPet.key}:${userId}`)
        .setLabel(`Adotar ${selectedPet.name} (${formatCoins(selectedPet.baseCost)})`)
        .setEmoji(selectedPet.emoji || '🐾')
        .setStyle(ButtonStyle.Success)
    );
  } else {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`adopt_hint:${userId}`)
        .setLabel('Selecione um Pet Acima para Adotar')
        .setEmoji('☝️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  }

  if (!hasClaimedStarterKit(userId)) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`onboard_kit:${userId}`)
        .setLabel('Resgatar Kit Inicial')
        .setEmoji('🎁')
        .setStyle(ButtonStyle.Primary)
    );
  }

  buttonRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel('Ver Meu Pet')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Secondary)
  );

  return [
    new ActionRowBuilder().addComponents(elementMenu),
    new ActionRowBuilder().addComponents(petMenu),
    buttonRow,
  ];
}

function isAdoptionInteraction(interaction) {
  if (!interaction.customId) return false;
  return (
    interaction.customId.startsWith('adopt_elem_select:') ||
    interaction.customId.startsWith('adopt_pet_select:') ||
    interaction.customId.startsWith('adopt_confirm:') ||
    interaction.customId.startsWith('adopt_feed_direct:') ||
    interaction.customId.startsWith('adopt_carinho_direct:')
  );
}

async function handleAdoptionInteraction(interaction) {
  const customId = interaction.customId;
  const parts = customId.split(':');
  const action = parts[0];
  const targetUserId = parts[parts.length - 1];

  if (targetUserId && targetUserId !== interaction.user.id) {
    return interaction.reply({
      content: '❌ Este centro de adoção pertence a outro aventureiro. Use `/adocao` para abrir o seu!',
      flags: 64,
    });
  }

  const userId = interaction.user.id;

  // 1. Filtrar por Elemento
  if (action === 'adopt_elem_select') {
    const selectedElement = interaction.values[0];
    const embed = buildAdoptionEmbed(selectedElement, null);
    const components = buildAdoptionComponents(userId, selectedElement, null);
    return interaction.update({ embeds: [embed], components });
  }

  // 2. Selecionar Pet específico
  if (action === 'adopt_pet_select') {
    const selectedPetKey = interaction.values[0];
    const petDef = PETS_CATALOG[selectedPetKey];
    const element = petDef ? petDef.element : 'TODOS';
    const embed = buildAdoptionEmbed(element, selectedPetKey);
    const components = buildAdoptionComponents(userId, element, selectedPetKey);
    return interaction.update({ embeds: [embed], components });
  }

  // 3. Confirmar Adoção
  if (action === 'adopt_confirm') {
    const petKey = parts[1];
    const result = adoptPet(userId, petKey);

    if (!result.success) {
      if (result.reason === 'insufficient_coins') {
        return interaction.reply({
          content: `❌ ${result.message} Você pode conseguir moedas trabalhando (\`/trabalho\`) ou explorando dungeons!`,
          flags: 64,
        });
      }
      if (result.reason === 'max_pets_reached') {
        return interaction.reply({
          content: `❌ ${result.message}`,
          flags: 64,
        });
      }
      return interaction.reply({
        content: `❌ ${result.message || 'Falha ao adotar este pet.'}`,
        flags: 64,
      });
    }

    const adopted = result.pet;
    const shinyText = adopted.shiny ? ' ✨ **SHINY RARO!**' : '';

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.emerald)
      .setTitle(`🎉  ✦  Parabéns! Você adotou um ${adopted.species}!${shinyText}`)
      .setDescription(
        `O seu novo companheiro **${adopted.name}** ${adopted.emoji} já está aos seus cuidados!\n\n` +
        `• **Elemento:** \`${adopted.element}\`\n` +
        `• **Nível Inicial:** **1**\n` +
        `• **Vida:** ${adopted.stats.hp}/${adopted.stats.maxHp}  |  ⚡ **Energia:** ${adopted.energy}%\n\n` +
        `*Cuide bem dele para que ele fique forte e enfrente os desafios das dungeons!*`
      )
      .setImage('attachment://pet_card.png')
      .setFooter({ text: pyxieFooter('Adotado com Sucesso • Pronto para Aventuras') })
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
        .setEmoji('🧭')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:pet:${userId}`)
        .setLabel('Abrir Hub do Pet')
        .setEmoji('🐾')
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
    .setDescription('Abre o Centro de Adoção de Mascotes com filtros por elemento e 1-clique.')
    .addStringOption((option) =>
      option
        .setName('pet')
        .setDescription('Espécie do pet para adoção rápida')
        .setRequired(false)
        .addChoices(...getChoices())
    ),
  aliases: ['adotar', 'adote', 'petshop', 'canil'],
  isAdoptionInteraction,
  handleAdoptionInteraction,
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const directPet = interaction.options.getString('pet');

    if (directPet) {
      const result = adoptPet(userId, directPet);
      if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.message || 'Falha ao adotar.'}` });
      }
      const adopted = result.pet;
      const shinyText = adopted.shiny ? ' ✨ **SHINY!**' : '';
      const embed = new EmbedBuilder()
        .setColor(PYXIE_COLORS.emerald)
        .setTitle(`🎉  ✦  Mascote Adotado com Sucesso!${shinyText}`)
        .setDescription(`Você adotou **${adopted.name}** ${adopted.emoji} por ${formatCoins(result.cost)}!`)
        .setImage('attachment://pet_card.png');
      return interaction.editReply({ embeds: [embed], files: [createPetAttachment(adopted)] });
    }

    const embed = buildAdoptionEmbed('TODOS', null);
    const components = buildAdoptionComponents(userId, 'TODOS', null);
    await interaction.editReply({ embeds: [embed], components });
  },
  async executePrefix({ message, args }) {
    const userId = message.author.id;
    const embed = buildAdoptionEmbed('TODOS', null);
    const components = buildAdoptionComponents(userId, 'TODOS', null);
    await message.reply({ embeds: [embed], components });
  },
};