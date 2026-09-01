const { EmbedBuilder } = require("discord.js");



// Barra de progresso de coração com base na porcentagem.
function buildHeartBar(percent, color) {
  const total = 10;
  const filled = Math.round((percent / 100) * total);
  const empty = total - filled;

  const heart = color === "yellow" ? "💛" : "💜";
  return heart.repeat(filled) + "🖤".repeat(empty);
}


// Junta os nomes dos dois usuários formando um nome de casal.
function buildShipName(nameA, nameB) {
  const half = (name) => {
    const clean = name.replace(/[^a-zA-ZÀ-ÿ]/g, "").toLowerCase();
    return clean.slice(0, Math.ceil(clean.length / 2));
  };
  const a = half(nameA);
  const b = half(nameB);
  if (!a && !b) return "Misterio";
  const shipName = (a + b).replace(/^\w/, (c) => c.toUpperCase());
  return shipName || "Misterio";
}

// Retorna a mensagem e cor do embed de acordo com a porcentagem.
function getShipVerdict(percent) {
  if (percent < 40) {
    return { message: "eca que nojo desses dois juntos 🤢", color: "#ef4444", emoji: "❤️" };
  }
  if (percent < 70) {
    return { message: "nossa... será? 🤔", color: "#f59e0b", emoji: "💛" };
  }
  return { message: "Se casem logo, affz... 💍", color: "#7c3aed", emoji: "💜" };
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

// Constroi o embed principal do ship.
function buildShipEmbed(memberA, memberB, percent) {
  const nameA = memberA.displayName;
  const nameB = memberB.displayName;
  const verdict = getShipVerdict(percent);
  const shipName = buildShipName(nameA, nameB);

  const bar = buildHeartBar(percent, verdict.color);

  return new EmbedBuilder()
    .setColor(verdict.color)
    .setTitle(`${verdict.emoji} Ship CRINGEEEEWWW`)
    .setDescription(
      `**${nameA}** x **${nameB}**\n\n` +
      `💑 Nome do casal: **${shipName}**\n\n` +
      `${bar}\n` +
      `**${percent}% de amor**\n\n` +
      `> *${verdict.message}*`
    )
    .setFooter({ text: "Kuromi • Ship CRINGEEEEWWW" })
    .setTimestamp();
}

// Executa o comando ship a partir de uma mensagem de texto (prefixo).
async function runShipPrefix(message) {
  const members = await message.guild.members.fetch().catch(() => null);
  if (!members) {
    await message.reply("❌ Nao consegui buscar os membros do servidor.");
    return;
  }

  const pair = pickTwoRandom(members);
  if (!pair) {
    await message.reply("❌ Precisamos de pelo menos 2 humanos no servidor para isso!");
    return;
  }

  const percent = Math.floor(Math.random() * 101);
  const embed = buildShipEmbed(pair[0], pair[1], percent);
  await message.reply({ embeds: [embed] });
}

// Executa o comando ship a partir de um slash command.
async function runShipInteraction(interaction) {
  await interaction.deferReply();

  const members = await interaction.guild.members.fetch().catch(() => null);
  if (!members) {
    await interaction.editReply("❌ Nao consegui buscar os membros do servidor.");
    return;
  }

  const pair = pickTwoRandom(members);
  if (!pair) {
    await interaction.editReply("❌ Precisamos de pelo menos 2 humanos no servidor para isso!");
    return;
  }

  const percent = Math.floor(Math.random() * 101);
  const embed = buildShipEmbed(pair[0], pair[1], percent);
  await interaction.editReply({ embeds: [embed] });
}

module.exports = {
  runShipPrefix,
  runShipInteraction,
};
