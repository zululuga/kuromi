const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} = require('discord.js');
const {
  getActivePet,
  getUserPets,
  setActivePet,
  petCarinho,
  petSleep,
  renamePet,
  feedPet,
  useItemOnActivePet,
  hasClaimedStarterKit,
  claimStarterKit,
  getIncubator,
  putEggInIncubator,
  hatchIncubatorEgg,
  awardPetXp,
  useHourglassOnIncubator,
  expandUserIncubator,
  schedulePetsSave,
  CARINHO_COOLDOWN_MS,
  SLEEP_COOLDOWN_MS,
} = require('../services/pets');
const {
  getProceduralRun,
  startProceduralRun,
  advanceStep,
  retreatRun,
  panicFlee,
  getDungeonZones,
} = require('../services/proceduralExplorer');
const { createPetAttachment } = require('../services/petRenderer');
const {
  getUserInventory,
  getItemDefinition,
  formatItemEffects,
  getItemsByCategory,
  buyItem,
  openChest,
} = require('../services/inventory');
const { getUserAccount } = require('../services/economy');
const { PYXIE_COLORS, pyxieFooter, getRandomPhrase } = require('../utils/pyxieVoice');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { PET } = require('./commandNames');

// --- Component Builders ---

function buildHubHeaderRow(userId, currentTab = 'pet') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel('Meu Pet')
      .setEmoji('🐾')
      .setStyle(currentTab === 'pet' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:incubator:${userId}`)
      .setLabel('Chocadeira')
      .setEmoji('🥚')
      .setStyle(currentTab === 'incubator' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:dungeon:${userId}`)
      .setLabel('Dungeons')
      .setEmoji('🗺️')
      .setStyle(currentTab === 'dungeon' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:inventory:${userId}`)
      .setLabel('Mochila')
      .setEmoji('🎒')
      .setStyle(currentTab === 'inventory' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:shop:${userId}`)
      .setLabel('Lojinha')
      .setEmoji('🛒')
      .setStyle(currentTab === 'shop' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

// 1. Tab Meu Pet
function buildPetTab(userId, userTag) {
  const activePet = getActivePet(userId);
  const userPets = getUserPets(userId);

  if (!activePet) {
    return buildOnboardingView(userId, userTag);
  }

  const shinyTag = activePet.shiny ? ' ✨ **Shiny**' : '';
  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle(`${activePet.emoji}  ✦  ${activePet.name}${shinyTag}`)
    .setDescription(
      `**Tutor:** ${userTag}\n` +
      `**Espécie:** ${activePet.species} • **Elemento:** \`${activePet.element}\` • **Nível:** **${activePet.level}**\n\n` +
      `💖 **Vida:** ${activePet.stats.hp}/${activePet.stats.maxHp}  |  🍖 **Fome:** ${activePet.hunger}%  |  😊 **Humor:** ${activePet.happiness}%  |  ⚡ **Energia:** ${activePet.energy}%\n` +
      `⭐ **XP:** ${activePet.xp}/${activePet.xpToNext}  |  🏆 **Duelos:** ${activePet.duelosVencidos || 0}V - ${activePet.duelosPerdidos || 0}D\n\n` +
      `> *"${getRandomPhrase('feed')}"*`
    )
    .setImage('attachment://pet_card.png')
    .setFooter({ text: pyxieFooter('Hub Central • 100% Interativo') })
    .setTimestamp();

  const components = [buildHubHeaderRow(userId, 'pet')];

  // Se o usuário tiver mais de 1 pet, dropdown para alternar
  if (userPets.length > 1) {
    const petOptions = userPets.map((p) => ({
      label: `${p.name} (Nv. ${p.level} ${p.species})`,
      description: `HP: ${p.stats.hp}/${p.stats.maxHp} • Energia: ${p.energy}% • ${p.element}`,
      value: p.id,
      emoji: p.emoji || '🐾',
      default: p.id === activePet.id,
    }));

    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`hub_select_pet:${userId}`)
          .setPlaceholder('🔄 Alternar Pet Ativo...')
          .addOptions(petOptions.slice(0, 25))
      )
    );
  }

  // Ações do Pet
  const actionsRow = new ActionRowBuilder().addComponents(
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
      .setCustomId(`hub_pet_sleep:${userId}`)
      .setLabel('Dormir')
      .setEmoji('💤')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_support_info:${userId}`)
      .setLabel('Apoiar')
      .setEmoji('✨')
      .setStyle(ButtonStyle.Secondary)
  );

  components.push(actionsRow);

  return {
    embeds: [embed],
    components,
    files: [createPetAttachment(activePet)],
  };
}

// 2. Tab Chocadeira
function buildIncubatorTab(userId, userTag) {
  const incubator = getIncubator(userId);
  const inventory = getUserInventory(userId);
  const eggItems = Object.entries(inventory).filter(([id, count]) => {
    const def = getItemDefinition(id);
    return def && def.effects && def.effects.isEgg && count > 0;
  });

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.emerald)
    .setTitle(`🥚  ✦  Chocadeira Encantada de Pyxie — ${userTag}`)
    .setDescription(
      `*Chocadeira mágica com taxa elevada de criaturas **SHINY (15% a 20%)**!*\n` +
      `Capacidade: **${incubator.activeCount}/${incubator.maxSlots} ninhos ocupados**.\n\n` +
      incubator.slots
        .map((s) => {
          if (s.empty) {
            return `🪺 **Slot #${s.slotIndex + 1}:** *Ninho Vazio (Coloque um ovo para chocar)*`;
          }
          if (s.ready) {
            return `✨ **Slot #${s.slotIndex + 1}:** ${s.emoji} **${s.eggName}** — 🐣 **PRONTO PARA CHOCAR!**`;
          }
          const mins = Math.ceil(s.tempoRestanteMs / 60000);
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          const timeStr = hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
          return `🪺 **Slot #${s.slotIndex + 1}:** ${s.emoji} **${s.eggName}** — ⏳ Faltam **${timeStr}** (${s.progressPercent}% chocado)`;
        })
        .join('\n')
    )
    .setFooter({ text: pyxieFooter('Delta-Time Arcana • Zero CPU em Repouso') })
    .setTimestamp();

  const components = [buildHubHeaderRow(userId, 'incubator')];

  // Dropdown para colocar ovo se houver ovos e slot livre
  if (eggItems.length > 0 && incubator.freeCount > 0) {
    const eggOptions = eggItems.map(([id, count]) => {
      const def = getItemDefinition(id);
      return {
        label: `${def.name} (x${count})`,
        description: `Elemento: ${def.effects.element} • Tempo: ${Math.round(def.effects.hatchDurationMs / 3600000)}h`,
        value: id,
        emoji: def.emoji || '🥚',
      };
    });

    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`hub_incubator_place_egg:${userId}`)
          .setPlaceholder('🥚 Escolha um ovo da mochila para chocar...')
          .addOptions(eggOptions.slice(0, 25))
      )
    );
  }

  // Botões de ação da chocadeira
  const readySlots = incubator.slots.filter((s) => !s.empty && s.ready);
  const actionRow = new ActionRowBuilder();

  if (readySlots.length > 0) {
    for (const readySlot of readySlots.slice(0, 3)) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`hub_hatch_egg:${readySlot.slotIndex}:${userId}`)
          .setLabel(`Quebrar Casca (Ninho #${readySlot.slotIndex + 1})`)
          .setEmoji('🐣')
          .setStyle(ButtonStyle.Success)
      );
    }
  }

  if (incubator.maxSlots < 5) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_expand_incubator:${userId}`)
        .setLabel('Expandir (+2 Ninhos)')
        .setEmoji('🏡')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (actionRow.components.length > 0) {
    components.push(actionRow);
  }

  return { embeds: [embed], components };
  return { embeds: [embed], components, files: [] };
}

// 3. Tab Dungeons & Exploração Procedural
function buildDungeonTab(userId, userTag) {
  const activePet = getActivePet(userId);
  const run = getProceduralRun(userId);

  if (!activePet) {
    return buildOnboardingView(userId, userTag);
  }

  const components = [buildHubHeaderRow(userId, 'dungeon')];

  if (!run) {
    const zones = getDungeonZones();
    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.cyan)
      .setTitle(`🗺️  ✦  Expedições & Dungeons Procedurais — ${userTag}`)
      .setDescription(
        `Prepare **${activePet.name}** (${activePet.emoji} Nv. ${activePet.level}) para explorar labirintos mágicos!\n\n` +
        `⚡ **Energia Atual:** **${activePet.energy}/100 ⚡** (Custo médio: **8 ⚡/passo**)\n` +
        `💖 **HP Atual:** **${activePet.stats.hp}/${activePet.stats.maxHp}**\n\n` +
        `⚡ **Energia Atual:** **${activePet.energy}/100 ⚡** (Custo médio: **10 ⚡/passo**)\n` +
        `💖 **HP Atual:** **${activePet.stats.hp}/${activePet.stats.maxHp}**  |  🍖 **Fome:** **${activePet.hunger}%**\n\n` +
        `**Zonas Disponíveis:**\n` +
        zones
          .map((z) => `${z.emoji} **${z.name}** (Nv. Mín: ${z.minLevel})\n> *${z.desc}*`)
          .join('\n\n')
      )
      .setFooter({ text: pyxieFooter('Consumo de Estamina por Passo • Encontros em RAM') })
      .setFooter({ text: pyxieFooter('Passos consom estamina • Fome 0% ou 0 HP impedem exploração') })
      .setTimestamp();

    const zoneOptions = zones.map((z) => ({
      label: z.name,
      description: `Nv. Mínimo: ${z.minLevel} • Ovos: ${z.eggs.join(', ')}`,
      value: z.id,
      emoji: z.emoji,
    }));

    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`hub_dungeon_start_zone:${userId}`)
          .setPlaceholder('🌲 Escolha a zona de dungeon para explorar...')
          .addOptions(zoneOptions)
      )
    );

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_dungeon_start_fast:${userId}`)
        .setLabel('Explorar Bosque dos Guizos')
        .setEmoji('🧭')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`hub_use_energy_potion:${userId}`)
        .setLabel('Usar Frasco de Éter (+50 ⚡)')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(actionRow);

    return { embeds: [embed], components, files: [] };
  }

  const isExhausted = activePet.energy < 8 || run.isExhausted;
  const embed = new EmbedBuilder()
    .setColor(isExhausted ? PYXIE_COLORS.crimson : PYXIE_COLORS.violet)
    .setTitle(`🧭  ✦  ${run.zone.emoji} ${run.zone.name} — Passo ${run.step}/${run.maxSteps}`)
    .setDescription(
      `**Explorador:** ${activePet.name} (${activePet.emoji} Nv. ${activePet.level})\n` +
      `⚡ **Energia:** **${activePet.energy} ⚡** | 💖 **HP:** **${activePet.stats.hp}/${activePet.stats.maxHp}** | 🍖 **Fome:** ${activePet.hunger}%\n` +
      `🏞️ **Terreno Atual:** ${run.currentTerrain.emoji} **${run.currentTerrain.name}** (*${run.currentTerrain.desc}*)\n\n` +
      `💰 **Moedas Acumuladas:** **+${run.coinsAccumulated}**\n` +
      `🪺 **Ovos Resgatados:** **${run.eggsFound.length > 0 ? run.eggsFound.map((e) => `\`${e}\``).join(', ') : 'Nenhum ainda'}**\n\n` +
      `📜 **Diário da Expedição:**\n` +
      run.logs.map((l) => `> ${l}`).join('\n')
    )
    .setFooter({ text: pyxieFooter('Resgate voluntário salva 100% • Exaustão penaliza carga • 0 HP causa KO') })
    .setTimestamp();

  const runActions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_step:${userId}`)
      .setLabel('Avançar Passo')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_retreat:${userId}`)
      .setLabel(isExhausted ? 'Resgatar Espólios (Exausto)' : 'Resgatar Espólios (100%)')
      .setEmoji('🏃')
      .setStyle(isExhausted ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_flee:${userId}`)
      .setLabel('Fuga de Pânico (40%)')
      .setEmoji('💨')
      .setStyle(ButtonStyle.Danger)
  );

  components.push(runActions);

  return { embeds: [embed], components, files: [] };
}

// 4. Tab Mochila / Inventário
function buildInventoryTab(userId, userTag) {
  const inventory = getUserInventory(userId);
  const account = getUserAccount(userId);
  const activePet = getActivePet(userId);
  const entries = Object.entries(inventory).filter(([_, count]) => count > 0);

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta)
    .setTitle(`🎒  ✦  Mochila Encantada — ${userTag}`)
    .setDescription(
      `💰 **Saldo:** **${formatCoins(account.coins)}**\n` +
      `🐾 **Pet Ativo:** ${activePet ? `${activePet.emoji} ${activePet.name}` : '*Nenhum*'}\n\n` +
      (entries.length === 0
        ? '*Sua mochila está completamente vazia! Visite a Lojinha ou resgate o Kit Inicial.*'
        : entries
            .map(([id, count]) => {
              const def = getItemDefinition(id);
              if (!def) return `• \`${id}\`: **${count}x**`;
              return `${def.emoji} **${def.name}** (x${count})\n> *${def.description}*`;
            })
            .join('\n\n'))
    )
    .setFooter({ text: pyxieFooter('Selecione um item no menu para usá-lo imediatamente') })
    .setTimestamp();

  const components = [buildHubHeaderRow(userId, 'inventory')];

  if (entries.length > 0) {
    const itemOptions = entries.slice(0, 25).map(([id, count]) => {
      const def = getItemDefinition(id);
      return {
        label: `${def ? def.name : id} (x${count})`,
        description: def ? def.description.slice(0, 50) : `Quantidade: ${count}`,
        value: id,
        emoji: def ? def.emoji : '📦',
      };
    });

    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`hub_inventory_use_item:${userId}`)
          .setPlaceholder('✨ Selecione um item da mochila para usar...')
          .addOptions(itemOptions)
      )
    );
  }

  if (!hasClaimedStarterKit(userId)) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`hub_claim_kit:${userId}`)
          .setLabel('Resgatar Kit Inicial')
          .setEmoji('🎁')
          .setStyle(ButtonStyle.Success)
      )
    );
  }

  return { embeds: [embed], components };
  return { embeds: [embed], components, files: [] };
}

// 5. Tab Lojinha
function buildShopTab(userId, userTag, category = 'comida') {
  const items = getItemsByCategory(category);
  const account = getUserAccount(userId);

  const catNames = {
    comida: 'Comidas & Nutrição 🍖',
    cura: 'Cura & Estamina 🩹',
    utilitario: 'Utilitários & Ampulhetas ⏳',
    bau: 'Baús Misteriosos 📦',
    melhoria: 'Melhorias & Ninhos 🪺',
  };

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold)
    .setTitle(`🛒  ✦  Lojinha da Pyxie — ${catNames[category] || category}`)
    .setDescription(
      `💰 **Seu Saldo:** **${formatCoins(account.coins)}**\n` +
      `*Itens frescos e trapaças mágicas garantidas.*\n\n` +
      items
        .map((item) => {
          const price = item.buyPrice ? `${formatCoins(item.buyPrice)}` : 'Indisponível';
          return `${item.emoji} **${item.name}** — 🪙 ${price}\n> *${item.description}*`;
        })
        .join('\n\n')
    )
    .setFooter({ text: pyxieFooter('Clique nos itens do menu para comprar com 1 clique') })
    .setTimestamp();

  const components = [buildHubHeaderRow(userId, 'shop')];

  // Categorias
  const catOptions = [
    { label: 'Comidas & Nutrição', value: 'comida', emoji: '🍖', default: category === 'comida' },
    { label: 'Cura & Estamina', value: 'cura', emoji: '🩹', default: category === 'cura' },
    { label: 'Utilitários & Aceleração', value: 'utilitario', emoji: '⏳', default: category === 'utilitario' },
    { label: 'Baús Misteriosos', value: 'bau', emoji: '📦', default: category === 'bau' },
    { label: 'Melhorias & Ninhos', value: 'melhoria', emoji: '🏡', default: category === 'melhoria' },
  ];

  components.push(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`hub_shop_category:${userId}`)
        .setPlaceholder('📂 Mudar Categoria da Loja...')
        .addOptions(catOptions)
    )
  );

  // Itens para compra direta
  const buyableItems = items.filter((i) => i.buyPrice);
  if (buyableItems.length > 0) {
    const buyOptions = buyableItems.map((item) => ({
      label: `${item.name} (${formatCoins(item.buyPrice)})`,
      description: (item.description || '').slice(0, 45),
      value: item.id,
      emoji: item.emoji,
    }));

    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`hub_shop_buy_item:${userId}`)
          .setPlaceholder('🛒 Escolha um item para comprar...')
          .addOptions(buyOptions)
      )
    );
  }

  return { embeds: [embed], components };
  return { embeds: [embed], components, files: [] };
}

// Onboarding View para novos usuários
function buildOnboardingView(userId, userDisplayName) {
  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle('✨ ✦ Boas-vindas ao Reino de Mascotes de Pyxie! ✦ ✨')
    .setDescription(
      `Ora, ora, **${userDisplayName}**! Parece que você ainda não tem nenhum mascote para chamar de seu.\n\n` +
      `Pyxie preparou um **Kit Inicial de Aventureiro** gratuito para você dar os primeiros passos no bosque mágico!\n\n` +
      `🎁 **O que vem no Kit Inicial:**\n` +
      `• 🪙 **+150 Moedas** para adotar seu 1º pet;\n` +
      `• 🥣 **2x Rações da Floresta**;\n` +
      `• 🩹 **1x Curativo de Coração**;\n` +
      `• 📦 **1x Baú Rústico**.\n\n` +
      `*Clique no botão verde abaixo para resgatar o kit e começar!*`
    )
    .setFooter({ text: pyxieFooter('Reino Encantado de Pyxie • 1-Clique Acessível') })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_claim_kit:${userId}`)
      .setLabel('Resgatar Kit Inicial')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`hub_open_adoption:${userId}`)
      .setLabel('Centro de Adoção')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
  return { embeds: [embed], components: [row], files: [] };
}

// --- Handler de Interações do Hub ---

function isHubInteraction(interaction) {
  if (!interaction.customId) return false;
  return (
    interaction.customId.startsWith('hub_tab:') ||
    interaction.customId.startsWith('hub_select_pet:') ||
    interaction.customId.startsWith('hub_pet_feed:') ||
    interaction.customId.startsWith('hub_pet_carinho:') ||
    interaction.customId.startsWith('hub_pet_sleep:') ||
    interaction.customId.startsWith('hub_support_info:') ||
    interaction.customId.startsWith('hub_incubator_place_egg:') ||
    interaction.customId.startsWith('hub_hatch_egg:') ||
    interaction.customId.startsWith('hub_expand_incubator:') ||
    interaction.customId.startsWith('hub_dungeon_start_zone:') ||
    interaction.customId.startsWith('hub_dungeon_start_fast:') ||
    interaction.customId.startsWith('hub_dungeon_step:') ||
    interaction.customId.startsWith('hub_dungeon_retreat:') ||
    interaction.customId.startsWith('hub_dungeon_flee:') ||
    interaction.customId.startsWith('hub_use_energy_potion:') ||
    interaction.customId.startsWith('hub_inventory_use_item:') ||
    interaction.customId.startsWith('hub_claim_kit:') ||
    interaction.customId.startsWith('hub_shop_category:') ||
    interaction.customId.startsWith('hub_shop_buy_item:') ||
    interaction.customId.startsWith('hub_open_adoption:') ||
    // Compatibilidade com IDs legados
    interaction.customId.startsWith('pet_') ||
    interaction.customId.startsWith('onboard_')
  );
}

async function handleHubInteraction(interaction) {
  const customId = interaction.customId;
  const parts = customId.split(':');
  const action = parts[0];
  const targetUserId = parts[parts.length - 1];

  if (targetUserId && targetUserId !== interaction.user.id) {
    return interaction.reply({
      content: '❌ Este painel pertence a outro aventureiro. Use `/pet` para abrir o seu próprio!',
      flags: 64, // Ephemeral
    });
  }

  const userId = interaction.user.id;
  const userTag = interaction.user.displayName || interaction.user.username;

  // 1. Alternar Abas
  if (action === 'hub_tab') {
    const tabName = parts[1] || 'pet';
    if (tabName === 'pet') {
      const view = buildPetTab(userId, userTag);
      return interaction.update(view);
    }
    if (tabName === 'incubator') {
      const view = buildIncubatorTab(userId, userTag);
      return interaction.update(view);
    }
    if (tabName === 'dungeon') {
      const view = buildDungeonTab(userId, userTag);
      return interaction.update(view);
    }
    if (tabName === 'inventory') {
      const view = buildInventoryTab(userId, userTag);
      return interaction.update(view);
    }
    if (tabName === 'shop') {
      const view = buildShopTab(userId, userTag, 'comida');
      return interaction.update(view);
    }
  }

  // 2. Resgate de Kit Inicial
  if (action === 'hub_claim_kit' || action === 'onboard_kit') {
    const result = claimStarterKit(userId);
    if (!result.success) {
      return interaction.reply({
        content: '❌ Você já resgatou o seu Kit Inicial de Aventureiro anteriormente!',
        flags: 64,
      });
    }
    const view = buildInventoryTab(userId, userTag);
    return interaction.update({
      content: '🎁 **Kit Inicial Resgatado com Sucesso!** (+150 Moedas, 2x Ração da Floresta, 1x Curativo, 1x Baú)',
      ...view,
    });
  }

  // 3. Ações do Pet (Alimentar, Carinho, Dormir)
  if (action === 'hub_pet_feed' || action === 'pet_feed_menu') {
    const feedRes = feedPet(userId, 'racao_cringe');
    if (!feedRes.success) {
      if (feedRes.reason === 'no_food_in_inventory') {
        return interaction.reply({
          content: '🛒 Você não tem **Ração** na mochila! Compre na aba **Lojinha**.',
          flags: 64,
        });
      }
      return interaction.reply({
        content: feedRes.message || 'Seu pet não pode comer agora.',
        flags: 64,
      });
    }
    const view = buildPetTab(userId, userTag);
    return interaction.update(view);
  }

  if (action === 'hub_pet_carinho' || action === 'pet_carinho') {
    const carinhoRes = petCarinho(userId);
    if (!carinhoRes.success) {
      return interaction.reply({
        content: `⏳ Seu pet já recebeu muito carinho! Aguarde **${carinhoRes.remainingMinutes}m** para fazer carinho novamente.`,
        flags: 64,
      });
    }
    const view = buildPetTab(userId, userTag);
    return interaction.update(view);
  }

  if (action === 'hub_pet_sleep' || action === 'pet_sleep') {
    const sleepRes = petSleep(userId);
    if (!sleepRes.success) {
      return interaction.reply({
        content: `💤 Seu pet ainda está descansado! Poderá dormir novamente em **${sleepRes.remainingHours}h**.`,
        flags: 64,
      });
    }
    const view = buildPetTab(userId, userTag);
    return interaction.update(view);
  }

  // 4. Seleção de Pet Ativo
  if (action === 'hub_select_pet') {
    const selectedPetId = interaction.values[0];
    setActivePet(userId, selectedPetId);
    const view = buildPetTab(userId, userTag);
    return interaction.update(view);
  }

  // 5. Chocadeira: Colocar ovo
  if (action === 'hub_incubator_place_egg') {
    const eggItemId = interaction.values[0];
    const incubator = getIncubator(userId);
    const emptySlot = incubator.slots.find((s) => s.empty);
    if (!emptySlot) {
      return interaction.reply({
        content: '❌ Não há ninhos vazios na sua chocadeira!',
        flags: 64,
      });
    }
    const res = putEggInIncubator(userId, eggItemId, emptySlot.slotIndex);
    if (!res.success) {
      return interaction.reply({ content: `❌ ${res.message}`, flags: 64 });
    }
    const view = buildIncubatorTab(userId, userTag);
    return interaction.update(view);
  }

  // 6. Chocadeira: Chocar ovo pronto
  if (action === 'hub_hatch_egg') {
    const slotIdx = Number(parts[1]);
    const res = hatchIncubatorEgg(userId, slotIdx);
    if (!res.success) {
      return interaction.reply({ content: `❌ ${res.message}`, flags: 64 });
    }
    const view = buildIncubatorTab(userId, userTag);
    return interaction.update({
      content: res.message,
      ...view,
    });
  }

  // 7. Chocadeira: Expandir ninhos
  if (action === 'hub_expand_incubator') {
    const res = expandUserIncubator(userId);
    if (!res.success) {
      return interaction.reply({
        content: `❌ ${res.message} Compre o item **Ninho Encantado** na Lojinha!`,
        flags: 64,
      });
    }
    const view = buildIncubatorTab(userId, userTag);
    return interaction.update(view);
  }

  // 8. Dungeons: Iniciar expedição
  if (action === 'hub_dungeon_start_zone' || action === 'hub_dungeon_start_fast') {
    const zoneId = action === 'hub_dungeon_start_zone' ? interaction.values[0] : 'bosque';
    const activePet = getActivePet(userId);
    const startRes = startProceduralRun(userId, zoneId, activePet);
    if (!startRes.success) {
      return interaction.reply({ content: `❌ ${startRes.message}`, flags: 64 });
    }
    const view = buildDungeonTab(userId, userTag);
    return interaction.update(view);
  }

  // 9. Dungeons: Avançar Passo
  if (action === 'hub_dungeon_step') {
    const activePet = getActivePet(userId);
    const stepRes = advanceStep(userId, activePet, awardPetXp);
    schedulePetsSave();
    if (!stepRes.success) {
      return interaction.reply({ content: `❌ ${stepRes.message}`, flags: 64 });
    }
    const view = buildDungeonTab(userId, userTag);
    if (stepRes.autoCompleted) {
      return interaction.update({
        content: stepRes.completionResult?.message || '🎉 **Expedição Concluída com Sucesso!**',
        ...view,
      });
    }
    return interaction.update(view);
  }

  // 10. Dungeons: Resgatar Espólios
  if (action === 'hub_dungeon_retreat') {
    const activePet = getActivePet(userId);
    const retreatRes = retreatRun(userId, activePet, awardPetXp);
    schedulePetsSave();
    if (!retreatRes.success) {
      return interaction.reply({ content: `❌ ${retreatRes.message}`, flags: 64 });
    }
    const view = buildDungeonTab(userId, userTag);
    return interaction.update({
      content: retreatRes.message,
      ...view,
    });
  }

  // 11. Dungeons: Fuga
  if (action === 'hub_dungeon_flee') {
    const activePet = getActivePet(userId);
    const fleeRes = panicFlee(userId, activePet);
    const view = buildDungeonTab(userId, userTag);
    return interaction.update({
      content: fleeRes.message,
      ...view,
    });
  }

  // 12. Usar Poção de Energia
  if (action === 'hub_use_energy_potion') {
    const useRes = useItemOnActivePet(userId, 'pocao_energia');
    if (!useRes.success) {
      return interaction.reply({
        content: '❌ Você não tem **Frasco de Éter** na mochila! Compre na Lojinha.',
        flags: 64,
      });
    }
    const view = buildDungeonTab(userId, userTag);
    return interaction.update(view);
  }

  // 13. Mochila: Usar / Abrir / Chocar Item Selecionado
  if (action === 'hub_inventory_use_item') {
    const itemId = interaction.values[0];
    const itemDef = getItemDefinition(itemId);

    if (itemDef?.effects?.isChest) {
      const openRes = openChest(userId, itemId);
      if (!openRes.success) {
        return interaction.reply({ content: '❌ Não foi possível abrir o baú.', flags: 64 });
      }
      const itemsWonStr = (openRes.itemsWon && openRes.itemsWon.length > 0) ? ` e encontrou **1x ${openRes.itemsWon.join(', ')}**` : '';
      const view = buildInventoryTab(userId, userTag);
      return interaction.update({
        content: `🔓 **Baú Aberto com Sucesso!** Você resgatou **+${formatCoins(openRes.coinsWon)}**${itemsWonStr}!`,
        ...view,
      });
    }

    if (itemDef?.effects?.isEgg) {
      const incubator = getIncubator(userId);
      const emptySlot = incubator.slots.find((s) => s.empty);
      if (!emptySlot) {
        return interaction.reply({
          content: '❌ Todos os ninhos da sua Chocadeira estão ocupados! Vá na aba **Chocadeira** para chocar ovos prontos ou expandir.',
          flags: 64,
        });
      }
      const placeRes = putEggInIncubator(userId, itemId, emptySlot.slotIndex);
      if (!placeRes.success) {
        return interaction.reply({ content: `❌ ${placeRes.message}`, flags: 64 });
      }
      const view = buildInventoryTab(userId, userTag);
      return interaction.update({
        content: `🥚 **Ovo no Ninho!** ${itemDef.emoji} **${itemDef.name}** foi colocado no Ninho #${emptySlot.slotIndex + 1}! Vá na aba **Chocadeira** para acompanhar o tempo de choco.`,
        ...view,
      });
    }

    const useRes = useItemOnActivePet(userId, itemId);
    if (!useRes.success) {
      return interaction.reply({
        content: useRes.message || 'Falha ao usar o item.',
        flags: 64,
      });
    }
    const view = buildInventoryTab(userId, userTag);
    return interaction.update({
      content: useRes.message || `✨ Item **${useRes.item ? useRes.item.name : itemId}** utilizado!`,
      ...view,
    });
  }

  // 14. Lojinha: Mudar Categoria
  if (action === 'hub_shop_category') {
    const selectedCat = interaction.values[0];
    const view = buildShopTab(userId, userTag, selectedCat);
    return interaction.update(view);
  }

  // 15. Lojinha: Comprar Item
  if (action === 'hub_shop_buy_item') {
    const itemId = interaction.values[0];
    const buyRes = buyItem(userId, itemId, 1);
    if (!buyRes.success) {
      return interaction.reply({
        content: `❌ ${buyRes.message}`,
        flags: 64,
      });
    }
    const itemDef = getItemDefinition(itemId);
    const view = buildShopTab(userId, userTag, itemDef ? itemDef.category : 'comida');
    return interaction.update(view);
  }

  // 16. Apoio / Doação Modal / Info
  if (action === 'hub_support_info') {
    return interaction.reply({
      content:
        '💖 **Apoie o Desenvolvimento de Pyxie!**\n\n' +
        'Pyxie é um projeto 100% livre de mecânicas abusivas e *pay-to-win*.\n' +
        'Você pode apoiar doando qualquer valor via LivePix ou Pix direto para manter a hospedagem no ar!\n\n' +
        '🌟 **Benefícios de Apoiador:**\n' +
        '• Ícone exclusivo de Apoiador no perfil;\n' +
        '• Molduras estéticas especiais no Cartão Canvas;\n' +
        '• Linhas de diálogo únicas e ácidas com a Pyxie.\n\n' +
        '*(Para configurar ou enviar apoio, fale com a moderação do servidor!)*',
      flags: 64,
    });
  }

  // Fallback genérico
  const defaultView = buildPetTab(userId, userTag);
  return interaction.update(defaultView);
}

module.exports = {
  name: PET,
  data: new SlashCommandBuilder()
    .setName(PET)
    .setDescription('Abre o Hub Central de Mascotes de Pyxie (100% interativo via botões).'),
  aliases: ['pets', 'bicho', 'mascote', 'p'],
  buildPetEmbed: (pet, userTag) => buildPetTab(userTag, userTag).embeds[0],
  buildHubView: buildPetTab,
  buildPetTab,
  buildDungeonTab,
  buildInventoryTab,
  buildIncubatorTab,
  buildShopTab,
  isPetInteraction: isHubInteraction,
  handlePetInteraction: handleHubInteraction,
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const userTag = interaction.user.displayName || interaction.user.username;
    const view = buildPetTab(userId, userTag);
    await interaction.editReply(view);
  },
  async executePrefix({ message }) {
    const userId = message.author.id;
    const userTag = message.author.displayName || message.author.username;
    const view = buildPetTab(userId, userTag);
    await message.reply(view);
  },
};
