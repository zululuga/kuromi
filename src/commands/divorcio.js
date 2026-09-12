const { SlashCommandBuilder } = require('discord.js');
const { getBalance, spendCoins } = require('../services/economy');
const { endMarriage, getSpouseId } = require('../services/marriage');
const { DIVORCE } = require('./commandNames');
const { formatCoins, t } = require('../utils/i18n');

const DIVORCE_COST = 500;

async function executeDivorce(source, reply) {
  const user = source.user || source.author;
  const spouseId = getSpouseId(user.id);
  if (!spouseId) {
    await reply(t('divorce.notMarried', source));
    return;
  }

  if (getBalance(user.id) < DIVORCE_COST) {
    await reply(t('divorce.insufficientCoins', source, {
      cost: formatCoins(DIVORCE_COST, source),
      balance: formatCoins(getBalance(user.id), source),
    }));
    return;
  }

  const payment = spendCoins(user.id, DIVORCE_COST);
  if (!payment.spent) {
    await reply(t('divorce.insufficientCoins', source, {
      cost: formatCoins(DIVORCE_COST, source),
      balance: formatCoins(getBalance(user.id), source),
    }));
    return;
  }

  endMarriage(user.id);
  await reply(t('divorce.success', source, { cost: formatCoins(DIVORCE_COST, source) }));
}

module.exports = {
  name: DIVORCE,
  aliases: ['divorcio', 'divorce', 'separar'],
  DIVORCE_COST,
  data: new SlashCommandBuilder()
    .setName(DIVORCE)
    .setDescription('End marriage for 500 coins.')
    .setDescriptionLocalizations({
      'pt-BR': 'Encerra seu casamento por 500 Moedinhas.',
    }),
  async executePrefix({ message }) {
    await executeDivorce(message, (content) => message.reply(content));
  },
  async executeSlash({ interaction }) {
    await executeDivorce(interaction, (content) => interaction.editReply(content));
  },
};