// ملف بدء تشغيل البوت
const { spawn } = require('child_process');

console.log('🚀 بدء تشغيل MDT Discord Bot...');

// تشغيل البوت
const bot = spawn('node', ['index.js'], {
    stdio: 'inherit',
    shell: true
});

// معالجة إغلاق البوت
bot.on('close', (code) => {
    console.log(`❌ البوت توقف مع الكود: ${code}`);
    if (code !== 0) {
        console.log('🔄 إعادة تشغيل البوت...');
        setTimeout(() => {
            require('./start.js');
        }, 5000);
    }
});

// معالجة الأخطاء
bot.on('error', (error) => {
    console.error('❌ خطأ في تشغيل البوت:', error);
});

console.log('✅ تم بدء تشغيل البوت بنجاح!'); 