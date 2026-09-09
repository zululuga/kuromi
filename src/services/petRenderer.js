const { createCanvas } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const WIDTH = 800;
const HEIGHT = 500;

const ELEMENT_THEMES = {
  ORVALHO: {
    accent: '#00f5d4',
    glow: 'rgba(0, 245, 212, 0.4)',
    bgInner: '#0b2638',
    bgOuter: '#020d14',
    badgeText: '💧 ORVALHO',
  },
  BRISA: {
    accent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.4)',
    bgInner: '#0e1f3b',
    bgOuter: '#030814',
    badgeText: '🪶 BRISA',
  },
  SILVESTRE: {
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    bgInner: '#0a2e1d',
    bgOuter: '#02120b',
    badgeText: '🍃 SILVESTRE',
  },
  CHARME: {
    accent: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.4)',
    bgInner: '#380d28',
    bgOuter: '#12020d',
    badgeText: '🎀 CHARME',
  },
  TRAVESSURA: {
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    bgInner: '#240a38',
    bgOuter: '#0c0214',
    badgeText: '🖤 TRAVESSURA',
  },
  // Fallbacks de compatibilidade
  SOMBRA: {
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    bgInner: '#240a38',
    bgOuter: '#0c0214',
    badgeText: '🖤 TRAVESSURA',
  },
  FOFURA: {
    accent: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.4)',
    bgInner: '#380d28',
    bgOuter: '#12020d',
    badgeText: '🎀 CHARME',
  },
  CAOS: {
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.4)',
    bgInner: '#38220b',
    bgOuter: '#140c03',
    badgeText: '⚡ CAOS',
  },
  MISTICO: {
    accent: '#00f5d4',
    glow: 'rgba(0, 245, 212, 0.4)',
    bgInner: '#0b2638',
    bgOuter: '#020d14',
    badgeText: '💧 ORVALHO',
  },
};

const petCardCache = new Map();
const MAX_CACHE_SIZE = 30;

function drawProgressBar(ctx, x, y, width, height, current, max, fillStart, fillEnd, label) {
  // Fundo da barra
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  ctx.stroke();

  // Preenchimento
  const ratio = Math.max(0, Math.min(1, current / Math.max(1, max)));
  if (ratio > 0) {
    const fillGrad = ctx.createLinearGradient(x, y, x + width * ratio, y);
    fillGrad.addColorStop(0, fillStart);
    fillGrad.addColorStop(1, fillEnd);
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, Math.max(height - 2, (width - 2) * ratio), height - 2, (height - 2) / 2);
    ctx.fill();
  }

  // Texto do label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 8, y + height / 2);

  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(current)}/${Math.floor(max)}`, x + width - 8, y + height / 2);
  ctx.restore();
}

function renderPetCard(pet) {
  const cacheKey = `${pet.id}_${pet.level}_${pet.hunger}_${pet.happiness}_${pet.energy}_${pet.xp}_${pet.stats.hp}`;
  if (petCardCache.has(cacheKey)) {
    return petCardCache.get(cacheKey);
  }

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const theme = ELEMENT_THEMES[pet.element] || ELEMENT_THEMES.FOFURA;

  // 1. Background Radial Gradient
  const bgGrad = ctx.createRadialGradient(200, 250, 40, WIDTH / 2, HEIGHT / 2, 500);
  bgGrad.addColorStop(0, theme.bgInner);
  bgGrad.addColorStop(1, theme.bgOuter);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Stardust
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  const starCoords = [
    [50, 60], [120, 140], [700, 80], [750, 200], [60, 420], [720, 440], [280, 80], [520, 110]
  ];
  for (const [sx, sy] of starCoords) {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Moldura com Estilo Kuromi
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, WIDTH - 44, HEIGHT - 44);

  // Cantoneiras ✦
  ctx.fillStyle = theme.accent;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', 22, 22);
  ctx.fillText('✦', WIDTH - 22, 22);
  ctx.fillText('✦', 22, HEIGHT - 22);
  ctx.fillText('✦', WIDTH - 22, HEIGHT - 22);

  // 3. Avatar Central do Pet (Esfera Mística)
  const avatarCx = 160;
  const avatarCy = 230;
  const avatarR = 85;

  ctx.save();
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 25;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
  ctx.stroke();

  const orbGrad = ctx.createRadialGradient(avatarCx, avatarCy, 10, avatarCx, avatarCy, avatarR);
  orbGrad.addColorStop(0, pet.shiny ? '#4a154b' : '#1e083a');
  orbGrad.addColorStop(1, '#0c0217');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Emoji / Símbolo do Pet
  ctx.font = '64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pet.emoji || '🐾', avatarCx, avatarCy);

  // Badge Shiny / Corrupt
  if (pet.shiny) {
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('✨ SHINY', avatarCx, avatarCy + avatarR + 22);
  } else if (pet.corrupt) {
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🖤 CORROMPIDO', avatarCx, avatarCy + avatarR + 22);
  }

  // 4. Header: Nome e Título
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px serif';
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 10;
  ctx.fillText(pet.name, 310, 68);
  ctx.shadowBlur = 0;

  // Badges (Level e Elemento)
  ctx.fillStyle = theme.accent;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`Nível ${pet.level}  •  ${pet.species}  •  ${theme.badgeText}`, 310, 98);

  // 5. Barras de Progresso
  const barX = 310;
  const barW = 440;
  const barH = 20;

  // HP
  drawProgressBar(ctx, barX, 130, barW, barH, pet.stats.hp, pet.stats.maxHp, '#10b981', '#34d399', '💖 Vida (HP)');

  // Fome
  drawProgressBar(ctx, barX, 162, barW, barH, pet.hunger, 100, '#f97316', '#fb923c', '🍖 Fome');

  // Humor
  drawProgressBar(ctx, barX, 194, barW, barH, pet.happiness, 100, '#ec4899', '#f472b6', '😊 Humor');

  // Energia
  drawProgressBar(ctx, barX, 226, barW, barH, pet.energy, 100, '#eab308', '#facc15', '⚡ Energia');

  // XP
  drawProgressBar(ctx, barX, 258, barW, barH, pet.xp, pet.xpToNext, '#06b6d4', '#38bdf8', '⭐ Experiência (XP)');

  // 6. Painel de Atributos de Batalha (Grid Inferior)
  const gridY = 320;
  const boxW = 100;
  const boxH = 65;

  const statBoxes = [
    { label: 'ATAQUE', val: pet.stats.atk, icon: '⚔️', x: 310 },
    { label: 'DEFESA', val: pet.stats.def, icon: '🛡️', x: 425 },
    { label: 'VELOCIDADE', val: pet.stats.spd, icon: '💨', x: 540 },
    { label: 'VITÓRIAS', val: `${pet.duelosVencidos || 0}/${(pet.duelosVencidos || 0) + (pet.duelosPerdidos || 0)}`, icon: '🏆', x: 655 },
  ];

  for (const box of statBoxes) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(box.x, gridY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${box.icon} ${box.label}`, box.x + boxW / 2, gridY + 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(String(box.val), box.x + boxW / 2, gridY + 48);
  }

  // 7. Rodapé do Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REINO ENCANTADO DE PYXIE  •  SUPERVISÃO TRAVESSA DE PYXIE', WIDTH / 2, 470);

  const buffer = canvas.toBuffer('image/png');

  if (petCardCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = petCardCache.keys().next().value;
    if (oldestKey) petCardCache.delete(oldestKey);
  }
  petCardCache.set(cacheKey, buffer);

  return buffer;
}

function createPetAttachment(pet) {
  const buffer = renderPetCard(pet);
  return new AttachmentBuilder(buffer, { name: 'pet_card.png' });
}

module.exports = {
  renderPetCard,
  createPetAttachment,
};

