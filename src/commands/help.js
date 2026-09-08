const { SlashCommandBuilder } = require('discord.js');
const { buildHelpMessage } = require('./commandHelpers');
const { HELP } = require('./commandNames');

const BUTTON_PREFIX = 'help:';

function isHelpButton(interaction) {
  return interaction.isButton() && interaction.customId.startsWith(BUTTON_PREFIX);
}

async function executeButton({ interaction }) {
  const [, action, targetPage, userId] = interaction.customId.split(':');

  if (action === 'info') {
    await interaction.deferUpdate().catch(() => null);
    return;
  }

  if (userId && interaction.user.id !== userId) {
    await interaction.reply({
      content: '❌ Apenas quem abriu o menu de ajuda pode navegar pelas páginas.',
      ephemeral: true,
    });
    return;
  }

  const page = Number.parseInt(targetPage, 10) || 1;
  const { embed, components } = buildHelpMessage(page, interaction.user.id);

  await interaction.update({
    embeds: [embed],
    components,
  });
}

module.exports = {
  name: HELP,
  aliases: ['help'],
  ephemeral: true,
  isHelpButton,
  executeButton,
  data: new SlashCommandBuilder()
    .setName(HELP)
    .setDescription('Mostra a lista de comandos e funções da Kuromi. Leia tudo antes de perguntar de novo.')
    .addIntegerOption((option) =>
      option.setName('pagina').setDescription('Número da página inicial').setMinValue(1).setRequired(false)
    ),
  async executePrefix({ message, args }) {
    const page = Number.parseInt(args[0], 10) || 1;
    const { embed, components } = buildHelpMessage(page, message.author.id);
    await message.reply({ embeds: [embed], components });
  },
  async executeSlash({ interaction }) {
    const page = interaction.options.getInteger('pagina') || 1;
    const { embed, components } = buildHelpMessage(page, interaction.user.id);
    await interaction.editReply({ embeds: [embed], components });
  },
};