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
  movePlayer,
  advanceStep,
  retreatRun,
  panicFlee,
  getDungeonZones,
} = require('../services/proceduralExplorer');
const {
  createPetAttachment,
  createExpeditionMapAttachment,
} = require('../services/petRenderer');
const {
  getUserInventory,
  getItemDefinition,
  formatItemEffects,
  getItemsByCategory,
  buyItem,
  openChest,
} = require('../services/inventory');
const { getUserAccount } = require('../services/economy');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { PYMONS, PIXELMONSTERS, PET } = require('./commandNames');

// --- Component Builders (Interface Estilo Tamagotchi) ---

/**
 * Constrói a barra principal de navegação com 4 botões essenciais.
 */
function buildHubHeaderRow(userId, currentTab = 'pet', subMode = null) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_sub:care:${userId}`)
      .setLabel('Cuidar')
      .setEmoji('🐾')
      .setStyle(subMode === 'care' ? ButtonStyle.Primary : (currentTab === 'pet' ? ButtonStyle.Primary : ButtonStyle.Secondary)),
    new ButtonBuilder()
      .setCustomId(`hub_tab:dungeon:${userId}`)
      .setLabel('Aventura')
      .setEmoji('🗺️')
      .setStyle(currentTab === 'dungeon' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_tab:inventory:${userId}`)
      .setLabel('Mochila')
      .setEmoji('🎒')
      .setStyle(currentTab === 'inventory' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`hub_sub:more:${userId}`)
      .setLabel('Mais')
      .setEmoji('📱')
      .setStyle(subMode === 'more' || ['dex', 'incubator', 'shop'].includes(currentTab) ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

// 1. Tab Meu Pymon (Painel Principal Tamagotchi)
function buildPetTab(userId, userTag, subMode = null) {
  const activePet = getActivePet(userId);
  const userPets = getUserPets(userId);

  if (!activePet) {
    return buildOnboardingView(userId, userTag);
  }

  const shinyTag = activePet.shiny ? ' ✨ **Shiny**' : '';
  const desc = [
    '✨ **TREINADOR & ESPÉCIE**',
    `> 👤 **Treinador:** ${userTag}`,
    `> 🐾 **Espécie:** ${activePet.species}  •  🔮 **Elemento:** \`${activePet.element}\`  •  ⭐ **Nível:** **${activePet.level}**`,
    '',
    '💖 **VITAIS & BEM-ESTAR**',
    `> ❤️ **Vida:** **${activePet.stats.hp}/${activePet.stats.maxHp}**  •  🍖 **Fome:** **${activePet.hunger}%**`,
    `> ⚡ **Energia:** **${activePet.energy}%**  •  😊 **Humor:** **${activePet.happiness}%**`,
    '',
    '📈 **PROGRESSO & COMBATE**',
    `> ⭐ **XP:** **${activePet.xp}/${activePet.xpToNext}**`,
    `> 🏆 **Duelos:** **${activePet.duelosVencidos || 0}V - ${activePet.duelosPerdidos || 0}D**`,
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle(`${activePet.emoji}  ✦  ${activePet.name}${shinyTag}`)
    .setDescription(desc)
    .setImage('attachment://pet_card.png')
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const components = [buildHubHeaderRow(userId, 'pet', subMode)];

  const petSelectRow = userPets.length > 1
    ? new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`hub_select_pet:${userId}`)
          .setPlaceholder('🔄 Alternar Pet Ativo...')
          .addOptions(
            userPets.slice(0, 25).map((p) => ({
              label: `${p.name}${p.shiny ? ' ✨ Shiny' : ''} (Nv. ${p.level} ${p.species})`,
              description: `${p.shiny ? '✨ Shiny • ' : ''}HP: ${p.stats.hp}/${p.stats.maxHp} • Energia: ${p.energy}% • ${p.element}`,
              value: p.id,
              emoji: p.emoji || '🐾',
              default: p.id === activePet.id,
            }))
          )
      )
    : null;

  if (subMode === 'care') {
    // Submenu Cuidar
    const careRow = new ActionRowBuilder().addComponents(
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
        .setCustomId(`hub_pet_heal:${userId}`)
        .setLabel('Curativo')
        .setEmoji('🩹')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:pet:${userId}`)
        .setLabel('Fechar')
        .setEmoji('◀')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(careRow);
    if (petSelectRow) components.push(petSelectRow);

  } else if (subMode === 'more') {
    // Submenu Mais Recursos & Ações
    const moreRow1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_tab:dex:${userId}`)
        .setLabel('Dex')
        .setEmoji('📖')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:incubator:${userId}`)
        .setLabel('Chocadeira')
        .setEmoji('🥚')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:shop:${userId}`)
        .setLabel('Lojinha')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:element:${userId}`)
        .setLabel('Elementos')
        .setEmoji('⚖️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:pet:${userId}`)
        .setLabel('Fechar')
        .setEmoji('◀')
        .setStyle(ButtonStyle.Secondary)
    );
    const moreRow2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_tab:expedition:${userId}`)
        .setLabel('Expedição AFK')
        .setEmoji('⏳')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`hub_tab:boss:${userId}`)
        .setLabel('World Boss')
        .setEmoji('🐉')
        .setStyle(ButtonStyle.Danger)
    );
    if (userPets.length > 1) {
      moreRow2.addComponents(
        new ButtonBuilder()
          .setCustomId(`hub_release_menu:${userId}`)
          .setLabel('Liberar Pet')
          .setEmoji('🍃')
          .setStyle(ButtonStyle.Secondary)
      );
    }
    components.push(moreRow1, moreRow2);
    if (petSelectRow) components.push(petSelectRow);

  } else {
    // Menu padrão rápido
    if (petSelectRow) {
      components.push(petSelectRow);
    }

    const quickActionsRow = new ActionRowBuilder().addComponents(
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
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(quickActionsRow);
  }

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

  const slotLines = incubator.slots.map((s) => {
    if (s.empty) {
      return `🪺 **Ninho #${s.slotIndex + 1}**\n> *Ninho Vazio (Coloque um ovo para chocar)*`;
    }
    if (s.ready) {
      return `✨ **Ninho #${s.slotIndex + 1}:** ${s.emoji} **${s.eggName}**\n> 🐣 **PRONTO PARA CHOCAR!** *(Clique em Quebrar Casca)*`;
    }
    const mins = Math.ceil(s.tempoRestanteMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
    return `🪺 **Ninho #${s.slotIndex + 1}:** ${s.emoji} **${s.eggName}**\n> ⏳ **Faltam:** ${timeStr}  •  📊 **Progresso:** ${s.progressPercent}% chocado`;
  });

  const desc = [
    `*Chocadeira mágica com taxa elevada de criaturas **SHINY (15% a 20%)**!*`,
    '> *Chocadeira mágica com taxa elevada de criaturas **SHINY (15% a 20%)**!*',
    '*Chocadeira mágica com taxa elevada de criaturas **SHINY (15% a 20%)**!*',
    '',
    `🏡 **Capacidade:** **${incubator.activeCount}/${incubator.maxSlots} ninhos ocupados**`,
    '🏡 **CAPACIDADE DA CHOCADEIRA**',
    `> 🪺 **Ocupação:** **${incubator.activeCount}/${incubator.maxSlots} ninhos ocupados**`,
    '',
    '🪺 **STATUS DOS NINHOS**',
    slotLines.join('\n\n'),
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.emerald)
    .setTitle(`🥚  ✦  Chocadeira Encantada de Pyxie — ${userTag}`)
    .setDescription(desc)
    .setFooter({ text: 'Pyxie' })
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
          .setLabel(`Quebrar Casca (#${readySlot.slotIndex + 1})`)
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

  return { embeds: [embed], components, files: [] };
}

// 3. Tab Dungeons & Exploração Procedural em Grade 2D
function buildDungeonTab(userId, userTag) {
  const activePet = getActivePet(userId);
  const run = getProceduralRun(userId);

  if (!activePet) {
    return buildOnboardingView(userId, userTag);
  }

  const { getActiveExpedition } = require('../services/petExpedition');
  const activeExp = getActiveExpedition(userId);
  if (activeExp && !activeExp.completed) {
    const remainingMins = Math.ceil(activeExp.remainingMs / 60000);
    const desc = [
      `🧭 **${activePet.name}** (${activePet.emoji}) está atualmente em uma **Expedição AFK**!`,
      '',
      `> ⏳ **Retorno estimado:** **${remainingMins} minuto(s)**`,
      `> 📍 **Missão:** Expedição de ${activeExp.durationHours}h`,
      '',
      'Enquanto estiver em expedição externa, seu Pymon não pode explorar masmorras simultaneamente.',
      'Aguarde o término da expedição e resgate seus tesouros com `/expedicao` para liberar novas aventuras!',
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.gold)
      .setTitle(`🗺️  ✦  Dungeons em Pausa — ${userTag}`)
      .setDescription(desc)
      .setFooter({ text: 'Pyxie' })
      .setTimestamp();

    const components = [buildHubHeaderRow(userId, 'dungeon')];
    return { embeds: [embed], components, files: [] };
  }

  if (!run) {
    const zones = getDungeonZones();
    const desc = [
      `Prepare **${activePet.name}** (${activePet.emoji} Nv. ${activePet.level}) para explorar labirintos misteriosos em grade 2D com névoa de guerra!`,
      '',
      '⚡ **CONDIÇÃO DO EXPLORADOR**',
      `> ⚡ **Energia:** **${activePet.energy}/100 ⚡** (Custo: **~10 ⚡/movimento**)`,
      `> ❤️ **HP:** **${activePet.stats.hp}/${activePet.stats.maxHp}**  •  🍖 **Fome:** **${activePet.hunger}%**`,
      '',
      '🌲 **ZONAS DE EXPEDIÇÃO DISPONÍVEIS**',
      zones
        .map((z) => `${z.emoji} **${z.name}** (Nv. Mín: ${z.minLevel})\n> *${z.desc}*`)
        .join('\n\n'),
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.cyan)
      .setTitle(`🗺️  ✦  Masmorras & Dungeons Procedurais 2D — ${userTag}`)
      .setDescription(desc)
      .setFooter({ text: 'Pyxie' })
      .setTimestamp();

    const components = [buildHubHeaderRow(userId, 'dungeon')];

    const zoneOptions = zones.map((z) => ({
      label: `${z.name} (Grade ${z.gridW}x${z.gridH})`,
      description: `Nv. Mín: ${z.minLevel} • Ovos: ${z.eggs.join(', ')}`,
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
  const desc = [
    `🐾 **Explorador:** **${activePet.name}** (${activePet.emoji} Nv. ${activePet.level})`,
    `📍 **Posição:** Quadrante **(${run.playerPos.x + 1}, ${run.playerPos.y + 1})**  •  🏞️ **Terreno:** ${run.currentTerrain?.emoji || '🌿'} **${run.currentTerrain?.name || 'Trilha'}**`,
    '🧭 **COORDENADAS DA EXPEDIÇÃO**',
    `> 🐾 **Explorador:** **${activePet.name}** (${activePet.emoji} Nv. ${activePet.level})`,
    `> 📍 **Posição:** Quadrante **(${run.playerPos.x + 1}, ${run.playerPos.y + 1})**  •  🏞️ **Terreno:** ${run.currentTerrain?.emoji || '🌿'} **${run.currentTerrain?.name || 'Trilha'}**`,
    '',
    '💖 **STATUS DO EXPLORADOR**',
    `> ❤️ **HP:** **${activePet.stats.hp}/${activePet.stats.maxHp}**  •  ⚡ **Energia:** **${activePet.energy} ⚡**  •  🍖 **Fome:** **${activePet.hunger}%**`,
    '',
    '💰 **ESPÓLIOS ACUMULADOS**',
    `> 🪙 **Moedas:** **+${run.coinsAccumulated}**  •  📦 **Baús:** **${(run.chestsFound || []).length}**  •  🥚 **Ovos:** **${(run.eggsFound || []).length}**`,
    '',
    '📜 **DIÁRIO DE BORDO**',
    run.logs.map((l) => `> ${l}`).join('\n'),
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(isExhausted ? PYXIE_COLORS.crimson : PYXIE_COLORS.violet)
    .setTitle(`🧭  ✦  ${run.zone.emoji} ${run.zone.name} — Mapa 2D`)
    .setDescription(desc)
    .setImage('attachment://dungeon_map.png')
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  // Controles Direcionais D-Pad
  const dpadRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_move:UP:${userId}`)
      .setLabel('Norte')
      .setEmoji('⬆️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_move:DOWN:${userId}`)
      .setLabel('Sul')
      .setEmoji('⬇️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_move:LEFT:${userId}`)
      .setLabel('Oeste')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_move:RIGHT:${userId}`)
      .setLabel('Leste')
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Primary)
  );

  // Ações de Saída / Fuga / Painel
  const exitActionsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_retreat:${userId}`)
      .setLabel(isExhausted ? 'Resgatar (Exausto)' : (run.atExit ? 'Sair pelo Portal 🚩 (100%)' : 'Resgatar Espólios (100%)'))
      .setEmoji(run.atExit ? '🚩' : '🏃')
      .setStyle(run.atExit ? ButtonStyle.Success : (isExhausted ? ButtonStyle.Secondary : ButtonStyle.Primary)),
    new ButtonBuilder()
      .setCustomId(`hub_dungeon_flee:${userId}`)
      .setLabel('Fuga de Pânico')
      .setEmoji('💨')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`hub_tab:pet:${userId}`)
      .setLabel('Meu Pymon')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [dpadRow, exitActionsRow],
    files: [createExpeditionMapAttachment(run, activePet)],
  };
}

// 4. Tab Mochila / Inventário
function buildInventoryTab(userId, userTag) {
  const inventory = getUserInventory(userId);
  const account = getUserAccount(userId);
  const activePet = getActivePet(userId);
  const entries = Object.entries(inventory).filter(([_, count]) => count > 0);

  const desc = [
    '🎒 **STATUS GERAL**',
    `> 💰 **Saldo em Carteira:** **${formatCoins(account.coins)}**`,
    `> 🐾 **Pymon Ativo:** ${activePet ? `${activePet.emoji} **${activePet.name}** (Nv. ${activePet.level})` : '*Nenhum ativo*'}`,
    '',
    '📦 **ITENS NA MOCHILA**',
    entries.length === 0
      ? '> *Sua mochila está completamente vazia! Visite a Lojinha ou resgate o Kit Inicial.*'
      : entries
          .map(([id, count]) => {
            const def = getItemDefinition(id);
            if (!def) return `> • \`${id}\`: **${count}x**`;
            return `> ${def.emoji} **${def.name}** (x${count})\n> *${def.description}*`;
          })
          .join('\n\n'),
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta)
    .setTitle(`🎒  ✦  Mochila Encantada — ${userTag}`)
    .setDescription(desc)
    .setFooter({ text: 'Pyxie' })
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
          .setPlaceholder('🎒 Escolha um item para usar no seu pet ativo...')
          .addOptions(itemOptions)
      )
    );
  }

  const actionButtons = new ActionRowBuilder();
  if (!hasClaimedStarterKit(userId)) {
    actionButtons.addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_claim_kit:${userId}`)
        .setLabel('Resgatar Kit Inicial')
        .setEmoji('🎁')
        .setStyle(ButtonStyle.Success)
    );
  }

  actionButtons.addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_tab:shop:${userId}`)
      .setLabel('Ir para Lojinha')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Secondary)
  );

  components.push(actionButtons);

  return { embeds: [embed], components, files: [] };
}

// 5. Tab Loja
function buildShopTab(userId, categoryOrTag = 'comida', maybeCategory = null) {
  const account = getUserAccount(userId);
  const validCategories = ['comida', 'cura', 'utilitario', 'bau', 'melhoria'];
  const category = (maybeCategory && validCategories.includes(maybeCategory))
    ? maybeCategory
    : (validCategories.includes(categoryOrTag) ? categoryOrTag : 'comida');
  const items = getItemsByCategory(category);

  const catNames = {
    comida: 'Comidas & Nutrição',
    cura: 'Cura & Estamina',
    utilitario: 'Utilitários & Aceleração',
    bau: 'Baús Misteriosos',
    melhoria: 'Melhorias & Ninhos',
  };

  const desc = [
    `💰 **Seu Saldo:** **${formatCoins(account.coins)}**`,
    `📂 **Categoria:** **${catNames[category] || category}**`,
    '🪙 **CARTEIRA & DEPARTAMENTO**',
    `> 💰 **Seu Saldo:** **${formatCoins(account.coins)}**`,
    `> 📂 **Categoria:** **${catNames[category] || category}**`,
    '',
    '🛍️ **CATÁLOGO DISPONÍVEL**',
    items
      .map((item) => {
        const buyText = item.buyPrice ? `— 🪙 **${formatCoins(item.buyPrice)}**` : '— *(Indisponível)*';
        return `${item.emoji} **${item.name}** ${buyText}\n> *${item.description}*`;
      })
      .join('\n\n'),
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold)
    .setTitle(`🛒  ✦  Lojinha da Pyxie — ${catNames[category] || category}`)
    .setDescription(desc)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const components = [buildHubHeaderRow(userId, 'shop')];

  // Dropdown de Categorias
  const catOptions = [
    { label: 'Comidas & Nutrição', value: 'comida', emoji: '🍖', default: category === 'comida' },
    { label: 'Cura & Estamina', value: 'cura', emoji: '🩹', default: category === 'cura' },
    { label: 'Utilitários & Aceleração', value: 'utilitario', emoji: '⏳', default: category === 'utilitario' },
    { label: 'Baús Misteriosos', value: 'bau', emoji: '📦', default: category === 'bau' },
    { label: 'Melhorias de Ninhos', value: 'melhoria', emoji: '🏡', default: category === 'melhoria' },
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

  return { embeds: [embed], components, files: [] };
}

// Onboarding View para novos usuários
function buildOnboardingView(userId, userDisplayName) {
  const desc = [
    `Boas-vindas, **${userDisplayName}**! Você ainda não possui nenhum Pymon ao seu lado.`,
    '',
    '🐾 **ESCOLHA SEU STARTER**',
    'Clique no botão **Adotar Meu Starter** abaixo para abrir a Dex e escolher seu parceiro inicial:',
    '',
    '> 🧁 **Cinna** (`Charme`) — Doçura radiante e astúcia natural',
    '> 💧 **Bonorka** (`Orvalho`) — Serenidade aquática e grande resistência',
    '> 🍃 **Pomcorin** (`Silvestre`) — Agilidade pura e vigor das florestas',
    '',
    '✨ **PROBABILIDADE SHINY**',
    '> Todo inicial possui **5% de chance** de nascer em sua forma **Shiny Rara**!',
    '',
    '🎁 **KIT INICIAL GRATUITO**',
    '> 🪙 **+150 Moedinhas**',
    '> 🥣 **2x Rações da Floresta**',
    '> 🩹 **1x Curativo**',
    '> 📦 **1x Baú Rústico**',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle('✨ ✦ Boas-vindas ao Reino dos Pymons! ✦ ✨')
    .setDescription(desc)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hub_claim_kit:${userId}`)
      .setLabel('Resgatar Kit Inicial')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`hub_open_adoption:${userId}`)
      .setLabel('Adotar Meu Starter')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row], files: [] };
}

// --- Handler de Interações do Hub ---

function isHubInteraction(interaction) {
  if (!interaction.customId) return false;
  return (
    interaction.customId.startsWith('hub_tab:') ||
    interaction.customId.startsWith('hub_sub:') ||
    interaction.customId.startsWith('hub_select_pet:') ||
    interaction.customId.startsWith('hub_pet_feed:') ||
    interaction.customId.startsWith('hub_pet_carinho:') ||
    interaction.customId.startsWith('hub_pet_sleep:') ||
    interaction.customId.startsWith('hub_pet_heal:') ||
    interaction.customId.startsWith('hub_release_menu:') ||
    interaction.customId.startsWith('hub_release_select:') ||
    interaction.customId.startsWith('hub_support_info:') ||
    interaction.customId.startsWith('hub_incubator_place_egg:') ||
    interaction.customId.startsWith('hub_hatch_egg:') ||
    interaction.customId.startsWith('hub_expand_incubator:') ||
    interaction.customId.startsWith('hub_dungeon_start_zone:') ||
    interaction.customId.startsWith('hub_dungeon_start_fast:') ||
    interaction.customId.startsWith('hub_dungeon_move:') ||
    interaction.customId.startsWith('hub_dungeon_step:') ||
    interaction.customId.startsWith('hub_dungeon_retreat:') ||
    interaction.customId.startsWith('hub_dungeon_flee:') ||
    interaction.customId.startsWith('hub_use_energy_potion:') ||
    interaction.customId.startsWith('hub_inventory_use_item:') ||
    interaction.customId.startsWith('hub_claim_kit:') ||
    interaction.customId.startsWith('hub_shop_category:') ||
    interaction.customId.startsWith('hub_shop_buy_item:') ||
    interaction.customId.startsWith('hub_open_adoption:') ||
    interaction.customId.startsWith('dex_select:') ||
    interaction.customId.startsWith('dex_nav:') ||
    interaction.customId.startsWith('dex_toggle_shiny:') ||
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
      content: '❌ Este painel pertence a outro aventureiro. Use `/pymons` para abrir o seu próprio!',
      flags: 64, // Ephemeral
    });
  }

  const userId = interaction.user.id;
  const userTag = interaction.user.displayName || interaction.user.username;

  // 1. Submenus Tamagotchi (Cuidar / Mais)
  if (action === 'hub_sub') {
    const subMode = parts[1] || 'care';
    const view = buildPetTab(userId, userTag, subMode);
    return interaction.update(view);
  }

  // 2. Alternar Abas Principais
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
    if (tabName === 'dex') {
      const { buildDexView } = require('./dex');
      const view = buildDexView(userId, userTag, 'cinna', false);
      return interaction.update(view);
    }
    if (tabName === 'inventory') {
      const view = buildInventoryTab(userId, userTag);
      return interaction.update(view);
    }
    if (tabName === 'shop') {
      const view = buildShopTab(userId, 'comida');
      return interaction.update(view);
    }
    if (tabName === 'boss') {
      const { buildBossView } = require('./boss');
      const view = buildBossView(userId);
      return interaction.update(view);
    }
    if (tabName === 'expedition') {
      const { buildExpeditionView } = require('./expedicao');
      const view = buildExpeditionView(userId);
      return interaction.update(view);
    }
    if (tabName === 'element') {
      const { buildElementChartEmbed } = require('../utils/elementChart');
      const embed = buildElementChartEmbed();
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`hub_tab:pet:${userId}`)
          .setLabel('Voltar ao Hub')
          .setEmoji('◀')
          .setStyle(ButtonStyle.Secondary)
      );
      return interaction.update({ embeds: [embed], components: [backRow], files: [] });
    }
  }

  // Interações diretas da Dex
  if (action.startsWith('dex_')) {
    const { handleDexInteraction } = require('./dex');
    return handleDexInteraction(interaction);
  }

  // 3. Resgate de Kit Inicial
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

  // 4. Ações de Cuidado do Pet (Alimentar, Carinho, Dormir, Curativo)
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
    const view = buildPetTab(userId, userTag, 'care');
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
    const view = buildPetTab(userId, userTag, 'care');
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
    const view = buildPetTab(userId, userTag, 'care');
    return interaction.update(view);
  }

  if (action === 'hub_pet_heal') {
    const activePet = getActivePet(userId);
    if (!activePet) return;
    if (activePet.stats.hp >= activePet.stats.maxHp) {
      return interaction.reply({ content: '💖 Seu pet já está com a vida cheia (100% HP)!', flags: 64 });
    }
    const inv = getUserInventory(userId);
    const healItem = (inv.curativo_fofo > 0) ? 'curativo_fofo' : ((inv.pocao_vida > 0) ? 'pocao_vida' : null);
    if (!healItem) {
      return interaction.reply({ content: '🛒 Você não possui **Curativos** ou **Poções** na mochila! Compre na Lojinha.', flags: 64 });
    }
    const healRes = useItemOnActivePet(userId, healItem);
    schedulePetsSave();
    const view = buildPetTab(userId, userTag, 'care');
    return interaction.update({
      content: healRes.message,
      ...view,
    });
  }

  // 5. Seleção de Pet Ativo
  if (action === 'hub_select_pet') {
    const selectedPetId = interaction.values[0];
    setActivePet(userId, selectedPetId);
    const view = buildPetTab(userId, userTag);
    return interaction.update(view);
  }

  // 5.1 Menu de Liberação de Pet
  if (action === 'hub_release_menu') {
    const userPets = getUserPets(userId);
    if (userPets.length <= 1) {
      return interaction.reply({
        content: '❌ Você possui apenas 1 Pymon e não pode liberá-lo! Você deve manter ao menos 1 companheiro.',
        flags: 64,
      });
    }
    const petOptions = userPets.map((p) => ({
      label: `${p.name}${p.shiny ? ' ✨ Shiny' : ''} (Nv. ${p.level} ${p.species})`,
      description: `Liberar para a natureza (+50 Moedinhas de gratidão)`,
      value: p.id,
      emoji: p.emoji || '🐾',
    }));
    const releaseRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`hub_release_select:${userId}`)
        .setPlaceholder('🍃 Escolha qual Pymon devolver à natureza...')
        .addOptions(petOptions)
    );
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hub_tab:pet:${userId}`)
        .setLabel('Cancelar')
        .setEmoji('◀')
        .setStyle(ButtonStyle.Secondary)
    );
    return interaction.update({
      content: '🍃 **Devolução à Natureza:** Selecione abaixo qual Pymon você deseja liberar da sua equipe. Ele viverá feliz nas florestas e você receberá +50 Moedinhas como recompensa de gratidão.',
      components: [releaseRow, backRow],
      embeds: [],
      files: [],
    });
  }

  if (action === 'hub_release_select') {
    const selectedPetId = interaction.values[0];
    const { releasePet } = require('../services/pets');
    const res = releasePet(userId, selectedPetId);
    if (!res.success) {
      return interaction.reply({
        content: `❌ ${res.message}`,
        flags: 64,
      });
    }
    const view = buildPetTab(userId, userTag);
    return interaction.update({
      content: res.message,
      ...view,
    });
  }

  // 6. Chocadeira: Colocar ovo
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

  // 7. Chocadeira: Chocar ovo pronto
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

  // 8. Chocadeira: Expandir ninhos
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

  // 9. Dungeons: Iniciar expedição
  if (action === 'hub_dungeon_start_zone' || action === 'hub_dungeon_start_fast') {
    const { isPetOnExpedition } = require('../services/petExpedition');
    if (isPetOnExpedition(userId)) {
      return interaction.reply({
        content: '🧭 **Seu Pymon está atualmente em uma expedição!** Aguarde o retorno dele para explorar masmorras.',
        flags: 64,
      });
    }

    const zoneId = action === 'hub_dungeon_start_zone' ? interaction.values[0] : 'bosque';
    const activePet = getActivePet(userId);
    const startRes = startProceduralRun(userId, zoneId, activePet);
    if (!startRes.success) {
      return interaction.reply({ content: `❌ ${startRes.message || 'Não foi possível iniciar a expedição.'}`, flags: 64 });
    }
    const view = buildDungeonTab(userId, userTag);
    return interaction.update(view);
  }

  // 10. Dungeons: Movimentação D-Pad 2D (UP, DOWN, LEFT, RIGHT)
  if (action === 'hub_dungeon_move' || action === 'hub_dungeon_step') {
    const direction = parts[1] || 'RIGHT';
    const activePet = getActivePet(userId);
    const moveRes = movePlayer(userId, direction, activePet, awardPetXp);
    schedulePetsSave();

    if (!moveRes.success) {
      return interaction.reply({ content: `❌ ${moveRes.message || 'Não foi possível mover nessa direção.'}`, flags: 64 });
    }

    const view = buildDungeonTab(userId, userTag);
    if (moveRes.fainted) {
      return interaction.update({
        content: moveRes.completionResult?.message || '💀 **O Pymon desmaiou em combate!**',
        ...view,
      });
    }

    return interaction.update(view);
  }

  // 11. Dungeons: Resgatar Espólios
  if (action === 'hub_dungeon_retreat') {
    const activePet = getActivePet(userId);
    const retreatRes = retreatRun(userId, activePet, awardPetXp);
    schedulePetsSave();
    if (!retreatRes.success) {
      return interaction.reply({ content: `❌ ${retreatRes.message || 'Não foi possível resgatar os espólios.'}`, flags: 64 });
    }
    const view = buildDungeonTab(userId, userTag);
    return interaction.update({
      content: retreatRes.message || '✨ Espólios resgatados com sucesso!',
      ...view,
    });
  }

  // 12. Dungeons: Fuga
  if (action === 'hub_dungeon_flee') {
    const activePet = getActivePet(userId);
    const fleeRes = panicFlee(userId, activePet);
    schedulePetsSave();
    if (!fleeRes.success) {
      return interaction.reply({ content: `❌ ${fleeRes.message || 'Não foi possível fugir.'}`, flags: 64 });
    }
    const view = buildDungeonTab(userId, userTag);
    return interaction.update({
      content: fleeRes.message || '💨 Você fugiu da masmorra!',
      ...view,
    });
  }

  // 13. Dungeons: Poção de Energia
  if (action === 'hub_use_energy_potion') {
    const res = useItemOnActivePet(userId, 'frasco_eter');
    schedulePetsSave();
    if (!res.success) {
      return interaction.reply({ content: `❌ ${res.message || 'Você não possui Frasco de Éter na sua mochila! Compre na Lojinha.'}`, flags: 64 });
    }
    const view = buildDungeonTab(userId, userTag);
    return interaction.update(view);
  }

  // 14. Mochila: Usar item
  if (action === 'hub_inventory_use_item') {
    const itemId = interaction.values[0];
    const def = getItemDefinition(itemId);

    if (def && def.effects && def.effects.isChest) {
      const openRes = openChest(userId, itemId);
      if (!openRes.success) {
        return interaction.reply({ content: `❌ ${openRes.message || 'Não foi possível abrir o baú.'}`, flags: 64 });
      }
      const view = buildInventoryTab(userId, userTag);
      return interaction.update({
        content: openRes.message || '📦 Baú aberto!',
        ...view,
      });
    }

    const useRes = useItemOnActivePet(userId, itemId);
    if (!useRes.success) {
      return interaction.reply({ content: `❌ ${useRes.message || 'Não foi possível usar este item.'}`, flags: 64 });
    }
    schedulePetsSave();
    const view = buildInventoryTab(userId, userTag);
    return interaction.update({
      content: useRes.message || '✨ Item utilizado com sucesso!',
      ...view,
    });
  }

  // 15. Loja: Mudar categoria
  if (action === 'hub_shop_category') {
    const cat = interaction.values[0];
    const view = buildShopTab(userId, cat);
    return interaction.update(view);
  }

  // 16. Loja: Comprar item
  if (action === 'hub_shop_buy_item') {
    const itemId = interaction.values[0];
    const buyRes = buyItem(userId, itemId, 1);
    if (!buyRes.success) {
      return interaction.reply({ content: `❌ ${buyRes.message || 'Saldo insuficiente ou item indisponível.'}`, flags: 64 });
    }
    const def = getItemDefinition(itemId);
    const view = buildShopTab(userId, def?.category || 'comida');
    return interaction.update({
      content: `🛍️ **Compra Concluída!** Você adquiriu 1x **${def?.name || itemId}**!`,
      ...view,
    });
  }

  // 17. Apoiar
  if (action === 'hub_support_info') {
    return interaction.reply({
      content: '💖 **Apoie o Universo Pymon!** Use `/diario` para coletar moedas diárias e explore dungeons para subir de nível!',
      flags: 64,
    });
  }

  // 18. Abrir Adoção
  if (action === 'hub_open_adoption') {
    const { buildDexEmbed, buildDexComponents } = require('./adocao');
    const embed = buildDexEmbed('cinna');
    const components = buildDexComponents(userId, 'cinna');
    const { createDexAttachment } = require('../services/petRenderer');
    const { PETS_CATALOG } = require('../services/pets');
    const attachment = createDexAttachment(PETS_CATALOG.cinna, false);
    return interaction.update({
      embeds: [embed],
      components,
      files: [attachment],
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName(PYMONS)
    .setDescription('Abre o painel Tamagotchi dos seus Pymons, Dungeons e Mochila.')
    .addSubcommand((sub) =>
      sub
        .setName('painel')
        .setDescription('Abre o painel principal do seu Pymon ativo.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('renomear')
        .setDescription('Altera o nome do seu Pymon ativo.')
        .addStringOption((opt) =>
          opt
            .setName('novo_nome')
            .setDescription('O novo nome para seu companheiro')
            .setRequired(true)
        )
    ),
  name: PYMONS,
  aliases: [PIXELMONSTERS, PET, 'pet', 'pymon'],
  description: 'Painel Tamagotchi dos Pymons, Dungeons 2D e Adoção.',
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const userTag = interaction.user.displayName || interaction.user.username;
    const sub = interaction.options.getSubcommand(false);

    if (sub === 'renomear') {
      const newName = interaction.options.getString('novo_nome');
      const res = renamePet(userId, newName);
      if (!res.success) {
        return interaction.editReply({ content: `❌ ${res.message}` });
      }
      const view = buildPetTab(userId, userTag);
      return interaction.editReply({
        content: `✨ Nome alterado com sucesso para **${newName}**!`,
        ...view,
      });
    }

    const view = buildPetTab(userId, userTag);
    await interaction.editReply(view);
  },
  async executePrefix({ message, args }) {
    const userId = message.author.id;
    const userTag = message.author.displayName || message.author.username;

    if (args[0] === 'renomear' && args[1]) {
      const newName = args.slice(1).join(' ');
      const res = renamePet(userId, newName);
      if (!res.success) {
        return message.reply(`❌ ${res.message}`);
      }
      const view = buildPetTab(userId, userTag);
      return message.reply({
        content: `✨ Nome alterado com sucesso para **${newName}**!`,
        ...view,
      });
    }

    const view = buildPetTab(userId, userTag);
    await message.reply(view);
  },
  buildHubHeaderRow,
  buildPetTab,
  buildDungeonTab,
  buildIncubatorTab,
  buildInventoryTab,
  buildShopTab,
  isHubInteraction,
  handleHubInteraction,
  isPetInteraction: isHubInteraction,
  handlePetInteraction: handleHubInteraction,
};
