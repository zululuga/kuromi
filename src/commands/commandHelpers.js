const { EmbedBuilder } = require('discord.js');
const { getCommandList } = require('../utils/botUtils');

function buildHelpEmbed(requestedPage = 1) {
  const commandList = getCommandList();
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(commandList.length / pageSize));
  const page = Math.min(Math.max(Number.parseInt(requestedPage, 10) || 1, 1), totalPages);
  const pageCommands = commandList.slice((page - 1) * pageSize, page * pageSize);

  return new EmbedBuilder()
    .setColor('#7c3aed')
    .setTitle(`📚 Comandos da Kuromi • Página ${page}/${totalPages}`)
    .setDescription('Cada item mostra as versões slash e por prefixo:')
    .addFields(
      ...pageCommands.map((command) => ({
        name: `${command.name}`,
        value: `• ${command.description}\n${command.usage.replace(/\n/g, '\n')}`,
      }))
    )
    .setFooter({ text: `Kuromi • ${commandList.length} comandos • Use /ajuda pagina ou ku!ajuda 2` })
    .setTimestamp();
}

function buildPrefixStatusEmbed(authorTag, newPrefix) {
  return new EmbedBuilder()
    .setColor('#f59e0b')
    .setTitle('🔧 Prefixo da Kuromi')
    .setDescription(`O prefixo atual foi alterado para: \`${newPrefix}\``)
    .addFields(
      { name: 'Comando de exemplo', value: `\`${newPrefix}ajuda\`` },
      { name: 'Solicitado por', value: authorTag }
    )
    .setTimestamp();
}

module.exports = {
  buildHelpEmbed,
  buildPrefixStatusEmbed,
};
