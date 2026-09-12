const { AttachmentBuilder, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { serializeGuildEmojis } = require('../utils/serverEmojis');
const { EMOJIS } = require('./commandNames');
const { getLanguage, t } = require('../utils/i18n');

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

function buildSummary(guild, count, animated, source = null) {
  const guildName = guild?.name || 'Servidor';
  const lang = getLanguage(source || guild);

  return new EmbedBuilder()
    .setColor('#e60067')
    .setTitle(t('admin.emojisExportTitle', source || guild, { server: guildName }))
    .setDescription(t('admin.emojisExportDesc', source || guild, { server: guildName, count, animated }))
    .setFooter({ text: `${guildName} • ${lang === 'en' ? 'Downloadable Emoji Catalog' : 'Catálogo baixável de emojis'}` })
    .setTimestamp();
}

function buildUsage(source = null) {
  return t('admin.noPermission', source);
}

async function sendExport(source, reply) {
  if (!source.guild) return reply(t('admin.onlyServer', source));
  if (!isManager(source)) return reply(buildUsage(source));

  const result = buildFile(source.guild);
  await reply({ embeds: [buildSummary(source.guild, result.count, result.animated, source)], files: [result.file] });
}

module.exports = {
  name,
  aliases: ['listaemojis', 'emojis'],
  buildFile,
  serializeGuildEmojis,
  data: new SlashCommandBuilder()
    .setName(name)
    .setDescription('Download this server\'s custom emojis as a JSON file.')
    .setDescriptionLocalizations({
      'pt-BR': 'Baixa a lista de emojis customizados deste servidor em JSON.',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async executePrefix({ message }) {
    await sendExport(message, (content) => message.reply(content));
  },
  async executeSlash({ interaction }) {
    await sendExport(interaction, (content) => interaction.editReply(content));
  },
};
