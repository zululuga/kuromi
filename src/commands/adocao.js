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
const { formatCoins } = require('./economyHelpers');
const { ADOPTION } = require('./commandNames');

const ELEMENTS = [
  { label: '🌟 Todos os Elementos', value: 'TODOS', emoji: '🌟', desc: 'Ver todas as 24 espécies disponíveis para adoção' },
  { label: '🌑 Elemento Sombra', value: 'SOMBRA', emoji: '🌑', desc: 'Pets noturnos e furtivos com alto ataque e agilidade' },
  { label: '💖 Elemento Fofura', value: 'FOFURA', emoji: '💖', desc: 'Criaturas doces e amáveis com alto HP e felicidade' },
  { label: '🔥 Elemento Caos', value: 'CAOS', emoji: '🔥', desc: 'Criaturas rebeldes com alto dano crítico e energia' },
  { label: '🔮 Elemento Místico', value: 'MISTICO', emoji: '🔮', desc: 'Seres mágicos e arcanos com alta defesa e velocidade' },
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

  const embed = new EmbedBuilder()
    .setColor(selectedElement === 'SOMBRA' ? '#a855f7' : selectedElement === 'FOFURA' ? '#f472b6' : selectedElement === 'CAOS' ? '#f59e0b' : selectedElement === 'MISTICO' ? '#38bdf8' : '#E60067')
    .setTitle(`🐾  ✦  Centro de Adoção da Kuromi — ${elementInfo.label}`)
    .setDescription(
      `*${elementInfo.desc}*\n\n` +
      'Escolha um elemento ou selecione o mascote que você deseja adotar no menu abaixo.\n' +
      'Kuromi avisa: *“Cada pet tem afinidades únicas nas masmorras, então escolha com sabedoria!”*'
    )
    .setFooter({ text: 'Cringelândia Pets • Kuromi não aceita devoluções nem choro' })
    .setTimestamp();

  if (selectedPetKey && PETS_CATALOG[selectedPetKey]) {
    const p = PETS_CATALOG[selectedPetKey];
    embed.addFields({
      name: `👉 Selecionado: ${p.emoji} ${p.name} (${formatCoins(p.baseCost)})`,
      value: `> **Elemento:** \`${p.element}\` • **Raridade:** \`${p.rarity}\`\n> 💖 **HP Base:** ${p.baseStats.hp} | ⚔️ **ATK:** ${p.baseStats.atk} | 🛡️ **DEF:** ${p.baseStats.def} | 💨 **SPD:** ${p.baseStats.spd}\n> *Clique no botão verde abaixo para confirmar a adoção!*`,
      inline: false,
    });
  }

  // Lista resumida de espécies disponíveis
  const petLines = pets.slice(0, 8).map((p) => `> ${p.emoji} **${p.name}** (\`${p.element}\`) — **${formatCoins(p.baseCost)}** (HP: ${p.baseStats.hp}, ATK: ${p.baseStats.atk})`);
  embed.addFields({
    name: `📋 Mascotes Disponíveis (${pets.length})`,
    value: petLines.join('\n') || 'Nenhum pet encontrado.',
    inline: false,
  });

  return embed;
}

function buildAdoptionComponents(userId, selectedElement = 'TODOS', selectedPetKey = null) {
  const rows = [];

  // 1. Menu de Seleção de Elemento
  const elementSelect = new StringSelectMenuBuilder()
    .setCustomId(`adopt_elem:${userId}`)
    .setPlaceholder('🔮 Filtrar por Elemento Místico...')
    .addOptions(
      ELEMENTS.map((el) => ({
        label: el.label,
        value: el.value,
        emoji: el.emoji,
        description: el.desc.slice(0, 50),
        default: el.value === selectedElement,
      }))
    );
  rows.push(new ActionRowBuilder().addComponents(elementSelect));

  // 2. Menu de Seleção de Pet dentro do Elemento
  const isAll = selectedElement === 'TODOS';
  const pets = (isAll ? Object.values(PETS_CATALOG) : getPetsByElement(selectedElement)).slice(0, 25);

  const petSelect = new StringSelectMenuBuilder()
    .setCustomId(`adopt_select:${userId}:${selectedElement}`)
    .setPlaceholder('🐾 Escolha um mascote para adotar...')
    .addOptions(
      pets.map((p) => ({
        label: `${p.name} (${p.baseCost}🪙)`,
        value: p.key,
        emoji: p.emoji,
        description: `${p.element} • HP: ${p.baseStats.hp} | ATK: ${p.baseStats.atk} | DEF: ${p.baseStats.def}`,
        default: p.key === selectedPetKey,
      }))
    );
  rows.push(new ActionRowBuilder().addComponents(petSelect));

  // 3. Botões de Ação
  const buttons = [];
  if (selectedPetKey && PETS_CATALOG[selectedPetKey]) {
    const p = PETS_CATALOG[selectedPetKey];
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`adopt_confirm:${userId}:${p.key}`)
        .setLabel(`Adotar ${p.name} (${p.baseCost}🪙)`)
        .setEmoji('🐾')
        .setStyle(ButtonStyle.Success)
    );
  }

  if (!hasClaimedStarterKit(userId)) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`onboard_kit:${userId}`)
        .setLabel('Resgatar Kit Inicial (150🪙 + Itens)')
        .setEmoji('🎁')
        .setStyle(ButtonStyle.Primary)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId(`pet_bag_list:${userId}`)
      .setLabel('Meus Pets')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary)
  );

  if (buttons.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(buttons));
  }

  return rows;
}

function buildAdoptSuccessReply(userId, userDisplayName, result) {
  const shinyLabel = result.shiny ? ' ✨ **SHINY ESPECIAL!**' : result.corrupt ? ' 🖤 **CORROMPIDO PELO CAOS!**' : '';
  const pet = result.pet;
  const attachment = createPetAttachment(pet);

  const embed = new EmbedBuilder()
    .setColor(result.shiny ? '#facc15' : result.corrupt ? '#581c87' : '#E60067')
    .setTitle(`🎉  ✦  Novo Mascote Adotado com Sucesso!  ✦  ✨`)
    .setDescription(
      `Parabéns, **${userDisplayName}**! Você acolheu **${pet.emoji} ${pet.name}**${shinyLabel}!\n\n` +
      `🪙 **Custo:** ${formatCoins(pet.baseCost || 0)}  |  💰 **Saldo restante:** ${formatCoins(result.balance)}\n` +
      `🐾 **Status Inicial:** HP: ${pet.stats.hp}/${pet.stats.maxHp} • Fome: 100% • Humor: 100% • Energia: 100%\n\n` +
      '> *Kuromi dá uma risadinha:* “Vê se cuida bem desse bicho, tá ouvindo?! Não quero reclamações!”\n\n' +
      '**Ações Rápidas Disponíveis:**'
    )
    .setImage('attachment://pet_card.png')
    .setFooter({ text: 'Cringelândia Pets • Kuromi é a chefe deste abrigo' })
    .setTimestamp();

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pet_feed_menu:${userId}`)
      .setLabel('Alimentar')
      .setEmoji('🍖')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`pet_carinho:${userId}`)
      .setLabel('Carinho')
      .setEmoji('💖')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`pet_explore_zones:${userId}`)
      .setLabel('Explorar Dungeons')
      .setEmoji('🧭')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`inv_select:${userId}`)
      .setLabel('Mochila')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    files: [attachment],
    components: [actionRow],
  };
}

function isAdoptionInteraction(interaction) {
  return (
    (interaction.isStringSelectMenu() &&
      (interaction.customId.startsWith('adopt_elem:') || interaction.customId.startsWith('adopt_select:'))) ||
    (interaction.isButton() && interaction.customId.startsWith('adopt_confirm:'))
  );
}

async function handleAdoptionInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const ownerId = parts[1];

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: '❌ Apenas a pessoa que abriu este menu de adoção pode interagir!',
      ephemeral: true,
    });
    return;
  }

  // 1. Filtrar Elemento
  if (action === 'adopt_elem') {
    const selectedElement = interaction.values[0];
    const embed = buildAdoptionEmbed(selectedElement, null);
    const components = buildAdoptionComponents(ownerId, selectedElement, null);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  // 2. Selecionar Pet no Dropdown
  if (action === 'adopt_select') {
    const selectedElement = parts[2] || 'TODOS';
    const selectedPetKey = interaction.values[0];
    const embed = buildAdoptionEmbed(selectedElement, selectedPetKey);
    const components = buildAdoptionComponents(ownerId, selectedElement, selectedPetKey);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  // 3. Confirmar Adoção
  if (action === 'adopt_confirm') {
    const petKey = parts[2];
    const result = adoptPet(ownerId, petKey);

    if (!result.success) {
      if (result.reason === 'slots_full') {
        await interaction.reply({
          content: `❌ Sua mochila de pets está cheia (${result.currentCount}/${result.maxSlots} slots)! Compre uma **Expansão de Canil** na \`/loja\` para ter mais vagas.`,
          ephemeral: true,
        });
      } else if (result.reason === 'insufficient_funds') {
        const claimBtn = !hasClaimedStarterKit(ownerId) ? '\n💡 Dica: Resgate o seu **Kit Inicial (+150🪙)** clicando no botão do kit!' : '';
        await interaction.reply({
          content: `❌ Você precisa de **${formatCoins(result.cost)}**, mas seu saldo é **${formatCoins(result.balance)}**.${claimBtn}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: '❌ Não foi possível adotar este pet no momento.',
          ephemeral: true,
        });
      }
      return;
    }

    const replyData = buildAdoptSuccessReply(ownerId, interaction.user.displayName, result);
    await interaction.update({ embeds: replyData.embeds, files: replyData.files, components: replyData.components });
  }
}

function normalizePet(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
  name: ADOPTION,
  aliases: ['adotar'],
  data: new SlashCommandBuilder()
    .setName(ADOPTION)
    .setDescription('Abre o centro de adoção ou adota um novo mascote para sua coleção')
    .addStringOption((option) =>
      option
        .setName('pet')
        .setDescription('Espécie que você deseja adotar diretamente')
        .setRequired(false)
        .addChoices(...getChoices())
    ),
  async executePrefix({ message, args }) {
    if (!args[0]) {
      const embed = buildAdoptionEmbed('TODOS', null);
      const components = buildAdoptionComponents(message.author.id, 'TODOS', null);
      await message.reply({ embeds: [embed], components });
      return;
    }
    const result = adoptPet(message.author.id, normalizePet(args[0]));
    if (!result.success) {
      if (result.reason === 'insufficient_funds') {
        await message.reply(`❌ Você precisa de **${formatCoins(result.cost)}**, mas seu saldo é **${formatCoins(result.balance)}**.`);
      } else {
        await message.reply('❌ Não foi possível adotar esta espécie.');
      }
      return;
    }
    const replyData = buildAdoptSuccessReply(message.author.id, message.author.displayName, result);
    await message.reply(replyData);
  },
  async executeSlash({ interaction }) {
    const petKey = interaction.options.getString('pet');
    if (!petKey) {
      const embed = buildAdoptionEmbed('TODOS', null);
      const components = buildAdoptionComponents(interaction.user.id, 'TODOS', null);
      await interaction.editReply({ embeds: [embed], components });
      return;
    }
    const result = adoptPet(interaction.user.id, petKey);
    if (!result.success) {
      if (result.reason === 'insufficient_funds') {
        await interaction.editReply({ content: `❌ Você precisa de **${formatCoins(result.cost)}**, mas seu saldo é **${formatCoins(result.balance)}**.` });
      } else if (result.reason === 'slots_full') {
        await interaction.editReply({ content: `❌ Sua mochila de pets está cheia (${result.currentCount}/${result.maxSlots} slots)!` });
      } else {
        await interaction.editReply({ content: '❌ Espécie inválida ou não disponível.' });
      }
      return;
    }
    const replyData = buildAdoptSuccessReply(interaction.user.id, interaction.user.displayName, result);
    await interaction.editReply(replyData);
  },
  buildAdoptionEmbed,
  buildAdoptionComponents,
  isAdoptionInteraction,
  handleAdoptionInteraction,
};