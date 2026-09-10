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

const SPECIAL_COUPLE_IDS = new Set(['214153735281180673', '1463644930080637140']);

function isSpecialCouple(memberA, memberB) {
  const idA = memberA?.id || memberA?.user?.id;
  const idB = memberB?.id || memberB?.user?.id;
  return SPECIAL_COUPLE_IDS.has(idA) && SPECIAL_COUPLE_IDS.has(idB) && idA !== idB;
}

// Retorna a mensagem e cor do embed de acordo com a porcentagem.
function getShipVerdict(percent, isSpecial = false) {
  if (isSpecial) {
    return {
      message: 'Esses usuários se amam mais do que qualquer coisa no mundo.',
      color: '#E60067',
      emoji: '💖',
      isSpecial: true,
    };
  }
  if (percent < 40) {
    return { message: 'Química duvidosa, mas o drama está garantido.', color: '#F43F5E', emoji: '💔' };
  }
  if (percent < 70) {
    return { message: 'Há faísca. Talvez. Não me pressionem.', color: '#EC4899', emoji: '💖' };
  }
  return { message: 'Isso está perigosamente romântico.', color: '#8B5CF6', emoji: '💜' };
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
  const guildName = memberA.guild?.name || 'Servidor';
  const isSpecial = isSpecialCouple(memberA, memberB);
  const verdict = getShipVerdict(percent, isSpecial);
  const shipName = buildShipName(nameA, nameB);

  const embed = new EmbedBuilder()
    .setColor(verdict.color)
    .setImage('attachment://casal_cringelandia.png')
    .setTimestamp();

  if (isSpecial) {
    const desc = [
      `**${nameA}**  ✦  **${nameB}**`,
      '',
      '💍 **NOME DO CASAL**',
      `> 💖 **${shipName}**`,
      '',
      '✨ **COMPATIBILIDADE: 100% DE AMOR ABSOLUTO**',
      `> ✧ ✦ 💖 **${verdict.message}** 💖 ✦ ✧`,
    ].join('\n');

    embed
      .setTitle(`💖  ✦  Ship Eterno — ${guildName}  ✦  💖`)
      .setDescription(desc)
      .setFooter({ text: `${guildName} • Conexão predestinada e inabalável` });
  } else {
    const desc = [
      `**${nameA}**  x  **${nameB}**`,
      '',
      '💑 **NOME DO CASAL**',
      `> 🌸 **${shipName}**`,
      '',
      `📊 **COMPATIBILIDADE: ${percent}% DE AFINIDADE**`,
      `> *${verdict.message}*`,
    ].join('\n');

    embed
      .setTitle(`${verdict.emoji}  ✦  Ship — ${guildName}`)
      .setDescription(desc)
      .setFooter({ text: `${guildName} • Compatibilidade de Membros` });
  }

  return embed;
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
  if (error.message === 'selection_count') return '❌ Escolha exatamente duas pessoas ou deixe o comando sem menções para sortear.';
  if (error.message === 'bot') return '❌ Bots não podem entrar no sorteio de casal.';
  if (error.message === 'same_user') return '❌ A mesma pessoa duas vezes não forma um casal.';
  if (error.message === 'not_member') return '❌ Só é possível juntar pessoas que estejam neste servidor.';
  return '❌ Não foi possível preparar esse casal agora. Tente novamente.';
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
      await reply('❌ Não foi possível buscar os membros do servidor no momento.');
      return;
    }
    pair = pickTwoRandom(members);
  }
  if (!pair) {
    await reply('❌ São necessários pelo menos 2 membros no servidor para realizar o sorteio.');
    return;
  }

  const isSpecial = isSpecialCouple(pair[0], pair[1]);
  const percent = isSpecial ? 100 : Math.floor(Math.random() * 101);
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
