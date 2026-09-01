const { EmbedBuilder } = require('discord.js');
const { getCommandList } = require('../utils/botUtils');

function buildHelpEmbed() {
  const commandList = getCommandList();

  return new EmbedBuilder()
    .setColor('#7c3aed')
    .setTitle('📚 Comandos da Kuromi')
    .setDescription('Aqui estão os recursos disponíveis no momento:')
    .addFields(
      ...commandList.map((command) => ({
        name: `${command.name}`,
        value: `• ${command.description}\nUso: \`${command.usage}\``,
      }))
    )
    .setFooter({ text: 'Kuromi • Bot oficial da Cringelândia' })
    .setTimestamp();
}

function buildPrefixStatusEmbed(authorTag, newPrefix) {
  return new EmbedBuilder()
    .setColor('#f59e0b')
    .setTitle('🔧 Prefixo da Kuromi')
    .setDescription(`O prefixo atual foi alterado para: \`${newPrefix}\``)
    .addFields(
      { name: 'Comando de exemplo', value: `\`${newPrefix}help\`` },
      { name: 'Solicitado por', value: authorTag }
    )
    .setTimestamp();
}

module.exports = {
  buildHelpEmbed,
  buildPrefixStatusEmbed,
};
