const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { resetUserEconomy } = require('../services/economy');
const { RESET_ECONOMY } = require('./commandNames');

function isManager(source) {
  return source.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function getTargetUser(source, args = []) {
  return source.options?.getUser('usuario') || source.mentions.users.first() || source.guild?.members.cache.get(args[0])?.user;
}

module.exports = {
  name: RESET_ECONOMY,
  aliases: ['reseteconomia'],
  data: new SlashCommandBuilder()
    .setName(RESET_ECONOMY)
    .setDescription('Zera as Moedinhas e o cooldown diário de um usuário.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) => option.setName('usuario').setDescription('Usuário que terá a economia resetada').setRequired(true)),
  async executePrefix({ message, args }) {
    if (!isManager(message)) return message.reply('❌ Apenas administradores podem resetar a economia. Não tente apertar o botão vermelho sem permissão.');
    const target = getTargetUser(message, args);
    if (!target) return message.reply('❌ Use: `ku!resetareconomia @usuário`. Eu não reseto o caos por telepatia.');
    resetUserEconomy(target.id);
    await message.reply(`✅ Economia de **${target}** resetada. Saldo: **0 Moedinhas**. Que recomeço dramático.`);
  },
  async executeSlash({ interaction }) {
    if (!isManager(interaction)) return interaction.editReply('❌ Apenas administradores podem resetar a economia. Não tente apertar o botão vermelho sem permissão.');
    const target = getTargetUser(interaction);
    resetUserEconomy(target.id);
    await interaction.editReply(`✅ Economia de **${target}** resetada. Saldo: **0 Moedinhas**. Que recomeço dramático.`);
  },
};