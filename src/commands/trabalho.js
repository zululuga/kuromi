const { SlashCommandBuilder } = require('discord.js');
const professions = require('../services/professions');
const {
  finishWork,
  getUserAccount,
  getWorkStatus,
  startWork,
} = require('../services/economy');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { WORK } = require('./commandNames');

const WORK_MINIMUM = 5;
const WORK_MAXIMUM = 50;
const ANSWER_TIME_MS = 60 * 1000;

function normalizeWord(word) {
  return String(word || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function pickWords(words) {
  const available = [...new Set(words)];
  const selected = [];
  while (selected.length < 5) {
    const index = Math.floor(Math.random() * available.length);
    selected.push(available.splice(index, 1)[0]);
  }
  return selected;
}

function isCorrectAnswer(content, expectedWords) {
  const answer = String(content || '').trim().split(/\s+/).filter(Boolean).map(normalizeWord).sort();
  const expected = expectedWords.map(normalizeWord).sort();
  return answer.length === 5 && answer.every((word, index) => word === expected[index]);
}

function randomSalary() {
  return Math.floor(Math.random() * (WORK_MAXIMUM - WORK_MINIMUM + 1)) + WORK_MINIMUM;
}

async function runWork(source, reply, channel) {
  const user = source.user || source.author;
  const account = getUserAccount(user.id);
  if (!account.profession || !professions[account.profession]) {
    await reply('❌ Escolha uma profissão primeiro com `/profissao`. Até a Kuromi precisa de um mínimo de planejamento.');
    return;
  }

  const status = getWorkStatus(user.id);
  if (!status.available) {
    await reply(`⏳ Você já trabalhou. Tente novamente em **${formatRemaining(status.remainingMs)}**; não transforme sua exploração em expediente infinito.`);
    return;
  }

  const selectedWords = pickWords(professions[account.profession].words);
  startWork(user.id, selectedWords);
  await reply(
    `💼 Trabalho de **${professions[account.profession].label}** iniciado.\n` +
      `Envie estas 5 palavras em uma única mensagem, em até 1 minuto. Eu escolhi palavras fáceis; não estrague isso:\n**${selectedWords.join(' • ')}**`
  );

  if (!channel?.awaitMessages) return;
  const collected = await channel.awaitMessages({
    filter: (message) => message.author.id === user.id,
    max: 1,
    time: ANSWER_TIME_MS,
    errors: ['time'],
  }).catch(() => null);
  const answerMessage = collected?.first();
  if (!answerMessage) {
    await reply('⌛ Tempo esgotado. Você não recebeu salário e poderá trabalhar novamente em 3 horas. Eu avisei, mas claro que ninguém ouve a Kuromi.');
    return;
  }

  if (!isCorrectAnswer(answerMessage.content, selectedWords)) {
    await reply('❌ Uma ou mais palavras estão erradas. Você não recebeu salário e poderá tentar novamente em 3 horas. Isso foi quase impressionante.');
    return;
  }

  const salary = randomSalary();
  const result = finishWork(user.id, true, salary);
  await reply(`✅ Trabalho concluído. Você recebeu **${formatCoins(result.amount)}**. Saldo: **${formatCoins(result.balance)}**. Não foi inútil, afinal.`);
}

module.exports = {
  name: WORK,
  pickWords,
  isCorrectAnswer,
  data: new SlashCommandBuilder().setName(WORK).setDescription('Trabalha usando sua profissão e recebe de 5 a 50 Moedinhas.'),
  async executePrefix({ message }) {
    await runWork(message, (content) => message.reply(content), message.channel);
  },
  async executeSlash({ interaction }) {
    await runWork(interaction, (content) => interaction.editReply(content), interaction.channel);
  },
};