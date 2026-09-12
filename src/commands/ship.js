const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { SHIP } = require('./commandNames');
const { createShipAttachment } = require('../services/shipRenderer');
const { getCanvasStrings, getLanguage, t } = require('../utils/i18n');

// Junta os nomes dos dois usuários formando um nome de casal.
function buildShipName(nameA, nameB) {
  const half = (name) => {
    const clean = name.replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase();
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
function getShipVerdict(percent, isSpecial = false, lang = 'pt') {
  const langKey = getLanguage(lang);
  const cStrs = getCanvasStrings(langKey).ship;

  if (isSpecial) {
    return {
      message: cStrs.verdictSpecial,
      color: '#E60067',
      emoji: '💖',
      isSpecial: true,
    };
  }
  if (percent < 40) {
    return { message: cStrs.verdictLow, color: '#F43F5E', emoji: '💔' };
  }
  if (percent < 70) {
    return { message: cStrs.verdictMid, color: '#EC4899', emoji: '💖' };
  }
  return { message: cStrs.verdictHigh, color: '#8B5CF6', emoji: '💜' };
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
function buildShipEmbed(memberA, memberB, percent, lang = 'pt') {
  const langKey = getLanguage(lang);
  const nameA = memberA.displayName;
  const nameB = memberB.displayName;
  const guildName = memberA.guild?.name || (langKey === 'en' ? 'Server' : 'Servidor');
  const isSpecial = isSpecialCouple(memberA, memberB);
  const verdict = getShipVerdict(percent, isSpecial, langKey);
  const shipName = buildShipName(nameA, nameB);

  const embed = new EmbedBuilder()
    .setColor(verdict.color)
    .setImage('attachment://casal_cringelandia.png')
    .setTimestamp();

  if (isSpecial) {
    const desc = [
      `**${nameA}**  ✦  **${nameB}**`,
      '',
      t('ship.specialCoupleName', lang),
      `> 💖 **${shipName}**`,
      '',
      t('ship.specialCompatibility', lang),
      `> ✧ ✦ 💖 **${verdict.message}** 💖 ✦ ✧`,
    ].join('\n');

    embed
      .setTitle(t('ship.eternalTitle', lang, { guild: guildName }))
      .setDescription(desc)
      .setFooter({ text: 'Pyxie' });
  } else {
    const desc = [
      `**${nameA}**  x  **${nameB}**`,
      '',
      t('ship.coupleName', lang),
      `> 🌸 **${shipName}**`,
      '',
      t('ship.compatibility', lang, { percent }),
      `> *${verdict.message}*`,
    ].join('\n');

    embed
      .setTitle(t('ship.normalTitle', lang, { emoji: verdict.emoji, guild: guildName }))
      .setDescription(desc)
      .setFooter({ text: 'Pyxie' });
  }

  return embed;
}

function getSelectedUsers(source) {
  if (source.options) {
    return [
      source.options.getUser('pessoa1') || source.options.getUser('person1'),
      source.options.getUser('pessoa2') || source.options.getUser('person2'),
    ].filter(Boolean);
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

function getSelectionError(error, source = null) {
  if (error.message === 'selection_count') return t('ship.countError', source);
  if (error.message === 'bot') return t('ship.botError', source);
  if (error.message === 'same_user') return t('ship.sameUserError', source);
  if (error.message === 'not_member') return t('ship.notMemberError', source);
  return t('ship.genericError', source);
}

// Executa o comando ship a partir de uma mensagem de texto (prefixo).
async function runShip(source, reply) {
  let selectedMembers;
  try {
    selectedMembers = await resolveSelectedMembers(source);
  } catch (error) {
    await reply(getSelectionError(error, source));
    return;
  }

  let pair = selectedMembers;
  if (!pair) {
    const members = await source.guild.members.fetch().catch(() => null);
    if (!members) {
      await reply(t('ship.fetchError', source));
      return;
    }
    pair = pickTwoRandom(members);
  }
  if (!pair) {
    await reply(t('ship.twoMembersNeeded', source));
    return;
  }

  const isSpecial = isSpecialCouple(pair[0], pair[1]);
  const percent = isSpecial ? 100 : Math.floor(Math.random() * 101);
  const attachment = await createShipAttachment(pair[0], pair[1], percent, source);
  const embed = buildShipEmbed(pair[0], pair[1], percent, source);
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
    .setDescription('Calculate love affinity between two users or draw a random couple.')
    .setDescriptionLocalizations({
      'pt-BR': 'Junta duas pessoas ou sorteia um casal e calcula a porcentagem de amor.',
    })
    .addUserOption((option) =>
      option
        .setName('pessoa1')
        .setNameLocalizations({
          'en-US': 'person1',
          'en-GB': 'person1',
          'pt-BR': 'pessoa1',
        })
        .setDescription('First person of the couple / Primeira pessoa')
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName('pessoa2')
        .setNameLocalizations({
          'en-US': 'person2',
          'en-GB': 'person2',
          'pt-BR': 'pessoa2',
        })
        .setDescription('Second person of the couple / Segunda pessoa')
        .setRequired(false)
    ),
  runShipPrefix,
  runShipInteraction,
  executePrefix: ({ message }) => runShipPrefix(message),
  executeSlash: ({ interaction }) => runShipInteraction(interaction),
  buildShipEmbed,
  buildShipName,
  getShipVerdict,
  getSelectedUsers,
  getSelectionError,
};
