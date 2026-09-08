const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { BUMP_GUIDE_CHANNEL_ID, BUMP_GUIDE_INTERVAL_MS, TAROT_CHANNEL_ID } = require('../config');
const { getAutomationSchedule } = require('../services/automationSchedule');
const { AGENDA } = require('./commandNames');
const { getAnimatedEmoji } = require('../utils/serverEmojis');

function isManager(source) {
  return source.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatRemaining(remainingMs) {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}min`].filter(Boolean).join(' ');
}

function buildAgendaEmbed(guild, now = Date.now()) {
  const schedule = getAutomationSchedule(now);
  const fields = schedule.length
    ? schedule.map((automation) => ({
        name: `${getAnimatedEmoji(guild, [automation.id, 'calendar', 'clock'], automation.emoji)} ${automation.name}`,
        value: `**Próxima ${automation.action}:** <t:${Math.floor(automation.nextAt / 1000)}:F>\n` +
          `**Em:** ${formatDate(automation.nextAt)} (Brasília)\n` +
          `**Falta:** ${formatRemaining(automation.remainingMs)}\n` +
          `**Canal:** <#${automation.channelId}>\n` +
          `**Frequência:** ${automation.frequency}`,
        inline: false,
      }))
    : [{ name: 'Nenhuma automação registrada', value: 'A Kuromi ainda está acordando. Tente novamente em alguns segundos.' }];

  return new EmbedBuilder()
    .setColor('#8b5cf6')
    .setTitle('📅  ✦  Agenda da Kuromi')
    .setDescription('Próximas chamadas automáticas conhecidas. O bump é uma verificação; ele só publica se o canal precisar.')
    .addFields(fields)
    .setFooter({ text: 'Kuromi • organização impecável, drama inevitável' })
    .setTimestamp();
}

function buildUsage() {
  return '❌ Use `/agenda` ou `ku!agenda` em um servidor. Apenas administradores podem consultar a agenda.';
}

module.exports = {
  name: AGENDA,
  aliases: ['automacoes'],
  buildAgendaEmbed,
  data: new SlashCommandBuilder()
    .setName(AGENDA)
    .setDescription('Mostra os próximos disparos e verificações automáticas do bot.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async executePrefix({ message }) {
    if (!isManager(message)) return message.reply(buildUsage());
    await message.reply({ embeds: [buildAgendaEmbed(message.guild)] });
  },
  async executeSlash({ interaction }) {
    if (!isManager(interaction)) return interaction.editReply(buildUsage());
    await interaction.editReply({ embeds: [buildAgendaEmbed(interaction.guild)] });
  },
  automationDefaults: {
    bump: { channelId: BUMP_GUIDE_CHANNEL_ID, intervalMs: BUMP_GUIDE_INTERVAL_MS },
    tarot: { channelId: TAROT_CHANNEL_ID },
  },
};
