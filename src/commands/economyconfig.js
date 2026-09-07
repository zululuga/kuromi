const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getEconomyConfig, setEconomyConfig } = require('../services/database');
const { ECONOMY_CONFIG } = require('./commandNames');

function parseValues(minimum, maximum) {
  const parsedMinimum = Number(minimum);
  const parsedMaximum = Number(maximum);
  if (!Number.isInteger(parsedMinimum) || !Number.isInteger(parsedMaximum) || parsedMinimum < 0 || parsedMaximum < parsedMinimum) {
    return null;
  }
  return { minimum: parsedMinimum, maximum: parsedMaximum };
}

function isManager(source) {
  return source.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function buildReply(config) {
  return `✅ Diário configurado: entre **${config.minimum}** e **${config.maximum}** Moedinhas.`;
}

module.exports = {
  name: ECONOMY_CONFIG,
  aliases: ['economyconfig'],
  data: new SlashCommandBuilder()
    .setName(ECONOMY_CONFIG)
    .setDescription('Configura a quantidade de Moedinhas do diário.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((option) => option.setName('minimo').setDescription('Valor mínimo').setMinValue(0).setRequired(true))
    .addIntegerOption((option) => option.setName('maximo').setDescription('Valor máximo').setMinValue(0).setRequired(true)),
  async executePrefix({ message, args }) {
    if (!isManager(message)) return message.reply('❌ Apenas administradores podem configurar a economia.');
    const values = parseValues(args[0], args[1]);
    if (!values) return message.reply('❌ Use dois números válidos: `ku!configeconomia 0 100`.');
    await message.reply(buildReply(setEconomyConfig(values.minimum, values.maximum)));
  },
  async executeSlash({ interaction }) {
    if (!isManager(interaction)) return interaction.editReply('❌ Apenas administradores podem configurar a economia.');
    const values = parseValues(interaction.options.getInteger('minimo'), interaction.options.getInteger('maximo'));
    if (!values) return interaction.editReply('❌ O mínimo deve ser menor ou igual ao máximo.');
    await interaction.editReply(buildReply(setEconomyConfig(values.minimum, values.maximum)));
  },
};