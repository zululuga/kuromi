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
  CARINHO_COOLDOWN_MS,
  SLEEP_COOLDOWN_MS,
} = require('../services/pets');
const { createPetAttachment } = require('../services/petRenderer');
const { getUserInventory, getItemDefinition } = require('../services/inventory');
const { formatRemaining } = require('./economyHelpers');
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

function isPetInteraction(interaction) {
  return (
    interaction.isButton() &&
    (interaction.customId.startsWith('pet_feed_menu:') ||
      interaction.customId.startsWith('pet_carinho:') ||
      interaction.customId.startsWith('pet_sleep:') ||
      interaction.customId.startsWith('pet_explore_zones:') ||
      interaction.customId.startsWith('pet_bag_list:') ||
      interaction.customId.startsWith('pet_duel_info:') ||
      interaction.customId.startsWith('pet_activate:')) ||
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

  const activePet = getActivePet(ownerId);
  if (!activePet) {
    await interaction.reply({
      content: '❌ Você ainda não tem nenhum pet! Use `/adocao` para escolher seu companheiro.',
      ephemeral: true,
    });
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
          return {
            label: `${item.name} (Você tem: ${count})`,
            value: id,
            emoji: item.emoji,
            description: `Recupera +${item.effects?.hunger || 0}% de fome`,
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

    await interaction.update({
      content: `🍖 Seu pet **${result.pet.name}** comeu **${result.item.name}** com alegria!\n💖 Fome agora está em **${result.pet.hunger}%** e Humor em **${result.pet.happiness}%**.${lvlMsg}`,
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
        await message.reply('❌ Você ainda não tem nenhum pet! Use `ku!adocao` para adotar.');
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
      await message.reply('❌ Você ainda não possui um pet! Use `ku!adocao` para adotar um.');
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
        await interaction.editReply({ content: '❌ Você ainda não tem nenhum pet! Use `/adocao` para adotar.' });
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
      await interaction.editReply({ content: '❌ Você ainda não tem nenhum pet! Use `/adocao` para adotar um.' });
      return;
    }

    const attachment = createPetAttachment(activePet);
    const embed = buildPetEmbed(activePet, interaction.user.displayName);
    const components = buildPetActionButtons(interaction.user.id, activePet);

    await interaction.editReply({ embeds: [embed], files: [attachment], components });
  },
  isPetInteraction,
  handlePetInteraction,
};
