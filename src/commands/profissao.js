const { SlashCommandBuilder } = require('discord.js');
const professions = require('../services/professions');
const { getUserAccount, setProfession } = require('../services/economy');
const { formatCoins } = require('./economyHelpers');
const { PROFESSION } = require('./commandNames');

function getProfessionChoices() {
  return Object.entries(professions).map(([value, profession]) => ({ name: profession.label, value }));
}

function getReply(result, profession) {
  if (!result.changed && result.reason === 'same') return `❌ Você já é **${profession.label}**. Escolha uma crise diferente.`;
  if (!result.changed && result.reason === 'insufficient') return `❌ Trocar de profissão custa **${formatCoins(50)}**. Seu saldo é **${formatCoins(result.balance)}**. Ambição sem orçamento é só teatro.`;
  return result.charged === 0
    ? `✅ Sua profissão agora é **${profession.label}**. Essa escolha foi gratuita. Não se acostume.`
    : `✅ Sua profissão agora é **${profession.label}**. Foram cobradas **${formatCoins(50)}**. Pelo menos agora existe um plano.`;
}

function resolveProfession(value) {
  const normalized = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return professions[normalized] ? normalized : null;
}

async function execute(source, reply, value) {
  const key = resolveProfession(value);
  if (!key) return reply(`❌ Escolha uma profissão válida: ${Object.values(professions).map((item) => item.label).join(', ')}. Eu não vou transformar sua indecisão em carreira.`);
  const result = setProfession(source.user?.id || source.author.id, key);
  await reply(getReply(result, professions[key]));
}

module.exports = {
  name: PROFESSION,
  aliases: ['profissão'],
  resolveProfession,
  data: new SlashCommandBuilder()
    .setName(PROFESSION)
    .setDescription('Escolhe ou troca sua profissão.')
    .addStringOption((option) =>
      option.setName('profissao').setDescription('Profissão desejada').setRequired(true).addChoices(...getProfessionChoices())
    ),
  async executePrefix({ message, args }) {
    await execute(message, (content) => message.reply(content), args[0]);
  },
  async executeSlash({ interaction }) {
    await execute(interaction, (content) => interaction.editReply(content), interaction.options.getString('profissao'));
  },
};