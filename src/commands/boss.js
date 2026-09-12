const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { getWorldBoss, attackWorldBoss, getBossRanking } = require('../services/worldBoss');
const { getActivePet } = require('../services/pets');
const { formatCoins, t, getLanguage } = require('../utils/i18n');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');
const { BOSS } = require('./commandNames');

function createHealthBar(current, max, size = 12) {
  const percentage = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(size * percentage);
  const empty = size - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function buildBossStatusEmbed(boss, source = null) {
  const isEn = getLanguage(source) === 'en';
  const isDefeated = boss.status === 'defeated';
  const hpBar = createHealthBar(boss.currentHp, boss.maxHp);
  const hpPercent = Math.round((boss.currentHp / boss.maxHp) * 100);

  const topDamagers = getBossRanking(5);
  const rankingText = topDamagers.length > 0
    ? topDamagers.map((tItem, idx) => `> **#${idx + 1}** <@${tItem.userId}> (${tItem.petName}): **${tItem.damage.toLocaleString(isEn ? 'en-US' : 'pt-BR')} ${isEn ? 'damage' : 'dano'}**`).join('\n')
    : t('boss.emptyDamage', source);

  const nameLabel = isEn ? 'Name' : 'Nome';
  const elemLabel = isEn ? 'Element' : 'Elemento';
  const levelLabel = isEn ? 'Level' : 'Nível';
  const hpLabel = isEn ? 'Health' : 'Vida';
  const bossInfoLines = [
    `> 👾 **${nameLabel}:** **${boss.emoji} ${boss.name}**`,
    `> 🌀 **${elemLabel}:** \`${boss.element}\``,
    `> ⚡ **${levelLabel}:** \`${boss.level}\``,
    `> ❤️ **${hpLabel}:** **${boss.currentHp.toLocaleString(isEn ? 'en-US' : 'pt-BR')} / ${boss.maxHp.toLocaleString(isEn ? 'en-US' : 'pt-BR')}** (${hpPercent}%)`,
    `> [ \`${hpBar}\` ]`,
  ].join('\n');

  const desc = [
    t('boss.spawnDesc', source, { aura: boss.aura }),
    '',
    t('boss.infoTitle', source),
    bossInfoLines,
    '',
    t('boss.top5', source),
    rankingText,
    '',
    t('boss.rewards', source),
    '',
    isDefeated
      ? t('boss.defeatedNotice', source)
      : t('boss.attackPrompt', source),
  ].join('\n');

  return new EmbedBuilder()
    .setColor(isDefeated ? PYXIE_COLORS.green || '#22c55e' : '#dc2626')
    .setTitle(t('boss.title', source, { name: boss.name }))
    .setDescription(desc)
    .setFooter({ text: pyxieFooter(isEn ? 'Joint raid across all servers!' : 'Ataque conjunto por todos os servidores!') })
    .setTimestamp();
}

function buildBossAttackEmbed(result, source = null) {
  const isEn = getLanguage(source) === 'en';
  let effectMsg = '';
  if (result.isSuperEffective) effectMsg = t('boss.superEffective', source);
  if (result.isWeak) effectMsg = t('boss.weak', source);
  if (result.isCrit) effectMsg += (effectMsg ? '\n' : '') + t('boss.crit', source);

  const dmgLabel = isEn ? 'Damage Dealt' : 'Dano Causado';
  const hpLabel = isEn ? 'Boss Remaining HP' : 'Vida Restante do Boss';
  const reportHeader = isEn ? '💥 **BATTLE REPORT**' : '💥 **RELATÓRIO DO CONFRONTO**';
  const statusHeader = isEn ? '⏳ **BATTLE STATUS**' : '⏳ **STATUS DA BATALHA**';

  const desc = [
    t('boss.attackDesc', source, { boss: `${result.bossEmoji} ${result.bossName}` }),
    '',
    reportHeader,
    `> ⚔️ **${dmgLabel}:** **${result.damage.toLocaleString(isEn ? 'en-US' : 'pt-BR')}**` +
      (effectMsg ? `\n> ${effectMsg}` : '') +
      `\n> ❤️ **${hpLabel}:** **${result.remainingHp.toLocaleString(isEn ? 'en-US' : 'pt-BR')} / ${result.maxHp.toLocaleString(isEn ? 'en-US' : 'pt-BR')}**`,
    '',
    statusHeader,
    result.bossDefeated
      ? t('boss.defeatedStatus', source)
      : t('boss.cooldownNotice', source),
  ].join('\n');

  return new EmbedBuilder()
    .setColor(result.bossDefeated ? PYXIE_COLORS.green || '#22c55e' : '#dc2626')
    .setTitle(t('boss.attackTitle', source))
    .setDescription(desc)
    .setFooter({ text: pyxieFooter(isEn ? 'Damage tracked on global leaderboard' : 'Dano contabilizado no ranking global') })
    .setTimestamp();
}

function buildBossComponents(boss, source = null) {
  const isDefeated = boss.status === 'defeated';
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('boss_attack')
        .setLabel(t('boss.btnAttack', source))
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(isDefeated),
      new ButtonBuilder()
        .setCustomId('boss_ranking')
        .setLabel(t('boss.btnRanking', source))
        .setEmoji('🏆')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('boss_status')
        .setLabel(t('boss.btnRefresh', source))
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('boss_element_chart')
        .setLabel(t('boss.btnChart', source))
        .setEmoji('⚖️')
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function isBossInteraction(interaction) {
  return typeof interaction.customId === 'string' && (
    interaction.customId === 'boss_attack' ||
    interaction.customId === 'boss_ranking' ||
    interaction.customId === 'boss_status' ||
    interaction.customId === 'boss_element_chart'
  );
}

async function handleBossInteraction(interaction) {
  const action = interaction.customId;

  if (action === 'boss_element_chart') {
    const { buildElementChartEmbed } = require('../utils/elementChart');
    return interaction.reply({ embeds: [buildElementChartEmbed(interaction)], flags: 64 });
  }

  if (action === 'boss_status') {
    const boss = getWorldBoss();
    const embed = buildBossStatusEmbed(boss, interaction);
    const components = buildBossComponents(boss, interaction);
    return interaction.update({ embeds: [embed], components });
  }

  if (action === 'boss_ranking') {
    const isEn = getLanguage(interaction) === 'en';
    const top = getBossRanking(10);
    const boss = getWorldBoss();
    const text = top.length > 0
      ? top.map((tItem, idx) => `> **#${idx + 1}** <@${tItem.userId}> (${tItem.petName}): **${tItem.damage.toLocaleString(isEn ? 'en-US' : 'pt-BR')} ${isEn ? 'damage' : 'dano'}** (${tItem.hits} ${isEn ? 'attacks' : 'ataques'})`).join('\n')
      : t('boss.emptyDamage', interaction);

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.gold || '#facc15')
      .setTitle(t('boss.rankingTitle', interaction, { name: boss.name }))
      .setDescription(t('boss.rankingDesc', interaction, { text }))
      .setFooter({ text: pyxieFooter(isEn ? '#1 will receive ALPHA version' : 'O #1 receberá a versão ALPHA ao final') })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
  }

  if (action === 'boss_attack') {
    const result = attackWorldBoss(interaction.user.id);
    if (!result.success) {
      return interaction.reply({ content: `❌ ${result.message}`, flags: 64 });
    }

    const attackEmbed = buildBossAttackEmbed(result, interaction);
    return interaction.reply({ embeds: [attackEmbed], flags: 64 });
  }
}

function buildBossView(userId, source = null) {
  const boss = getWorldBoss();
  const embed = buildBossStatusEmbed(boss, source);
  const components = buildBossComponents(boss, source);
  return { embeds: [embed], components, files: [] };
}

module.exports = {
  name: BOSS,
  aliases: ['boss', 'worldboss', 'tita', 'chefe'],
  isBossInteraction,
  handleBossInteraction,
  buildBossView,
  buildBossStatusEmbed,
  buildBossComponents,
  data: new SlashCommandBuilder()
    .setName(BOSS)
    .setDescription('Battle the weekly ALPHA World Boss with all servers / Enfrente o World Boss.')
    .setDescriptionLocalizations({
      'pt-BR': 'Enfrente o World Boss Semanal ALPHA junto com todos os servidores!',
    })
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Shows current World Boss status / Exibe status do World Boss')
    )
    .addSubcommand((sub) =>
      sub
        .setName('atacar')
        .setNameLocalizations({
          'en-US': 'attack',
          'en-GB': 'attack',
          'pt-BR': 'atacar',
        })
        .setDescription('Attack the World Boss / Atacar World Boss')
    )
    .addSubcommand((sub) =>
      sub
        .setName('ranking')
        .setDescription('Show damage leaderboard / Exibe maiores causadores de dano')
    ),
  async executeSlash({ interaction }) {
    const sub = interaction.options.getSubcommand() || 'status';

    if (sub === 'atacar' || sub === 'attack') {
      const result = attackWorldBoss(interaction.user.id);
      if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.message}` });
      }

      const embed = buildBossAttackEmbed(result, interaction);
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'ranking') {
      const isEn = getLanguage(interaction) === 'en';
      const top = getBossRanking(10);
      const boss = getWorldBoss();
      const text = top.length > 0
        ? top.map((tItem, idx) => `> **#${idx + 1}** <@${tItem.userId}> (${tItem.petName}): **${tItem.damage.toLocaleString(isEn ? 'en-US' : 'pt-BR')} ${isEn ? 'damage' : 'dano'}** (${tItem.hits} ${isEn ? 'attacks' : 'ataques'})`).join('\n')
        : t('boss.emptyDamage', interaction);

      const embed = new EmbedBuilder()
        .setColor(PYXIE_COLORS.gold || '#facc15')
        .setTitle(t('boss.rankingTitle', interaction, { name: boss.name }))
        .setDescription(t('boss.rankingDesc', interaction, { text }))
        .setFooter({ text: pyxieFooter(isEn ? '#1 will receive ALPHA version' : 'O #1 receberá a versão ALPHA ao final') })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const boss = getWorldBoss();
    const embed = buildBossStatusEmbed(boss, interaction);
    const components = buildBossComponents(boss, interaction);
    return interaction.editReply({ embeds: [embed], components });
  },
  async executePrefix({ message, args }) {
    const sub = String(args[0] || 'status').toLowerCase();

    if (sub === 'atacar' || sub === 'attack' || sub === 'golpe') {
      const result = attackWorldBoss(message.author.id);
      if (!result.success) {
        return message.reply(`❌ ${result.message}`);
      }

      const embed = buildBossAttackEmbed(result, message);
      return message.reply({ embeds: [embed] });
    }

    const boss = getWorldBoss();
    const embed = buildBossStatusEmbed(boss, message);
    const components = buildBossComponents(boss, message);
    return message.reply({ embeds: [embed], components });
  },
};
