const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const WIDTH = 1200;
const HEIGHT = 700;

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let current = '';

  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawHeartIcon(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.4, x, y + size);
  ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.4, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAvatar(ctx, member, image, centerX, centerY, radius, ringColor) {
  ctx.save();
  // Outer glow ring
  ctx.shadowColor = ringColor;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Clip avatar circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  if (image) {
    const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
  } else {
    ctx.fillStyle = '#260d35';
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((member.displayName || member.user?.username || '?').slice(0, 2).toUpperCase(), centerX, centerY);
  }
  ctx.restore();
}

async function loadMemberAvatar(member) {
  if (!member?.user?.displayAvatarURL) return null;
  const url = member.user.displayAvatarURL({ extension: 'png', size: 256 });
  return loadImage(url).catch(() => null);
}

function getThemePalette(percent) {
  if (percent < 40) {
    return {
      accent: '#f43f5e',
      accentGlow: 'rgba(244, 63, 94, 0.4)',
      barStart: '#e11d48',
      barEnd: '#fb7185',
      verdict: 'Química duvidosa, mas o drama está garantido.',
    };
  }
  if (percent < 70) {
    return {
      accent: '#ec4899',
      accentGlow: 'rgba(236, 72, 153, 0.4)',
      barStart: '#db2777',
      barEnd: '#c084fc',
      verdict: 'Há faísca. Talvez. Não me pressionem.',
    };
  }
  return {
    accent: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.4)',
    barStart: '#9333ea',
    barEnd: '#f472b6',
    verdict: 'Isso está perigosamente romântico.',
  };
}

async function renderShipCard(memberA, memberB, percent) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const palette = getThemePalette(percent);

  // 1. Background Radial Gradient (Gothic Romantic Dark)
  const bg = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 60, WIDTH / 2, HEIGHT / 2, 750);
  bg.addColorStop(0, '#230f38');
  bg.addColorStop(0.5, '#140722');
  bg.addColorStop(1, '#090212');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle ambient nebula glows
  const glowPink = ctx.createRadialGradient(245, 320, 20, 245, 320, 260);
  glowPink.addColorStop(0, 'rgba(244, 114, 182, 0.12)');
  glowPink.addColorStop(1, 'rgba(244, 114, 182, 0)');
  ctx.fillStyle = glowPink;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glowPurple = ctx.createRadialGradient(955, 320, 20, 955, 320, 260);
  glowPurple.addColorStop(0, 'rgba(192, 132, 252, 0.12)');
  glowPurple.addColorStop(1, 'rgba(192, 132, 252, 0)');
  ctx.fillStyle = glowPurple;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Stardust sparkles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  const stars = [
    [100, 100], [200, 160], [1050, 110], [1120, 220],
    [90, 580], [160, 640], [1080, 590], [1130, 650],
    [600, 70], [600, 480], [450, 140], [750, 140]
  ];
  for (const [sx, sy] of stars) {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Double Border with Gothic Corners
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);

  ctx.fillStyle = palette.accent;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', 28, 28);
  ctx.fillText('✦', WIDTH - 28, 28);
  ctx.fillText('✦', 28, HEIGHT - 28);
  ctx.fillText('✦', WIDTH - 28, HEIGHT - 28);

  // 3. Header
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = palette.accentGlow;
  ctx.shadowBlur = 12;
  ctx.font = 'bold 38px serif';
  ctx.fillText('SHIP CRINGELÂNDIA', WIDTH / 2, 80);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '17px sans-serif';
  ctx.fillText('A Kuromi juntou os destinos. Não faça disso uma cerimônia.', WIDTH / 2, 118);

  // 4. Avatars & Bridge
  const centerY = 310;
  const avatarA = await loadMemberAvatar(memberA);
  const avatarB = await loadMemberAvatar(memberB);

  // Connecting Bridge Line (Pink to Purple Gradient)
  const bridgeGrad = ctx.createLinearGradient(370, centerY, 830, centerY);
  bridgeGrad.addColorStop(0, '#f472b6');
  bridgeGrad.addColorStop(0.5, palette.accent);
  bridgeGrad.addColorStop(1, '#c084fc');

  ctx.strokeStyle = bridgeGrad;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.moveTo(370, centerY);
  ctx.bezierCurveTo(500, 210, 700, 410, 830, centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Central Floating Heart on the bridge
  drawHeartIcon(ctx, WIDTH / 2, centerY - 14, 28, palette.accent);

  // Avatars
  drawAvatar(ctx, memberA, avatarA, 245, centerY, 105, '#f472b6');
  drawAvatar(ctx, memberB, avatarB, 955, centerY, 105, '#c084fc');

  // Display Names below avatars
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 25px sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText(memberA.displayName || 'Pessoa 1', 245, 460);
  ctx.fillText(memberB.displayName || 'Pessoa 2', 955, 460);
  ctx.shadowBlur = 0;

  // 5. Progress Bar
  const barX = 320;
  const barY = 515;
  const barW = 560;
  const barH = 32;

  // Track
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 16);
  ctx.fill();
  ctx.stroke();

  // Progress Fill
  if (percent > 0) {
    const fillWidth = Math.max(32, (barW * percent) / 100);
    const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
    fillGrad.addColorStop(0, palette.barStart);
    fillGrad.addColorStop(1, palette.barEnd);

    ctx.fillStyle = fillGrad;
    ctx.shadowColor = palette.accentGlow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, barH, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Percentage Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(`${percent}%`, WIDTH / 2, barY + barH / 2 + 1);

  // 6. Verdict Quote
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'italic 21px sans-serif';
  const verdictLines = wrapText(ctx, `“${palette.verdict}”`, 820);
  verdictLines.forEach((line, index) => {
    ctx.fillText(line, WIDTH / 2, 595 + index * 26);
  });

  // 7. Footer
  ctx.fillStyle = palette.accent;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('✦ KUROMI SUPERVISIONA O ROMANCE ✦', WIDTH / 2, 658);

  return canvas.toBuffer('image/png');
}

async function createShipAttachment(memberA, memberB, percent) {
  const buffer = await renderShipCard(memberA, memberB, percent);
  return new AttachmentBuilder(buffer, { name: 'casal_cringelandia.png' });
}

module.exports = {
  renderShipCard,
  createShipAttachment,
};