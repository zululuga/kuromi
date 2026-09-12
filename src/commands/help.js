const { SlashCommandBuilder } = require('discord.js');
const { buildModularHelpEmbed, buildModularHelpComponents, MODULE_METADATA } = require('./commandHelpers');
const { HELP } = require('./commandNames');
const { t } = require('../utils/i18n');

function isHelpButton(interaction) {
  return interaction.isStringSelectMenu() && interaction.customId.startsWith('help_module_select:');
}

async function executeButton({ interaction }) {
  const [, userId] = interaction.customId.split(':');

  if (userId && interaction.user.id !== userId) {
    await interaction.reply({
      content: t('common.onlyOwner', interaction),
      ephemeral: true,
    });
    return;
  }

  const selectedModule = interaction.values[0] || 'todos';
  const guildName = interaction.guild?.name || '';
  const embed = buildModularHelpEmbed(selectedModule, guildName, interaction);
  const components = buildModularHelpComponents(selectedModule, userId, interaction);

  await interaction.update({
    embeds: [embed],
    components,
  });
}

function getModuleChoices() {
  return Object.values(MODULE_METADATA).map((m) => ({
    name: `${m.emoji} ${m.label}`,
    value: m.id,
  }));
}

module.exports = {
  name: HELP,
  aliases: ['help', 'comandos', 'manual'],
  ephemeral: true,
  isHelpButton,
  executeButton,
  data: new SlashCommandBuilder()
    .setName(HELP)
    .setDescription('Interactive help center categorized by modules / Central de ajuda.')
    .setDescriptionLocalizations({
      'pt-BR': 'Central de ajuda interativa categorizada por módulos e utilidades.',
    })
    .addStringOption((option) =>
      option
        .setName('modulo')
        .setNameLocalizations({
          'en-US': 'module',
          'en-GB': 'module',
          'pt-BR': 'modulo',
        })
        .setDescription('Module to inspect directly / Módulo que deseja consultar')
        .setRequired(false)
        .addChoices(...getModuleChoices())
    ),
  async executePrefix({ message, args }) {
    const mod = args[0] ? args[0].toLowerCase() : 'todos';
    const guildName = message.guild?.name || '';
    const embed = buildModularHelpEmbed(mod, guildName, message);
    const components = buildModularHelpComponents(mod, message.author.id, message);
    await message.reply({ embeds: [embed], components });
  },
  async executeSlash({ interaction }) {
    const mod = interaction.options.getString('modulo') || interaction.options.getString('module') || 'todos';
    const guildName = interaction.guild?.name || '';
    const embed = buildModularHelpEmbed(mod, guildName, interaction);
    const components = buildModularHelpComponents(mod, interaction.user.id, interaction);
    await interaction.editReply({ embeds: [embed], components });
  },
};