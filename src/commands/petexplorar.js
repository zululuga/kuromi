const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { exploreDungeon, getDungeonZones } = require('../services/petDungeons');
const { getActivePet } = require('../services/pets');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { PET_EXPLORE } = require('./commandNames');

function buildExplorationReply(userId, result) {
  if (!result.success) {
    if (result.reason === 'no_pet') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`onboard_adopt:${userId}`)
          .setLabel('Adotar Primeiro Pet')
          .setEmoji('🐾')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`onboard_kit:${userId}`)
          .setLabel('Resgatar Kit Inicial')
          .setEmoji('🎁')
          .setStyle(ButtonStyle.Primary)
      );
      return {
        content: '❌ Você precisa de um pet ativo para explorar! Adote um abaixo sem precisar digitar nada:',
        components: [row],
      };
    }
    if (result.reason === 'low_level') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`pet_explore_zones:${userId}`)
          .setLabel('Ver Outras Dungeons')
          .setEmoji('🧭')
          .setStyle(ButtonStyle.Primary)
      );
      return {
        content: `❌ A dungeon **${result.zone.name}** exige **Nível ${result.requiredLevel}+**, mas seu pet está no **Nível ${result.petLevel}**.`,
        components: [row],
      };
    }
    if (result.reason === 'too_hungry') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`pet_feed_menu:${userId}`)
          .setLabel('Alimentar Pet Agora')
          .setEmoji('🍖')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`inv_select:${userId}`)
          .setLabel('Abrir Mochila')
          .setEmoji('🎒')
          .setStyle(ButtonStyle.Secondary)
      );
      return {
        content: `❌ Seu pet está com muita fome (**${result.hunger}%**) e se recusa a explorar! Alimente-o usando o botão abaixo:`,
        components: [row],
      };
    }
    if (result.reason === 'no_energy') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`pet_sleep:${userId}`)
          .setLabel('Colocar Pet para Dormir')
          .setEmoji('💤')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`inv_select:${userId}`)
          .setLabel('Usar Poção na Mochila')
          .setEmoji('🧪')
          .setStyle(ButtonStyle.Secondary)
      );
      return {
        content: `❌ Energia insuficiente (**${result.energy}%** / **${result.requiredEnergy}%** necessário). Coloque seu pet para dormir ou use uma poção:`,
        components: [row],
      };
    }
    if (result.reason === 'cooldown') {
      return {
        content: `⏳ A dungeon **${result.zone.name}** está em cooldown! Tente novamente em **${formatRemaining(result.remainingMs)}**.`,
      };
    }
    return { content: '❌ Não foi possível explorar esta dungeon no momento.' };
  }

  const events = [];
  if (result.monsterDefeated) {
    events.push('👹 **Batalha Selvagem:** Seu pet derrotou um monstro no caminho e conquistou moedas e XP extras!');
  }
  if (result.tookDamage) {
    events.push(`🩹 **Armadilha:** Seu pet caiu em um espinho e perdeu **${result.damageTaken} HP**. Use um curativo se necessário.`);
  }

  let itemsText = '';
  if (result.droppedItems && result.droppedItems.length > 0) {
    const list = result.droppedItems.map((i) => `> ${i.emoji} **${i.name}** (\`${i.category}\`)`).join('\n');
    itemsText = `\n\n🎁 **Itens Encontrados na Dungeon:**\n${list}\n*(Guardados na sua mochila)*`;
  }

  let levelMsg = '';
  if (result.leveledUp) {
    levelMsg = `\n🎉 **LEVEL UP!** Seu pet atingiu o **Nível ${result.newLevel}**!`;
  }

  const embed = new EmbedBuilder()
    .setColor('#10b981')
    .setTitle(`${result.zone.emoji}  ✦  Expedição Concluída — ${result.zone.name}`)
    .setDescription(
      `Seu pet **${result.pet.emoji} ${result.pet.name}** retornou com segurança!\n\n` +
      `🪙 **Recompensa:** +**${formatCoins(result.coinsReward)}**\n` +
      `⭐ **XP:** +**${result.xpAwarded} XP**${levelMsg}\n` +
      `⚡ **Energia Restante:** ${result.pet.energy}%  |  🍖 **Fome:** ${result.pet.hunger}%\n` +
      (events.length > 0 ? `\n${events.join('\n')}` : '') +
      itemsText
    )
    .setFooter({ text: 'Cringelândia Dungeons • Kuromi supervisiona cada tesouro resgatado' })
    .setTimestamp();

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dungeon_start:${userId}:${result.zone.key}`)
      .setLabel('Explorar Novamente')
      .setEmoji('🧭')
      .setStyle(ButtonStyle.Success)
      .setDisabled(result.pet.energy < result.zone.energyCost || result.pet.hunger <= 15),
    new ButtonBuilder()
      .setCustomId(`pet_feed_menu:${userId}`)
      .setLabel('Alimentar')
      .setEmoji('🍖')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`inv_select:${userId}`)
      .setLabel('Abrir Mochila')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pet_view:${userId}`)
      .setLabel('Ver Cartão')
      .setEmoji('🐾')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [actionRow] };
}

function isDungeonInteraction(interaction) {
  return interaction.isButton() && interaction.customId.startsWith('dungeon_start:');
}

async function handleDungeonInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const ownerId = parts[1];
  const zoneKey = parts[2];

  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: '❌ Apenas o dono do pet pode enviar para esta expedição!', ephemeral: true });
    return;
  }

  const result = exploreDungeon(ownerId, zoneKey);
  const replyData = buildExplorationReply(ownerId, result);

  if (replyData.embeds) {
    await interaction.update({ embeds: replyData.embeds, components: replyData.components || [] });
  } else {
    await interaction.reply({ content: replyData.content, components: replyData.components || [], ephemeral: true });
  }
}

module.exports = {
  name: PET_EXPLORE,
  aliases: ['dungeon', 'explorar', 'masmorra'],
  data: new SlashCommandBuilder()
    .setName(PET_EXPLORE)
    .setDescription('Envia seu pet para explorar dungeons temáticas em busca de moedas, XP e drops')
    .addStringOption((opt) =>
      opt
        .setName('zona')
        .setDescription('Zona de dungeon que você deseja explorar')
        .setRequired(false)
        .addChoices(
          { name: '🌸 Jardim das Borboletas (Lv 1+)', value: 'jardim' },
          { name: '🌲 Floresta Proibida (Lv 5+)', value: 'floresta' },
          { name: '🏰 Mansão da Kuromi (Lv 15+)', value: 'mansao' },
          { name: '🌌 Vórtice do Caos (Lv 30+)', value: 'vortice' }
        )
    ),
  async executePrefix({ message, args }) {
    const zoneKey = args[0] ? args[0].toLowerCase() : 'jardim';
    const result = exploreDungeon(message.author.id, zoneKey);
    const replyData = buildExplorationReply(message.author.id, result);
    await message.reply(replyData);
  },
  async executeSlash({ interaction }) {
    const zoneKey = interaction.options.getString('zona') || 'jardim';
    const result = exploreDungeon(interaction.user.id, zoneKey);
    const replyData = buildExplorationReply(interaction.user.id, result);
    await interaction.editReply(replyData);
  },
  isDungeonInteraction,
  handleDungeonInteraction,
};