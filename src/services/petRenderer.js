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
  ctx.fillText('PYMONS • REINO TRAVESSO DE PYXIE', WIDTH / 2, 470);

  const buffer = canvas.toBuffer('image/png');

  if (petCardCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = petCardCache.keys().next().value;
    if (oldestKey) petCardCache.delete(oldestKey);
  }
  petCardCache.set(cacheKey, buffer);

  return buffer;
}

/**
 * Desenha a silhueta sombreada de um Pymon não descoberto.
 */
function drawSilhouetteSprite(ctx, img, targetX, targetY, targetSize) {
  if (!img) return;
  const lowRes = 48;
  const offCanvas = createCanvas(lowRes, lowRes);
  const offCtx = offCanvas.getContext('2d');
  offCtx.drawImage(img, 0, 0, lowRes, lowRes);

  const imgData = offCtx.getImageData(0, 0, lowRes, lowRes);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 20) {
      data[i] = 16;     // R
      data[i + 1] = 8;  // G
      data[i + 2] = 26; // B
      data[i + 3] = 250;// A
    }
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowColor = 'rgba(168, 85, 247, 0.7)';
  ctx.shadowBlur = 20;
  ctx.drawImage(offCanvas, targetX - targetSize / 2, targetY - targetSize / 2, targetSize, targetSize);
  ctx.restore();
}

/**
 * Renderiza uma entrada visual da Dex com suporte a Pymons descobertos, não descobertos e Shinies.
 */
function renderDexCard(monsterDef, isShiny = false, isUnlocked = true, isShinyUnlocked = false) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const theme = isUnlocked
    ? (ELEMENT_THEMES[monsterDef.element] || ELEMENT_THEMES.CHARME)
    : ELEMENT_THEMES.TRAVESSURA;

  // Background
  const bgGrad = ctx.createRadialGradient(200, 250, 40, WIDTH / 2, HEIGHT / 2, 500);
  bgGrad.addColorStop(0, theme.bgInner);
  bgGrad.addColorStop(1, theme.bgOuter);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Moldura Dex
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

  if (!isUnlocked) {
    // 1. Pymon NÃO descoberto (Silhueta Sombreada Misteriosa)
    if (sprite) {
      drawSilhouetteSprite(ctx, sprite, avatarCx, avatarCy, 145);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', avatarCx, avatarCy);

    // Nome misterioso
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 34px serif';
    ctx.fillText(`??? (${monsterDef.name ? monsterDef.name[0] : '?'}???)`, 310, 75);

    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('🔒 Pymon Não Registrado  •  Elemento: ???', 310, 110);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'italic 15px sans-serif';
    const descText = '"Esta criatura misteriosa ainda não foi registrada por você. Explore as Dungeons e choque novos ovos para desvendar este Pymon!"';
    const descLines = wrapCanvasText(ctx, descText, 440);
    descLines.forEach((line, idx) => {
      ctx.fillText(line, 310, 148 + idx * 22);
    });

    const statY = 245;
    const stats = [
      { label: 'Vida Base (HP)', val: 0, bar: '#4b5563' },
      { label: 'Ataque (ATK)', val: 0, bar: '#4b5563' },
      { label: 'Defesa (DEF)', val: 0, bar: '#4b5563' },
      { label: 'Velocidade (SPD)', val: 0, bar: '#4b5563' },
    ];
    stats.forEach((st, idx) => {
      const yPos = statY + idx * 42;
      drawProgressBar(ctx, 310, yPos, 440, 24, st.val, 100, st.bar, st.bar, `${st.label}: ???`);
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEX DE PYMONS • CRIATURA NÃO REGISTRADA', WIDTH / 2, 470);
  } else if (isShiny && !isShinyUnlocked) {
    // 2. Descoberto apenas na forma normal (Shiny bloqueado)
    if (sprite) {
      drawSilhouetteSprite(ctx, sprite, avatarCx, avatarCy, 145);
    }
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', avatarCx, avatarCy);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px serif';
    ctx.fillText(`${monsterDef.name} (Shiny)`, 310, 75);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`✨ Forma Shiny Bloqueada  •  Elemento: ${monsterDef.element}`, 310, 110);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'italic 15px sans-serif';
    const descText = `"Você registrou a espécie ${monsterDef.name}, mas a variante Shiny Rara ainda não foi descoberta. (5% no Inicial / até 20% na Chocadeira)."`;
    const descLines = wrapCanvasText(ctx, descText, 440);
    descLines.forEach((line, idx) => {
      ctx.fillText(line, 310, 148 + idx * 22);
    });

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

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEX DE PYMONS • VARIANTE SHINY NÃO DESCOBERTA', WIDTH / 2, 470);

  } else {
    // 3. Totalmente Descoberto
    if (sprite) {
      drawPixelatedSprite(ctx, sprite, avatarCx, avatarCy, 145);
    }

    if (isShiny) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ SHINY REGISTRADO ✨', avatarCx, avatarCy + avatarR + 24);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px serif';
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 10;
    ctx.fillText(`${monsterDef.name}${isShiny ? ' ✨' : ''}`, 310, 75);
    ctx.shadowBlur = 0;

    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${monsterDef.rarity || 'Pymon'}  •  Elemento: ${monsterDef.element}`, 310, 110);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'italic 15px sans-serif';
    const descText = `"${monsterDef.description || ''}"`;
    const descLines = wrapCanvasText(ctx, descText, 440);
    descLines.forEach((line, idx) => {
      ctx.fillText(line, 310, 148 + idx * 22);
    });

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

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEX DE PYMONS • COMPÊNDIO OFICIAL', WIDTH / 2, 470);
  }

  return canvas.toBuffer('image/png');
}

const renderPokedexCard = renderDexCard;

function createPetAttachment(pet) {
  const buffer = renderPetCard(pet);
  return new AttachmentBuilder(buffer, { name: 'pet_card.png' });
}

function createDexAttachment(monsterDef, isShiny = false, isUnlocked = true, isShinyUnlocked = false) {
  const buffer = renderDexCard(monsterDef, isShiny, isUnlocked, isShinyUnlocked);
  return new AttachmentBuilder(buffer, { name: 'dex_entry.png' });
}

/**
 * Renderiza o mapa procedural 2D da expedição em Canvas com Névoa de Guerra e posição do jogador.
 */
function renderExpeditionMap(run, activePet) {
  const MAP_WIDTH = 600;
  const MAP_HEIGHT = 480;

  const canvas = createCanvas(MAP_WIDTH, MAP_HEIGHT);
  const ctx = canvas.getContext('2d');

  const zoneId = run?.zone?.id || 'bosque';
  const themeGradients = {
    bosque: { bg1: '#071f12', bg2: '#020b06', accent: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    recife: { bg1: '#061a29', bg2: '#020912', accent: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
    colina: { bg1: '#261b07', bg2: '#0d0902', accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
    castelo: { bg1: '#210729', bg2: '#0b020d', accent: '#c084fc', glow: 'rgba(192, 132, 252, 0.4)' },
  };
  const theme = themeGradients[zoneId] || themeGradients.bosque;

  // 1. Fundo Gradiente da Masmorra
  const bgGrad = ctx.createRadialGradient(MAP_WIDTH / 2, MAP_HEIGHT / 2, 50, MAP_WIDTH / 2, MAP_HEIGHT / 2, 400);
  bgGrad.addColorStop(0, theme.bg1);
  bgGrad.addColorStop(1, theme.bg2);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Moldura Retrô
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, MAP_WIDTH - 20, MAP_HEIGHT - 20);

  // 2. HUD Superior: Informações do Pymon e Espólios
  // Avatar / Miniatura do Pet
  const avatarX = 40;
  const avatarY = 44;
  const avatarR = 24;

  ctx.save();
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#0f051d';
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR - 1, 0, Math.PI * 2);
  ctx.fill();

  const sprite = getCachedSprite(activePet?.key, Boolean(activePet?.shiny));
  if (sprite) {
    drawPixelatedSprite(ctx, sprite, avatarX, avatarY, 36);
  } else {
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(activePet?.emoji || '🐾', avatarX, avatarY);
  }
  ctx.restore();

  // Nome e Barras de Vida / Energia
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`${activePet?.name || 'Pymon'} (Nv. ${activePet?.level || 1})`, 75, 32);

  const curHp = activePet?.stats?.hp ?? 55;
  const maxHp = activePet?.stats?.maxHp ?? 55;
  const curEnergy = activePet?.energy ?? 100;

  drawProgressBar(ctx, 75, 44, 150, 12, curHp, maxHp, '#10b981', '#34d399', `HP: ${curHp}/${maxHp}`);
  drawProgressBar(ctx, 75, 59, 150, 12, curEnergy, 100, '#eab308', '#facc15', `ENERGIA: ${curEnergy}%`);

  // Painel de Espólios Acumulados (Lado Direito)
  const lootPanelX = 360;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.roundRect(lootPanelX, 22, 215, 52, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.accent;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`MASMORRA: ${run?.zone?.name?.toUpperCase() || 'DUNGEON'}`, lootPanelX + 10, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  const coinsText = `MOEDAS: +${run?.coinsAccumulated || 0}`;
  const chestsText = `BAÚS: ${(run?.chestsFound || []).length}`;
  const eggsText = `OVOS: ${(run?.eggsFound || []).length}`;
  ctx.fillText(`${coinsText}   ${chestsText}   ${eggsText}`, lootPanelX + 10, 58);

  // 3. Grid de Salas 2D (Centro do Canvas)
  const grid = run?.grid || [];
  const gridH = grid.length || 5;
  const gridW = grid[0]?.length || 5;

  const cellSize = gridW > 5 ? 44 : 52;
  const cellGap = 6;
  const totalBoardW = gridW * cellSize + (gridW - 1) * cellGap;
  const totalBoardH = gridH * cellSize + (gridH - 1) * cellGap;

  const boardStartX = Math.floor((MAP_WIDTH - totalBoardW) / 2);
  const boardStartY = 95 + Math.floor((335 - totalBoardH) / 2);

  const playerPos = run?.playerPos || { x: 0, y: 0 };
  const exitPos = run?.exitPos || { x: gridW - 1, y: gridH - 1 };

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const tile = grid[y]?.[x] || { revealed: false, visited: false, cleared: false, eventType: 'EMPTY' };
      const cellX = boardStartX + x * (cellSize + cellGap);
      const cellY = boardStartY + y * (cellSize + cellGap);
      const isPlayer = playerPos.x === x && playerPos.y === y;
      const isExit = exitPos.x === x && exitPos.y === y;
      const cellCx = cellX + cellSize / 2;
      const cellCy = cellY + cellSize / 2;

      ctx.save();
      if (!tile.revealed) {
        // Sala Oculta (Névoa de Guerra)
        ctx.fillStyle = '#0a0614';
        ctx.strokeStyle = '#1b1130';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cellX, cellY, cellSize, cellSize, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cellCx, cellCy);
      } else {
        // Sala Revelada
        if (tile.visited) {
          ctx.fillStyle = '#1c1033';
          ctx.strokeStyle = '#3b2066';
        } else {
          ctx.fillStyle = '#120b24';
          ctx.strokeStyle = '#271545';
        }
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cellX, cellY, cellSize, cellSize, 6);
        ctx.fill();
        ctx.stroke();

        // Desenha Marcador Universal Retro
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isExit) {
          // Portal de Saída (Estrela Dourada com Aura)
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(cellCx, cellCy, 11, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f051d';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('★', cellCx, cellCy + 1);
        } else if (isPlayer) {
          // Jogador na Célula
          ctx.shadowColor = theme.accent;
          ctx.shadowBlur = 15;
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(cellX - 1, cellY - 1, cellSize + 2, cellSize + 2, 7);
          ctx.stroke();

          if (sprite) {
            drawPixelatedSprite(ctx, sprite, cellCx, cellCy, cellSize - 10);
          } else {
            ctx.fillStyle = theme.accent;
            ctx.beginPath();
            ctx.arc(cellCx, cellCy, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('P', cellCx, cellCy + 1);
          }
        } else if (tile.visited) {
          // Sala já visitada
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('•', cellCx, cellCy);
        } else {
          // Marcadores com Símbolos Universais
          switch (tile.eventType) {
            case 'BATTLE':
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#ef4444';
              ctx.font = 'bold 18px sans-serif';
              ctx.fillText('⚔', cellCx, cellCy);
              break;
            case 'NPC_DUEL':
              ctx.shadowColor = '#c084fc';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#c084fc';
              ctx.font = 'bold 13px sans-serif';
              ctx.fillText('VS', cellCx, cellCy);
              break;
            case 'CHEST':
              ctx.shadowColor = '#f59e0b';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#fbbf24';
              ctx.font = 'bold 18px sans-serif';
              ctx.fillText('◆', cellCx, cellCy);
              break;
            case 'EGG_NEST':
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.ellipse(cellCx, cellCy, 6, 8.5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(cellCx - 1.5, cellCy - 2.5, 1.5, 0, Math.PI * 2);
              ctx.fill();
              break;
            case 'TRAP':
              ctx.shadowColor = '#f97316';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#f97316';
              ctx.font = 'bold 16px sans-serif';
              ctx.fillText('▲', cellCx, cellCy);
              break;
            case 'FOUNTAIN':
              ctx.shadowColor = '#06b6d4';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#22d3ee';
              ctx.font = 'bold 19px sans-serif';
              ctx.fillText('✚', cellCx, cellCy);
              break;
            default:
              ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
              ctx.font = '16px sans-serif';
              ctx.fillText('·', cellCx, cellCy);
              break;
          }
        }
      }
      ctx.restore();
    }
  }

  // 4. Rodapé do Mapa
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const posText = `Posição: (${playerPos.x + 1}, ${playerPos.y + 1})  •  Passos: ${run?.step || 0}  •  Use os botões direcionais D-Pad`;
  ctx.fillText(posText, MAP_WIDTH / 2, MAP_HEIGHT - 22);

  return canvas.toBuffer('image/png');
}

function createExpeditionMapAttachment(run, activePet) {
  const buffer = renderExpeditionMap(run, activePet);
  return new AttachmentBuilder(buffer, { name: 'dungeon_map.png' });
}

module.exports = {
  renderPetCard,
  renderDexCard,
  renderExpeditionMap,
  createPetAttachment,
  createDexAttachment,
  createExpeditionMapAttachment,
  preloadSprites,
};

