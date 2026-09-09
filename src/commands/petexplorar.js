const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { exploreDungeon, getDungeonZones } = require('../services/petDungeons');
const { getActivePet } = require('../services/pets');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { PET_EXPLORE } = require('./commandNames');

function buildExplorationReply(result) {
  if (!result.success) {
    if (result.reason === 'no_pet') {
      return { content: '❌ Você precisa de um pet ativo para explorar! Adote um usando `/adocao`.' };
    }
    if (result.reason === 'low_level') {
      return { content: `❌ A dungeon **${result.zone.name}** exige **Nível ${result.requiredLevel}+**, mas seu pet está no **Nível ${result.petLevel}**.` };
    }
    if (result.reason === 'too_hungry') {
      return { content: `❌ Seu pet está com muita fome (${result.hunger}%) e se recusa a explorar! Alimente-o usando \`/pet\` ou \`/usar\`.` };
    }
    if (result.reason === 'no_energy') {
      return { content: `❌ Energia insuficiente (${result.energy}% / ${result.requiredEnergy}% necessário). Coloque seu pet para dormir usando \`/pet\` ou dê uma poção.` };
    }
    if (result.reason === 'cooldown') {
      return { content: `⏳ A dungeon **${result.zone.name}** está em cooldown! Tente novamente em **${formatRemaining(result.remainingMs)}**.` };
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
    itemsText = `\n\n🎁 **Itens Encontrados na Dungeon:**\n${list}\n*(Guardados na sua mochila \`/inventario\`)*`;
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

  return { embeds: [embed] };
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
  const replyData = buildExplorationReply(result);

  if (replyData.embeds) {
    await interaction.update({ embeds: replyData.embeds, components: [] });
  } else {
    await interaction.reply({ content: replyData.content, ephemeral: true });
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
    const replyData = buildExplorationReply(result);
    await message.reply(replyData);
  },
  async executeSlash({ interaction }) {
    const zoneKey = interaction.options.getString('zona') || 'jardim';
    const result = exploreDungeon(interaction.user.id, zoneKey);
    const replyData = buildExplorationReply(result);
    await interaction.editReply(replyData);
  },
  isDungeonInteraction,
  handleDungeonInteraction,
};