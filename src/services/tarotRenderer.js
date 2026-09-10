const { createCanvas } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const WIDTH = 600;
const HEIGHT = 1024;

/**
 * Helper to wrap text into multiple lines given a max width.
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
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
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Draws an 8-pointed star in the background of the portal.
 */
function drawOctagram(ctx, cx, cy, outerRadius, innerRadius, color) {
  ctx.save();
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points; i++) {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws the vector illustration of Cute Kuromi.
 */
function drawKuromi(ctx, cx, cy, isReversed) {
  ctx.save();

  // Head center and scale
  const headY = cy + 10;
  const faceR = 52;

  // 1. Black Hood Base & Ears
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;

  // Hood background sphere
  ctx.beginPath();
  ctx.arc(cx, headY - 4, faceR + 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Left Ear (curved droop left)
  ctx.beginPath();
  ctx.moveTo(cx - 30, headY - 40);
  ctx.bezierCurveTo(cx - 70, headY - 100, cx - 110, headY - 70, cx - 105, headY - 25);
  ctx.bezierCurveTo(cx - 95, headY + 5, cx - 45, headY - 15, cx - 38, headY - 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left Ear Pink Sphere
  ctx.fillStyle = '#ff70a6';
  ctx.beginPath();
  ctx.arc(cx - 105, headY - 25, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Right Ear (curved droop right)
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 30, headY - 40);
  ctx.bezierCurveTo(cx + 70, headY - 100, cx + 110, headY - 70, cx + 105, headY - 25);
  ctx.bezierCurveTo(cx + 95, headY + 5, cx + 45, headY - 15, cx + 38, headY - 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Ear Pink Sphere
  ctx.fillStyle = '#ff70a6';
  ctx.beginPath();
  ctx.arc(cx + 105, headY - 25, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Jester Collar (3 pointed tips below face)
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;

  // Middle Point
  ctx.beginPath();
  ctx.moveTo(cx - 20, headY + 52);
  ctx.lineTo(cx, headY + 95);
  ctx.lineTo(cx + 20, headY + 52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left Point
  ctx.beginPath();
  ctx.moveTo(cx - 45, headY + 45);
  ctx.lineTo(cx - 55, headY + 85);
  ctx.lineTo(cx - 15, headY + 52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Point
  ctx.beginPath();
  ctx.moveTo(cx + 45, headY + 45);
  ctx.lineTo(cx + 55, headY + 85);
  ctx.lineTo(cx + 15, headY + 52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Collar Pink Bells / Spheres
  ctx.fillStyle = '#ff70a6';
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(cx - 55, headY + 85, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, headY + 95, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 55, headY + 85, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. White Chibi Face
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, headY + 8, faceR, faceR - 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Blushing Cheeks
  ctx.fillStyle = 'rgba(255, 112, 166, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - 28, headY + 18, 12, 7, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx + 28, headY + 18, 12, 7, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 4. Classic Kuromi Pink Skull on Forehead
  const skullY = headY - 32;
  ctx.fillStyle = '#ff70a6';
  // Skull Cranium
  ctx.beginPath();
  ctx.arc(cx, skullY, 13, 0, Math.PI * 2);
  ctx.fill();
  // Skull rounded Jaw
  ctx.beginPath();
  ctx.ellipse(cx, skullY + 9, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Skull crossbones / ears nubs
  ctx.beginPath();
  ctx.arc(cx - 10, skullY + 6, 4, 0, Math.PI * 2);
  ctx.arc(cx + 10, skullY + 6, 4, 0, Math.PI * 2);
  ctx.fill();

  // Skull Black Eyes
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(cx - 4.5, skullY + 1, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 4.5, skullY + 1, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Almond Eyes with Double Glossy Highlights
  // Left Eye
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.ellipse(cx - 22, headY + 6, 9, 13, -0.08, 0, Math.PI * 2);
  ctx.fill();
  // Left Eye Lashes
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 31, headY + 1);
  ctx.lineTo(cx - 36, headY - 3);
  ctx.stroke();

  // Left Eye Gloss
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 24, headY + 1, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 19, headY + 11, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.ellipse(cx + 22, headY + 6, 9, 13, 0.08, 0, Math.PI * 2);
  ctx.fill();
  // Right Eye Lashes
  ctx.beginPath();
  ctx.moveTo(cx + 31, headY + 1);
  ctx.lineTo(cx + 36, headY - 3);
  ctx.stroke();

  // Right Eye Gloss
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + 20, headY + 1, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 25, headY + 11, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 6. Tiny Pink Nose & "w" Mouth
  ctx.fillStyle = '#ff70a6';
  ctx.beginPath();
  ctx.arc(cx, headY + 14, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Cute "w" Smile Mouth
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Left curve of w
  ctx.arc(cx - 4.5, headY + 22, 5, 0.1 * Math.PI, 0.95 * Math.PI, false);
  ctx.stroke();
  // Right curve of w
  ctx.beginPath();
  ctx.arc(cx + 4.5, headY + 22, 5, 0.05 * Math.PI, 0.9 * Math.PI, false);
  ctx.stroke();

  ctx.restore();
}

// Cache LRU em memória para buffers de imagens renderizadas (economiza CPU/RAM)
const tarotCardCache = new Map();
const MAX_TAROT_CACHE_SIZE = 40;

/**
 * Renders the entire tarot card onto a 600x1024 Canvas and returns a PNG buffer.
 * @param {Object} card Card data from tarot.json
 * @param {'UPRIGHT'|'REVERSED'} orientation
 * @returns {Buffer}
 */
function renderTarotCard(card, orientation = 'UPRIGHT') {
  const cacheKey = `${card?.id || card?.name || 'unknown'}_${orientation}`;
  if (tarotCardCache.has(cacheKey)) {
    return tarotCardCache.get(cacheKey);
  }

  const isReversed = orientation === 'REVERSED';
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Theme Palette
  const accentColor = isReversed ? '#f43f5e' : '#c084fc';
  const glowColor = isReversed ? 'rgba(244, 63, 94, 0.35)' : 'rgba(192, 132, 252, 0.35)';
  const bgInner = isReversed ? '#4a0b1c' : '#2b1055';
  const bgMid = isReversed ? '#20040c' : '#15062a';
  const bgOuter = isReversed ? '#0c0105' : '#090212';

  // 1. Background Radial Gradient
  const portalCx = 300;
  const portalCy = 390;
  const bgGradient = ctx.createRadialGradient(portalCx, portalCy, 40, portalCx, portalCy, 520);
  bgGradient.addColorStop(0, bgInner);
  bgGradient.addColorStop(0.55, bgMid);
  bgGradient.addColorStop(1, bgOuter);

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle stardust / stars
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  const starCoords = [
    [70, 90], [130, 160], [480, 120], [530, 200], [80, 560], [520, 580],
    [100, 750], [500, 780], [70, 920], [530, 930], [220, 110], [380, 110]
  ];
  for (const [sx, sy] of starCoords) {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Double Gothic Frame with Corner Ornaments
  // Outer Border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(18, 18, WIDTH - 36, HEIGHT - 36);

  // Inner Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(26, 26, WIDTH - 52, HEIGHT - 52);

  // Corner Stars ✦
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', 26, 26);
  ctx.fillText('✦', WIDTH - 26, 26);
  ctx.fillText('✦', 26, HEIGHT - 26);
  ctx.fillText('✦', WIDTH - 26, HEIGHT - 26);

  // 3. Header: Numeral & Arcana
  // Roman Numeral
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 12;
  ctx.font = 'bold 30px serif';
  ctx.fillText(card.num || '✦', 300, 68);

  // Arcana Category
  ctx.shadowBlur = 0;
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText((card.arcana || 'ARCANOS').toUpperCase(), 300, 98);

  // 4. Central Portal (Rotatable)
  ctx.save();
  const portalR = 148;

  // If reversed, rotate portal around its center by 180 degrees
  if (isReversed) {
    ctx.translate(portalCx, portalCy);
    ctx.rotate(Math.PI);
    ctx.translate(-portalCx, -portalCy);
  }

  // Portal Background Circle with Glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 24;
  const portalGrad = ctx.createRadialGradient(portalCx, portalCy, 10, portalCx, portalCy, portalR);
  portalGrad.addColorStop(0, isReversed ? '#2d0611' : '#1e083a');
  portalGrad.addColorStop(0.85, isReversed ? '#140207' : '#0e031c');
  portalGrad.addColorStop(1, isReversed ? '#4a0b1c' : '#3b0764');

  ctx.fillStyle = portalGrad;
  ctx.beginPath();
  ctx.arc(portalCx, portalCy, portalR, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Outer Portal Ring
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(portalCx, portalCy, portalR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner Concentric Ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(portalCx, portalCy, portalR - 10, 0, Math.PI * 2);
  ctx.stroke();

  // Zodiac / Mystical Marker Dots on the ring
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const dotX = portalCx + Math.cos(angle) * (portalR - 5);
    const dotY = portalCy + Math.sin(angle) * (portalR - 5);
    ctx.fillStyle = i % 3 === 0 ? accentColor : '#ffffff';
    ctx.beginPath();
    ctx.arc(dotX, dotY, i % 3 === 0 ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mystical Octagram Star behind Kuromi
  drawOctagram(ctx, portalCx, portalCy, portalR - 18, 55, 'rgba(255, 255, 255, 0.15)');

  // Vector Kuromi
  drawKuromi(ctx, portalCx, portalCy, isReversed);

  ctx.restore();

  // 5. Orientation Badge
  const badgeY = 578;
  const badgeW = 270;
  const badgeH = 34;
  const badgeX = 300 - badgeW / 2;

  // Badge Rounded Box
  ctx.fillStyle = isReversed ? 'rgba(244, 63, 94, 0.18)' : 'rgba(192, 132, 252, 0.18)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 17);
  ctx.fill();
  ctx.stroke();

  // Badge Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 6;
  ctx.fillText(
    isReversed ? '✦ POSIÇÃO INVERTIDA ✦' : '✦ POSIÇÃO DIRETA ✦',
    300,
    badgeY + badgeH / 2 + 1
  );
  ctx.shadowBlur = 0;

  // 6. Card Name in Highlight
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px serif';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 10;
  ctx.fillText(card.name, 300, 650);
  ctx.shadowBlur = 0;

  // 7. Keywords
  ctx.fillStyle = accentColor;
  ctx.font = 'italic 15px sans-serif';
  const kwText = (card.keywords || []).join('  •  ');
  ctx.fillText(kwText, 300, 686);

  // Ornamental Horizontal Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(140, 712);
  ctx.lineTo(460, 712);
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.font = '12px sans-serif';
  ctx.fillText('✦', 300, 712);

  // 8. Interpretation Box
  const boxX = 48;
  const boxY = 734;
  const boxW = WIDTH - 96;
  const boxH = 200;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 14);
  ctx.fill();
  ctx.stroke();

  // Interpretation Text
  const interpretationText = `"${isReversed ? card.reversed : card.upright}"`;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const lines = wrapText(ctx, interpretationText, boxW - 36);
  const lineHeight = 24;
  const totalTextHeight = lines.length * lineHeight;
  const startTextY = boxY + (boxH - totalTextHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, 300, startTextY + index * lineHeight);
  });

  // 9. Footer
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('TAROT CRINGELÂNDIA  •  BOT PYXIE', 300, 978);

  const buffer = canvas.toBuffer('image/png');

  if (tarotCardCache.size >= MAX_TAROT_CACHE_SIZE) {
    const oldestKey = tarotCardCache.keys().next().value;
    if (oldestKey) tarotCardCache.delete(oldestKey);
  }
  tarotCardCache.set(cacheKey, buffer);

  return buffer;
}

/**
 * Creates a Discord AttachmentBuilder for the rendered card.
 * @param {Object} card
 * @param {'UPRIGHT'|'REVERSED'} orientation
 * @returns {AttachmentBuilder}
 */
function createTarotAttachment(card, orientation = 'UPRIGHT') {
  const buffer = renderTarotCard(card, orientation);
  return new AttachmentBuilder(buffer, { name: 'tarot_cringelandia.png' });
}

module.exports = {
  renderTarotCard,
  createTarotAttachment,
};

