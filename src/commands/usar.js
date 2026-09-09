const { SlashCommandBuilder } = require('discord.js');
const { useItemOnActivePet, getActivePet } = require('../services/pets');
const { getAllItems } = require('../services/inventory');
const { USE } = require('./commandNames');

function getItemChoices() {
  return getAllItems()
    .slice(0, 25)
    .map((item) => ({
      name: `${item.emoji} ${item.name}`,
      value: item.id,
    }));
}

function buildReply(result) {
  if (!result.success) {
    if (result.reason === 'no_pet') {
      return '❌ Você não possui nenhum pet ativo para receber este item! Adote um usando `/adocao`.';
    }
    if (result.reason === 'no_item') {
      return '❌ Você não possui este item na sua mochila. Compre na `/loja` ou obtenha em `/petexplorar`.';
    }
    return '❌ Item inválido ou não utilizável diretamente.';
  }

  let levelMsg = '';
  if (result.leveledUp) {
    levelMsg = `\n🎉 **LEVEL UP!** Seu pet subiu para o **Nível ${result.newLevel}**!`;
  }

  if (result.applied === 'expansion') {
    return `🏠 Você usou **${result.item.name}**! Seu limite de pets na mochila agora é de **${result.newMaxSlots} slots**!`;
  }

  const effectsText = result.effectsSummary ? `\n📊 **Efeitos:** ${result.effectsSummary}` : '';
  const statusText = result.statusSummary ? `\n🐾 **Status atual de ${result.pet?.name}:** ${result.statusSummary}` : '';

  return `✨ Você utilizou **${result.item ? result.item.emoji : '📦'} ${result.item ? result.item.name : 'item'}** no seu pet **${result.pet?.name}**!${effectsText}${statusText}${levelMsg}\nUse \`/pet\` para conferir o cartão atualizado.`;
}

module.exports = {
  name: USE,
  aliases: ['use', 'consumir'],
  data: new SlashCommandBuilder()
    .setName(USE)
    .setDescription('Utiliza um item da sua mochila no seu pet ativo')
    .addStringOption((opt) =>
      opt
        .setName('item')
        .setDescription('Item a ser utilizado')
        .setRequired(true)
        .addChoices(...getItemChoices())
    ),
  async executePrefix({ message, args }) {
    if (!args[0]) {
      await message.reply('❌ Informe o item que deseja usar. Exemplo: `ku!usar racao_cringe`. Use `ku!inventario` para ver sua mochila.');
      return;
    }
    const itemId = args[0].toLowerCase();
    await message.reply(buildReply(useItemOnActivePet(message.author.id, itemId)));
  },
  async executeSlash({ interaction }) {
    const itemId = interaction.options.getString('item');
    await interaction.editReply(buildReply(useItemOnActivePet(interaction.user.id, itemId)));
  },
};

