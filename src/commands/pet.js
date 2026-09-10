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
  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle(`${activePet.emoji}  ✦  ${activePet.name}${shinyTag}`)
    .setDescription(
      `**Treinador:** ${userTag}\n` +
      `**Espécie:** ${activePet.species} • **Elemento:** \`${activePet.element}\` • **Nível:** **${activePet.level}**\n\n` +
      `💖 **Vida:** **${activePet.stats.hp}/${activePet.stats.maxHp}**  •  🍖 **Fome:** **${activePet.hunger}%**\n` +
      `⚡ **Energia:** **${activePet.energy}%**  •  😊 **Humor:** **${activePet.happiness}%**\n\n` +
      `⭐ **XP:** **${activePet.xp}/${activePet.xpToNext}**\n` +
      `🏆 **Duelos:** **${activePet.duelosVencidos || 0}V - ${activePet.duelosPerdidos || 0}D**`
    )
    .setImage('attachment://pet_card.png')
    .setFooter({ text: 'Pymons • Painel Tamagotchi' })
    .setTimestamp();

  const components = [buildHubHeaderRow(userId, 'pet', subMode)];

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

  } else if (subMode === 'more') {
    // Submenu Mais Utilitários
    const moreRow = new ActionRowBuilder().addComponents(
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
        .setCustomId(`hub_tab:pet:${userId}`)
        .setLabel('Fechar')
        .setEmoji('◀')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(moreRow);

  } else {
    // Menu padrão rápido
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
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`hub_support_info:${userId}`)
        .setLabel('Apoiar')
        .setEmoji('✨')
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
    .setFooter({ text: 'Chocadeira • Incubação em tempo real' })
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

  if (!run) {
    const zones = getDungeonZones();
    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.cyan)
      .setTitle(`🗺️  ✦  Masmorras & Dungeons Procedurais 2D — ${userTag}`)
      .setDescription(
        `Prepare **${activePet.name}** (${activePet.emoji} Nv. ${activePet.level}) para explorar labirintos misteriosos em grade 2D com névoa de guerra!\n\n` +
        `⚡ **Energia:** **${activePet.energy}/100 ⚡** (Custo: **~10 ⚡/movimento**)\n` +
        `💖 **HP:** **${activePet.stats.hp}/${activePet.stats.maxHp}**  •  🍖 **Fome:** **${activePet.hunger}%**\n\n` +
        `**Zonas Disponíveis:**\n\n` +
        zones
          .map((z) => `${z.emoji} **${z.name}** (Nv. Mín: ${z.minLevel})\n> *${z.desc}*`)
          .join('\n\n')
      )
      .setFooter({ text: 'Dungeons • Movimente-se em grade • Fome 0% ou 0 HP impedem exploração' })
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
  const embed = new EmbedBuilder()
    .setColor(isExhausted ? PYXIE_COLORS.crimson : PYXIE_COLORS.violet)
    .setTitle(`🧭  ✦  ${run.zone.emoji} ${run.zone.name} — Mapa 2D`)
    .setDescription(
      `**Explorador:** **${activePet.name}** (${activePet.emoji} Nv. ${activePet.level})\n` +
      `📍 **Posição:** Quadrante **(${run.playerPos.x + 1}, ${run.playerPos.y + 1})**  •  🏞️ **Terreno:** ${run.currentTerrain?.emoji || '🌿'} **${run.currentTerrain?.name || 'Trilha'}**\n` +
      `💖 **HP:** **${activePet.stats.hp}/${activePet.stats.maxHp}**  •  ⚡ **Energia:** **${activePet.energy} ⚡**  •  🍖 **Fome:** **${activePet.hunger}%**\n\n` +
      `💰 **Moedas:** **+${run.coinsAccumulated}**  •  📦 **Baús:** **${(run.chestsFound || []).length}**  •  🥚 **Ovos:** **${(run.eggsFound || []).length}**\n\n` +
      `📜 **Diário de Bordo:**\n` +
      run.logs.map((l) => `> ${l}`).join('\n')
    )
    .setImage('attachment://dungeon_map.png')
    .setFooter({ text: 'Dungeon 2D • Use o D-Pad para navegar • Resgate voluntário salva 100% dos espólios' })
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
    .setFooter({ text: 'Mochila • Selecione um item no menu para usá-lo' })
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

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold)
    .setTitle(`🛒  ✦  Lojinha da Pyxie — ${catNames[category] || category}`)
    .setDescription(
      `💰 **Seu Saldo:** **${formatCoins(account.coins)}**\n` +
      `*Itens frescos e trapaças mágicas garantidas.*\n\n` +
      items
        .map((item) => {
          const buyText = item.buyPrice ? `• 🪙 **${formatCoins(item.buyPrice)}**` : '*(Indisponível)*';
          return `${item.emoji} **${item.name}** ${buyText}\n> *${item.description}*`;
        })
        .join('\n\n')
    )
    .setFooter({ text: 'Lojinha • Selecione uma categoria ou compre pelo menu abaixo' })
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
  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac)
    .setTitle('✨ ✦ Boas-vindas ao Reino dos Pymons! ✦ ✨')
    .setDescription(
      `Ora, ora, **${userDisplayName}**! Você ainda não possui nenhum Pymon ao seu lado.\n\n` +
      `Clique no botão **Adotar Meu Starter** abaixo para abrir a Dex e escolher seu parceiro inicial:\n\n` +
      `• 🧁 **Cinna** (\`Charme\`) — Doçura radiante e astúcia\n` +
      `• 💧 **Bonorka** (\`Orvalho\`) — Serenidade aquática e resistência\n` +
      `• 🍃 **Pomcorin** (\`Silvestre\`) — Agilidade pura e vigor natural\n\n` +
      `✨ **Probabilidade Shiny:** Todo inicial tem **5% de chance** de nascer Shiny Raro!\n\n` +
      `🎁 **Kit Inicial Gratuito incluso:**\n` +
      `• 🪙 **+150 Moedas**\n` +
      `• 🥣 **2x Rações da Floresta**\n` +
      `• 🩹 **1x Curativo**\n` +
      `• 📦 **1x Baú Rústico**`
    )
    .setFooter({ text: 'Pymons • Inicie sua jornada pelo botão abaixo' })
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
      content: '💖 **Apoie a Cringelândia & Pyxie!** Use `/diario` para coletar moedas diárias e explore dungeons para subir de nível!',
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
