const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getEconomyConfig, setEconomyConfig } = require('../services/database');
const { ECONOMY_CONFIG } = require('./commandNames');
const { t } = require('../utils/i18n');

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

function buildReply(config, source = null) {
  return t('admin.economyConfigSuccess', source, {
    min: config.minimum,
    max: config.maximum,
    coins: t('common.coins', source),
  });
}

module.exports = {
  name: ECONOMY_CONFIG,
  aliases: ['economyconfig', 'configeconomia'],
  data: new SlashCommandBuilder()
    .setName(ECONOMY_CONFIG)
    .setDescription('Configure daily minimum and maximum Coins rewards.')
    .setDescriptionLocalizations({
      'pt-BR': 'Configura a quantidade de Moedinhas do diário.',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((option) =>
      option
        .setName('minimo')
        .setNameLocalizations({
          'en-US': 'minimum',
          'en-GB': 'minimum',
          'pt-BR': 'minimo',
        })
        .setDescription('Minimum value / Valor mínimo')
        .setMinValue(0)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('maximo')
        .setNameLocalizations({
          'en-US': 'maximum',
          'en-GB': 'maximum',
          'pt-BR': 'maximo',
        })
        .setDescription('Maximum value / Valor máximo')
        .setMinValue(0)
        .setRequired(true)
    ),
  async executePrefix({ message, args }) {
    if (!isManager(message)) return message.reply(t('admin.noPermission', message));
    const values = parseValues(args[0], args[1]);
    if (!values) return message.reply(t('admin.economyConfigInvalid', message));
    await message.reply(buildReply(setEconomyConfig(values.minimum, values.maximum), message));
  },
  async executeSlash({ interaction }) {
    if (!isManager(interaction)) return interaction.editReply(t('admin.noPermission', interaction));
    const minVal = interaction.options.getInteger('minimo') ?? interaction.options.getInteger('minimum');
    const maxVal = interaction.options.getInteger('maximo') ?? interaction.options.getInteger('maximum');
    const values = parseValues(minVal, maxVal);
    if (!values) return interaction.editReply(t('admin.economyConfigInvalid', interaction));
    await interaction.editReply(buildReply(setEconomyConfig(values.minimum, values.maximum), interaction));
  },
};