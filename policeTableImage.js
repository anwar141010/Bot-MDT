const { createCanvas, loadImage } = require('canvas');

/**
 * Generate a police department table image for up to 10 soldiers.
 * @param {Array} soldiers - Array of objects: { code, name, status } where status is 'login', 'logout', or 'end_shift'.
 * @returns {Promise<Buffer>} - PNG image buffer
 */
async function generatePoliceTableImage(soldiers) {
  // إعدادات الصورة
  const width = 700, rowHeight = 54, headerHeight = 70, maxRows = 10;
  const count = soldiers.length;
  const height = headerHeight + Math.max(count, 1) * rowHeight + 20;
  const scale = 2; // جودة عالية

  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // خلفية
  ctx.fillStyle = '#181c20';
  ctx.fillRect(0, 0, width, height);

  // العنوان
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText('Police Department', 30, 45);

  // دائرة عدد المباشرين
  const directCount = soldiers.filter(s => s.status === 'login').length;
  ctx.save();
  ctx.beginPath();
  ctx.arc(width - 60, 38, 28, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#27ae60';
  ctx.fill();
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(directCount.toString(), width - 60, 46);
  ctx.restore();

  // رؤوس الأعمدة
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#b2bec3';
  ctx.textAlign = 'left';
  ctx.fillText('الحالة', 30, headerHeight);
  ctx.fillText('الكود', 100, headerHeight);
  ctx.fillText('الاسم', 200, headerHeight);

  // الصفوف
  ctx.font = '16px sans-serif';
  for (let i = 0; i < Math.max(count, 1); i++) {
    const y = headerHeight + 10 + i * rowHeight;
    // خلفية الصف
    ctx.fillStyle = i % 2 === 0 ? '#23272b' : '#202326';
    ctx.fillRect(20, y - 8, width - 40, rowHeight - 4);

    if (i >= count) continue;
    const s = soldiers[i];
    // دائرة الحالة
    let color = '#636e72';
    if (s.status === 'login') color = '#27ae60';
    else if (s.status === 'logout') color = '#e74c3c';
    ctx.save();
    ctx.beginPath();
    ctx.arc(50, y + rowHeight / 2 - 10, 14, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    // الكود
    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(s.code, 85, y + rowHeight / 2);
    // الاسم
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(s.name, 170, y + rowHeight / 2);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generatePoliceTableImage }; 
