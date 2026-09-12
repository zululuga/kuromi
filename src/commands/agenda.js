const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { BUMP_GUIDE_CHANNEL_ID, BUMP_GUIDE_INTERVAL_MS, TAROT_CHANNEL_ID } = require('../config');
const { getAutomationSchedule } = require('../services/automationSchedule');
const { AGENDA } = require('./commandNames');
const { getAnimatedEmoji } = require('../utils/serverEmojis');
const { getLanguage, t } = require('../utils/i18n');

function isManager(source) {
  return source.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function formatDate(timestamp, lang = 'pt') {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', {
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

function buildAgendaEmbed(guild, now = Date.now(), source = null) {
  const schedule = getAutomationSchedule(now);
  const guildName = guild?.name || '';
  const lang = getLanguage(source || guild);

  const autoLines = schedule.length
    ? schedule.map((automation) => {
        const emoji = getAnimatedEmoji(guild, [automation.id, 'calendar', 'clock'], automation.emoji);
        const nextLabel = lang === 'en' ? `Next ${automation.action}:` : `Próxima ${automation.action}:`;
        const timeLabel = lang === 'en' ? 'Time:' : 'Horário:';
        const leftLabel = lang === 'en' ? 'Time Left:' : 'Tempo Restante:';
        const channelLabel = lang === 'en' ? 'Channel:' : 'Canal:';
        const freqLabel = lang === 'en' ? 'Frequency:' : 'Frequência:';
        return [
          `**${emoji} ${automation.name}**`,
          `> ⏰ **${nextLabel}** <t:${Math.floor(automation.nextAt / 1000)}:F>`,
          `> 📅 **${timeLabel}** ${formatDate(automation.nextAt, lang)} (Brasília)`,
          `> ⏳ **${leftLabel}** ${formatRemaining(automation.remainingMs)}`,
          `> 📢 **${channelLabel}** <#${automation.channelId}>`,
          `> 🔁 **${freqLabel}** ${automation.frequency}`,
        ].join('\n');
      })
    : [lang === 'en' ? '> *No automations currently scheduled.*' : '> *Nenhuma automação programada no momento.*'];

  const desc = [
    t('admin.agendaDesc', source || guild),
    '',
    autoLines.join('\n\n'),
  ].join('\n');

  return new EmbedBuilder()
    .setColor('#8b5cf6')
    .setTitle(t('admin.agendaTitle', source || guild, { server: guildName ? ` — ${guildName}` : '' }))
    .setDescription(desc)
    .setFooter({ text: `${guildName ? `${guildName} • ` : ''}${lang === 'en' ? 'Schedule & Reminders' : 'Cronograma e Lembretes'}` })
    .setTimestamp();
}

function buildUsage(source = null) {
  return t('admin.noPermission', source);
}

module.exports = {
  name: AGENDA,
  aliases: ['automacoes', 'schedule'],
  buildAgendaEmbed,
  data: new SlashCommandBuilder()
    .setName(AGENDA)
    .setDescription('Shows upcoming scheduled automations and tasks.')
    .setDescriptionLocalizations({
      'pt-BR': 'Mostra os próximos disparos e verificações automáticas do bot.',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async executePrefix({ message }) {
    if (!isManager(message)) return message.reply(buildUsage(message));
    await message.reply({ embeds: [buildAgendaEmbed(message.guild, Date.now(), message)] });
  },
  async executeSlash({ interaction }) {
    if (!isManager(interaction)) return interaction.editReply(buildUsage(interaction));
    await interaction.editReply({ embeds: [buildAgendaEmbed(interaction.guild, Date.now(), interaction)] });
  },
  automationDefaults: {
    bump: { channelId: BUMP_GUIDE_CHANNEL_ID, intervalMs: BUMP_GUIDE_INTERVAL_MS },
    tarot: { channelId: TAROT_CHANNEL_ID },
  },
};
