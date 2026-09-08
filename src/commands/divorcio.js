const { SlashCommandBuilder } = require('discord.js');
const { getBalance, spendCoins } = require('../services/economy');
const { endMarriage, getSpouseId } = require('../services/marriage');
const { formatCoins } = require('./economyHelpers');
const { DIVORCE } = require('./commandNames');

const DIVORCE_COST = 500;

async function executeDivorce(source, reply) {
  const user = source.user || source.author;
  const spouseId = getSpouseId(user.id);
  if (!spouseId) {
    await reply('❌ Você não está casado(a). E eu não vou inventar um relacionamento para você, por mais dramático que seja.');
    return;
  }

  if (getBalance(user.id) < DIVORCE_COST) {
    await reply(`❌ O divórcio custa **${formatCoins(DIVORCE_COST)}**. Seu saldo é **${formatCoins(getBalance(user.id))}**. Até terminar exige planejamento.`);
    return;
  }

  const payment = spendCoins(user.id, DIVORCE_COST);
  if (!payment.spent) {
    await reply(`❌ Você precisa de **${formatCoins(DIVORCE_COST)}** para se divorciar. A tragédia não é gratuita.`);
    return;
  }

  endMarriage(user.id);
  await reply(`💔 Divórcio concluído. Foram cobradas **${formatCoins(DIVORCE_COST)}**. Respire. Não faça uma cena... ainda.`);
}

module.exports = {
  name: DIVORCE,
  DIVORCE_COST,
  data: new SlashCommandBuilder()
    .setName(DIVORCE)
    .setDescription('Encerra seu casamento por 500 Moedinhas. O drama tem taxa administrativa.'),
  async executePrefix({ message }) {
    await executeDivorce(message, (content) => message.reply(content));
  },
  async executeSlash({ interaction }) {
    await executeDivorce(interaction, (content) => interaction.editReply(content));
  },
};