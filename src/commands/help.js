const { SlashCommandBuilder } = require('discord.js');
const { buildModularHelpEmbed, buildModularHelpComponents, MODULE_METADATA } = require('./commandHelpers');
const { HELP } = require('./commandNames');

function isHelpButton(interaction) {
  return interaction.isStringSelectMenu() && interaction.customId.startsWith('help_module_select:');
}

async function executeButton({ interaction }) {
  const [, userId] = interaction.customId.split(':');

  if (userId && interaction.user.id !== userId) {
    await interaction.reply({
      content: '❌ Apenas quem abriu este menu de ajuda pode selecionar as categorias.',
      ephemeral: true,
    });
    return;
  }

  const selectedModule = interaction.values[0] || 'todos';
  const guildName = interaction.guild?.name || '';
  const embed = buildModularHelpEmbed(selectedModule, guildName);
  const components = buildModularHelpComponents(selectedModule, userId);

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
    .setDescription('Central de ajuda interativa categorizada por módulos e utilidades')
    .addStringOption((option) =>
      option
        .setName('modulo')
        .setDescription('Módulo que deseja consultar diretamente')
        .setRequired(false)
        .addChoices(...getModuleChoices())
    ),
  async executePrefix({ message, args }) {
    const mod = args[0] ? args[0].toLowerCase() : 'todos';
    const guildName = message.guild?.name || '';
    const embed = buildModularHelpEmbed(mod, guildName);
    const components = buildModularHelpComponents(mod, message.author.id);
    await message.reply({ embeds: [embed], components });
  },
  async executeSlash({ interaction }) {
    const mod = interaction.options.getString('modulo') || 'todos';
    const guildName = interaction.guild?.name || '';
    const embed = buildModularHelpEmbed(mod, guildName);
    const components = buildModularHelpComponents(mod, interaction.user.id);
    await interaction.editReply({ embeds: [embed], components });
  },
};