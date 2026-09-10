const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const WIDTH = 800;
const HEIGHT = 500;
const PETS_DIR = path.join(__dirname, '..', 'pets');

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
    badgeText: '🌸 CHARME',
  },
  TRAVESSURA: {
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    bgInner: '#240a38',
    bgOuter: '#0c0214',
    badgeText: '🔮 TRAVESSURA',
  },
  FOFURA: {
    accent: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.4)',
    bgInner: '#380d28',
    bgOuter: '#12020d',
    badgeText: '🌸 CHARME',
  },
};

// Cache de sprites em memória (pre-carregados)
const spriteCache = new Map();
const petCardCache = new Map();
const MAX_CACHE_SIZE = 40;

function preloadSprites() {
  try {
    if (!fs.existsSync(PETS_DIR)) return;
    const files = fs.readdirSync(PETS_DIR).filter((f) => f.endsWith('.png'));
    for (const file of files) {
      const fullPath = path.join(PETS_DIR, file);
      loadImage(fullPath)
        .then((img) => spriteCache.set(file.replace('.png', ''), img))
        .catch(() => {});
    }
  } catch (_) {}
}

preloadSprites();

function getCachedSprite(petKey, isShiny = false) {
  if (isShiny) {
    const shinyKey = `${petKey}_shiny`;
    if (spriteCache.has(shinyKey)) return spriteCache.get(shinyKey);
  }
  if (spriteCache.has(petKey)) return spriteCache.get(petKey);
  return null;
}

/**
 * Desenha o sprite com filtro de pixelização retrô (pixel art).
 */
function drawPixelatedSprite(ctx, img, targetX, targetY, targetSize) {
  if (!img) return;

  // Cria canvas intermediário em baixa resolução para pixelização nítida
  const lowRes = 48;
  const offCanvas = createCanvas(lowRes, lowRes);
  const offCtx = offCanvas.getContext('2d');
  offCtx.drawImage(img, 0, 0, lowRes, lowRes);

  // Renderiza no canvas principal sem interpolação (nearest-neighbor)
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offCanvas, targetX - targetSize / 2, targetY - targetSize / 2, targetSize, targetSize);

  // Leve efeito de scanline / grade de pixel art
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
  for (let y = targetY - targetSize / 2; y < targetY + targetSize / 2; y += 4) {
    ctx.fillRect(targetX - targetSize / 2, y, targetSize, 1);
  }

  ctx.restore();
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function drawProgressBar(ctx, x, y, width, height, current, max, fillStart, fillEnd, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  ctx.stroke();

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

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 8, y + height / 2);

  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(current)}/${Math.floor(max)}`, x + width - 8, y + height / 2);
  ctx.restore();
}

/**
 * Renderiza o Cartão de Status do PixelMonster.
 */
function renderPetCard(pet) {
  const cacheKey = `${pet.id}_${pet.level}_${pet.hunger}_${pet.happiness}_${pet.energy}_${pet.xp}_${pet.stats?.hp}_${Boolean(pet.shiny)}`;
  if (petCardCache.has(cacheKey)) {
    return petCardCache.get(cacheKey);
  }

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const theme = ELEMENT_THEMES[pet.element] || ELEMENT_THEMES.CHARME;

  // 1. Background Radial Gradient
  const bgGrad = ctx.createRadialGradient(200, 250, 40, WIDTH / 2, HEIGHT / 2, 500);
  bgGrad.addColorStop(0, theme.bgInner);
  bgGrad.addColorStop(1, theme.bgOuter);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Partículas Pixeladas de Fundo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  const starCoords = [
    [50, 60], [120, 140], [700, 80], [750, 200], [60, 420], [720, 440], [280, 80], [520, 110], [660, 310]
  ];
  for (const [sx, sy] of starCoords) {
    ctx.fillRect(sx, sy, 3, 3); // Pixels quadrados em vez de círculos
  }

  // 2. Moldura com Estilo Pixel Retrô
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, WIDTH - 44, HEIGHT - 44);

  // Cantoneiras Pixeladas
  ctx.fillStyle = theme.accent;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 22, 22);
  ctx.fillText('+', WIDTH - 22, 22);
  ctx.fillText('+', 22, HEIGHT - 22);
  ctx.fillText('+', WIDTH - 22, HEIGHT - 22);

  // 3. Avatar Central do PixelMonster
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

  // Sprite Oficial Pixelado
  const sprite = getCachedSprite(pet.key, Boolean(pet.shiny));
  if (sprite) {
    drawPixelatedSprite(ctx, sprite, avatarCx, avatarCy, 136);
  } else {
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pet.emoji || '🐾', avatarCx, avatarCy);
  }

  // Badge Shiny / Corrupt
  if (pet.shiny) {
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHINY', avatarCx, avatarCy + avatarR + 24);
  } else if (pet.corrupt) {
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CORROMPIDO', avatarCx, avatarCy + avatarR + 24);
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
  ctx.fillText(`Nível ${pet.level}  •  ${pet.species || pet.name}  •  Elemento: ${pet.element}`, 310, 98);

  // 5. Barras de Progresso
  const barX = 310;
  const barW = 440;
  const barH = 20;

  const currentHp = pet.stats?.hp !== undefined ? pet.stats.hp : 55;
  const maxHp = pet.stats?.maxHp !== undefined ? pet.stats.maxHp : 55;

  drawProgressBar(ctx, barX, 130, barW, barH, currentHp, maxHp, '#10b981', '#34d399', 'Vida (HP)');
  drawProgressBar(ctx, barX, 162, barW, barH, pet.hunger || 0, 100, '#f97316', '#fb923c', 'Fome');
  drawProgressBar(ctx, barX, 194, barW, barH, pet.happiness || 0, 100, '#ec4899', '#f472b6', 'Humor');
  drawProgressBar(ctx, barX, 226, barW, barH, pet.energy || 0, 100, '#eab308', '#facc15', 'Energia');
  drawProgressBar(ctx, barX, 258, barW, barH, pet.xp || 0, pet.xpToNext || 100, '#06b6d4', '#38bdf8', 'Experiência (XP)');

  // 6. Painel de Atributos de Batalha (Grid Inferior)
  const gridY = 320;
  const boxW = 100;
  const boxH = 65;

  const atk = pet.stats?.atk !== undefined ? pet.stats.atk : 12;
  const def = pet.stats?.def !== undefined ? pet.stats.def : 12;
  const spd = pet.stats?.spd !== undefined ? pet.stats.spd : 12;

  const statBoxes = [
    { label: 'ATAQUE', val: atk, x: 310 },
    { label: 'DEFESA', val: def, x: 425 },
    { label: 'VELOCIDADE', val: spd, x: 540 },
    { label: 'VITÓRIAS', val: `${pet.duelosVencidos || 0}/${(pet.duelosVencidos || 0) + (pet.duelosPerdidos || 0)}`, x: 655 },
  ];

  for (const box of statBoxes) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(box.x, gridY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(box.label, box.x + boxW / 2, gridY + 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(String(box.val), box.x + boxW / 2, gridY + 48);
  }

  // 7. Rodapé do Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PIXELMONSTERS • REINO TRAVESSO DE PYXIE', WIDTH / 2, 470);

  const buffer = canvas.toBuffer('image/png');

  if (petCardCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = petCardCache.keys().next().value;
    if (oldestKey) petCardCache.delete(oldestKey);
  }
  petCardCache.set(cacheKey, buffer);

  return buffer;
}

/**
 * Renderiza uma entrada visual de Pokédex para o inicial selecionado.
 */
function renderPokedexCard(monsterDef, isShiny = false) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const theme = ELEMENT_THEMES[monsterDef.element] || ELEMENT_THEMES.CHARME;

  // Background
  const bgGrad = ctx.createRadialGradient(200, 250, 40, WIDTH / 2, HEIGHT / 2, 500);
  bgGrad.addColorStop(0, theme.bgInner);
  bgGrad.addColorStop(1, theme.bgOuter);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Moldura Pokédex
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);

  // Avatar
  const avatarCx = 160;
  const avatarCy = 230;
  const avatarR = 90;

  ctx.save();
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
  ctx.stroke();

  const orbGrad = ctx.createRadialGradient(avatarCx, avatarCy, 10, avatarCx, avatarCy, avatarR);
  orbGrad.addColorStop(0, isShiny ? '#4a154b' : '#1e083a');
  orbGrad.addColorStop(1, '#0c0217');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const sprite = getCachedSprite(monsterDef.key, isShiny);
  if (sprite) {
    drawPixelatedSprite(ctx, sprite, avatarCx, avatarCy, 145);
  }

  // Nome e Elemento
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px serif';
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 10;
  ctx.fillText(monsterDef.name, 310, 75);
  ctx.shadowBlur = 0;

  ctx.fillStyle = theme.accent;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`PixelMonster Inicial  •  Elemento: ${monsterDef.element}`, 310, 110);

  // Descrição Pokédex com quebra de linha inteligente
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'italic 15px sans-serif';
  const descText = `"${monsterDef.description || ''}"`;
  const descLines = wrapCanvasText(ctx, descText, 440);
  descLines.forEach((line, idx) => {
    ctx.fillText(line, 310, 148 + idx * 22);
  });

  // Atributos Base
  const statY = 245;
  const stats = [
    { label: 'Vida Base (HP)', val: monsterDef.baseStats?.hp || 55, bar: '#10b981' },
    { label: 'Ataque (ATK)', val: monsterDef.baseStats?.atk || 12, bar: '#f97316' },
    { label: 'Defesa (DEF)', val: monsterDef.baseStats?.def || 12, bar: '#38bdf8' },
    { label: 'Velocidade (SPD)', val: monsterDef.baseStats?.spd || 12, bar: '#ec4899' },
  ];

  stats.forEach((st, idx) => {
    const yPos = statY + idx * 42;
    drawProgressBar(ctx, 310, yPos, 440, 24, st.val, 100, st.bar, st.bar, st.label);
  });

  // Rodapé Pokédex
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POKÉDEX PIXELMONSTERS • ESCOLHA SEU COMPANHEIRO INICIAL', WIDTH / 2, 470);

  return canvas.toBuffer('image/png');
}

function createPetAttachment(pet) {
  const buffer = renderPetCard(pet);
  return new AttachmentBuilder(buffer, { name: 'pet_card.png' });
}

function createPokedexAttachment(monsterDef, isShiny = false) {
  const buffer = renderPokedexCard(monsterDef, isShiny);
  return new AttachmentBuilder(buffer, { name: 'pokedex_entry.png' });
}

module.exports = {
  renderPetCard,
  renderPokedexCard,
  createPetAttachment,
  createPokedexAttachment,
  preloadSprites,
};
