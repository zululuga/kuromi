const { SlashCommandBuilder } = require('discord.js');
const professions = require('../services/professions');
const { getUserAccount, setProfession } = require('../services/economy');
const { formatCoins } = require('./economyHelpers');
const { PROFESSION } = require('./commandNames');
const { t } = require('../utils/i18n');

function getProfessionChoices() {
  return Object.entries(professions).map(([value, profession]) => ({ name: profession.label, value }));
}

function getReply(result, professionKey, source = null) {
  const professionLabel = t(`profession.labels.${professionKey}`, source) || professions[professionKey]?.label || professionKey;
  if (!result.changed && result.reason === 'same') {
    return t('profession.sameProfession', source, { profession: professionLabel });
  }
  if (!result.changed && result.reason === 'insufficient') {
    return t('profession.switchCost', source, { cost: formatCoins(50, source), balance: formatCoins(result.balance, source) });
  }
  return result.charged === 0
    ? t('profession.freeSuccess', source, { profession: professionLabel })
    : t('profession.paidSuccess', source, { profession: professionLabel, cost: formatCoins(50, source) });
}

function resolveProfession(value) {
  const normalized = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return professions[normalized] ? normalized : null;
}

async function execute(source, reply, value) {
  const key = resolveProfession(value);
  if (!key) {
    const list = Object.keys(professions).map((k) => t(`profession.labels.${k}`, source) || professions[k].label).join(', ');
    return reply(t('profession.invalid', source, { list }));
  }
  const result = setProfession(source.user?.id || source.author.id, key);
  await reply(getReply(result, key, source));
}

module.exports = {
  name: PROFESSION,
  aliases: ['profissão', 'career', 'job', 'profession', 'profissao'],
  resolveProfession,
  data: new SlashCommandBuilder()
    .setName(PROFESSION)
    .setDescription('Choose or change your profession.')
    .setDescriptionLocalizations({
      'pt-BR': 'Escolhe ou troca sua profissão.',
    })
    .addStringOption((option) =>
      option
        .setName('profissao')
        .setNameLocalizations({
          'en-US': 'profession',
          'en-GB': 'profession',
          'pt-BR': 'profissao',
        })
        .setDescription('Desired profession / Profissão desejada')
        .setRequired(true)
        .addChoices(...getProfessionChoices())
    ),
  async executePrefix({ message, args }) {
    await execute(message, (content) => message.reply(content), args[0]);
  },
  async executeSlash({ interaction }) {
    const chosen = interaction.options.getString('profissao') || interaction.options.getString('profession');
    await execute(interaction, (content) => interaction.editReply(content), chosen);
  },
};