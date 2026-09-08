const { SlashCommandBuilder } = require('discord.js');
const { getRanking, getUserRank } = require('../services/economy');
const { buildRankingEmbed } = require('./economyHelpers');
const { RANKING } = require('./commandNames');

async function buildReply(guild, userId) {
  const members = await guild.members.fetch().catch(() => null);
  const memberMap = new Map();
  if (members) members.forEach((member) => memberMap.set(member.id, member));

  const memberIds = new Set(memberMap.keys());
  return buildRankingEmbed(getRanking(10, memberIds), memberMap, getUserRank(userId, memberIds));
}

module.exports = {
  name: RANKING,
  data: new SlashCommandBuilder()
    .setName(RANKING)
    .setDescription('Exibe o ranking de Moedinhas do servidor. Prepare o orgulho para uma possível derrota.'),
  async executePrefix({ message }) {
    await message.reply({ embeds: [await buildReply(message.guild, message.author.id)] });
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({ embeds: [await buildReply(interaction.guild, interaction.user.id)] });
  },
};