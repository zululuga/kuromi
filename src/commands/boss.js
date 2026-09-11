const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { getWorldBoss, attackWorldBoss, getBossRanking } = require('../services/worldBoss');
const { getActivePet } = require('../services/pets');
const { formatCoins } = require('./economyHelpers');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function createHealthBar(current, max, size = 12) {
  const percentage = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(size * percentage);
  const empty = size - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function buildBossStatusEmbed(boss) {
  const isDefeated = boss.status === 'defeated';
  const hpBar = createHealthBar(boss.currentHp, boss.maxHp);
  const hpPercent = Math.round((boss.currentHp / boss.maxHp) * 100);

  const topDamagers = getBossRanking(5);
  const rankingText = topDamagers.length > 0
    ? topDamagers.map((t, idx) => `> **#${idx + 1}** <@${t.userId}> (${t.petName}): **${t.damage.toLocaleString('pt-BR')} dano**`).join('\n')
    : '> 🕊️ *Nenhum ataque registrado ainda. Seja o primeiro!*';

  const desc = [
    `Um titã colossal surgiu no reino emanando uma **${boss.aura}**!`,
    '',
    '👑 **INFORMAÇÕES DO CHEFE MUNDIAL:**',
    `> 👾 **Nome:** **${boss.emoji} ${boss.name}**`,
    `> 🌀 **Elemento:** \`${boss.element}\``,
    `> ⚡ **Nível:** \`${boss.level}\``,
    `> ❤️ **Vida:** **${boss.currentHp.toLocaleString('pt-BR')} / ${boss.maxHp.toLocaleString('pt-BR')}** (${hpPercent}%)`,
    `> [ \`${hpBar}\` ]`,
    '',
    '🏆 **MAIORES CAUSADORES DE DANO (TOP 5):**',
    rankingText,
    '',
    '🎁 **RECOMPENSAS DE VITÓRIA:**',
    '> 👑 **TOP 1 (MVP):** Recebe o próprio **Pymon versão ALPHA (🔴 Aura Avermelhada)** + 3 🌱 Feijões + 3.000 🪙',
    '> ⚔️ **Todos os Participantes:** 1 🌱 Feijão Mágico + 1.000 🪙 + XP proporcional!',
    '',
    isDefeated
      ? '🎉 **ESTE CHEFE JÁ FOI DERROTADO!** O próximo titã despertará em breve.'
      : 'Clique no botão vermelho abaixo para atacar com seu Pymon ativo (Cooldown: 10m):',
  ].join('\n');

  return new EmbedBuilder()
    .setColor(isDefeated ? PYXIE_COLORS.green || '#22c55e' : '#dc2626')
    .setTitle(`🐉  ✦  World Boss Semanal — ${boss.name}`)
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Ataque conjunto por todos os servidores!') })
    .setTimestamp();
}

function buildBossComponents(boss) {
  const isDefeated = boss.status === 'defeated';
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('boss_attack')
        .setLabel('⚔️ Atacar Boss ALPHA')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(isDefeated),
      new ButtonBuilder()
        .setCustomId('boss_ranking')
        .setLabel('🏆 Ranking Completo')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('boss_status')
        .setLabel('🔄 Atualizar')
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function isBossInteraction(interaction) {
  return typeof interaction.customId === 'string' && (
    interaction.customId === 'boss_attack' ||
    interaction.customId === 'boss_ranking' ||
    interaction.customId === 'boss_status'
  );
}

async function handleBossInteraction(interaction) {
  const action = interaction.customId;

  if (action === 'boss_status') {
    const boss = getWorldBoss();
    const embed = buildBossStatusEmbed(boss);
    const components = buildBossComponents(boss);
    return interaction.update({ embeds: [embed], components });
  }

  if (action === 'boss_ranking') {
    const top = getBossRanking(10);
    const boss = getWorldBoss();
    const text = top.length > 0
      ? top.map((t, idx) => `> **#${idx + 1}** <@${t.userId}> (${t.petName}): **${t.damage.toLocaleString('pt-BR')} dano** (${t.hits} ataques)`).join('\n')
      : '> 🕊️ *Nenhum golpe registrado ainda.*';

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.gold || '#facc15')
      .setTitle(`🏆  ✦  Ranking de Dano — ${boss.name}`)
      .setDescription(`Confira a classificação dos maiores guerreiros contra o titã:\n\n${text}`)
      .setFooter({ text: pyxieFooter('O #1 receberá a versão ALPHA ao final') })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
  }

  if (action === 'boss_attack') {
    const result = attackWorldBoss(interaction.user.id);
    if (!result.success) {
      return interaction.reply({ content: `❌ ${result.message}`, flags: 64 });
    }

    let effectMsg = '';
    if (result.isSuperEffective) effectMsg = '✨ **SUPER EFICAZ (+35% de Dano Elemental)!**';
    if (result.isWeak) effectMsg = '🛡️ *Pouco eficaz contra o elemento do Boss (-25% Dano).*';
    if (result.isCrit) effectMsg += ' 💥 **GOLPE CRÍTICO (1.5x)!**';

    const desc = [
      `Seu Pymon avançou com coragem e desferiu um ataque devastador contra **${result.bossEmoji} ${result.bossName}**!`,
      '',
      '💥 **RELATÓRIO DO GOLPE:**',
      `> ⚔️ **Dano Causado:** **${result.damage.toLocaleString('pt-BR')}**`,
      effectMsg ? `> ${effectMsg}` : '',
      `> ❤️ **Vida Restante do Boss:** **${result.remainingHp.toLocaleString('pt-BR')} / ${result.maxHp.toLocaleString('pt-BR')}**`,
      '',
      result.bossDefeated ? `🎉 **O TITÃ FOI DERROTADO!** O maior causador de dano (<@${result.mvpUserId}>) recebeu o Pymon na versão ALPHA!` : '⏳ *Aguarde 10 minutos para atacar novamente.*',
    ].filter(Boolean).join('\n');

    const attackEmbed = new EmbedBuilder()
      .setColor(result.bossDefeated ? PYXIE_COLORS.green || '#22c55e' : '#dc2626')
      .setTitle('⚔️  ✦  Ataque Realizado no World Boss!')
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Dano contabilizado no placar global') })
      .setTimestamp();

    return interaction.reply({ embeds: [attackEmbed], flags: 64 });
  }
}

module.exports = {
  name: 'boss',
  aliases: ['worldboss', 'tita', 'chefe'],
  isBossInteraction,
  handleBossInteraction,
  data: new SlashCommandBuilder()
    .setName('boss')
    .setDescription('Enfrente o World Boss Semanal ALPHA junto com todos os servidores!')
    .addSubcommand((sub) => sub.setName('status').setDescription('Exibe o status do World Boss ALPHA atual e placar'))
    .addSubcommand((sub) => sub.setName('atacar').setDescription('Desfere um ataque no World Boss com seu Pymon ativo'))
    .addSubcommand((sub) => sub.setName('ranking').setDescription('Exibe os maiores causadores de dano')),
  async executeSlash({ interaction }) {
    const sub = interaction.options.getSubcommand() || 'status';

    if (sub === 'atacar') {
      const result = attackWorldBoss(interaction.user.id);
      if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.message}` });
      }

      let effectMsg = '';
      if (result.isSuperEffective) effectMsg = '✨ **SUPER EFICAZ (+35% de Dano Elemental)!**';
      if (result.isWeak) effectMsg = '🛡️ *Pouco eficaz contra o elemento do Boss (-25% Dano).*';
      if (result.isCrit) effectMsg += ' 💥 **GOLPE CRÍTICO (1.5x)!**';

      const desc = [
        `Seu Pymon avançou com bravura e atacou **${result.bossEmoji} ${result.bossName}**!`,
        '',
        '💥 **RELATÓRIO DO GOLPE:**',
        `> ⚔️ **Dano Causado:** **${result.damage.toLocaleString('pt-BR')}**`,
        effectMsg ? `> ${effectMsg}` : '',
        `> ❤️ **Vida Restante do Boss:** **${result.remainingHp.toLocaleString('pt-BR')} / ${result.maxHp.toLocaleString('pt-BR')}**`,
        '',
        result.bossDefeated ? `🎉 **O TITÃ FOI DERROTADO!** O maior causador de dano (<@${result.mvpUserId}>) recebeu o Pymon na versão ALPHA!` : '⏳ *Aguarde 10 minutos para atacar novamente.*',
      ].filter(Boolean).join('\n');

      const embed = new EmbedBuilder()
        .setColor(result.bossDefeated ? PYXIE_COLORS.green || '#22c55e' : '#dc2626')
        .setTitle('⚔️  ✦  Ataque ao World Boss!')
        .setDescription(desc)
        .setFooter({ text: pyxieFooter('Contabilizado no ranking') })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'ranking') {
      const top = getBossRanking(10);
      const boss = getWorldBoss();
      const text = top.length > 0
        ? top.map((t, idx) => `> **#${idx + 1}** <@${t.userId}> (${t.petName}): **${t.damage.toLocaleString('pt-BR')} dano** (${t.hits} ataques)`).join('\n')
        : '> 🕊️ *Nenhum golpe registrado ainda.*';

      const embed = new EmbedBuilder()
        .setColor(PYXIE_COLORS.gold || '#facc15')
        .setTitle(`🏆  ✦  Ranking de Dano — ${boss.name}`)
        .setDescription(`Classificação dos maiores guerreiros contra o titã:\n\n${text}`)
        .setFooter({ text: pyxieFooter('O #1 receberá a versão ALPHA ao final') })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const boss = getWorldBoss();
    const embed = buildBossStatusEmbed(boss);
    const components = buildBossComponents(boss);
    return interaction.editReply({ embeds: [embed], components });
  },
  async executePrefix({ message, args }) {
    const sub = String(args[0] || 'status').toLowerCase();

    if (sub === 'atacar' || sub === 'attack' || sub === 'golpe') {
      const result = attackWorldBoss(message.author.id);
      if (!result.success) {
        return message.reply(`❌ ${result.message}`);
      }

      let effectMsg = '';
      if (result.isSuperEffective) effectMsg = '✨ **SUPER EFICAZ (+35% de Dano Elemental)!**';
      if (result.isWeak) effectMsg = '🛡️ *Pouco eficaz contra o elemento do Boss (-25% Dano).*';
      if (result.isCrit) effectMsg += ' 💥 **GOLPE CRÍTICO (1.5x)!**';

      const desc = [
        `Seu Pymon avançou com bravura e atacou **${result.bossEmoji} ${result.bossName}**!`,
        '',
        '💥 **RELATÓRIO DO GOLPE:**',
        `> ⚔️ **Dano Causado:** **${result.damage.toLocaleString('pt-BR')}**`,
        effectMsg ? `> ${effectMsg}` : '',
        `> ❤️ **Vida Restante do Boss:** **${result.remainingHp.toLocaleString('pt-BR')} / ${result.maxHp.toLocaleString('pt-BR')}**`,
        '',
        result.bossDefeated ? `🎉 **O TITÃ FOI DERROTADO!** O maior causador de dano (<@${result.mvpUserId}>) recebeu o Pymon na versão ALPHA!` : '⏳ *Aguarde 10 minutos para atacar novamente.*',
      ].filter(Boolean).join('\n');

      const embed = new EmbedBuilder()
        .setColor(result.bossDefeated ? PYXIE_COLORS.green || '#22c55e' : '#dc2626')
        .setTitle('⚔️  ✦  Ataque ao World Boss!')
        .setDescription(desc)
        .setFooter({ text: pyxieFooter('Contabilizado no ranking') })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    const boss = getWorldBoss();
    const embed = buildBossStatusEmbed(boss);
    const components = buildBossComponents(boss);
    return message.reply({ embeds: [embed], components });
  },
};

