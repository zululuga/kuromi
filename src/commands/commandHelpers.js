const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { getCommandList } = require('../utils/botUtils');

const PAGE_SIZE = 10;

function getHelpPageData(requestedPage = 1) {
  const commandList = getCommandList();
  const totalPages = Math.max(1, Math.ceil(commandList.length / PAGE_SIZE));
  const page = Math.min(Math.max(Number.parseInt(requestedPage, 10) || 1, 1), totalPages);
  const pageCommands = commandList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    commandList,
    page,
    totalPages,
    pageCommands,
  };
}

function buildHelpEmbed(requestedPage = 1) {
  const { commandList, page, totalPages, pageCommands } = getHelpPageData(requestedPage);

  return new EmbedBuilder()
    .setColor('#7c3aed')
    .setTitle(`📚  ✦  Manual da Kuromi • Página ${page}/${totalPages}`)
    .setDescription('Cada item mostra as versões slash e por prefixo. Navegue pelas páginas usando os botões abaixo.')
    .addFields(
      ...pageCommands.map((command) => ({
        name: `${command.name}`,
        value: `• ${command.description}\n${command.usage.replace(/\n/g, '\n')}`,
      }))
    )
    .setFooter({ text: `Kuromi • ${commandList.length} comandos • Página ${page} de ${totalPages}` })
    .setTimestamp();
}

function buildHelpComponents(page, totalPages, userId = '') {
  const prevButton = new ButtonBuilder()
    .setCustomId(`help:page:${page - 1}:${userId}`)
    .setLabel('◀️ Anterior')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page <= 1);

  const pageIndicator = new ButtonBuilder()
    .setCustomId(`help:info:${page}:${userId}`)
    .setLabel(`${page} / ${totalPages}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextButton = new ButtonBuilder()
    .setCustomId(`help:page:${page + 1}:${userId}`)
    .setLabel('Próximo ▶️')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page >= totalPages);

  return [new ActionRowBuilder().addComponents(prevButton, pageIndicator, nextButton)];
}

function buildHelpMessage(requestedPage = 1, userId = '') {
  const { page, totalPages } = getHelpPageData(requestedPage);
  const embed = buildHelpEmbed(page);
  const components = buildHelpComponents(page, totalPages, userId);

  return { embed, components, page, totalPages };
}

module.exports = {
  buildHelpEmbed,
  buildHelpComponents,
  buildHelpMessage,
  getHelpPageData,
};
