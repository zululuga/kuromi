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

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawSpark(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.3, y - size * 0.3);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.3, y + size * 0.3);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.3, y + size * 0.3);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - size * 0.3, y - size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAvatar(ctx, member, image, centerX, centerY, radius, accentColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  if (image) {
    const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
  } else {
    ctx.fillStyle = '#4B0082';
    ctx.fill();
    ctx.fillStyle = '#FF8FB3';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((member.displayName || member.user?.username || '?').slice(0, 2).toUpperCase(), centerX, centerY);
  }
  ctx.restore();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
  ctx.stroke();
}

async function loadMemberAvatar(member) {
  const url = member.user.displayAvatarURL({ extension: 'png', size: 256 });
  return loadImage(url).catch(() => null);
}

async function renderShipCard(memberA, memberB, percent) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const accentColor = percent < 40 ? '#E60067' : percent < 70 ? '#F59E0B' : '#8B5CF6';
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#1A1A1A');
  background.addColorStop(0.55, '#260D35');
  background.addColorStop(1, '#4B0082');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(230, 0, 103, 0.14)';
  ctx.beginPath();
  ctx.arc(1050, 80, 230, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
  ctx.beginPath();
  ctx.arc(140, 650, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, WIDTH - 48, HEIGHT - 48);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(38, 38, WIDTH - 76, HEIGHT - 76);
  drawSpark(ctx, 72, 72, 13, '#FF8FB3');
  drawSpark(ctx, WIDTH - 72, HEIGHT - 72, 13, '#F59E0B');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText('CASAL DA CRINGELÂNDIA', WIDTH / 2, 88);
  ctx.fillStyle = '#FF8FB3';
  ctx.font = '20px sans-serif';
  ctx.fillText('a Kuromi juntou os destinos. Não faça disso uma cerimônia.', WIDTH / 2, 124);

  const avatarA = await loadMemberAvatar(memberA);
  const avatarB = await loadMemberAvatar(memberB);
  const centerY = 320;
  drawAvatar(ctx, memberA, avatarA, 245, centerY, 112, '#E60067');
  drawAvatar(ctx, memberB, avatarB, 955, centerY, 112, '#8B5CF6');

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 5;
  ctx.setLineDash([12, 14]);
  ctx.beginPath();
  ctx.moveTo(370, centerY);
  ctx.bezierCurveTo(500, 220, 700, 420, 830, centerY);
  ctx.stroke();
  ctx.setLineDash([]);
  drawSpark(ctx, WIDTH / 2, centerY, 22, accentColor);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 27px sans-serif';
  ctx.fillText(memberA.displayName, 245, 480);
  ctx.fillText(memberB.displayName, 955, 480);

  const barX = 300;
  const barY = 542;
  const barW = 600;
  const barH = 30;
  roundRect(ctx, barX, barY, barW, barH, 15);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fill();
  roundRect(ctx, barX, barY, Math.max(30, barW * percent / 100), barH, 15);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText(`${percent}%`, WIDTH / 2, barY + barH / 2 + 1);

  const verdict = percent < 40 ? 'química duvidosa, mas o drama está garantido' : percent < 70 ? 'há faísca. Talvez. Não me pressionem.' : 'isso está perigosamente romântico';
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'italic 22px sans-serif';
  const verdictLines = wrapText(ctx, verdict, 850);
  verdictLines.forEach((line, index) => ctx.fillText(`“${line}”`, WIDTH / 2, 615 + index * 27));

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('✦ KUROMI SUPERVISIONA O ROMANCE ✦', WIDTH / 2, 664);

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