const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { setUserBalance } = require('../services/economy');
const { formatCoins } = require('./economyHelpers');
const { SET_ECONOMY } = require('./commandNames');

function isManager(source) {
  return source.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function getTargetUser(source, args = []) {
  return source.options?.getUser('usuario') || source.mentions.users.first() || source.guild?.members.cache.get(args[0])?.user;
}

function parseAmount(value) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function buildReply(target, amount) {
  return `✅ Economia de **${target}** definida para **${formatCoins(amount)}**. Pronto. Não diga que eu não cuido desta casa.`;
  return `✅ Economia de **${target}** definida para **${formatCoins(amount)}** com sucesso.`;
}

module.exports = {
  name: SET_ECONOMY,
  aliases: ['seteconomy'],
  data: new SlashCommandBuilder()
    .setName(SET_ECONOMY)
    .setDescription('Define o saldo de Moedinhas de um usuário.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) => option.setName('usuario').setDescription('Usuário que terá o saldo alterado').setRequired(true))
    .addIntegerOption((option) => option.setName('quantidade').setDescription('Novo saldo de Moedinhas').setMinValue(0).setRequired(true)),
  async executePrefix({ message, args }) {
    if (!isManager(message)) return message.reply('❌ Apenas administradores podem alterar a economia. A pose de autoridade não engana a Kuromi.');
    if (!isManager(message)) return message.reply('❌ Apenas administradores podem alterar a economia.');
    const target = getTargetUser(message, args);
    const amount = parseAmount(args[1]);
    if (!target || amount === null) return message.reply('❌ Use: `ku!setareconomia @usuário quantidade`. Eu preciso de dados, não de drama.');
    if (!target || amount === null) return message.reply('❌ Use: `ku!setareconomia @usuário quantidade`.');
    setUserBalance(target.id, amount);
    await message.reply(buildReply(target, amount));
  },
  async executeSlash({ interaction }) {
    if (!isManager(interaction)) return interaction.editReply('❌ Apenas administradores podem alterar a economia. A pose de autoridade não engana a Kuromi.');
    if (!isManager(interaction)) return interaction.editReply('❌ Apenas administradores podem alterar a economia.');
    const target = getTargetUser(interaction);
    const amount = interaction.options.getInteger('quantidade');
    setUserBalance(target.id, amount);
    await interaction.editReply(buildReply(target, amount));
  },
};