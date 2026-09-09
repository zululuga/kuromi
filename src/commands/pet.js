const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const {
  getActivePet,
  getUserPets,
  setActivePet,
  petCarinho,
  petSleep,
  renamePet,
  feedPet,
  hasClaimedStarterKit,
  claimStarterKit,
  CARINHO_COOLDOWN_MS,
  SLEEP_COOLDOWN_MS,
} = require('../services/pets');
const { createPetAttachment } = require('../services/petRenderer');
const { getUserInventory, getItemDefinition, formatItemEffects } = require('../services/inventory');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { PET } = require('./commandNames');

function buildPetEmbed(pet, userTag) {
  const elementColors = {
    SOMBRA: '#a855f7',
    FOFURA: '#f472b6',
    CAOS: '#f59e0b',
    MISTICO: '#38bdf8',
  };

  const color = elementColors[pet.element] || '#E60067';
  const shinyTag = pet.shiny ? ' ✨ **Shiny**' : pet.corrupt ? ' 🖤 **Corrompido**' : '';

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${pet.emoji}  ✦  ${pet.name}${shinyTag}`)
    .setDescription(
      `**Tutor:** ${userTag}\n` +
      `**Espécie:** ${pet.species} • **Elemento:** \`${pet.element}\` • **Nível:** **${pet.level}**\n\n` +
      `💖 **Vida:** ${pet.stats.hp}/${pet.stats.maxHp}  |  🍖 **Fome:** ${pet.hunger}%  |  😊 **Humor:** ${pet.happiness}%  |  ⚡ **Energia:** ${pet.energy}%\n` +
      `⭐ **XP:** ${pet.xp}/${pet.xpToNext}  |  🏆 **Duelos:** ${pet.duelosVencidos || 0}V - ${pet.duelosPerdidos || 0}D\n\n` +
      '> *Clique nos botões abaixo para cuidar, brincar ou enviar seu companheiro para a ação!*'
    )
    .setImage('attachment://pet_card.png')
    .setFooter({ text: 'Cringelândia Pets • Kuromi supervisiona e finge que não acha fofo' })
    .setTimestamp();
}

function buildPetActionButtons(userId, pet) {
  const row1 = new ActionRowBuilder().addComponents(
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
      .setCustomId(`pet_sleep:${userId}`)
      .setLabel('Dormir')
      .setEmoji('💤')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pet_explore_zones:${userId}`)
      .setLabel('Explorar Dungeons')
      .setEmoji('🧭')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`pet_bag_list:${userId}`)
      .setLabel('Meus Pets')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pet_duel_info:${userId}`)
      .setLabel('Coliseu / Duelo')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

function buildOnboardingEmbed(userDisplayName) {
  return new EmbedBuilder()
    .setColor('#C084FC')
    .setTitle('🖤 ✦ Boas-vindas ao Mundo dos Mascotes da Cringelândia! ✦ ✨')
    .setDescription(
      `Olá, **${userDisplayName}**! Parece que você ainda não tem um mascote para chamar de seu.\n\n` +
      'Aqui na Cringelândia, você pode adotar criaturas leais, alimentá-las, explorar masmorras cheias de tesouros e até disputar duelos épicos no Coliseu!\n\n' +
      '**Como começar em 3 passos simples:**\n' +
      '🎁 **1. Resgate seu Kit Inicial:** Receba **150 Moedas**, comidas e itens de cura grátis!\n' +
      '🐾 **2. Adote seu Primeiro Pet:** Escolha entre 24 espécies de 4 elementos mágicos.\n' +
      '🧭 **3. Cuide & Explore:** Alimente, faça carinho e envie em expedições para ganhar recompensas!\n\n' +
      '> *Kuromi observa com desdém:* “Espero que você tenha mais responsabilidade com esse bichinho do que com a sua vida!”'
    )
    .addFields(
      {
        name: '🌟 4 Elementos Místicos',
        value: '> 🌑 **Sombra** (Furtividade e Dano)\n> 💖 **Fofura** (Vida e Alegria)\n> 🔥 **Caos** (Crítico e Energia)\n> 🔮 **Místico** (Defesa e Magia)',
        inline: false,
      },
      {
        name: '🎁 Conteúdo do Kit de Boas-Vindas',
        value: '> 🪙 **+150 Moedinhas**\n> 🥣 **2x Ração Cringe**\n> 🩹 **1x Curativo de Coração**\n> 📦 **1x Baú Rústico**',
        inline: false,
      }
    )
    .setFooter({ text: 'Cringelândia Pets • Clique nos botões abaixo para jogar!' })
    .setTimestamp();
}

function buildOnboardingComponents(userId) {
  const isClaimed = hasClaimedStarterKit(userId);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`onboard_adopt:${userId}`)
      .setLabel('Adotar Primeiro Mascote')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`onboard_kit:${userId}`)
      .setLabel(isClaimed ? 'Kit Inicial (Já Resgatado)' : 'Resgatar Kit Inicial (Grátis)')
      .setEmoji('🎁')
      .setStyle(isClaimed ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(isClaimed),
    new ButtonBuilder()
      .setCustomId(`onboard_guide:${userId}`)
      .setLabel('Guia Rápido')
      .setEmoji('📖')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

function isPetInteraction(interaction) {
  return (
    interaction.isButton() &&
    (interaction.customId.startsWith('pet_feed_menu:') ||
      interaction.customId.startsWith('pet_carinho:') ||
      interaction.customId.startsWith('pet_sleep:') ||
      interaction.customId.startsWith('pet_explore_zones:') ||
      interaction.customId.startsWith('pet_bag_list:') ||
      interaction.customId.startsWith('pet_duel_info:') ||
      interaction.customId.startsWith('pet_view:') ||
      interaction.customId.startsWith('pet_activate:') ||
      interaction.customId.startsWith('onboard_adopt:') ||
      interaction.customId.startsWith('onboard_kit:') ||
      interaction.customId.startsWith('onboard_guide:')) ||
    (interaction.isStringSelectMenu() && interaction.customId.startsWith('pet_feed_select:'))
  );
}

async function handlePetInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const ownerId = parts[1];

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: '❌ Este painel de pet pertence a outro jogador!',
      ephemeral: true,
    });
    return;
  }

  // --- Ações de Onboarding (para quem ainda não tem pet ou está iniciando) ---
  if (action === 'onboard_adopt') {
    const { buildAdoptionEmbed, buildAdoptionComponents } = require('./adocao');
    const embed = buildAdoptionEmbed('TODOS', null);
    const components = buildAdoptionComponents(ownerId, 'TODOS', null);
    await interaction.update({ embeds: [embed], components, files: [] });
    return;
  }

  if (action === 'onboard_kit') {
    const result = claimStarterKit(ownerId);
    if (!result.success) {
      await interaction.reply({
        content: '❌ Você já resgatou o seu Kit Inicial de Aventureiro! Use a `/loja` para conseguir mais suprimentos.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#10b981')
      .setTitle('🎁  ✦  Kit Inicial de Aventureiro Resgatado!  ✦  ✨')
      .setDescription(
        `Parabéns, **${interaction.user.displayName}**! A Kuromi liberou seus suprimentos de sobrevivência:\n\n` +
        `🪙 **+150 Moedinhas** (Saldo atual: **${formatCoins(result.newBalance)}**)\n` +
        `🥣 **2x Ração Cringe** (para manter a fome do seu pet baixa)\n` +
        `🩹 **1x Curativo de Coração** (para curar dano em expedições)\n` +
        `📦 **1x Baú Rústico** (abra na sua mochila para ganhar mais moedas e itens!)\n\n` +
        '> *Kuromi dá uma piscadela:* “Prontinho! Agora você tem moedas suficientes para adotar qualquer pet comum no abrigo. Escolha com carinho!”'
      )
      .setFooter({ text: 'Cringelândia Pets • Kuromi supervisiona cada entrega' })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`onboard_adopt:${ownerId}`)
        .setLabel('Escolher Meu Pet Agora')
        .setEmoji('🐾')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`inv_select:${ownerId}`)
        .setLabel('Abrir Minha Mochila')
        .setEmoji('🎒')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [actionRow], files: [] });
    return;
  }

  if (action === 'onboard_guide') {
    const embed = new EmbedBuilder()
      .setColor('#C084FC')
      .setTitle('📖  ✦  Manual de Cuidados e Aventuras com Pets  ✦  ✨')
      .setDescription(
        'Aqui estão todas as mecânicas para você se tornar o tutor mais temido e respeitado da Cringelândia:\n\n' +
        '🍖 **Fome (0-100%):** Pets com fome alta (< 15%) recusam-se a lutar e explorar. Dê comida regularmente via botão `[Alimentar]` ou `/usar`.\n\n' +
        '💖 **Humor & Felicidade:** Faça carinho no seu pet a cada 1 hora para deixá-lo contente e conceder bônus de XP.\n\n' +
        '⚡ **Energia:** Explorar masmorras consome energia. Quando estiver cansado, use o botão `[Dormir]` para restaurar 100% da barra de energia.\n\n' +
        '🧭 **Dungeons & Drops:** Quanto maior o nível do pet, mais profundas e lucrativas serão as masmorras que ele poderá desbravar!\n\n' +
        '⚔️ **Coliseu de Duelos:** Desafie outros tutores do servidor valendo apostas de moedas.'
      )
      .setFooter({ text: 'Cringelândia Pets • Kuromi aprova quem lê o manual' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`onboard_adopt:${ownerId}`)
        .setLabel('Ir para o Centro de Adoção')
        .setEmoji('🐾')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`onboard_kit:${ownerId}`)
        .setLabel('Resgatar Kit Inicial')
        .setEmoji('🎁')
        .setStyle(hasClaimedStarterKit(ownerId) ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(hasClaimedStarterKit(ownerId))
    );

    await interaction.update({ embeds: [embed], components: [row], files: [] });
    return;
  }

  const activePet = getActivePet(ownerId);
  if (!activePet) {
    const embed = buildOnboardingEmbed(interaction.user.displayName);
    const components = buildOnboardingComponents(ownerId);
    await interaction.update({ embeds: [embed], components, files: [] });
    return;
  }

  // --- Ações do Pet Ativo ---
  if (action === 'pet_view') {
    const attachment = createPetAttachment(activePet);
    const embed = buildPetEmbed(activePet, interaction.user.displayName);
    const components = buildPetActionButtons(ownerId, activePet);
    await interaction.update({ embeds: [embed], files: [attachment], components });
    return;
  }

  // 1. Menu de Alimentação
  if (action === 'pet_feed_menu') {
    const inv = getUserInventory(ownerId);
    const foodEntries = Object.entries(inv).filter(([id, count]) => {
      const item = getItemDefinition(id);
      return item && item.category === 'comida' && count > 0;
    });

    if (foodEntries.length === 0) {
      await interaction.reply({
        content: '🥣 Você não tem nenhuma comida na sua mochila! Compre ração ou sushi na `/loja`.',
        ephemeral: true,
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`pet_feed_select:${ownerId}`)
      .setPlaceholder('🍖 Escolha o que dar de comer para o seu pet...')
      .addOptions(
        foodEntries.slice(0, 25).map(([id, count]) => {
          const item = getItemDefinition(id);
          const fxSummary = item ? formatItemEffects(item) : '';
          return {
            label: `${item.name} (Você tem: ${count})`,
            value: id,
            emoji: item.emoji,
            description: fxSummary ? fxSummary.slice(0, 50) : `Recupera +${item.effects?.hunger || 0}% de fome`,
          };
        })
      );

    await interaction.reply({
      content: '🍴 **Hora do lanche:** Escolha um item abaixo para alimentar seu pet:',
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      ephemeral: true,
    });
    return;
  }

  // 1.1. Confirmar Alimentação via SelectMenu
  if (action === 'pet_feed_select') {
    const foodId = interaction.values[0];
    const result = feedPet(ownerId, foodId);

    if (!result.success) {
      await interaction.update({ content: '❌ Não foi possível alimentar seu pet.', components: [] });
      return;
    }

    let lvlMsg = '';
    if (result.leveledUp) {
      lvlMsg = `\n🎉 **LEVEL UP!** Seu pet subiu para o **Nível ${result.newLevel}**!`;
    }

    const effectsText = result.effectsSummary ? `\n📊 **Efeitos:** ${result.effectsSummary}` : '';
    const statusText = result.statusSummary ? `\n🐾 **Status atual:** ${result.statusSummary}` : '';

    await interaction.update({
      content: `🍖 Seu pet **${result.pet.name}** comeu **${result.item.name}** com alegria!${effectsText}${statusText}${lvlMsg}`,
      components: [],
    });
    return;
  }

  // 2. Fazer Carinho
  if (action === 'pet_carinho') {
    const result = petCarinho(ownerId);
    if (!result.success) {
      await interaction.reply({
        content: `⏳ Seu pet já recebeu muito carinho recentemente. Dê um espaço para ele e tente de novo em **${formatRemaining(result.remainingMs)}**.`,
        ephemeral: true,
      });
      return;
    }

    let lvlMsg = '';
    if (result.leveledUp) {
      lvlMsg = `\n🎉 **LEVEL UP!** Seu pet subiu para o **Nível ${result.newLevel}**!`;
    }

    await interaction.reply({
      content: `💖 Você fez carinho em **${result.pet.name}**! Ele ronronou feliz e ganhou **+15 XP**.\nHumor atual: **${result.pet.happiness}%**.${lvlMsg}`,
      ephemeral: true,
    });
    return;
  }

  // 3. Colocar para Dormir
  if (action === 'pet_sleep') {
    const result = petSleep(ownerId);
    if (!result.success) {
      await interaction.reply({
        content: `⏳ Seu pet está acordado e elétrico! Ele só poderá dormir novamente em **${formatRemaining(result.remainingMs)}**.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: `💤 **${result.pet.name}** tirou uma soneca restauradora e recuperou **100% de Energia**!`,
      ephemeral: true,
    });
    return;
  }

  // 4. Mostrar Zonas de Exploração
  if (action === 'pet_explore_zones') {
    const { getDungeonZones } = require('../services/petDungeons');
    const zones = getDungeonZones();

    const buttons = zones.map((z) =>
      new ButtonBuilder()
        .setCustomId(`dungeon_start:${ownerId}:${z.key}`)
        .setLabel(`${z.name} (Lv ${z.minLevel}+)`)
        .setEmoji(z.emoji)
        .setStyle(activePet.level >= z.minLevel ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(activePet.level < z.minLevel)
    );

    const rows = [new ActionRowBuilder().addComponents(buttons.slice(0, 2))];
    if (buttons.length > 2) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(2, 4)));
    }

    await interaction.reply({
      content: `🧭 **Escolha uma Dungeon para enviar ${activePet.name}:**\nEnergia atual do pet: **${activePet.energy}%** (Necessário ter fome > 15%).`,
      components: rows,
      ephemeral: true,
    });
    return;
  }

  // 5. Lista de Pets da Mochila
  if (action === 'pet_bag_list') {
    const allPets = getUserPets(ownerId);
    const embed = new EmbedBuilder()
      .setColor('#C084FC')
      .setTitle(`🎒  ✦  Canil de ${interaction.user.displayName}`)
      .setDescription(
        `Você possui **${allPets.length} pet(s)** em sua coleção.\n` +
        'Clique no botão abaixo do pet que você deseja definir como seu **Companheiro Ativo**:'
      );

    const activateButtons = [];
    allPets.forEach((p) => {
      const isActive = p.id === activePet.id;
      const tag = isActive ? ' ⭐ (ATIVO)' : '';
      embed.addFields({
        name: `${p.emoji} ${p.name} — Nível ${p.level}${tag}`,
        value: `> Espécie: \`${p.species}\` • Elemento: \`${p.element}\` • HP: ${p.stats.hp}/${p.stats.maxHp}`,
        inline: false,
      });

      if (!isActive) {
        activateButtons.push(
          new ButtonBuilder()
            .setCustomId(`pet_activate:${ownerId}:${p.id}`)
            .setLabel(`Ativar ${p.name.slice(0, 15)}`)
            .setEmoji(p.emoji)
            .setStyle(ButtonStyle.Primary)
        );
      }
    });

    const rows = [];
    if (activateButtons.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(activateButtons.slice(0, 4)));
    }

    await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    return;
  }

  // 5.1. Ativar Pet Selecionado
  if (action === 'pet_activate') {
    const petId = parts[2];
    const result = setActivePet(ownerId, petId);
    if (!result.success) {
      await interaction.reply({ content: '❌ Não foi possível ativar este pet.', ephemeral: true });
      return;
    }

    await interaction.reply({
      content: `⭐ **${result.pet.emoji} ${result.pet.name}** agora é o seu companheiro ativo! Use \`/pet\` para ver o cartão dele.`,
      ephemeral: true,
    });
    return;
  }

  // 6. Informações de Duelo
  if (action === 'pet_duel_info') {
    await interaction.reply({
      content: `⚔️ Para desafiar alguém para um duelo de pets na arena, use:\n> \`/petduelo @usuario [aposta]\`\n\nSeu pet atual: **${activePet.name}** (Lv ${activePet.level}, ATK: ${activePet.stats.atk}, DEF: ${activePet.stats.def}, SPD: ${activePet.stats.spd}).`,
      ephemeral: true,
    });
  }
}

module.exports = {
  name: PET,
  aliases: ['petcard', 'meupet', 'bichinho'],
  data: new SlashCommandBuilder()
    .setName(PET)
    .setDescription('Exibe o painel e o cartão ilustrado do seu pet ativo')
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Exibe o cartão de status e botões de ação do seu pet ativo')
    )
    .addSubcommand((sub) =>
      sub
        .setName('mochila')
        .setDescription('Lista todos os pets da sua coleção')
    )
    .addSubcommand((sub) =>
      sub
        .setName('ativar')
        .setDescription('Define qual pet da sua mochila será o ativo')
        .addStringOption((opt) => opt.setName('nome_ou_id').setDescription('Nome ou espécie do pet').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('renomear')
        .setDescription('Altera o apelido do seu pet ativo')
        .addStringOption((opt) => opt.setName('novo_nome').setDescription('Novo apelido para o pet (2 a 25 caracteres)').setRequired(true))
    ),
  async executePrefix({ message, args }) {
    const sub = args[0] ? args[0].toLowerCase() : 'status';

    if (sub === 'mochila' || sub === 'pets') {
      const allPets = getUserPets(message.author.id);
      if (allPets.length === 0) {
        const embed = buildOnboardingEmbed(message.author.displayName);
        const components = buildOnboardingComponents(message.author.id);
        await message.reply({ embeds: [embed], components });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor('#C084FC')
        .setTitle(`🎒 Canil de ${message.author.displayName}`)
        .setDescription('Lista de todos os seus pets:');
      allPets.forEach((p) => {
        embed.addFields({
          name: `${p.emoji} ${p.name} (Lv ${p.level})`,
          value: `Espécie: ${p.species} • Elemento: ${p.element} • HP: ${p.stats.hp}/${p.stats.maxHp}`,
        });
      });
      await message.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'renomear' && args[1]) {
      const newName = args.slice(1).join(' ');
      const res = renamePet(message.author.id, newName);
      if (!res.success) {
        await message.reply('❌ Nome inválido! Escolha um nome entre 2 e 25 caracteres.');
        return;
      }
      await message.reply(`✅ Seu pet agora se chama **${res.pet.name}**!`);
      return;
    }

    if (sub === 'ativar' && args[1]) {
      const target = args.slice(1).join(' ');
      const res = setActivePet(message.author.id, target);
      if (!res.success) {
        await message.reply('❌ Pet não encontrado na sua mochila.');
        return;
      }
      await message.reply(`⭐ **${res.pet.name}** agora é o seu pet ativo!`);
      return;
    }

    const activePet = getActivePet(message.author.id);
    if (!activePet) {
      const embed = buildOnboardingEmbed(message.author.displayName);
      const components = buildOnboardingComponents(message.author.id);
      await message.reply({ embeds: [embed], components });
      return;
    }

    const attachment = createPetAttachment(activePet);
    const embed = buildPetEmbed(activePet, message.author.displayName);
    const components = buildPetActionButtons(message.author.id, activePet);

    await message.reply({ embeds: [embed], files: [attachment], components });
  },
  async executeSlash({ interaction }) {
    const sub = interaction.options.getSubcommand(false) || 'status';

    if (sub === 'renomear') {
      const newName = interaction.options.getString('novo_nome');
      const res = renamePet(interaction.user.id, newName);
      if (!res.success) {
        await interaction.editReply({ content: '❌ Nome inválido! Escolha um nome entre 2 e 25 caracteres.' });
        return;
      }
      await interaction.editReply({ content: `✅ Seu pet agora se chama **${res.pet.name}**!` });
      return;
    }

    if (sub === 'ativar') {
      const target = interaction.options.getString('nome_ou_id');
      const res = setActivePet(interaction.user.id, target);
      if (!res.success) {
        await interaction.editReply({ content: '❌ Pet não encontrado na sua coleção.' });
        return;
      }
      await interaction.editReply({ content: `⭐ **${res.pet.name}** agora é o seu pet ativo!` });
      return;
    }

    if (sub === 'mochila') {
      const allPets = getUserPets(interaction.user.id);
      if (allPets.length === 0) {
        const embed = buildOnboardingEmbed(interaction.user.displayName);
        const components = buildOnboardingComponents(interaction.user.id);
        await interaction.editReply({ embeds: [embed], components });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor('#C084FC')
        .setTitle(`🎒 Canil de ${interaction.user.displayName}`)
        .setDescription('Lista de todos os seus pets:');
      allPets.forEach((p) => {
        embed.addFields({
          name: `${p.emoji} ${p.name} (Lv ${p.level})`,
          value: `Espécie: ${p.species} • Elemento: ${p.element} • HP: ${p.stats.hp}/${p.stats.maxHp}`,
        });
      });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const activePet = getActivePet(interaction.user.id);
    if (!activePet) {
      const embed = buildOnboardingEmbed(interaction.user.displayName);
      const components = buildOnboardingComponents(interaction.user.id);
      await interaction.editReply({ embeds: [embed], components });
      return;
    }

    const attachment = createPetAttachment(activePet);
    const embed = buildPetEmbed(activePet, interaction.user.displayName);
    const components = buildPetActionButtons(interaction.user.id, activePet);

    await interaction.editReply({ embeds: [embed], files: [attachment], components });
  },
  isPetInteraction,
  handlePetInteraction,
  buildOnboardingEmbed,
  buildOnboardingComponents,
};


