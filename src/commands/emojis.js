const { AttachmentBuilder, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { serializeGuildEmojis } = require('../utils/serverEmojis');
const { EMOJIS } = require('./commandNames');

const name = EMOJIS || 'py-emojis';

function isManager(source) {
  return source.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function buildFile(guild) {
  const emojis = serializeGuildEmojis(guild);
  const payload = {
    guild: { id: guild.id, name: guild.name },
    exportedAt: new Date().toISOString(),
    total: emojis.length,
    animated: emojis.filter((emoji) => emoji.animated).length,
    emojis,
  };
  return {
    file: new AttachmentBuilder(Buffer.from(JSON.stringify(payload, null, 2), 'utf8'), { name: 'emojis-do-servidor.json' }),
    count: emojis.length,
    animated: payload.animated,
  };
}

function buildSummary(guild, count, animated) {
  const guildName = guild?.name || 'Servidor';
  const desc = [
    `Catálogo completo de emojis customizados do servidor **${guildName}**:`,
    '',
    '📊 **ESTATÍSTICAS DOS EMOJIS**',
    `> 🎀 **Total de Emojis:** **${count}**`,
    `> ✨ **Emojis Animados:** **${animated}**`,
    `> 📄 **Arquivo Anexo:** \`emojis-do-servidor.json\``,
    '',
    '📥 *O arquivo JSON com a lista completa foi anexado a esta mensagem.*',
  ].join('\n');

  return new EmbedBuilder()
    .setColor('#e60067')
    .setTitle(`🎀  ✦  Lista de Emojis — ${guildName}`)
    .setDescription(desc)
    .setFooter({ text: `${guildName} • Catálogo baixável de emojis` })
    .setTimestamp();
}

function buildUsage() {
  return '❌ Apenas administradores podem baixar a lista de emojis do servidor.';
}

async function sendExport(source, reply) {
  if (!source.guild) return reply('❌ Este comando precisa ser usado dentro de um servidor.');
  if (!isManager(source)) return reply(buildUsage());

  const result = buildFile(source.guild);
  await reply({ embeds: [buildSummary(source.guild, result.count, result.animated)], files: [result.file] });
}

module.exports = {
  name,
  aliases: ['listaemojis'],
  buildFile,
  serializeGuildEmojis,
  data: new SlashCommandBuilder()
    .setName(name)
    .setDescription('Baixa a lista de emojis customizados deste servidor em JSON.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async executePrefix({ message }) {
    await sendExport(message, (content) => message.reply(content));
  },
  async executeSlash({ interaction }) {
    await sendExport(interaction, (content) => interaction.editReply(content));
  },
};
