const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { SHIP } = require('./commandNames');
const { createShipAttachment } = require('../services/shipRenderer');


// Junta os nomes dos dois usuários formando um nome de casal.
function buildShipName(nameA, nameB) {
  const half = (name) => {
    const clean = name.replace(/[^a-zA-ZÀ-ÿ]/g, "").toLowerCase();
    return clean.slice(0, Math.ceil(clean.length / 2));
  };
  const a = half(nameA);
  const b = half(nameB);
  if (!a && !b) return 'Mistério';
  const shipName = (a + b).replace(/^\w/, (c) => c.toUpperCase());
  return shipName || 'Mistério';
}

// Retorna a mensagem e cor do embed de acordo com a porcentagem.
function getShipVerdict(percent) {
  if (percent < 40) {
    return { message: 'química duvidosa, mas o drama está garantido', color: '#E60067', emoji: '💔' };
  }
  if (percent < 70) {
    return { message: 'há faísca. Talvez. Não me pressionem.', color: '#F59E0B', emoji: '✦' };
  }
  return { message: 'isso está perigosamente romântico', color: '#8B5CF6', emoji: '💜' };
}


// Seleciona dois membros aleatórios do servidor (sem bots).
function pickTwoRandom(members) {
  const humans = members.filter((m) => !m.user.bot);
  if (humans.size < 2) return null;

  const arr = [...humans.values()];
  const idxA = Math.floor(Math.random() * arr.length);
  let idxB;
  do {
    idxB = Math.floor(Math.random() * arr.length);
  } while (idxB === idxA);

  return [arr[idxA], arr[idxB]];
}

// Constrói o embed principal do ship.
function buildShipEmbed(memberA, memberB, percent) {
  const nameA = memberA.displayName;
  const nameB = memberB.displayName;
  const verdict = getShipVerdict(percent);
  const shipName = buildShipName(nameA, nameB);

  return new EmbedBuilder()
    .setColor(verdict.color)
    .setTitle(`${verdict.emoji}  ✦  Casal da Cringelândia`)
    .setDescription(
      `**${nameA}** x **${nameB}**\n\n` +
      `💑 Nome do casal: **${shipName}**\n\n` +
      `**${percent}% de amor**\n\n` +
      `> *${verdict.message}*`
    )
    .setImage('attachment://casal_cringelandia.png')
    .setFooter({ text: 'Cringelândia • Kuromi juntou, Kuromi supervisiona' })
    .setTimestamp();
}

function getSelectedUsers(source) {
  if (source.options) {
    return [source.options.getUser('pessoa1'), source.options.getUser('pessoa2')].filter(Boolean);
  }
  return [...source.mentions.users.values()];
}

async function resolveSelectedMembers(source) {
  const users = getSelectedUsers(source);
  if (users.length === 0) return null;
  if (users.length !== 2) throw new Error('selection_count');
  if (users.some((user) => user.bot)) throw new Error('bot');
  if (users[0].id === users[1].id) throw new Error('same_user');

  const members = await Promise.all(users.map((user) => source.guild.members.fetch(user.id).catch(() => null)));
  if (members.some((member) => !member)) throw new Error('not_member');
  return members;
}

function getSelectionError(error) {
  if (error.message === 'selection_count') return '❌ Escolha exatamente duas pessoas ou deixe o comando sem menções para eu sortear. Não complique o romance.';
  if (error.message === 'bot') return '❌ Bots não entram no casal. Até a Kuromi tem algum critério.';
  if (error.message === 'same_user') return '❌ A mesma pessoa duas vezes não é casal. Isso é um monólogo romântico.';
  if (error.message === 'not_member') return '❌ Só posso juntar pessoas que estejam neste servidor. A Kuromi ainda não domina dimensões.';
  return '❌ Não consegui preparar esse casal agora. O drama técnico venceu por alguns segundos.';
}

// Executa o comando ship a partir de uma mensagem de texto (prefixo).
async function runShip(source, reply) {
  let selectedMembers;
  try {
    selectedMembers = await resolveSelectedMembers(source);
  } catch (error) {
    await reply(getSelectionError(error));
    return;
  }

  let pair = selectedMembers;
  if (!pair) {
    const members = await source.guild.members.fetch().catch(() => null);
    if (!members) {
      await reply('❌ Não consegui buscar os membros do servidor. Até a Kuromi tem limites, aparentemente.');
      return;
    }
    pair = pickTwoRandom(members);
  }
  if (!pair) {
    await reply('❌ Precisamos de pelo menos 2 humanos no servidor para isso. Romance solitário é outro comando.');
    return;
  }

  const percent = Math.floor(Math.random() * 101);
  const attachment = await createShipAttachment(pair[0], pair[1], percent);
  const embed = buildShipEmbed(pair[0], pair[1], percent);
  await reply({ embeds: [embed], files: [attachment] });
}

async function runShipPrefix(message) {
  await runShip(message, (content) => message.reply(content));
}

// Executa o comando ship a partir de um slash command.
async function runShipInteraction(interaction) {
  await runShip(interaction, (content) => interaction.editReply(content));
}

module.exports = {
  name: SHIP,
  aliases: ['ship'],
  data: new SlashCommandBuilder()
    .setName(SHIP)
    .setDescription('Junta duas pessoas ou sorteia um casal e calcula a porcentagem de amor.')
    .addUserOption((option) => option.setName('pessoa1').setDescription('Primeira pessoa do casal').setRequired(false))
    .addUserOption((option) => option.setName('pessoa2').setDescription('Segunda pessoa do casal').setRequired(false)),
  runShipPrefix,
  runShipInteraction,
  executePrefix: ({ message }) => runShipPrefix(message),
  executeSlash: ({ interaction }) => runShipInteraction(interaction),
  buildShipEmbed,
  buildShipName,
  getShipVerdict,
  getSelectedUsers,
};
