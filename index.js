const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
require('dotenv').config({ path: './config.env' });
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const { generatePoliceTableImage } = require('./policeTableImage');

// تحميل إعدادات اللوق
function loadConfig() {
    try {
        const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
        return config;
    } catch {
        return { logChannelId: '' };
    }
}
function saveConfig(config) {
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2));
}

// تحميل الهويات
function loadIdentities() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'identities.json'), 'utf8'));
    } catch {
        return {};
    }
}
function saveIdentities(data) {
    fs.writeFileSync(path.join(__dirname, 'identities.json'), JSON.stringify(data, null, 2));
}

// تحميل الجرائم
function loadCrimes() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'crimes.json'), 'utf8'));
    } catch {
        return {};
    }
}
function saveCrimes(data) {
    fs.writeFileSync(path.join(__dirname, 'crimes.json'), JSON.stringify(data, null, 2));
}

// تحميل المخالفات
function loadViolations() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'violations.json'), 'utf8'));
    } catch {
        return {};
    }
}
function saveViolations(data) {
    fs.writeFileSync(path.join(__dirname, 'violations.json'), JSON.stringify(data, null, 2));
}

// تحميل وحفظ حالة البريميوم
function loadPremium() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'premium.json'), 'utf8'));
    } catch {
        return {};
    }
}
function savePremium(data) {
    fs.writeFileSync(path.join(__dirname, 'premium.json'), JSON.stringify(data, null, 2));
}

// تحميل وحفظ إعدادات حقوق Wonder Bot
function loadRightsConfig() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'rights_config.json'), 'utf8'));
    } catch {
        return {
            enabled: true,
            buttonText: 'حقوق Wonder Bot',
            buttonUrl: 'https://discord.gg/95jJ8EnK',
            hidden: false
        };
    }
}
function saveRightsConfig(data) {
    fs.writeFileSync(path.join(__dirname, 'rights_config.json'), JSON.stringify(data, null, 2));
}
let rightsConfig = loadRightsConfig();
let premium = loadPremium();

let config = loadConfig();
let identities = loadIdentities();
let crimes = loadCrimes();
let violations = loadViolations();

// قائمة آيدي المطورين
const OWNER_IDS = [
    '1337512375355707412', // آيدي المطور الأول
    '1070609053065154631', // آيدي المطور الثاني  
    '1291805249815711826', // آيدي المطور الثالث
    '1319791882389164072'  // آيدي المطور الرابع
];

// حالة البوت في كل سيرفر
let botStatus = new Map(); // serverId => { status: 'online' | 'offline', customImage: string }

// تحميل حالة البوت
function loadBotStatus() {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'bot_status.json'), 'utf8'));
        botStatus = new Map(Object.entries(data));
    } catch {
        botStatus = new Map();
    }
}

// حفظ حالة البوت
function saveBotStatus() {
    const data = Object.fromEntries(botStatus);
    fs.writeFileSync(path.join(__dirname, 'bot_status.json'), JSON.stringify(data, null, 2));
}

// تحميل حالة البوت عند بدء التشغيل
loadBotStatus(); 

// تعريف الكلاينت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ]
});

const IMAGE_URL = 'https://media.discordapp.net/attachments/1303476251746504726/1388435070141861918/Clean_20250626_130356_.png?ex=686ed02c&is=686d7eac&hm=f24f84fada334662ac50955484efe0e59e7684e845394662e7958effb7efe80a&=&format=webp&quality=lossless';

// تعريف الأوامر الأساسية
const identityCommand = {
    name: 'هوية',
    description: 'إنشاء هوية',
    type: 1
};

const myIdentityCommand = {
    name: 'شخصيتي',
    description: 'عرض معلومات هويتك الوطنية',
    type: 1
};

const ownerCommand = {
    name: 'الاونر',
    description: 'أوامر خاصة بالمطورين',
    type: 1
};

const policeCommand = {
    name: 'شرطة',
    description: 'أمر الشرطة',
    type: 1
};

const customizeCommand = {
    name: 'تخصيص',
    description: 'تخصيص إعدادات البوت (Admins only)',
    type: 1
};

const systemCommand = {
    name: 'النضام',
    description: 'نظام نقاط الشرطة',
    type: 1
};

// دالة تحويل أسماء الشهور العربية إلى أرقام
function convertArabicMonthToNumber(monthName) {
    if (!monthName) return '00';
    
    const monthMap = {
        'يناير': '01',
        'فبراير': '02',
        'فبراير': '02', // تصحيح للكتابة الخاطئة
        'مارس': '03',
        'أبريل': '04',
        'مايو': '05',
        'يونيو': '06',
        'يوليو': '07',
        'أغسطس': '08',
        'سبتمبر': '09',
        'أكتوبر': '10',
        'نوفمبر': '11',
        'ديسمبر': '12'
    };
    
    // إذا كان الشهر رقم بالفعل، نعيده كما هو
    if (/^\d{1,2}$/.test(monthName)) {
        return monthName.padStart(2, '0');
    }
    
    return monthMap[monthName] || monthName;
}

// دوال مساعدة للصلاحيات والصور
function isBotOffline(guildId) {
    const status = botStatus.get(guildId);
    return status && status.status === 'offline';
}

function getCustomImage(guildId) {
    const status = botStatus.get(guildId);
    return status && status.customImage ? status.customImage : IMAGE_URL;
}

function hasPoliceAdminRole(member) {
    if (!config.policeAdminRoleId) return false;
    return member.roles.cache.has(config.policeAdminRoleId);
}

function canUsePoliceFeature(interaction) {
    // تحقق من الهوية
    const identity = Object.values(identities).find(id => id.userId === interaction.user.id);
    if (!identity) {
        interaction.reply({ content: '❌ يجب أن يكون لديك هوية لاستعمال ال ام دي تي العسكري', ephemeral: true });
        return false;
    }
    // تحقق من الرتبة العسكرية
    if (config.militaryRoleId && !interaction.member.roles.cache.has(config.militaryRoleId)) {
        interaction.reply({ content: '❌ يجب أن تكون عسكري لاستعمال ال ام دي تي العسكري', ephemeral: true });
        return false;
    }
    return identity;
} 

// دالة تسجيل الأوامر
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [identityCommand, customizeCommand, myIdentityCommand, ownerCommand, policeCommand, systemCommand] }
        );
    } catch (error) {
        console.error('خطأ في تسجيل الأوامر:', error);
    }
}

client.once('ready', () => {
    console.log(`✅ البوت متصل بنجاح!`);
    registerCommands();
}); 

// متغيرات لحفظ بيانات المستخدمين مؤقتًا
const userData = new Map(); // لحفظ بيانات كل مستخدم مؤقتًا
const userNationalIds = new Map(); // حفظ الأرقام الوطنية لكل مستخدم

// دالة مساعدة لإضافة خيار إعادة تعيين في نهاية أي قائمة
function withResetOption(options) {
    // إزالة أي خيار إعادة تعيين سابق
    const filtered = options.filter(opt => opt.value !== 'reset');
    return [
        ...filtered,
        { label: 'إعادة تعيين', value: 'reset' }
    ];
}

// دالة إنشاء زر حقوق Wonder Bot
function createRightsButton() {
    if (!rightsConfig.enabled || rightsConfig.hidden) {
        return null;
    }
    
    return new ButtonBuilder()
        .setLabel(rightsConfig.buttonText)
        .setURL(rightsConfig.buttonUrl)
        .setStyle(ButtonStyle.Link);
}

// دالة توليد رقم وطني فريد
function generateNationalId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// دالة تحقق اكتمال البيانات
function isIdentityComplete(data) {
    return data.fullName && data.gender && data.city && data.year && data.month && data.day;
}

// دالة بناء الأزرار حسب حالة البيانات
function buildStepButtons(data) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('set_full_name')
            .setLabel('الاسم الكامل')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!!data.fullName),
        new ButtonBuilder()
            .setCustomId('set_gender')
            .setLabel('الجنس')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!data.fullName || !!data.gender),
        new ButtonBuilder()
            .setCustomId('set_city')
            .setLabel('مكان الولادة')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!data.gender || !!data.city),
        new ButtonBuilder()
            .setCustomId('set_birthdate')
            .setLabel('تاريخ الميلاد')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!data.city || !!(data.year && data.month && data.day)),
        new ButtonBuilder()
            .setCustomId('finish_identity')
            .setLabel('إنهاء')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!isIdentityComplete(data))
    );
} 

// التعامل مع الأحداث
client.on(Events.InteractionCreate, async interaction => {
    console.log('Interaction received:', interaction.type, interaction.customId || interaction.commandName);
    
    // أمر /هوية (Admins only)
    if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'هوية') {
        // المطورين يمكنهم استخدام جميع الأوامر حتى لو كان البوت متوقف
        if (!OWNER_IDS.includes(interaction.user.id)) {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: '❌ هذا الأمر متاح فقط للأدمن.', ephemeral: true });
                return;
            }
            
            // التحقق من حالة البوت
            if (isBotOffline(interaction.guildId)) {
                await interaction.reply({ 
                    content: '❌ البوت حالياً متوقف من قبل المطورين يرجى التواصل مع أحد المطورين <@1337512375355707412> <@1070609053065154631> <@1291805249815711826>', 
                    ephemeral: true 
                });
                return;
            }
        }
        // أزرار مفعلة للجميع دائمًا
        userData.set(interaction.user.id, { fullName: null, gender: null, city: null, year: null, month: null, day: null });
        const embed = new EmbedBuilder()
            .setTitle('من هنا تنشئ هويتك الوطنية')
            .setDescription('يرجى تعبئة جميع البيانات عبر الأزرار أدناه:')
            .setColor('#0099ff')
            .setImage(getCustomImage(interaction.guildId));
        
        const row = buildStepButtons({});
        const rightsButton = createRightsButton();
        
        let components = [row];
        if (rightsButton) {
            const rightsRow = new ActionRowBuilder().addComponents(rightsButton);
            components.push(rightsRow);
        }
        
        await interaction.reply({ embeds: [embed], components: components });
        return;
    }

    // أزرار الهوية
    if (interaction.isButton()) {
        const userId = interaction.user.id;
        
        // المطورين يمكنهم استخدام جميع الأوامر حتى لو كان البوت متوقف
        if (!OWNER_IDS.includes(interaction.user.id)) {
            // التحقق من حالة البوت
            if (isBotOffline(interaction.guildId)) {
                await interaction.reply({ 
                    content: '❌ البوت حالياً متوقف من قبل المطورين يرجى التواصل مع أحد المطورين <@1337512375355707412> <@1070609053065154631> <@1291805249815711826>', 
                    ephemeral: true 
                });
                return;
            }
        }
        
        // تحقق فقط إذا كان الزر من أزرار إنشاء الهوية للمستخدم
        const creationButtons = [
            'set_full_name', 'set_gender', 'set_city', 'set_birthdate', 'finish_identity'
        ];
        if (creationButtons.includes(interaction.customId)) {
            const hasIdentity = Object.values(identities).some(id => id.userId === userId);
            if (hasIdentity) {
                await interaction.reply({
                    content: 'لديك هوية بالفعل، لا يمكن إنشاء هوية أخرى أو تعديل على الهوية.',
                    ephemeral: true
                });
                return;
            }
        }
        
        const data = userData.get(userId) || { fullName: null, gender: null, city: null, year: null, month: null, day: null };
        
        if (interaction.customId === 'set_full_name') {
            const modal = new ModalBuilder()
                .setCustomId('modal_full_name')
                .setTitle('الاسم الكامل')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('full_name')
                            .setLabel('أدخل اسمك الكامل')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.customId === 'set_gender') {
            const genderMenu = new StringSelectMenuBuilder()
                .setCustomId('select_gender')
                .setPlaceholder('اختر الجنس')
                .addOptions(withResetOption([
                    { label: 'ذكر', value: 'ذكر' },
                    { label: 'أنثى', value: 'أنثى' }
                ]));
            const row = new ActionRowBuilder().addComponents(genderMenu);
            await interaction.reply({ content: 'اختر الجنس:', components: [row], ephemeral: true });
            return;
        }
        
        if (interaction.customId === 'set_city') {
            const cityMenu = new StringSelectMenuBuilder()
                .setCustomId('select_city')
                .setPlaceholder('اختر مكان الولادة')
                .addOptions(withResetOption([
                    { label: 'لوس سانتوس', value: 'لوس سانتوس' },
                    { label: 'بوليتو', value: 'بوليتو' },
                    { label: 'ساندي شور', value: 'ساندي شور' }
                ]));
            const row = new ActionRowBuilder().addComponents(cityMenu);
            await interaction.reply({ content: 'اختر مكان الولادة:', components: [row], ephemeral: true });
            return;
        }
        
        if (interaction.customId === 'set_birthdate') {
            // قائمة السنوات
            const years = Array.from({ length: 24 }, (_, i) => 1990 + i);
            const yearMenu = new StringSelectMenuBuilder()
                .setCustomId('select_year')
                .setPlaceholder('اختر سنة الميلاد')
                .addOptions(withResetOption(years.map(y => ({ label: y.toString(), value: y.toString() }))));
            const row = new ActionRowBuilder().addComponents(yearMenu);
            await interaction.reply({ content: 'اختر سنة الميلاد:', components: [row], ephemeral: true });
            return;
        }
        
        if (interaction.customId === 'finish_identity') {
            if (!isIdentityComplete(data)) {
                await interaction.reply({ content: 'يرجى تعبئة جميع البيانات أولاً.', ephemeral: true });
                return;
            }
            // حفظ الهوية
            const nationalId = generateNationalId();
            identities[nationalId] = { ...data, userId, nationalId };
            saveIdentities(identities);
            // إرسال للوق
            const logChannel = config.logChannelId && interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('بطاقة هوية جديدة')
                    .setColor('#0099ff')
                    .setImage(IMAGE_URL)
                    .addFields(
                        { name: 'الاسم الكامل', value: data.fullName, inline: false },
                        { name: 'الجنس', value: data.gender, inline: true },
                        { name: 'تاريخ الميلاد', value: `${data.day.padStart(2, '0')}/${convertArabicMonthToNumber(data.month)}/${data.year}`, inline: true },
                        { name: 'مكان الولادة', value: data.city, inline: true },
                        { name: 'الرقم الوطني', value: nationalId, inline: true },
                        { name: 'أنشئت بواسطة', value: `<@${userId}>`, inline: false }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
            // الرد بشكل مؤجل
            await interaction.deferReply({ ephemeral: true });
            // إرسال DM بعد الرد
            try {
                await interaction.user.send(`تم إنشاء هويتك بنجاح! رقم هويتك الوطني: **${nationalId}**`);
            } catch {}
            await interaction.editReply({ content: '✅ تم إنشاء الهوية بنجاح!' });
            userData.delete(userId);
            return;
        }
        
        // التعامل مع زر الأيام 25-31
        if (interaction.customId === 'more_days') {
            const userId = interaction.user.id;
            const data = userData.get(userId) || {};
            
            const moreDays = Array.from({ length: 7 }, (_, i) => (i + 25).toString());
            const dayMenu = new StringSelectMenuBuilder()
                .setCustomId('select_day')
                .setPlaceholder('اختر يوم الميلاد (25-31)')
                .addOptions(withResetOption(moreDays.map(d => ({ label: d, value: d }))));
            const row = new ActionRowBuilder().addComponents(dayMenu);
            
            // زر العودة للأيام 1-24
            const backButton = new ButtonBuilder()
                .setCustomId('back_to_days_1_24')
                .setLabel('الأيام 1-24')
                .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder().addComponents(backButton);
            
            await interaction.update({ 
                content: 'اختر يوم الميلاد:', 
                components: [row, buttonRow], 
                ephemeral: true 
            });
            return;
        }
        
        // التعامل مع زر العودة للأيام 1-24
        if (interaction.customId === 'back_to_days_1_24') {
            const userId = interaction.user.id;
            const data = userData.get(userId) || {};
            
            const days = Array.from({ length: 24 }, (_, i) => (i + 1).toString());
            const dayMenu = new StringSelectMenuBuilder()
                .setCustomId('select_day')
                .setPlaceholder('اختر يوم الميلاد (1-24)')
                .addOptions(withResetOption(days.map(d => ({ label: d, value: d }))));
            const row = new ActionRowBuilder().addComponents(dayMenu);
            
            // إضافة زر للوصول للأيام 25-31
            const moreDaysButton = new ButtonBuilder()
                .setCustomId('more_days')
                .setLabel('الأيام 25-31')
                .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder().addComponents(moreDaysButton);
            
            await interaction.update({ 
                content: 'اختر يوم الميلاد:', 
                components: [row, buttonRow], 
                ephemeral: true 
            });
            return;
        }
    }

    // استقبال مودال تعديل الهوية
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'edit_identity_modal') {
        const userId = interaction.user.id;
        const userDataEntry = userData.get(userId);
        
        if (!userDataEntry || !userDataEntry.editingMode) {
            await interaction.reply({ content: '❌ خطأ في عملية التعديل.', ephemeral: true });
            return;
        }
        
        const fullName = interaction.fields.getTextInputValue('edit_full_name');
        const gender = interaction.fields.getTextInputValue('edit_gender');
        const city = interaction.fields.getTextInputValue('edit_city');
        const birthdate = interaction.fields.getTextInputValue('edit_birthdate');
        
        // تحليل تاريخ الميلاد
        const birthdateParts = birthdate.split('/');
        if (birthdateParts.length !== 3) {
            await interaction.reply({ content: '❌ تنسيق تاريخ الميلاد غير صحيح. استخدم: يوم/شهر/سنة', ephemeral: true });
            return;
        }
        
        const [day, month, year] = birthdateParts;
        
        // تحديث الهوية
        const nationalId = userDataEntry.editingNationalId;
        identities[nationalId] = {
            ...identities[nationalId],
            fullName,
            gender,
            city,
            day,
            month,
            year
        };
        
        saveIdentities(identities);
        
        // إزالة بيانات التعديل
        userData.delete(userId);
        
        await interaction.reply({ 
            content: `✅ تم تعديل هوية **${fullName}** بنجاح!`, 
            ephemeral: true 
        });
        return;
    }

    // استقبال مودال الاسم الكامل
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_full_name') {
        const userId = interaction.user.id;
        
        // المطورين يمكنهم استخدام جميع الأوامر حتى لو كان البوت متوقف
        if (!OWNER_IDS.includes(interaction.user.id)) {
            // التحقق من حالة البوت
            if (isBotOffline(interaction.guildId)) {
                await interaction.reply({ 
                    content: '❌ البوت حالياً متوقف من قبل المطورين يرجى التواصل مع أحد المطورين <@1337512375355707412> <@1070609053065154631> <@1291805249815711826>', 
                    ephemeral: true 
                });
                return;
            }
        }
        
        const data = userData.get(userId) || {};
        data.fullName = interaction.fields.getTextInputValue('full_name');
        userData.set(userId, data);
        await interaction.reply({
            content: 'أكمل الخطوة التالية:',
            ephemeral: true,
            components: [buildStepButtons(data)]
        });
        return;
    }

    // استقبال القوائم المنسدلة
    if (interaction.isStringSelectMenu()) {
        const userId = interaction.user.id;
        
        // المطورين يمكنهم استخدام جميع الأوامر حتى لو كان البوت متوقف
        if (!OWNER_IDS.includes(interaction.user.id)) {
            // التحقق من حالة البوت
            if (isBotOffline(interaction.guildId)) {
                await interaction.reply({ 
                    content: '❌ البوت حالياً متوقف من قبل المطورين يرجى التواصل مع أحد المطورين <@1337512375355707412> <@1070609053065154631> <@1291805249815711826>', 
                    ephemeral: true 
                });
                return;
            }
        }
        
        const data = userData.get(userId) || {};
        
        if (interaction.customId === 'select_gender') {
            if (interaction.values[0] === 'reset') {
                data.gender = null;
            } else {
                data.gender = interaction.values[0];
            }
            userData.set(userId, data);
            await interaction.update({
                content: 'أكمل الخطوة التالية:',
                ephemeral: true,
                components: [buildStepButtons(data)]
            });
            return;
        }
        
        if (interaction.customId === 'select_city') {
            if (interaction.values[0] === 'reset') {
                data.city = null;
            } else {
                data.city = interaction.values[0];
            }
            userData.set(userId, data);
            await interaction.update({
                content: 'أكمل الخطوة التالية:',
                ephemeral: true,
                components: [buildStepButtons(data)]
            });
            return;
        }
        
        if (interaction.customId === 'select_year') {
            if (interaction.values[0] === 'reset') {
                data.year = null;
                data.month = null;
                data.day = null;
                userData.set(userId, data);
                await interaction.update({
                    content: 'أكمل الخطوة التالية:',
                    ephemeral: true,
                    components: [buildStepButtons(data)]
                });
                return;
            } else {
                data.year = interaction.values[0];
                userData.set(userId, data);
                // بعد اختيار السنة، نطلب الشهر
                const months = [
                    { label: 'يناير', value: 'يناير' },
                    { label: 'فبراير', value: 'فبراير' },
                    { label: 'مارس', value: 'مارس' },
                    { label: 'أبريل', value: 'أبريل' },
                    { label: 'مايو', value: 'مايو' },
                    { label: 'يونيو', value: 'يونيو' },
                    { label: 'يوليو', value: 'يوليو' },
                    { label: 'أغسطس', value: 'أغسطس' },
                    { label: 'سبتمبر', value: 'سبتمبر' },
                    { label: 'أكتوبر', value: 'أكتوبر' },
                    { label: 'نوفمبر', value: 'نوفمبر' },
                    { label: 'ديسمبر', value: 'ديسمبر' }
                ];
                const monthMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_month')
                    .setPlaceholder('اختر شهر الميلاد')
                    .addOptions(withResetOption(months));
                const row = new ActionRowBuilder().addComponents(monthMenu);
                await interaction.update({ content: 'اختر شهر الميلاد:', components: [row], ephemeral: true });
                return;
            }
        }
        
        if (interaction.customId === 'select_month') {
            if (interaction.values[0] === 'reset') {
                data.month = null;
                data.day = null;
                userData.set(userId, data);
                await interaction.update({
                    content: 'أكمل الخطوة التالية:',
                    ephemeral: true,
                    components: [buildStepButtons(data)]
                });
                return;
            } else {
                data.month = interaction.values[0];
                userData.set(userId, data);
                // بعد اختيار الشهر، نطلب اليوم
                const days = Array.from({ length: 24 }, (_, i) => (i + 1).toString());
                const dayMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_day')
                    .setPlaceholder('اختر يوم الميلاد (1-24)')
                    .addOptions(withResetOption(days.map(d => ({ label: d, value: d }))));
                const row = new ActionRowBuilder().addComponents(dayMenu);
                
                // إضافة زر للوصول للأيام 25-31
                const moreDaysButton = new ButtonBuilder()
                    .setCustomId('more_days')
                    .setLabel('الأيام 25-31')
                    .setStyle(ButtonStyle.Secondary);
                const buttonRow = new ActionRowBuilder().addComponents(moreDaysButton);
                
                await interaction.update({ 
                    content: 'اختر يوم الميلاد:', 
                    components: [row, buttonRow], 
                    ephemeral: true 
                });
                return;
            }
        }
        
        if (interaction.customId === 'select_day') {
            if (interaction.values[0] === 'reset') {
                data.day = null;
                userData.set(userId, data);
                await interaction.update({
                    content: 'أكمل الخطوة التالية:',
                    ephemeral: true,
                    components: [buildStepButtons(data)]
                });
                return;
            } else {
                data.day = interaction.values[0];
                userData.set(userId, data);
                await interaction.reply({
                    content: 'أكمل الخطوة التالية:',
                    ephemeral: true,
                    components: [buildStepButtons(data)]
                });
                return;
            }
        }
    }

    // أمر /تخصيص (Admins only)
    if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'تخصيص') {
        // المطورين يمكنهم استخدام جميع الأوامر حتى لو كان البوت متوقف
        if (!OWNER_IDS.includes(interaction.user.id)) {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: '❌ هذا الأمر متاح فقط للأدمن.', ephemeral: true });
                return;
            }
            
            // التحقق من حالة البوت
            if (isBotOffline(interaction.guildId)) {
                await interaction.reply({ 
                    content: '❌ البوت حالياً متوقف من قبل المطورين يرجى التواصل مع أحد المطورين <@1337512375355707412> <@1070609053065154631> <@1291805249815711826>', 
                    ephemeral: true 
                });
                return;
            }
        }
        // Embed مع صورة الهوية
        const embed = new EmbedBuilder()
            .setTitle('لوحة التخصيص')
            .setDescription('اختر إجراء من القائمة أدناه:')
            .setColor('#f1c40f')
            .setImage(getCustomImage(interaction.guildId));
        // قائمة منسدلة فيها خيارين
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('customize_select')
            .setPlaceholder('اختر إجراء')
            .addOptions([
                { label: 'تعيين لوق الهوية', value: 'set_log' },
                { label: 'تعيين لوق الجرائم', value: 'set_crimes_log' },
                { label: 'تعيين روم مباشرة العسكر', value: 'set_direct_military_room' },
                { label: 'تعيين روم لوق الشرطة', value: 'set_police_log_room' },
                { label: 'حذف هوية & تعديل هوية', value: 'delete_identity' },
                { label: 'إضافة رتبة عسكرية', value: 'set_military_role' },
                { label: 'إضافة رتبة مسؤول الشرطة', value: 'set_police_admin_role' },
                { label: 'رؤية التعديلات', value: 'view_settings' },
                { label: 'إعادة تعيين', value: 'reset' }
            ]);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع أزرار "رؤية المزيد" للهويات
    if (interaction.isButton() && interaction.customId.startsWith('view_more_identities_')) {
        const pageNumber = parseInt(interaction.customId.split('_')[3]);
        const identityOptions = Object.values(identities).map(id => ({
            label: id.fullName,
            value: id.nationalId
        }));
        
        const pageSize = 24;
        const totalPages = Math.ceil(identityOptions.length / pageSize);
        const startIndex = pageNumber * pageSize;
        const endIndex = Math.min(startIndex + pageSize, identityOptions.length);
        const pageOptions = identityOptions.slice(startIndex, endIndex);
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_identity_to_manage_page_${pageNumber}`)
            .setPlaceholder('اختر هوية')
            .addOptions(pageOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        let components = [row];
        if (endIndex < identityOptions.length) {
            const moreButton = new ButtonBuilder()
                .setCustomId(`view_more_identities_${pageNumber + 1}`)
                .setLabel('رؤية المزيد')
                .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder().addComponents(moreButton);
            components.push(buttonRow);
        }
        
        const embed = new EmbedBuilder()
            .setTitle('حذف أو تعديل هوية')
            .setDescription(`اختر هوية من القائمة لإدارتها (الصفحة ${pageNumber + 1} من ${totalPages})`)
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId));
        
        await interaction.update({ embeds: [embed], components: components, ephemeral: true });
        return;
    }

    // التعامل مع أزرار "رؤية المزيد" للعسكريين
    if (interaction.isButton() && interaction.customId.startsWith('view_more_military_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const pageNumber = parseInt(interaction.customId.split('_')[3]);
        const militaryMembers = Object.values(identities).filter(id => id.policeCode);
        
        const pageSize = 24;
        const totalPages = Math.ceil(militaryMembers.length / pageSize);
        const startIndex = pageNumber * pageSize;
        const endIndex = Math.min(startIndex + pageSize, militaryMembers.length);
        const pageMembers = militaryMembers.slice(startIndex, endIndex);
        
        const memberOptions = pageMembers.map(member => ({
            label: `${member.fullName} (${member.policeCode})`,
            value: member.nationalId,
            description: `نقاط: ${member.points || 0}`
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`manage_military_member_page_${pageNumber}`)
            .setPlaceholder('اختر عسكري لإدارته')
            .addOptions(memberOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        let components = [row];
        if (endIndex < militaryMembers.length) {
            const moreButton = new ButtonBuilder()
                .setCustomId(`view_more_military_${pageNumber + 1}`)
                .setLabel('رؤية المزيد')
                .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder().addComponents(moreButton);
            components.push(buttonRow);
        }
        
        const embed = new EmbedBuilder()
            .setTitle('إدارة العسكريين')
            .setDescription(`اختر عسكري من القائمة لإدارته (الصفحة ${pageNumber + 1} من ${totalPages})`)
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId));
        
        await interaction.update({ embeds: [embed], components: components, ephemeral: true });
        return;
    }

    // التعامل مع أزرار "رؤية المزيد" للنقاط
    if (interaction.isButton() && interaction.customId.startsWith('view_more_points_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const pageNumber = parseInt(interaction.customId.split('_')[3]);
        const militaryMembers = Object.values(identities).filter(id => id.policeCode);
        
        const pageSize = 24;
        const totalPages = Math.ceil(militaryMembers.length / pageSize);
        const startIndex = pageNumber * pageSize;
        const endIndex = Math.min(startIndex + pageSize, militaryMembers.length);
        const pageMembers = militaryMembers.slice(startIndex, endIndex);
        
        const memberOptions = pageMembers.map(member => ({
            label: `${member.fullName} (${member.policeCode})`,
            value: member.nationalId,
            description: `نقاط: ${member.points || 0}`
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`manage_points_member_page_${pageNumber}`)
            .setPlaceholder('اختر عسكري لإدارة نقاطه')
            .addOptions(memberOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        let components = [row];
        if (endIndex < militaryMembers.length) {
            const moreButton = new ButtonBuilder()
                .setCustomId(`view_more_points_${pageNumber + 1}`)
                .setLabel('رؤية المزيد')
                .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder().addComponents(moreButton);
            components.push(buttonRow);
        }
        
        const embed = new EmbedBuilder()
            .setTitle('إدارة النقاط')
            .setDescription(`اختر عسكري من القائمة لإدارة نقاطه (الصفحة ${pageNumber + 1} من ${totalPages})`)
            .setColor('#f39c12')
            .setImage(getCustomImage(interaction.guildId));
        
        await interaction.update({ embeds: [embed], components: components, ephemeral: true });
        return;
    }

    // التعامل مع القائمة المنسدلة في /تخصيص
    if (interaction.isStringSelectMenu() && interaction.customId === 'customize_select') {
        if (interaction.values[0] === 'set_log') {
            // مودال تعيين لوق الهوية
            const modal = new ModalBuilder()
                .setCustomId('customize_log_modal')
                .setTitle('تعيين لوق الهوية')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('log_channel_id')
                            .setLabel('أدخل آيدي قناة اللوق')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'set_crimes_log') {
            // مودال تعيين لوق الجرائم
            const modal = new ModalBuilder()
                .setCustomId('set_crimes_log_modal')
                .setTitle('تعيين لوق الجرائم')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('crimes_log_channel_id')
                            .setLabel('أدخل آيدي قناة لوق الجرائم')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'delete_identity') {
            // قائمة منسدلة بجميع الشخصيات (الاسم الكامل فقط)
            const identityOptions = Object.values(identities).map(id => ({
                label: id.fullName,
                value: id.nationalId
            }));
            if (identityOptions.length === 0) {
                await interaction.reply({ content: 'لا توجد أي هويات حالياً.', ephemeral: true });
                return;
            }
            
            // نظام الصفحات - عرض أول 24 هوية فقط
            const pageSize = 24;
            const firstPageOptions = identityOptions.slice(0, pageSize);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_identity_to_manage_page_0')
                .setPlaceholder('اختر هوية')
                .addOptions(firstPageOptions);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            // إضافة زر "رؤية المزيد" إذا كان هناك المزيد من الهويات
            let components = [row];
            if (identityOptions.length > pageSize) {
                const moreButton = new ButtonBuilder()
                    .setCustomId('view_more_identities_1')
                    .setLabel('رؤية المزيد')
                    .setStyle(ButtonStyle.Secondary);
                const buttonRow = new ActionRowBuilder().addComponents(moreButton);
                components.push(buttonRow);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('حذف أو تعديل هوية')
                .setDescription(`اختر هوية من القائمة لإدارتها (الصفحة 1 من ${Math.ceil(identityOptions.length / pageSize)})`)
                .setColor('#e74c3c')
                .setImage(getCustomImage(interaction.guildId));
            await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'set_military_role') {
            // مودال لتعيين الرتبة العسكرية
            const modal = new ModalBuilder()
                .setCustomId('set_military_role_modal')
                .setTitle('تعيين رتبة عسكرية')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('military_role')
                            .setLabel('آيدي الرتبة العسكرية')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMinLength(1)
                            .setMaxLength(50)
                            .setPlaceholder('مثال: 123456789012345678')
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'set_police_admin_role') {
            // مودال لتعيين رتبة مسؤول الشرطة
            const modal = new ModalBuilder()
                .setCustomId('set_police_admin_role_modal')
                .setTitle('تعيين رتبة مسؤول الشرطة')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('police_admin_role')
                            .setLabel('آيدي رتبة مسؤول الشرطة')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMinLength(1)
                            .setMaxLength(50)
                            .setPlaceholder('مثال: 123456789012345678')
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🔧 لوحة تحكم المطورين')
                .setDescription('مرحباً بك في لوحة تحكم المطورين. اختر إجراء من القائمة أدناه:')
                .setColor('#ff6b6b')
                .setImage(IMAGE_URL);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('owner_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'إحصائيات البوت', value: 'bot_stats' },
                    { label: 'إيقاف | تشغيل البوت', value: 'bot_toggle' },
                    { label: 'تغيير إمبد', value: 'change_embed' },
                    { label: 'تغيير حقوق', value: 'change_rights' },
                    { label: 'تفعيل', value: 'activate' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'view_settings') {
            // جلب الإعدادات الحالية
            const logChannel = config.logChannelId ? `<#${config.logChannelId}>` : 'غير محدد';
            const crimesLogChannel = config.crimesLogChannelId ? `<#${config.crimesLogChannelId}>` : 'غير محدد';
            const directMilitaryRoom = config.directMilitaryRoomId ? `<#${config.directMilitaryRoomId}>` : 'غير محدد';
            const policeLogRoom = config.policeLogChannelId ? `<#${config.policeLogChannelId}>` : 'غير محدد';
            let militaryRole = 'غير محدد';
            let policeAdminRole = 'غير محدد';
            try {
                if (config.militaryRoleId) {
                    const role = interaction.guild.roles.cache.get(config.militaryRoleId);
                    if (role) militaryRole = `<@&${role.id}>`;
                }
                if (config.policeAdminRoleId) {
                    const role = interaction.guild.roles.cache.get(config.policeAdminRoleId);
                    if (role) policeAdminRole = `<@&${role.id}>`;
                }
            } catch {}
            const embed = new EmbedBuilder()
                .setTitle('🔎 ملخص التعديلات والإعدادات')
                .setColor('#f39c12')
                .addFields(
                    { name: 'لوق الهوية', value: logChannel, inline: true },
                    { name: 'لوق الجرائم', value: crimesLogChannel, inline: true },
                    { name: 'روم مباشرة العسكر', value: directMilitaryRoom, inline: true },
                    { name: 'روم لوق الشرطة', value: policeLogRoom, inline: true },
                    { name: 'الرتبة العسكرية', value: militaryRole, inline: true },
                    { name: 'رتبة مسؤول الشرطة', value: policeAdminRole, inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        if (interaction.values[0] === 'set_direct_military_room') {
            // مودال تعيين روم مباشرة العسكر
            const modal = new ModalBuilder()
                .setCustomId('set_direct_military_room_modal')
                .setTitle('تعيين روم مباشرة العسكر')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('direct_military_room_id')
                            .setLabel('أدخل آيدي الروم')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        if (interaction.values[0] === 'set_police_log_room') {
            // مودال تعيين روم لوق الشرطة
            const modal = new ModalBuilder()
                .setCustomId('set_police_log_room_modal')
                .setTitle('تعيين روم لوق الشرطة')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('police_log_room_id')
                            .setLabel('أدخل آيدي الروم')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
    }

    // استقبال مودال تعيين لوق الهوية
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'customize_log_modal') {
        const logChannelId = interaction.fields.getTextInputValue('log_channel_id');
        config.logChannelId = logChannelId;
        saveConfig(config);
        await interaction.reply({ content: '✅ تم حفظ قناة اللوق بنجاح!', ephemeral: true });
        return;
    }

    // استقبال مودال تعيين لوق الجرائم
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set_crimes_log_modal') {
        const logChannelId = interaction.fields.getTextInputValue('crimes_log_channel_id');
        config.crimesLogChannelId = logChannelId;
        saveConfig(config);
        await interaction.reply({ content: '✅ تم حفظ قناة لوق الجرائم بنجاح!', ephemeral: true });
        return;
    }

    // استقبال مودال تعيين رتبة عسكرية
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set_military_role_modal') {
        const roleId = interaction.fields.getTextInputValue('military_role');
        config.militaryRoleId = roleId;
        saveConfig(config);
        await interaction.reply({ content: '✅ تم حفظ رتبة العسكرية بنجاح!', ephemeral: true });
        return;
    }

    // استقبال مودال تعيين رتبة مسؤول الشرطة
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set_police_admin_role_modal') {
        const roleId = interaction.fields.getTextInputValue('police_admin_role');
        config.policeAdminRoleId = roleId;
        saveConfig(config);
        await interaction.reply({ content: '✅ تم حفظ رتبة مسؤول الشرطة بنجاح!', ephemeral: true });
        return;
    }

    // استقبال مودال البحث عن شخص
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'search_person_modal') {
        const searchQuery = interaction.fields.getTextInputValue('search_query');
        
        // البحث في الهويات
        const foundIdentity = Object.values(identities).find(id => 
            id.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            id.nationalId === searchQuery
        );
        
        if (!foundIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على شخص بهذا الاسم أو الرقم الوطني.', ephemeral: true });
            return;
        }
        
        // إنشاء embed بمعلومات الشخص
        const embed = new EmbedBuilder()
            .setTitle(`🔍 نتائج البحث: ${foundIdentity.fullName}`)
            .setColor('#3498db')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'الاسم الكامل', value: foundIdentity.fullName, inline: true },
                { name: 'الجنس', value: foundIdentity.gender, inline: true },
                { name: 'تاريخ الميلاد', value: `${foundIdentity.day.padStart(2, '0')}/${convertArabicMonthToNumber(foundIdentity.month)}/${foundIdentity.year}`, inline: true },
                { name: 'مكان الولادة', value: foundIdentity.city, inline: true },
                { name: 'الرقم الوطني', value: foundIdentity.nationalId, inline: true },
                { name: 'صاحب الهوية', value: `<@${foundIdentity.userId}>`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // استقبال مودال سجل الجرائم
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'crime_record_modal') {
        const searchQuery = interaction.fields.getTextInputValue('search_query');
        
        // البحث في الهويات
        const foundIdentity = Object.values(identities).find(id => 
            id.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            id.nationalId === searchQuery
        );
        
        if (!foundIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على شخص بهذا الاسم أو الرقم الوطني.', ephemeral: true });
            return;
        }
        
        const userCrimes = crimes[foundIdentity.nationalId] || [];
        
        if (userCrimes.length === 0) {
            // إنشاء نفس الصورة مع نص أحمر "لا يوجد جرائم لهذا الشخص"
            const buffer = await createCrimePage(foundIdentity, [], 0, interaction, true); // true = no crimes
            const attachment = new AttachmentBuilder(buffer, { name: 'crime_record.png' });
            await interaction.reply({ files: [attachment], ephemeral: true });
            return;
        }
        
        const crimesPerPage = 8;
        const pageNumber = 0;
        const totalPages = Math.ceil(userCrimes.length / crimesPerPage) || 1;
        const buffer = await createCrimePage(foundIdentity, userCrimes, pageNumber, interaction, false);
        const attachment = new AttachmentBuilder(buffer, { name: 'crime_record.png' });
        // أزرار تصفح الصفحات إذا كان هناك أكثر من صفحة
        let components = [];
        if (totalPages > 1) {
            const nextBtn = new ButtonBuilder()
                .setCustomId(`crime_page_${foundIdentity.nationalId}_${pageNumber + 1}`)
                .setLabel('التالي')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNumber + 1 >= totalPages);
            const row = new ActionRowBuilder().addComponents(nextBtn);
            components = [row];
        }
        await interaction.reply({ files: [attachment], components, ephemeral: true });
        return;
    }

    // التعامل مع أزرار تصفح صفحات سجل الجرائم
    if (interaction.isButton() && interaction.customId.startsWith('crime_page_')) {
        // customId: crime_page_{nationalId}_{pageNumber}
        const parts = interaction.customId.split('_');
        const nationalId = parts[2];
        const pageNumber = parseInt(parts[3]);
        const foundIdentity = identities[nationalId];
        const userCrimes = crimes[nationalId] || [];
        const crimesPerPage = 8;
        const totalPages = Math.ceil(userCrimes.length / crimesPerPage) || 1;
        const buffer = await createCrimePage(foundIdentity, userCrimes, pageNumber, interaction, false);
        const attachment = new AttachmentBuilder(buffer, { name: 'crime_record.png' });
        // أزرار تصفح الصفحات
        let components = [];
        const prevBtn = new ButtonBuilder()
            .setCustomId(`crime_page_${nationalId}_${pageNumber - 1}`)
            .setLabel('السابق')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageNumber <= 0);
        const nextBtn = new ButtonBuilder()
            .setCustomId(`crime_page_${nationalId}_${pageNumber + 1}`)
            .setLabel('التالي')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNumber + 1 >= totalPages);
        const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);
        components = [row];
        await interaction.update({ files: [attachment], components, ephemeral: true });
        return;
    }

    // استقبال مودال تعيين روم مباشرة العسكر
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set_direct_military_room_modal') {
        console.log('تم استقبال مودال تعيين روم مباشرة العسكر');
        try {
            const roomId = interaction.fields.getTextInputValue('direct_military_room_id');
            console.log('آيدي الروم المدخل:', roomId);
            config.directMilitaryRoomId = roomId;
            saveConfig(config);
            console.log('تم حفظ config:', config);
            await interaction.reply({ content: '✅ تم حفظ روم مباشرة العسكر بنجاح!', ephemeral: true });
        } catch (error) {
            console.error('خطأ في حفظ روم مباشرة العسكر:', error);
            await interaction.reply({ content: '❌ حدث خطأ في حفظ روم مباشرة العسكر', ephemeral: true });
        }
        return;
    }

    // استقبال مودال تعيين روم لوق الشرطة
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set_police_log_room_modal') {
        console.log('تم استقبال مودال تعيين روم لوق الشرطة');
        try {
            const roomId = interaction.fields.getTextInputValue('police_log_room_id');
            console.log('آيدي الروم المدخل:', roomId);
            config.policeLogChannelId = roomId;
            saveConfig(config);
            console.log('تم حفظ config:', config);
            await interaction.reply({ content: '✅ تم حفظ روم لوق الشرطة بنجاح!', ephemeral: true });
        } catch (error) {
            console.error('خطأ في حفظ روم لوق الشرطة:', error);
            await interaction.reply({ content: '❌ حدث خطأ في حفظ روم لوق الشرطة', ephemeral: true });
        }
        return;
    }

    // التعامل مع إدارة الجرائم
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'manage_crimes_modal') {
        const searchQuery = interaction.fields.getTextInputValue('search_query');
        
        // البحث في الهويات
        const foundIdentity = Object.values(identities).find(id => 
            id.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            id.nationalId === searchQuery
        );
        
        if (!foundIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على شخص بهذا الاسم أو الرقم الوطني.', ephemeral: true });
            return;
        }
        
        const userCrimes = crimes[foundIdentity.nationalId] || [];
        
        if (userCrimes.length === 0) {
            // إنشاء embed مع زر إضافة جريمة
            const embed = new EmbedBuilder()
                .setTitle(`🔧 إدارة الجرائم - ${foundIdentity.fullName}`)
                .setDescription('لا توجد جرائم حالياً لهذا الشخص.')
                .setColor('#e74c3c')
                .setImage(getCustomImage(interaction.guildId));
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`add_crime_${foundIdentity.nationalId}`)
                    .setLabel('إضافة جريمة')
                    .setStyle(ButtonStyle.Success)
            );
            
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        // إنشاء قائمة منسدلة بالجرائم
        const crimeOptions = userCrimes.map((crime, index) => ({
            label: `${crime.title} - ${crime.executed ? 'مسددة' : 'غير مسددة'}`,
            value: index.toString()
        }));
        
        crimeOptions.push({ label: 'إعادة تعيين', value: 'reset' });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`manage_crime_${foundIdentity.nationalId}`)
            .setPlaceholder('اختر جريمة لإدارتها')
            .addOptions(crimeOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle(`🔧 إدارة الجرائم - ${foundIdentity.fullName}`)
            .setDescription('اختر جريمة من القائمة لإدارتها:')
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId));
        
        // إضافة زر إضافة جريمة
        const addCrimeButton = new ButtonBuilder()
            .setCustomId(`add_crime_${foundIdentity.nationalId}`)
            .setLabel('إضافة جريمة')
            .setStyle(ButtonStyle.Success);
        
        const buttonRow = new ActionRowBuilder().addComponents(addCrimeButton);
        
        await interaction.reply({ embeds: [embed], components: [row, buttonRow], ephemeral: true });
        return;
    }

    // استقبال مودال إصدار مذكرة قبض
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'arrest_warrant_search_modal') {
        const searchQuery = interaction.fields.getTextInputValue('arrest_search_query');
        
        // البحث في الهويات
        const foundIdentity = Object.values(identities).find(id => 
            id.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            id.nationalId === searchQuery
        );
        
        if (!foundIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على شخص بهذا الاسم أو الرقم الوطني.', ephemeral: true });
            return;
        }
        
        // إنشاء embed بمعلومات الشخص
        const embed = new EmbedBuilder()
            .setTitle(`🚨 إصدار مذكرة قبض - ${foundIdentity.fullName}`)
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'الاسم الكامل', value: foundIdentity.fullName, inline: true },
                { name: 'الجنس', value: foundIdentity.gender, inline: true },
                { name: 'تاريخ الميلاد', value: `${foundIdentity.day.padStart(2, '0')}/${convertArabicMonthToNumber(foundIdentity.month)}/${foundIdentity.year}`, inline: true },
                { name: 'مكان الولادة', value: foundIdentity.city, inline: true },
                { name: 'الرقم الوطني', value: foundIdentity.nationalId, inline: true },
                { name: 'صاحب الهوية', value: `<@${foundIdentity.userId}>`, inline: true }
            )
            .setTimestamp();
        
        // زر إصدار المذكرة
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`issue_arrest_warrant_${foundIdentity.nationalId}`)
                .setLabel('إصدار مذكرة قبض')
                .setStyle(ButtonStyle.Danger)
        );
        
        // حفظ هوية الشخص المطلوب
        userData.set(interaction.user.id, { 
            ...userData.get(interaction.user.id), 
            arrestTarget: foundIdentity.nationalId 
        });
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع زر إصدار مذكرة قبض
    if (interaction.isButton() && interaction.customId.startsWith('issue_arrest_warrant_')) {
        const nationalId = interaction.customId.replace('issue_arrest_warrant_', '');
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        // إنشاء مودال إصدار مذكرة قبض
        const modal = new ModalBuilder()
            .setCustomId('arrest_warrant_details_modal')
            .setTitle('تفاصيل مذكرة القبض')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('arrest_title')
                        .setLabel('عنوان المذكرة')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('مثال: مذكرة قبض بتهمة السرقة')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('arrest_desc')
                        .setLabel('وصف المذكرة')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('أدخل تفاصيل كاملة عن سبب إصدار المذكرة...')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('arrest_severity')
                        .setLabel('درجة الخطورة')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('مثال: عالية / متوسطة / منخفضة')
                        .setRequired(true)
                )
            );
        
        // حفظ هوية الشخص المطلوب
        userData.set(interaction.user.id, { 
            ...userData.get(interaction.user.id), 
            arrestTarget: nationalId 
        });
        
        await interaction.showModal(modal);
        return;
    }

    // استقبال مودال إضافة مخالفة
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'add_violation_search_modal') {
        const searchQuery = interaction.fields.getTextInputValue('violation_search_query');
        
        // البحث في الهويات
        const foundIdentity = Object.values(identities).find(id => 
            id.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            id.nationalId === searchQuery
        );
        
        if (!foundIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على شخص بهذا الاسم أو الرقم الوطني.', ephemeral: true });
            return;
        }
        
        // إنشاء embed بمعلومات الشخص
        const embed = new EmbedBuilder()
            .setTitle(`🚨 إدارة المخالفات - ${foundIdentity.fullName}`)
            .setColor('#f39c12')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'الاسم الكامل', value: foundIdentity.fullName, inline: true },
                { name: 'الجنس', value: foundIdentity.gender, inline: true },
                { name: 'تاريخ الميلاد', value: `${foundIdentity.day.padStart(2, '0')}/${convertArabicMonthToNumber(foundIdentity.month)}/${foundIdentity.year}`, inline: true },
                { name: 'مكان الولادة', value: foundIdentity.city, inline: true },
                { name: 'الرقم الوطني', value: foundIdentity.nationalId, inline: true },
                { name: 'صاحب الهوية', value: `<@${foundIdentity.userId}>`, inline: true }
            )
            .setTimestamp();
        
        // جلب المخالفات الحالية
        const userViolations = violations[foundIdentity.nationalId] || [];
        
        // إنشاء قائمة منسدلة بالمخالفات (أول 24 فقط)
        const pageSize = 24;
        const firstPageViolations = userViolations.slice(0, pageSize);
        
        const violationOptions = firstPageViolations.map((violation, index) => ({
            label: `${violation.title} - ${violation.executed ? 'مسددة' : 'غير مسددة'}`,
            value: index.toString(),
            description: `$${violation.fine}`
        }));
        
        violationOptions.push({ label: 'إعادة تعيين', value: 'reset' });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`manage_violation_${foundIdentity.nationalId}`)
            .setPlaceholder('اختر مخالفة لإدارتها')
            .addOptions(violationOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        // أزرار الإدارة
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`add_violation_btn_${foundIdentity.nationalId}`)
                .setLabel('إضافة مخالفة')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`delete_violation_btn_${foundIdentity.nationalId}`)
                .setLabel('حذف مخالفة')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`edit_violation_btn_${foundIdentity.nationalId}`)
                .setLabel('تعديل مخالفة')
                .setStyle(ButtonStyle.Primary)
        );
        
        // إضافة زر "رؤية المزيد" إذا كان هناك أكثر من 24 مخالفة
        let components = [row, buttonRow];
        if (userViolations.length > pageSize) {
            const moreButton = new ButtonBuilder()
                .setCustomId(`view_more_violations_${foundIdentity.nationalId}_1`)
                .setLabel('رؤية المزيد')
                .setStyle(ButtonStyle.Secondary);
            const moreRow = new ActionRowBuilder().addComponents(moreButton);
            components.push(moreRow);
        }
        
        // حفظ هوية الشخص المطلوب
        userData.set(interaction.user.id, { 
            ...userData.get(interaction.user.id), 
            violationTarget: foundIdentity.nationalId 
        });
        
        await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
        return;
    }

    // التعامل مع زر إضافة مخالفة
    if (interaction.isButton() && interaction.customId.startsWith('add_violation_btn_')) {
        // التحقق من الصلاحيات: فقط مسؤولي الشرطة يمكنهم إضافة المخالفات
        if (!hasPoliceAdminRole(interaction.member)) {
            await interaction.reply({
                content: '❌ فقط مسؤولي الشرطة يمكنهم إضافة المخالفات.',
                ephemeral: true
            });
            return;
        }
        
        const nationalId = interaction.customId.replace('add_violation_btn_', '');
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        // قائمة بعناوين المخالفات (24 عنوان)
        const violationTitles = [
            'القيادة بسرعة زائدة',
            'الوقوف في مكان ممنوع',
            'عدم ارتداء حزام الأمان',
            'استخدام الهاتف أثناء القيادة',
            'عدم إعطاء الأولوية للمشاة',
            'القيادة تحت تأثير الكحول',
            'عدم تجديد رخصة القيادة',
            'القيادة بدون تأمين',
            'تجاوز الإشارة الحمراء',
            'القيادة في الاتجاه المعاكس',
            'عدم حمل وثائق المركبة',
            'القيادة بمركبة معطلة',
            'عدم إصلاح عيوب المركبة',
            'القيادة بدون لوحات',
            'عدم حمل رخصة القيادة',
            'القيادة بسرعة بطيئة',
            'عدم إعطاء إشارات المرور',
            'الوقوف في مكان إسعاف',
            'عدم حمل شهادة الفحص',
            'القيادة في الطريق السريع',
            'عدم حمل شهادة التأمين',
            'القيادة بمركبة ملوثة',
            'عدم حمل شهادة الجمرك',
            'إعادة تعيين'
        ];
        
        // إنشاء قائمة منسدلة بعناوين المخالفات
        const violationOptions = violationTitles.map(title => ({
            label: title,
            value: title === 'إعادة تعيين' ? 'reset' : title
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_violation_title_${nationalId}`)
            .setPlaceholder('اختر عنوان المخالفة')
            .addOptions(violationOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle(`🚨 إضافة مخالفة - ${identity.fullName}`)
            .setDescription('اختر عنوان المخالفة من القائمة المنسدلة:')
            .setColor('#f39c12')
            .setImage(getCustomImage(interaction.guildId));
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع اختيار عنوان المخالفة
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_violation_title_')) {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🚔 قسم الشرطة')
                .setDescription('مرحباً بك في قسم الشرطة. اختر إجراء من القائمة أدناه:')
                .setColor('#ff0000')
                .setImage(getCustomImage(interaction.guildId));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('police_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'البحث عن شخص', value: 'search_person' },
                    { label: 'سجل الجرائم', value: 'crime_record' },
                    { label: 'إدارة الجرائم', value: 'manage_crimes' },
                    { label: 'إصدار مذكرة قبض', value: 'arrest_warrant' },
                    { label: 'إضافة مخالفة', value: 'add_violation' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        const nationalId = interaction.customId.replace('select_violation_title_', '');
        const violationTitle = interaction.values[0];
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        // إنشاء مودال لإدخال تفاصيل المخالفة
        const modal = new ModalBuilder()
            .setCustomId(`add_violation_details_${nationalId}`)
            .setTitle(`إضافة مخالفة - ${violationTitle}`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('violation_title')
                        .setLabel('عنوان المخالفة')
                        .setStyle(TextInputStyle.Short)
                        .setValue(violationTitle)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('violation_desc')
                        .setLabel('وصف المخالفة')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('أدخل تفاصيل المخالفة...')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('violation_fine')
                        .setLabel('قيمة المخالفة ($)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('مثال: 500')
                        .setRequired(true)
                )
            );
        
        await interaction.showModal(modal);
        return;
    }

    // استقبال مودال تفاصيل مذكرة القبض
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'arrest_warrant_details_modal') {
        const userId = interaction.user.id;
        const userDataEntry = userData.get(userId);
        
        if (!userDataEntry || !userDataEntry.arrestTarget) {
            await interaction.reply({ content: '❌ خطأ في عملية إصدار مذكرة قبض.', ephemeral: true });
            return;
        }
        
        const title = interaction.fields.getTextInputValue('arrest_title');
        const desc = interaction.fields.getTextInputValue('arrest_desc');
        const severity = interaction.fields.getTextInputValue('arrest_severity');
        
        const targetIdentity = identities[userDataEntry.arrestTarget];
        if (!targetIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المستهدفة.', ephemeral: true });
            return;
        }
        
        // إنشاء embed مراجعة المذكرة
        const embed = new EmbedBuilder()
            .setTitle(`🚨 مراجعة مذكرة القبض - ${targetIdentity.fullName}`)
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'عنوان المذكرة', value: title, inline: true },
                { name: 'درجة الخطورة', value: severity, inline: true },
                { name: 'تاريخ الإصدار', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: 'وصف المذكرة', value: desc, inline: false }
            )
            .setTimestamp();
        
        // زر تأكيد الرفع
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_arrest_warrant_${targetIdentity.nationalId}`)
                .setLabel('تأكيد الرفع')
                .setStyle(ButtonStyle.Success)
        );
        
        // حفظ تفاصيل المذكرة
        userData.set(interaction.user.id, { 
            ...userData.get(interaction.user.id), 
            arrestWarrantDetails: { title, desc, severity }
        });
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع زر تأكيد رفع مذكرة القبض
    if (interaction.isButton() && interaction.customId.startsWith('confirm_arrest_warrant_')) {
        const userId = interaction.user.id;
        const userDataEntry = userData.get(userId);
        
        if (!userDataEntry || !userDataEntry.arrestTarget || !userDataEntry.arrestWarrantDetails) {
            await interaction.reply({ content: '❌ خطأ في عملية إصدار مذكرة قبض.', ephemeral: true });
            return;
        }
        
        const nationalId = interaction.customId.replace('confirm_arrest_warrant_', '');
        const targetIdentity = identities[nationalId];
        
        if (!targetIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المستهدفة.', ephemeral: true });
            return;
        }
        
        const { title, desc, severity } = userDataEntry.arrestWarrantDetails;
        
        // إضافة مذكرة القبض إلى سجل الجرائم
        if (!crimes[targetIdentity.nationalId]) {
            crimes[targetIdentity.nationalId] = [];
        }
        
        const crime = {
            title: title,
            desc: `وصف: ${desc}\nدرجة الخطورة: ${severity}`,
            months: 0, // مذكرة قبض لا تحتوي على مدة
            fine: 0,
            executed: false,
            date: new Date().toISOString(),
            type: 'arrest_warrant' // تمييز نوع الجريمة
        };
        
        crimes[targetIdentity.nationalId].push(crime);
        saveCrimes(crimes);
        
        // إرسال لوق
        sendCrimeLog(interaction, 'add', targetIdentity.fullName, crime.title, crime.desc, crime.months, crime.fine, null, 'crime');
        
        // إزالة البيانات المؤقتة
        userData.delete(userId);
        
        await interaction.reply({ 
            content: `✅ تم إصدار مذكرة قبض ضد **${targetIdentity.fullName}** بنجاح!\n**العنوان:** ${title}\n**الوصف:** ${desc}\n**درجة الخطورة:** ${severity}`, 
            ephemeral: true 
        });
        return;
    }

    // استقبال مودال تفاصيل المخالفة
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('add_violation_details_')) {
        const nationalId = interaction.customId.replace('add_violation_details_', '');
        const title = interaction.fields.getTextInputValue('violation_title');
        const desc = interaction.fields.getTextInputValue('violation_desc');
        const fine = parseInt(interaction.fields.getTextInputValue('violation_fine')) || 0;
        
        const targetIdentity = identities[nationalId];
        if (!targetIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المستهدفة.', ephemeral: true });
            return;
        }
        
        // إضافة المخالفة
        if (!violations[targetIdentity.nationalId]) {
            violations[targetIdentity.nationalId] = [];
        }
        
        const violation = {
            title,
            desc,
            fine,
            executed: false,
            date: new Date().toISOString()
        };
        
        violations[targetIdentity.nationalId].push(violation);
        saveViolations(violations);
        
        // إرسال لوق
        sendCrimeLog(interaction, 'add', targetIdentity.fullName, violation.title, violation.desc, 0, violation.fine, null, 'violation');
        
        await interaction.reply({ 
            content: `✅ تم إضافة مخالفة إلى **${targetIdentity.fullName}** بنجاح!\n**العنوان:** ${title}\n**الوصف:** ${desc}\n**القيمة:** $${fine}`, 
            ephemeral: true 
        });
        return;
    }

    // استقبال مودال إضافة مخالفة (الطريقة القديمة - للتوافق)
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'add_violation_modal') {
        const userId = interaction.user.id;
        const userDataEntry = userData.get(userId);
        
        if (!userDataEntry || !userDataEntry.violationTarget) {
            await interaction.reply({ content: '❌ خطأ في عملية إضافة مخالفة.', ephemeral: true });
            return;
        }
        
        const title = interaction.fields.getTextInputValue('violation_title');
        const desc = interaction.fields.getTextInputValue('violation_desc');
        const fine = parseInt(interaction.fields.getTextInputValue('violation_fine')) || 0;
        
        const targetIdentity = identities[userDataEntry.violationTarget];
        if (!targetIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المستهدفة.', ephemeral: true });
            return;
        }
        
        // إضافة المخالفة
        if (!violations[targetIdentity.nationalId]) {
            violations[targetIdentity.nationalId] = [];
        }
        
        const violation = {
            title,
            desc,
            fine,
            executed: false,
            date: new Date().toISOString()
        };
        
        violations[targetIdentity.nationalId].push(violation);
        saveViolations(violations);
        
        // إرسال لوق
        sendCrimeLog(interaction, 'add', targetIdentity.fullName, violation.title, violation.desc, 0, violation.fine, null, 'violation');
        
        // إزالة البيانات المؤقتة
        userData.delete(userId);
        
        await interaction.reply({ 
            content: `✅ تم إضافة مخالفة إلى **${targetIdentity.fullName}** بنجاح!\n**العنوان:** ${title}\n**الوصف:** ${desc}\n**القيمة:** $${fine}`, 
            ephemeral: true 
        });
        return;
    }

    // التعامل مع اختيار الهوية لإدارتها
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_identity_to_manage_page_')) {
        const selectedNationalId = interaction.values[0];
        const selectedIdentity = identities[selectedNationalId];
        
        if (!selectedIdentity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        // إنشاء embed بمعلومات الهوية
        const embed = new EmbedBuilder()
            .setTitle(`🆔 معلومات الهوية: ${selectedIdentity.fullName}`)
            .setColor('#3498db')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'الاسم الكامل', value: selectedIdentity.fullName, inline: true },
                { name: 'الجنس', value: selectedIdentity.gender, inline: true },
                { name: 'تاريخ الميلاد', value: `${selectedIdentity.day.padStart(2, '0')}/${convertArabicMonthToNumber(selectedIdentity.month)}/${selectedIdentity.year}`, inline: true },
                { name: 'مكان الولادة', value: selectedIdentity.city, inline: true },
                { name: 'الرقم الوطني', value: selectedIdentity.nationalId, inline: true },
                { name: 'صاحب الهوية', value: `<@${selectedIdentity.userId}>`, inline: true }
            )
            .setTimestamp();
        
        // أزرار الإدارة
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`delete_identity_${selectedNationalId}`)
                .setLabel('حذف الهوية')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`edit_identity_${selectedNationalId}`)
                .setLabel('تعديل الهوية')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('back_to_identities')
                .setLabel('العودة')
                .setStyle(ButtonStyle.Secondary)
        );
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع إدارة المخالفات
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('manage_violation_')) {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🚔 قسم الشرطة')
                .setDescription('مرحباً بك في قسم الشرطة. اختر إجراء من القائمة أدناه:')
                .setColor('#ff0000')
                .setImage(getCustomImage(interaction.guildId));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('police_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'البحث عن شخص', value: 'search_person' },
                    { label: 'سجل الجرائم', value: 'crime_record' },
                    { label: 'إدارة الجرائم', value: 'manage_crimes' },
                    { label: 'إصدار مذكرة قبض', value: 'arrest_warrant' },
                    { label: 'إضافة مخالفة', value: 'add_violation' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        const nationalId = interaction.customId.split('_')[2];
        const violationIndex = parseInt(interaction.values[0]);
        const userViolations = violations[nationalId] || [];
        const selectedViolation = userViolations[violationIndex];
        
        if (!selectedViolation) {
            await interaction.reply({ content: '❌ لم يتم العثور على المخالفة المحددة أو تم حذفها.', ephemeral: true });
            return;
        }
        
        const identity = identities[nationalId];
        
        // إنشاء embed بمعلومات المخالفة
        const embed = new EmbedBuilder()
            .setTitle(`🚨 إدارة المخالفة - ${identity.fullName}`)
            .setColor('#f39c12')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'عنوان المخالفة', value: selectedViolation.title, inline: true },
                { name: 'وصف المخالفة', value: selectedViolation.desc, inline: true },
                { name: 'الغرامة', value: `$${selectedViolation.fine}`, inline: true },
                { name: 'الحالة', value: selectedViolation.executed ? '✅ مسددة' : '❌ غير مسددة', inline: true },
                { name: 'التاريخ', value: `<t:${Math.floor(new Date(selectedViolation.date).getTime() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();
        
        // أزرار الإدارة
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`delete_violation_${nationalId}_${violationIndex}`)
                .setLabel('حذف المخالفة')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`toggle_violation_status_${nationalId}_${violationIndex}`)
                .setLabel('تعديل المخالفة')
                .setStyle(ButtonStyle.Primary)
        );
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع إدارة الجرائم
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('manage_crime_')) {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🚔 قسم الشرطة')
                .setDescription('مرحباً بك في قسم الشرطة. اختر إجراء من القائمة أدناه:')
                .setColor('#ff0000')
                .setImage(getCustomImage(interaction.guildId));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('police_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'البحث عن شخص', value: 'search_person' },
                    { label: 'سجل الجرائم', value: 'crime_record' },
                    { label: 'إدارة الجرائم', value: 'manage_crimes' },
                    { label: 'إصدار مذكرة قبض', value: 'arrest_warrant' },
                    { label: 'إضافة مخالفة', value: 'add_violation' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        const nationalId = interaction.customId.split('_')[2];
        const crimeIndex = parseInt(interaction.values[0]);
        const userCrimes = crimes[nationalId] || [];
        const selectedCrime = userCrimes[crimeIndex];
        
        if (!selectedCrime) {
            await interaction.reply({ content: '❌ لم يتم العثور على الجريمة المحددة أو تم حذفها.', ephemeral: true });
            return;
        }
        
        const identity = identities[nationalId];
        
        // إنشاء embed بمعلومات الجريمة
        const embed = new EmbedBuilder()
            .setTitle(`🔧 إدارة الجريمة - ${identity.fullName}`)
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'عنوان الجريمة', value: selectedCrime.title, inline: true },
                { name: 'وصف الجريمة', value: selectedCrime.desc, inline: true },
                { name: 'المدة بالأشهر', value: selectedCrime.months.toString(), inline: true },
                { name: 'الغرامة', value: `$${selectedCrime.fine}`, inline: true },
                { name: 'الحالة', value: selectedCrime.executed ? '✅ منفذة' : '❌ غير منفذة', inline: true },
                { name: 'التاريخ', value: `<t:${Math.floor(new Date(selectedCrime.date).getTime() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();
        
        // أزرار الإدارة
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`delete_crime_${nationalId}_${crimeIndex}`)
                .setLabel('حذف الجريمة')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`toggle_crime_status_${nationalId}_${crimeIndex}`)
                .setLabel('تعديل الجريمة')
                .setStyle(ButtonStyle.Primary)
        );
        
        // إضافة زر إضافة جريمة
        const addCrimeButton = new ButtonBuilder()
            .setCustomId(`add_crime_${nationalId}`)
            .setLabel('إضافة جريمة')
            .setStyle(ButtonStyle.Success);
        
        const buttonRow = new ActionRowBuilder().addComponents(addCrimeButton);
        
        await interaction.reply({ embeds: [embed], components: [row, buttonRow], ephemeral: true });
        return;
    }

    // التعامل مع زر حذف المخالفة
    if (interaction.isButton() && interaction.customId.startsWith('delete_violation_')) {
        const parts = interaction.customId.split('_');
        const nationalId = parts[2];
        const violationIndex = parseInt(parts[3]);
        const userViolations = violations[nationalId] || [];
        const selectedViolation = userViolations[violationIndex];
        
        if (!selectedViolation) {
            await interaction.reply({ content: '❌ لم يتم العثور على المخالفة المحددة أو تم حذفها.', ephemeral: true });
            return;
        }
        
        // حذف المخالفة
        userViolations.splice(violationIndex, 1);
        saveViolations(violations);
        
        // إرسال لوق
        sendCrimeLog(interaction, 'delete', identities[nationalId].fullName, selectedViolation.title, selectedViolation.desc, 0, selectedViolation.fine, null, 'violation');
        
        await interaction.reply({ 
            content: `✅ تم حذف المخالفة **${selectedViolation.title}** من **${identities[nationalId].fullName}** بنجاح!`, 
            ephemeral: true 
        });
        return;
    }

    // التعامل مع زر تعديل حالة المخالفة
    if (interaction.isButton() && interaction.customId.startsWith('toggle_violation_status_')) {
        const parts = interaction.customId.split('_');
        const nationalId = parts[3];
        const violationIndex = parseInt(parts[4]);
        const userViolations = violations[nationalId] || [];
        const selectedViolation = userViolations[violationIndex];
        
        if (!selectedViolation) {
            await interaction.reply({ content: '❌ لم يتم العثور على المخالفة المحددة أو تم حذفها.', ephemeral: true });
            return;
        }
        
        // تغيير الحالة
        selectedViolation.executed = !selectedViolation.executed;
        saveViolations(violations);
        
        // إرسال لوق
        sendCrimeLog(interaction, 'edit', identities[nationalId].fullName, selectedViolation.title, selectedViolation.desc, 0, selectedViolation.fine, selectedViolation.executed ? 'مسددة' : 'غير مسددة', 'violation');
        
        await interaction.reply({ 
            content: `✅ تم تغيير حالة المخالفة **${selectedViolation.title}** إلى: ${selectedViolation.executed ? '✅ مسددة' : '❌ غير مسددة'}`, 
            ephemeral: true 
        });
        return;
    }

    // التعامل مع زر تعديل حالة الجريمة
    if (interaction.isButton() && interaction.customId.startsWith('toggle_crime_status_')) {
        const parts = interaction.customId.split('_');
        const nationalId = parts[3];
        const crimeIndex = parseInt(parts[4]);
        const userCrimes = crimes[nationalId] || [];
        const selectedCrime = userCrimes[crimeIndex];
        if (!selectedCrime) {
            await interaction.reply({ content: '❌ لم يتم العثور على الجريمة المحددة أو تم حذفها.', ephemeral: true });
            return;
        }
        // تغيير الحالة
        selectedCrime.executed = !selectedCrime.executed;
        saveCrimes(crimes);
        
        // إرسال لوق إلى قناة لوق الجرائم إذا كانت معرفة
        if (config.crimesLogChannelId) {
            const logChannel = interaction.guild.channels.cache.get(config.crimesLogChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('تغيير حالة الجريمة')
                    .setDescription(`تم تغيير حالة الجريمة للشخص **${identities[nationalId].fullName}** إلى: ${selectedCrime.executed ? '✅ منفذة' : '❌ غير منفذة'}`)
                    .addFields(
                        { name: 'عنوان الجريمة', value: selectedCrime.title, inline: true },
                        { name: 'الوصف', value: selectedCrime.desc, inline: true },
                        { name: 'الغرامة', value: `$${selectedCrime.fine}`, inline: true },
                        { name: 'الحالة الجديدة', value: selectedCrime.executed ? '✅ منفذة' : '❌ غير منفذة', inline: true },
                        { name: 'تاريخ التغيير', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setColor(selectedCrime.executed ? '#27ae60' : '#e74c3c')
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }
        }
        // إنشاء embed محدث مع معلومات الجريمة
        const identity = identities[nationalId];
        const embed = new EmbedBuilder()
            .setTitle(`🔧 إدارة الجريمة - ${identity.fullName}`)
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'عنوان الجريمة', value: selectedCrime.title, inline: true },
                { name: 'وصف الجريمة', value: selectedCrime.desc, inline: true },
                { name: 'المدة بالأشهر', value: selectedCrime.months.toString(), inline: true },
                { name: 'الغرامة', value: `$${selectedCrime.fine}`, inline: true },
                { name: 'الحالة', value: selectedCrime.executed ? '✅ منفذة' : '❌ غير منفذة', inline: true },
                { name: 'التاريخ', value: `<t:${Math.floor(new Date(selectedCrime.date).getTime() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();
        
        // أزرار الإدارة
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`delete_crime_${nationalId}_${crimeIndex}`)
                .setLabel('حذف الجريمة')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`toggle_crime_status_${nationalId}_${crimeIndex}`)
                .setLabel('تعديل الجريمة')
                .setStyle(ButtonStyle.Primary)
        );
        
        // إضافة زر إضافة جريمة
        const addCrimeButton = new ButtonBuilder()
            .setCustomId(`add_crime_${nationalId}`)
            .setLabel('إضافة جريمة')
            .setStyle(ButtonStyle.Success);
        
        const buttonRow = new ActionRowBuilder().addComponents(addCrimeButton);
        
        await interaction.update({ embeds: [embed], components: [row, buttonRow], ephemeral: true });
        return;
    }

    // التعامل مع زر رؤية المزيد من المخالفات
    if (interaction.isButton() && interaction.customId.startsWith('view_more_violations_')) {
        const parts = interaction.customId.split('_');
        const nationalId = parts[3];
        const pageNumber = parseInt(parts[4]);
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        const userViolations = violations[nationalId] || [];
        const pageSize = 24;
        const startIndex = pageNumber * pageSize;
        const endIndex = startIndex + pageSize;
        const pageViolations = userViolations.slice(startIndex, endIndex);
        
        if (pageViolations.length === 0) {
            await interaction.reply({ content: '❌ لا توجد مخالفات في هذه الصفحة.', ephemeral: true });
            return;
        }
        
        // إنشاء embed
        const embed = new EmbedBuilder()
            .setTitle(`🚨 إدارة المخالفات - ${identity.fullName} (الصفحة ${pageNumber + 1})`)
            .setColor('#f39c12')
            .setImage(getCustomImage(interaction.guildId))
            .addFields(
                { name: 'الاسم الكامل', value: identity.fullName, inline: true },
                { name: 'الجنس', value: identity.gender, inline: true },
                { name: 'تاريخ الميلاد', value: `${identity.day.padStart(2, '0')}/${convertArabicMonthToNumber(identity.month)}/${identity.year}`, inline: true },
                { name: 'مكان الولادة', value: identity.city, inline: true },
                { name: 'الرقم الوطني', value: identity.nationalId, inline: true },
                { name: 'صاحب الهوية', value: `<@${identity.userId}>`, inline: true }
            )
            .setTimestamp();
        
        // إنشاء قائمة منسدلة بالمخالفات
        const violationOptions = pageViolations.map((violation, index) => ({
            label: `${violation.title} - ${violation.executed ? 'مسددة' : 'غير مسددة'}`,
            value: (startIndex + index).toString(),
            description: `$${violation.fine}`
        }));
        
        violationOptions.push({ label: 'إعادة تعيين', value: 'reset' });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`manage_violation_${nationalId}`)
            .setPlaceholder('اختر مخالفة لإدارتها')
            .addOptions(violationOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        // أزرار الإدارة
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`add_violation_btn_${nationalId}`)
                .setLabel('إضافة مخالفة')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`delete_violation_btn_${nationalId}`)
                .setLabel('حذف مخالفة')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`edit_violation_btn_${nationalId}`)
                .setLabel('تعديل مخالفة')
                .setStyle(ButtonStyle.Primary)
        );
        
        // أزرار التنقل
        const navigationRow = new ActionRowBuilder();
        
        if (pageNumber > 0) {
            navigationRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`view_more_violations_${nationalId}_${pageNumber - 1}`)
                    .setLabel('السابق')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        if (endIndex < userViolations.length) {
            navigationRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`view_more_violations_${nationalId}_${pageNumber + 1}`)
                    .setLabel('التالي')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        let components = [row, buttonRow];
        if (navigationRow.components.length > 0) {
            components.push(navigationRow);
        }
        
        await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
        return;
    }

    // عند إدارة شخص ولا توجد له جرائم، إظهار زر إضافة جريمة فقط
    if (interaction.isButton() && interaction.customId.startsWith('manage_crimes_for_')) {
        const nationalId = interaction.customId.replace('manage_crimes_for_', '');
        const userCrimes = crimes[nationalId] || [];
        const identity = identities[nationalId];
        const embed = new EmbedBuilder()
            .setTitle(`🔧 إدارة الجرائم - ${identity.fullName}`)
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId))
            .setDescription(userCrimes.length === 0 ? 'لا توجد جرائم حالياً لهذا الشخص.' : '');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`add_crime_${nationalId}`)
                .setLabel('إضافة جريمة')
                .setStyle(ButtonStyle.Success)
        );
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // أمر /شخصيتي (Admins فقط)
    if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'شخصيتي') {
        // المطورين يمكنهم استخدام جميع الأوامر حتى لو كان البوت متوقف
        if (!OWNER_IDS.includes(interaction.user.id)) {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: '❌ هذا الأمر متاح فقط للأدمن.', ephemeral: true });
                return;
            }
            
            // التحقق من حالة البوت
            if (isBotOffline(interaction.guildId)) {
                await interaction.reply({ 
                    content: '❌ البوت حالياً متوقف من قبل المطورين يرجى التواصل مع أحد المطورين <@1337512375355707412> <@1070609053065154631> <@1291805249815711826>', 
                    ephemeral: true 
                });
                return;
            }
        }
        // Embed بصورة الهوية
        const embed = new EmbedBuilder()
            .setTitle('بطاقتك الوطنية')
            .setDescription('اختر إجراء من القائمة أدناه:')
            .setColor('#0099ff')
            .setImage(getCustomImage(interaction.guildId));
        // قائمة منسدلة
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('my_identity_select')
            .setPlaceholder('اختر إجراء')
            .addOptions([
                { label: 'معلوماتي', value: 'my_info' },
                { label: 'الرقم الوطني', value: 'my_national_id' },
                { label: 'مخالفاتي', value: 'my_violations' },
                { label: 'إعادة تعيين', value: 'reset' }
            ]);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const rightsButton = createRightsButton();
        
        let components = [row];
        if (rightsButton) {
            const rightsRow = new ActionRowBuilder().addComponents(rightsButton);
            components.push(rightsRow);
        }
        
        await interaction.reply({ embeds: [embed], components: components });
        return;
    }

    // التعامل مع القائمة المنسدلة في /شخصيتي
    if (interaction.isStringSelectMenu() && interaction.customId === 'my_identity_select') {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('بطاقتك الوطنية')
                .setDescription('اختر إجراء من القائمة أدناه:')
                .setColor('#0099ff')
                .setImage(getCustomImage(interaction.guildId));
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('my_identity_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'معلوماتي', value: 'my_info' },
                    { label: 'الرقم الوطني', value: 'my_national_id' },
                    { label: 'مخالفاتي', value: 'my_violations' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        // دائماً نستخدم من ضغط الزر لعرض الهوية
        const userId = interaction.user.id;
        const identity = Object.values(identities).find(id => id.userId === userId);
        
        if (interaction.values[0] === 'my_info') {
            if (!identity) {
                await interaction.reply({ content: 'ليس لديك هوية وطنية قم بإنشاء هوية وطنية', ephemeral: true });
                return;
            }
            // توليد صورة ديناميكية
            const canvas = createCanvas(600, 300);
            const ctx = canvas.getContext('2d');
            // خلفية بسيطة
            ctx.fillStyle = '#e6f2e6';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // صورة avatar بشكل دائري للمستخدم الذي ضغط الزر
            let avatarURL = 'https://cdn.discordapp.com/embed/avatars/0.png';
            try {
                avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
            } catch {}
            const avatar = await loadImage(avatarURL);
            ctx.save();
            ctx.beginPath();
            ctx.arc(90, 150, 60, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 30, 90, 120, 120);
            ctx.restore();
            // اسم الشخصية الكامل في الأعلى يسار
            ctx.font = 'bold 26px Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'left';
            ctx.fillText(identity.fullName, 30, 60);
            // معلومات على اليمين
            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'right';
            ctx.fillText('*** : الرقم', 570, 100);
            ctx.fillText(`تاريخ الميلاد : ${identity.day.padStart(2, '0')}/${convertArabicMonthToNumber(identity.month)}/${identity.year}`, 570, 150);
            ctx.fillText(`المدينة : ${identity.city}`, 570, 200);
            // إرسال الصورة
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'my_id_card.png' });
            await interaction.reply({ files: [attachment], ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'my_national_id') {
            if (!identity) {
                await interaction.reply({ content: 'ليس لديك هوية وطنية قم بإنشاء هوية وطنية', ephemeral: true });
                return;
            }
            const embed = new EmbedBuilder()
                .setTitle('الرقم الوطني الخاص بك')
                .setColor('#e67e22')
                .setImage(getCustomImage(interaction.guildId))
                .setDescription(`هذا الرقم الوطني معلومة حساسة جدًا لا يجب مشاركتها مع أحد منعًا باتًا.`)
                .addFields(
                    { name: 'الرقم الوطني', value: identity.nationalId, inline: false }
                );
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'my_violations') {
            if (!identity) {
                await interaction.reply({ content: 'ليس لديك هوية وطنية قم بإنشاء هوية وطنية', ephemeral: true });
                return;
            }
            const userViolations = violations[identity.nationalId] || [];
            const violationsPerPage = 6;
            const pageNumber = 0; // الصفحة الأولى
            const totalPages = Math.ceil(userViolations.length / violationsPerPage) || 1;
            const buffer = await createViolationPage(identity, userViolations, pageNumber, interaction);
            const attachment = new AttachmentBuilder(buffer, { name: 'my_violations.png' });
            // أزرار تصفح الصفحات إذا كان هناك أكثر من صفحة
            let components = [];
            if (totalPages > 1) {
                const nextBtn = new ButtonBuilder()
                    .setCustomId(`violation_page_${identity.nationalId}_${pageNumber + 1}`)
                    .setLabel('التالي')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageNumber + 1 >= totalPages);
                const row = new ActionRowBuilder().addComponents(nextBtn);
                components = [row];
            }
            await interaction.reply({ files: [attachment], components, ephemeral: true });
            return;
        }
    }

    // أمر /شرطة
    if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'شرطة') {
        // المطورين يمكنهم استخدام جميع الأوامر حتى لو كان البوت متوقف
        if (!OWNER_IDS.includes(interaction.user.id)) {
            // التحقق من حالة البوت
            if (isBotOffline(interaction.guildId)) {
                await interaction.reply({ 
                    content: '❌ البوت حالياً متوقف من قبل المطورين يرجى التواصل مع أحد المطورين <@1337512375355707412> <@1070609053065154631> <@1291805249815711826>', 
                    ephemeral: true 
                });
                return;
            }
        }
        
        // Embed بصورة الهوية
        const embed = new EmbedBuilder()
            .setTitle('🚔 قسم الشرطة')
            .setDescription('مرحباً بك في قسم الشرطة. اختر إجراء من القائمة أدناه:')
            .setColor('#ff0000')
            .setImage(getCustomImage(interaction.guildId));
        
        // قائمة منسدلة
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('police_select')
            .setPlaceholder('اختر إجراء')
            .addOptions([
                { label: 'البحث عن شخص', value: 'search_person' },
                { label: 'سجل الجرائم', value: 'crime_record' },
                { label: 'إدارة الجرائم', value: 'manage_crimes' },
                { label: 'إصدار مذكرة قبض', value: 'arrest_warrant' },
                { label: 'إضافة مخالفة', value: 'add_violation' },
                { label: 'إعادة تعيين', value: 'reset' }
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const rightsButton = createRightsButton();
        
        let components = [row];
        if (rightsButton) {
            const rightsRow = new ActionRowBuilder().addComponents(rightsButton);
            components.push(rightsRow);
        }
        
        await interaction.reply({ embeds: [embed], components: components });
        return;
    }

    // التعامل مع القائمة المنسدلة في /شرطة
    if (interaction.isStringSelectMenu() && interaction.customId === 'police_select') {
        if (!canUsePoliceFeature(interaction)) return;
        
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🚔 قسم الشرطة')
                .setDescription('مرحباً بك في قسم الشرطة. اختر إجراء من القائمة أدناه:')
                .setColor('#ff0000')
                .setImage(getCustomImage(interaction.guildId));
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('police_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'البحث عن شخص', value: 'search_person' },
                    { label: 'سجل الجرائم', value: 'crime_record' },
                    { label: 'إدارة الجرائم', value: 'manage_crimes' },
                    { label: 'إصدار مذكرة قبض', value: 'arrest_warrant' },
                    { label: 'إضافة مخالفة', value: 'add_violation' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'search_person') {
            const modal = new ModalBuilder()
                .setCustomId('search_person_modal')
                .setTitle('البحث عن شخص')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('search_query')
                            .setLabel('أدخل الاسم الكامل أو الرقم الوطني')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('مثال: أحمد محمد أو 1234')
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'crime_record') {
            const modal = new ModalBuilder()
                .setCustomId('crime_record_modal')
                .setTitle('سجل الجرائم')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('search_query')
                            .setLabel('أدخل الاسم الكامل أو الرقم الوطني')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('مثال: أحمد محمد أو 1234')
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'manage_crimes') {
            const modal = new ModalBuilder()
                .setCustomId('manage_crimes_modal')
                .setTitle('إدارة الجرائم')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('search_query')
                            .setLabel('أدخل الاسم الكامل أو الرقم الوطني')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('مثال: أحمد محمد أو 1234')
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'arrest_warrant') {
            if (!hasPoliceAdminRole(interaction.member)) {
                await interaction.update({
                    content: '❌ فقط مسؤولي الشرطة يمكنهم إصدار مذكرة قبض.',
                    components: [],
                    ephemeral: true
                });
                return;
            }
            const modal = new ModalBuilder()
                .setCustomId('arrest_warrant_search_modal')
                .setTitle('إصدار مذكرة قبض')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('arrest_search_query')
                            .setLabel('أدخل الاسم الكامل أو الرقم الوطني')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('مثال: أحمد محمد أو 1234')
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'add_violation') {
            if (!hasPoliceAdminRole(interaction.member)) {
                await interaction.update({
                    content: '❌ فقط مسؤولي الشرطة يمكنهم إضافة مخالفات.',
                    components: [],
                    ephemeral: true
                });
                return;
            }
            const modal = new ModalBuilder()
                .setCustomId('add_violation_search_modal')
                .setTitle('إضافة مخالفة')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('violation_search_query')
                            .setLabel('أدخل الاسم الكامل أو الرقم الوطني')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('مثال: أحمد محمد أو 1234')
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
    }

    // أمر /الاونر (المطورين فقط)
    if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'الاونر') {
        if (!OWNER_IDS.includes(interaction.user.id)) {
            await interaction.reply({ content: '❌ هذا الأمر متاح فقط للمطورين.', ephemeral: true });
            return;
        }
        
        // Embed للمطورين
        const embed = new EmbedBuilder()
            .setTitle('🔧 لوحة تحكم المطورين')
            .setDescription('مرحباً بك في لوحة تحكم المطورين. اختر إجراء من القائمة أدناه:')
            .setColor('#ff6b6b')
            .setImage(IMAGE_URL);
        
        // قائمة منسدلة للمطورين
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('owner_select')
            .setPlaceholder('اختر إجراء')
            .addOptions([
                { label: 'إحصائيات البوت', value: 'bot_stats' },
                { label: 'إيقاف | تشغيل البوت', value: 'bot_toggle' },
                { label: 'تغيير إمبد', value: 'change_embed' },
                { label: 'تغيير حقوق', value: 'change_rights' },
                { label: 'تفعيل', value: 'activate' },
                { label: 'إعادة تعيين', value: 'reset' }
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع القائمة المنسدلة في /الاونر
    if (interaction.isStringSelectMenu() && interaction.customId === 'owner_select') {
        if (interaction.values[0] === 'activate') {
            // عرض قائمة السيرفرات مع زر رؤية المزيد
            const guilds = client.guilds.cache;
            const guildsArray = Array.from(guilds.values());
            const pageSize = 24;
            const totalPages = Math.ceil(guildsArray.length / pageSize);
            const firstPageGuilds = guildsArray.slice(0, pageSize);
            const guildOptions = firstPageGuilds.map(guild => ({
                label: `${guild.name} (${guild.memberCount} عضو)` ,
                value: guild.id
            }));
            guildOptions.push({ label: 'إعادة تعيين', value: 'reset' });
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_guild_to_activate_page_0')
                .setPlaceholder('اختر سيرفر لتفعيل البريميوم')
                .addOptions(guildOptions);
            const row = new ActionRowBuilder().addComponents(selectMenu);
            let components = [row];
            if (guildsArray.length > pageSize) {
                const moreButton = new ButtonBuilder()
                    .setCustomId('view_more_guilds_activate_1')
                    .setLabel('رؤية المزيد')
                    .setStyle(ButtonStyle.Secondary);
                const buttonRow = new ActionRowBuilder().addComponents(moreButton);
                components.push(buttonRow);
            }
            const embed = new EmbedBuilder()
                .setTitle('🔑 تفعيل البريميوم')
                .setDescription(`اختر سيرفر من القائمة لتفعيل أو إيقاف البريميوم فيه (الصفحة 1 من ${totalPages})`)
                .setColor('#f1c40f')
                .setImage(IMAGE_URL);
            await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🔧 لوحة تحكم المطورين')
                .setDescription('مرحباً بك في لوحة تحكم المطورين. اختر إجراء من القائمة أدناه:')
                .setColor('#ff6b6b')
                .setImage(IMAGE_URL);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('owner_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'إحصائيات البوت', value: 'bot_stats' },
                    { label: 'إيقاف | تشغيل البوت', value: 'bot_toggle' },
                    { label: 'تغيير إمبد', value: 'change_embed' },
                    { label: 'تغيير حقوق', value: 'change_rights' },
                    { label: 'تفعيل', value: 'activate' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'bot_stats') {
            const totalIdentities = Object.keys(identities).length;
            const totalCrimes = Object.values(crimes).reduce((sum, userCrimes) => sum + userCrimes.length, 0);
            const totalViolations = Object.values(violations).reduce((sum, userViolations) => sum + userViolations.length, 0);
            const onlineServers = Array.from(botStatus.values()).filter(status => status.status === 'online').length;
            const offlineServers = Array.from(botStatus.values()).filter(status => status.status === 'offline').length;
            
            const embed = new EmbedBuilder()
                .setTitle('📊 إحصائيات البوت')
                .setColor('#00b894')
                .setImage(IMAGE_URL)
                .addFields(
                    { name: 'إجمالي الهويات', value: totalIdentities.toString(), inline: true },
                    { name: 'إجمالي الجرائم', value: totalCrimes.toString(), inline: true },
                    { name: 'إجمالي المخالفات', value: totalViolations.toString(), inline: true },
                    { name: 'السيرفرات المتصلة', value: onlineServers.toString(), inline: true },
                    { name: 'السيرفرات المتوقفة', value: offlineServers.toString(), inline: true }
                );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'bot_toggle') {
            // الحصول على جميع السيرفرات التي يوجد فيها البوت
            const guilds = client.guilds.cache;
            const guildsArray = Array.from(guilds.values());
            
            // تقسيم السيرفرات إلى صفحات (24 سيرفر لكل صفحة)
            const pageSize = 24;
            const totalPages = Math.ceil(guildsArray.length / pageSize);
            const firstPageGuilds = guildsArray.slice(0, pageSize);
            
            // إنشاء قائمة منسدلة للسيرفرات
            const guildOptions = firstPageGuilds.map(guild => ({
                label: `${guild.name} (${guild.memberCount} عضو)`,
                value: guild.id
            }));
            
            // إضافة خيار إعادة تعيين
            guildOptions.push({ label: 'إعادة تعيين', value: 'reset' });
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_guild_to_toggle_page_0')
                .setPlaceholder('اختر سيرفر لإيقاف/تشغيل البوت')
                .addOptions(guildOptions);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            // إضافة زر "رؤية المزيد" إذا كان هناك المزيد من السيرفرات
            let components = [row];
            if (guildsArray.length > pageSize) {
                const moreButton = new ButtonBuilder()
                    .setCustomId('view_more_guilds_1')
                    .setLabel('رؤية المزيد')
                    .setStyle(ButtonStyle.Secondary);
                const buttonRow = new ActionRowBuilder().addComponents(moreButton);
                components.push(buttonRow);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🔧 إيقاف/تشغيل البوت')
                .setDescription(`اختر سيرفر من القائمة لإيقاف/تشغيل البوت فيه (الصفحة 1 من ${totalPages})`)
                .setColor('#ff6b6b')
                .setImage(IMAGE_URL);
            
            await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
            return;
        }
        
        if (interaction.values[0] === 'change_embed') {
            const modal = new ModalBuilder()
                .setCustomId('change_embed_modal')
                .setTitle('تغيير صورة الإمبد')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('new_embed_image')
                            .setLabel('رابط الصورة الجديدة')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('https://example.com/image.png')
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.values[0] === 'change_rights') {
            // عرض قائمة السيرفرات مع زر رؤية المزيد
            const guilds = client.guilds.cache;
            const guildsArray = Array.from(guilds.values());
            const pageSize = 24;
            const totalPages = Math.ceil(guildsArray.length / pageSize);
            const firstPageGuilds = guildsArray.slice(0, pageSize);
            
            const guildOptions = firstPageGuilds.map(guild => ({
                label: `${guild.name} (${guild.memberCount} عضو)`,
                value: guild.id
            }));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_guild_for_rights_page_0')
                .setPlaceholder('اختر سيرفر لتعديل إعدادات الحقوق')
                .addOptions(guildOptions);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            // إضافة زر "رؤية المزيد" إذا كان هناك المزيد من السيرفرات
            let components = [row];
            if (guildsArray.length > pageSize) {
                const moreButton = new ButtonBuilder()
                    .setCustomId('view_more_guilds_rights_1')
                    .setLabel('رؤية المزيد')
                    .setStyle(ButtonStyle.Secondary);
                const buttonRow = new ActionRowBuilder().addComponents(moreButton);
                components.push(buttonRow);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🔧 إعدادات حقوق Wonder Bot')
                .setDescription(`اختر سيرفر من القائمة لتعديل إعدادات زر حقوق Wonder Bot فيه (الصفحة 1 من ${totalPages})`)
                .setColor('#3498db')
                .setImage(IMAGE_URL);
            
            await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
            return;
        }
    }

    // استقبال مودال تغيير صورة الإمبد
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'change_embed_modal') {
        const newImageUrl = interaction.fields.getTextInputValue('new_embed_image');
        
        botStatus.set(interaction.guildId, { 
            status: isBotOffline(interaction.guildId) ? 'offline' : 'online', 
            customImage: newImageUrl 
        });
        saveBotStatus();
        
        await interaction.reply({ 
            content: '✅ تم تغيير صورة الإمبد بنجاح!', 
            ephemeral: true 
        });
        return;
    }

    // التعامل مع اختيار السيرفر لإعدادات الحقوق
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_guild_for_rights_page_')) {
        const selectedGuildId = interaction.values[0];
        const selectedGuild = client.guilds.cache.get(selectedGuildId);
        
        if (!selectedGuild) {
            await interaction.reply({ content: '❌ لم يتم العثور على السيرفر المحدد.', ephemeral: true });
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🔧 إعدادات حقوق Wonder Bot - ${selectedGuild.name}`)
            .setDescription('اختر إجراء لتعديل إعدادات زر حقوق Wonder Bot:')
            .setColor('#3498db')
            .setThumbnail(selectedGuild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👑 أونر السيرفر', value: `<@${selectedGuild.ownerId}>`, inline: true },
                { name: '🆔 آيدي السيرفر', value: selectedGuild.id, inline: true },
                { name: '👥 عدد الأعضاء', value: selectedGuild.memberCount.toString(), inline: true },
                { name: '💎 حالة الزر', value: rightsConfig.enabled ? 'مفعل ✅' : 'معطل ❌', inline: true },
                { name: '📝 النص الحالي', value: rightsConfig.buttonText, inline: true },
                { name: '🔗 الرابط الحالي', value: rightsConfig.buttonUrl, inline: true },
                { name: '👁️ مخفي', value: rightsConfig.hidden ? 'نعم ✅' : 'لا ❌', inline: true }
            )
            .setImage(IMAGE_URL);
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`rights_settings_select_${selectedGuildId}`)
            .setPlaceholder('اختر إجراء')
            .addOptions([
                { label: 'تفعيل/تعطيل الزر', value: 'toggle_rights' },
                { label: 'تغيير نص الزر', value: 'change_button_text' },
                { label: 'تغيير رابط الزر', value: 'change_button_url' },
                { label: 'إخفاء/إظهار الزر', value: 'toggle_hidden' },
                { label: 'إعادة تعيين', value: 'reset_rights' }
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع القائمة المنسدلة لإعدادات الحقوق
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('rights_settings_select_')) {
        const selectedValue = interaction.values[0];
        
        if (selectedValue === 'toggle_rights') {
            const guildId = interaction.customId.split('_')[3];
            const guild = client.guilds.cache.get(guildId);
            
            rightsConfig.enabled = !rightsConfig.enabled;
            saveRightsConfig(rightsConfig);
            
            const embed = new EmbedBuilder()
                .setTitle(`🔧 إعدادات حقوق Wonder Bot - ${guild?.name || 'غير معروف'}`)
                .setDescription('تم تحديث إعدادات زر حقوق Wonder Bot:')
                .setColor('#3498db')
                .setThumbnail(guild?.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👑 أونر السيرفر', value: `<@${guild?.ownerId || 'غير معروف'}>`, inline: true },
                    { name: '🆔 آيدي السيرفر', value: guildId, inline: true },
                    { name: '👥 عدد الأعضاء', value: guild?.memberCount?.toString() || 'غير معروف', inline: true },
                    { name: '💎 حالة الزر', value: rightsConfig.enabled ? 'مفعل ✅' : 'معطل ❌', inline: true },
                    { name: '📝 النص الحالي', value: rightsConfig.buttonText, inline: true },
                    { name: '🔗 الرابط الحالي', value: rightsConfig.buttonUrl, inline: true },
                    { name: '👁️ مخفي', value: rightsConfig.hidden ? 'نعم ✅' : 'لا ❌', inline: true }
                )
                .setImage(IMAGE_URL);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`rights_settings_select_${guildId}`)
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'تفعيل/تعطيل الزر', value: 'toggle_rights' },
                    { label: 'تغيير نص الزر', value: 'change_button_text' },
                    { label: 'تغيير رابط الزر', value: 'change_button_url' },
                    { label: 'إخفاء/إظهار الزر', value: 'toggle_hidden' },
                    { label: 'إعادة تعيين', value: 'reset_rights' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        if (selectedValue === 'change_button_text') {
            const guildId = interaction.customId.split('_')[3];
            const modal = new ModalBuilder()
                .setCustomId(`change_button_text_modal_${guildId}`)
                .setTitle('تغيير نص زر حقوق Wonder Bot')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('new_button_text')
                            .setLabel('النص الجديد للزر')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('مثال: حقوق Wonder Bot')
                            .setValue(rightsConfig.buttonText)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (selectedValue === 'change_button_url') {
            const guildId = interaction.customId.split('_')[3];
            const modal = new ModalBuilder()
                .setCustomId(`change_button_url_modal_${guildId}`)
                .setTitle('تغيير رابط زر حقوق Wonder Bot')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('new_button_url')
                            .setLabel('الرابط الجديد للزر')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('https://discord.gg/example')
                            .setValue(rightsConfig.buttonUrl)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (selectedValue === 'toggle_hidden') {
            const guildId = interaction.customId.split('_')[3];
            const guild = client.guilds.cache.get(guildId);
            
            rightsConfig.hidden = !rightsConfig.hidden;
            saveRightsConfig(rightsConfig);
            
            const embed = new EmbedBuilder()
                .setTitle(`🔧 إعدادات حقوق Wonder Bot - ${guild?.name || 'غير معروف'}`)
                .setDescription('تم تحديث إعدادات زر حقوق Wonder Bot:')
                .setColor('#3498db')
                .setThumbnail(guild?.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👑 أونر السيرفر', value: `<@${guild?.ownerId || 'غير معروف'}>`, inline: true },
                    { name: '🆔 آيدي السيرفر', value: guildId, inline: true },
                    { name: '👥 عدد الأعضاء', value: guild?.memberCount?.toString() || 'غير معروف', inline: true },
                    { name: '💎 حالة الزر', value: rightsConfig.enabled ? 'مفعل ✅' : 'معطل ❌', inline: true },
                    { name: '📝 النص الحالي', value: rightsConfig.buttonText, inline: true },
                    { name: '🔗 الرابط الحالي', value: rightsConfig.buttonUrl, inline: true },
                    { name: '👁️ مخفي', value: rightsConfig.hidden ? 'نعم ✅' : 'لا ❌', inline: true }
                )
                .setImage(IMAGE_URL);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`rights_settings_select_${guildId}`)
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'تفعيل/تعطيل الزر', value: 'toggle_rights' },
                    { label: 'تغيير نص الزر', value: 'change_button_text' },
                    { label: 'تغيير رابط الزر', value: 'change_button_url' },
                    { label: 'إخفاء/إظهار الزر', value: 'toggle_hidden' },
                    { label: 'إعادة تعيين', value: 'reset_rights' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        if (selectedValue === 'reset_rights') {
            const guildId = interaction.customId.split('_')[3];
            const guild = client.guilds.cache.get(guildId);
            
            rightsConfig = {
                enabled: true,
                buttonText: 'حقوق Wonder Bot',
                buttonUrl: 'https://discord.gg/95jJ8EnK',
                hidden: false
            };
            saveRightsConfig(rightsConfig);
            
            const embed = new EmbedBuilder()
                .setTitle(`🔧 إعدادات حقوق Wonder Bot - ${guild?.name || 'غير معروف'}`)
                .setDescription('تم إعادة تعيين إعدادات زر حقوق Wonder Bot إلى القيم الافتراضية:')
                .setColor('#3498db')
                .setThumbnail(guild?.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👑 أونر السيرفر', value: `<@${guild?.ownerId || 'غير معروف'}>`, inline: true },
                    { name: '🆔 آيدي السيرفر', value: guildId, inline: true },
                    { name: '👥 عدد الأعضاء', value: guild?.memberCount?.toString() || 'غير معروف', inline: true },
                    { name: '💎 حالة الزر', value: rightsConfig.enabled ? 'مفعل ✅' : 'معطل ❌', inline: true },
                    { name: '📝 النص الحالي', value: rightsConfig.buttonText, inline: true },
                    { name: '🔗 الرابط الحالي', value: rightsConfig.buttonUrl, inline: true },
                    { name: '👁️ مخفي', value: rightsConfig.hidden ? 'نعم ✅' : 'لا ❌', inline: true }
                )
                .setImage(IMAGE_URL);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`rights_settings_select_${guildId}`)
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'تفعيل/تعطيل الزر', value: 'toggle_rights' },
                    { label: 'تغيير نص الزر', value: 'change_button_text' },
                    { label: 'تغيير رابط الزر', value: 'change_button_url' },
                    { label: 'إخفاء/إظهار الزر', value: 'toggle_hidden' },
                    { label: 'إعادة تعيين', value: 'reset_rights' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
    }

    // استقبال مودال تغيير نص زر الحقوق
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('change_button_text_modal_')) {
        const guildId = interaction.customId.split('_')[4];
        const newButtonText = interaction.fields.getTextInputValue('new_button_text');
        const guild = client.guilds.cache.get(guildId);
        
        rightsConfig.buttonText = newButtonText;
        saveRightsConfig(rightsConfig);
        
        await interaction.reply({ 
            content: `✅ تم تغيير نص زر حقوق Wonder Bot في سيرفر **${guild?.name || 'غير معروف'}** إلى: **${newButtonText}**`, 
            ephemeral: true 
        });
        return;
    }

    // استقبال مودال تغيير رابط زر الحقوق
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('change_button_url_modal_')) {
        const guildId = interaction.customId.split('_')[4];
        const newButtonUrl = interaction.fields.getTextInputValue('new_button_url');
        const guild = client.guilds.cache.get(guildId);
        
        rightsConfig.buttonUrl = newButtonUrl;
        saveRightsConfig(rightsConfig);
        
        await interaction.reply({ 
            content: `✅ تم تغيير رابط زر حقوق Wonder Bot في سيرفر **${guild?.name || 'غير معروف'}** إلى: **${newButtonUrl}**`, 
            ephemeral: true 
        });
        return;
    }

    // التعامل مع أزرار "رؤية المزيد" لإعدادات الحقوق
    if (interaction.isButton() && interaction.customId.startsWith('view_more_guilds_rights_')) {
        const pageNumber = parseInt(interaction.customId.split('_')[4]);
        const guilds = client.guilds.cache;
        const guildsArray = Array.from(guilds.values());
        
        const pageSize = 24;
        const totalPages = Math.ceil(guildsArray.length / pageSize);
        const startIndex = pageNumber * pageSize;
        const endIndex = Math.min(startIndex + pageSize, guildsArray.length);
        const pageGuilds = guildsArray.slice(startIndex, endIndex);
        
        const guildOptions = pageGuilds.map(guild => ({
            label: `${guild.name} (${guild.memberCount} عضو)`,
            value: guild.id
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_guild_for_rights_page_${pageNumber}`)
            .setPlaceholder('اختر سيرفر لتعديل إعدادات الحقوق')
            .addOptions(guildOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        let components = [row];
        if (endIndex < guildsArray.length) {
            const moreButton = new ButtonBuilder()
                .setCustomId(`view_more_guilds_rights_${pageNumber + 1}`)
                .setLabel('رؤية المزيد')
                .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder().addComponents(moreButton);
            components.push(buttonRow);
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 إعدادات حقوق Wonder Bot')
            .setDescription(`اختر سيرفر من القائمة لتعديل إعدادات زر حقوق Wonder Bot فيه (الصفحة ${pageNumber + 1} من ${totalPages})`)
            .setColor('#3498db')
            .setImage(IMAGE_URL);
        
        await interaction.update({ embeds: [embed], components: components, ephemeral: true });
        return;
    }

    // التعامل مع أزرار "رؤية المزيد" للسيرفرات
    if (interaction.isButton() && interaction.customId.startsWith('view_more_guilds_')) {
        const pageNumber = parseInt(interaction.customId.split('_')[3]);
        const guilds = client.guilds.cache;
        const guildsArray = Array.from(guilds.values());
        const pageSize = 24;
        const totalPages = Math.ceil(guildsArray.length / pageSize);
        const startIndex = pageNumber * pageSize;
        const endIndex = Math.min(startIndex + pageSize, guildsArray.length);
        const pageGuilds = guildsArray.slice(startIndex, endIndex);
        
        const guildOptions = pageGuilds.map(guild => ({
            label: `${guild.name} (${guild.memberCount} عضو)`,
            value: guild.id
        }));
        
        guildOptions.push({ label: 'إعادة تعيين', value: 'reset' });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_guild_to_toggle_page_${pageNumber}`)
            .setPlaceholder('اختر سيرفر لإيقاف/تشغيل البوت')
            .addOptions(guildOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        let components = [row];
        if (endIndex < guildsArray.length) {
            const moreButton = new ButtonBuilder()
                .setCustomId(`view_more_guilds_${pageNumber + 1}`)
                .setLabel('رؤية المزيد')
                .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder().addComponents(moreButton);
            components.push(buttonRow);
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 إيقاف/تشغيل البوت')
            .setDescription(`اختر سيرفر من القائمة لإيقاف/تشغيل البوت فيه (الصفحة ${pageNumber + 1} من ${totalPages})`)
            .setColor('#ff6b6b')
            .setImage(IMAGE_URL);
        
        await interaction.update({ embeds: [embed], components: components, ephemeral: true });
        return;
    }

    // التعامل مع اختيار السيرفر لإيقاف/تشغيل البوت
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_guild_to_toggle_page_')) {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🔧 لوحة تحكم المطورين')
                .setDescription('مرحباً بك في لوحة تحكم المطورين. اختر إجراء من القائمة أدناه:')
                .setColor('#ff6b6b')
                .setImage(IMAGE_URL);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('owner_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'إحصائيات البوت', value: 'bot_stats' },
                    { label: 'إيقاف | تشغيل البوت', value: 'bot_toggle' },
                    { label: 'تغيير إمبد', value: 'change_embed' },
                    { label: 'تفعيل', value: 'activate' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        const selectedGuildId = interaction.values[0];
        const selectedGuild = client.guilds.cache.get(selectedGuildId);
        
        if (!selectedGuild) {
            await interaction.reply({ content: '❌ لم يتم العثور على السيرفر المحدد.', ephemeral: true });
            return;
        }
        
        const currentStatus = isBotOffline(selectedGuildId) ? 'offline' : 'online';
        const newStatus = currentStatus === 'online' ? 'offline' : 'online';
        
        // تغيير اسم البوت إذا كان متوقف
        if (newStatus === 'offline') {
            try {
                const guild = client.guilds.cache.get(selectedGuildId);
                if (guild && guild.members.me) {
                    await guild.members.me.setNickname(`${guild.members.me.user.username} (متوقف)`);
                }
            } catch (error) {
                console.log('لا يمكن تغيير اسم البوت:', error.message);
            }
        } else {
            try {
                const guild = client.guilds.cache.get(selectedGuildId);
                if (guild && guild.members.me) {
                    await guild.members.me.setNickname(guild.members.me.user.username);
                }
            } catch (error) {
                console.log('لا يمكن تغيير اسم البوت:', error.message);
            }
        }
        
        // حفظ حالة البوت
        botStatus.set(selectedGuildId, { 
            status: newStatus, 
            customImage: getCustomImage(selectedGuildId) 
        });
        saveBotStatus();
        
        // إنشاء embed بمعلومات السيرفر
        const embed = new EmbedBuilder()
            .setTitle(`🔧 معلومات السيرفر: ${selectedGuild.name}`)
            .setColor(newStatus === 'online' ? '#00b894' : '#e74c3c')
            .setThumbnail(selectedGuild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👑 أونر السيرفر', value: `<@${selectedGuild.ownerId}>`, inline: true },
                { name: '🆔 آيدي السيرفر', value: selectedGuild.id, inline: true },
                { name: '👥 عدد الأعضاء', value: selectedGuild.memberCount.toString(), inline: true },
                { name: '🔗 رابط السيرفر', value: `https://discord.gg/${selectedGuild.vanityURLCode || 'غير متوفر'}`, inline: true },
                { name: '📊 حالة البوت', value: newStatus === 'online' ? '🟢 متصل' : '🔴 متوقف', inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(selectedGuild.createdTimestamp / 1000)}:F>`, inline: true }
            )
            .setImage(IMAGE_URL)
            .setTimestamp();
        // إضافة زر تشغيل/إيقاف البوت
        const toggleButton = new ButtonBuilder()
            .setCustomId(`toggle_bot_status_${selectedGuildId}`)
            .setLabel(newStatus === 'online' ? 'إيقاف البوت' : 'تشغيل البوت')
            .setStyle(newStatus === 'online' ? ButtonStyle.Danger : ButtonStyle.Success);
        const row = new ActionRowBuilder().addComponents(toggleButton);
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع زر تشغيل/إيقاف البوت من لوحة معلومات السيرفر
    if (interaction.isButton() && interaction.customId.startsWith('toggle_bot_status_')) {
        const guildId = interaction.customId.replace('toggle_bot_status_', '');
        const currentStatus = isBotOffline(guildId) ? 'offline' : 'online';
        const newStatus = currentStatus === 'online' ? 'offline' : 'online';
        // تغيير اسم البوت إذا كان متوقف
        try {
            const guild = client.guilds.cache.get(guildId);
            if (guild && guild.members.me) {
                if (newStatus === 'offline') {
                    await guild.members.me.setNickname(`${guild.members.me.user.username} (متوقف)`);
                } else {
                    await guild.members.me.setNickname(guild.members.me.user.username);
                }
            }
        } catch (error) {
            console.log('لا يمكن تغيير اسم البوت:', error.message);
        }
        // حفظ حالة البوت
        botStatus.set(guildId, {
            status: newStatus,
            customImage: getCustomImage(guildId)
        });
        saveBotStatus();
        // إعادة عرض معلومات السيرفر مع الزر الجديد
        const selectedGuild = client.guilds.cache.get(guildId);
        const embed = new EmbedBuilder()
            .setTitle(`🔧 معلومات السيرفر: ${selectedGuild.name}`)
            .setColor(newStatus === 'online' ? '#00b894' : '#e74c3c')
            .setThumbnail(selectedGuild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👑 أونر السيرفر', value: `<@${selectedGuild.ownerId}>`, inline: true },
                { name: '🆔 آيدي السيرفر', value: selectedGuild.id, inline: true },
                { name: '👥 عدد الأعضاء', value: selectedGuild.memberCount.toString(), inline: true },
                { name: '🔗 رابط السيرفر', value: `https://discord.gg/${selectedGuild.vanityURLCode || 'غير متوفر'}`, inline: true },
                { name: '📊 حالة البوت', value: newStatus === 'online' ? '🟢 متصل' : '🔴 متوقف', inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(selectedGuild.createdTimestamp / 1000)}:F>`, inline: true }
            )
            .setImage(IMAGE_URL)
            .setTimestamp();
        const toggleButton = new ButtonBuilder()
            .setCustomId(`toggle_bot_status_${guildId}`)
            .setLabel(newStatus === 'online' ? 'إيقاف البوت' : 'تشغيل البوت')
            .setStyle(newStatus === 'online' ? ButtonStyle.Danger : ButtonStyle.Success);
        const row = new ActionRowBuilder().addComponents(toggleButton);
        await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع أزرار تصفح صفحات مخالفاتي
    if (interaction.isButton() && interaction.customId.startsWith('violation_page_')) {
        // customId: violation_page_{nationalId}_{pageNumber}
        const parts = interaction.customId.split('_');
        const nationalId = parts[2];
        const pageNumber = parseInt(parts[3]);
        const identity = identities[nationalId];
        const userViolations = violations[nationalId] || [];
        const violationsPerPage = 6;
        const totalPages = Math.ceil(userViolations.length / violationsPerPage) || 1;
        const buffer = await createViolationPage(identity, userViolations, pageNumber, interaction);
        const attachment = new AttachmentBuilder(buffer, { name: 'my_violations.png' });
        // أزرار تصفح الصفحات
        let components = [];
        const prevBtn = new ButtonBuilder()
            .setCustomId(`violation_page_${nationalId}_${pageNumber - 1}`)
            .setLabel('السابق')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageNumber <= 0);
        const nextBtn = new ButtonBuilder()
            .setCustomId(`violation_page_${nationalId}_${pageNumber + 1}`)
            .setLabel('التالي')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNumber + 1 >= totalPages);
        const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);
        components = [row];
        await interaction.update({ files: [attachment], components, ephemeral: true });
        return;
    }

    // التعامل مع زر حذف مخالفة في قسم إدارة المخالفات
    if (interaction.isButton() && interaction.customId.startsWith('delete_violation_btn_')) {
        const nationalId = interaction.customId.replace('delete_violation_btn_', '');
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        const userViolations = violations[nationalId] || [];
        
        if (userViolations.length === 0) {
            await interaction.reply({ content: '❌ لا توجد مخالفات لهذا الشخص.', ephemeral: true });
            return;
        }
        
        // إنشاء قائمة منسدلة بالمخالفات للحذف
        const violationOptions = userViolations.map((violation, index) => ({
            label: `${violation.title} - ${violation.executed ? 'مسددة' : 'غير مسددة'}`,
            value: index.toString(),
            description: `$${violation.fine}`
        }));
        
        violationOptions.push({ label: 'إعادة تعيين', value: 'reset' });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_violation_to_delete_${nationalId}`)
            .setPlaceholder('اختر مخالفة لحذفها')
            .addOptions(violationOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle(`🗑️ حذف مخالفة - ${identity.fullName}`)
            .setDescription('اختر المخالفة التي تريد حذفها من القائمة المنسدلة:')
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId));
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع زر تعديل مخالفة في قسم إدارة المخالفات
    if (interaction.isButton() && interaction.customId.startsWith('edit_violation_btn_')) {
        const nationalId = interaction.customId.replace('edit_violation_btn_', '');
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        const userViolations = violations[nationalId] || [];
        
        if (userViolations.length === 0) {
            await interaction.reply({ content: '❌ لا توجد مخالفات لهذا الشخص.', ephemeral: true });
            return;
        }
        
        // إنشاء قائمة منسدلة بالمخالفات للتعديل
        const violationOptions = userViolations.map((violation, index) => ({
            label: `${violation.title} - ${violation.executed ? 'مسددة' : 'غير مسددة'}`,
            value: index.toString(),
            description: `$${violation.fine}`
        }));
        
        violationOptions.push({ label: 'إعادة تعيين', value: 'reset' });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_violation_to_edit_${nationalId}`)
            .setPlaceholder('اختر مخالفة لتعديلها')
            .addOptions(violationOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle(`✏️ تعديل مخالفة - ${identity.fullName}`)
            .setDescription('اختر المخالفة التي تريد تعديلها من القائمة المنسدلة:')
            .setColor('#3498db')
            .setImage(getCustomImage(interaction.guildId));
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع اختيار مخالفة للحذف
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_violation_to_delete_')) {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🚔 قسم الشرطة')
                .setDescription('مرحباً بك في قسم الشرطة. اختر إجراء من القائمة أدناه:')
                .setColor('#ff0000')
                .setImage(getCustomImage(interaction.guildId));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('police_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'البحث عن شخص', value: 'search_person' },
                    { label: 'سجل الجرائم', value: 'crime_record' },
                    { label: 'إدارة الجرائم', value: 'manage_crimes' },
                    { label: 'إصدار مذكرة قبض', value: 'arrest_warrant' },
                    { label: 'إضافة مخالفة', value: 'add_violation' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        const nationalId = interaction.customId.replace('select_violation_to_delete_', '');
        const violationIndex = parseInt(interaction.values[0]);
        const userViolations = violations[nationalId] || [];
        const selectedViolation = userViolations[violationIndex];
        
        if (!selectedViolation) {
            await interaction.reply({ content: '❌ لم يتم العثور على المخالفة المحددة أو تم حذفها.', ephemeral: true });
            return;
        }
        
        // حذف المخالفة
        userViolations.splice(violationIndex, 1);
        saveViolations(violations);
        
        // إرسال لوق
        sendCrimeLog(interaction, 'delete', identities[nationalId].fullName, selectedViolation.title, selectedViolation.desc, 0, selectedViolation.fine, null, 'violation');
        
        await interaction.reply({ 
            content: `✅ تم حذف المخالفة **${selectedViolation.title}** من **${identities[nationalId].fullName}** بنجاح!`, 
            ephemeral: true 
        });
        return;
    }

    // التعامل مع اختيار مخالفة للتعديل
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_violation_to_edit_')) {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🚔 قسم الشرطة')
                .setDescription('مرحباً بك في قسم الشرطة. اختر إجراء من القائمة أدناه:')
                .setColor('#ff0000')
                .setImage(getCustomImage(interaction.guildId));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('police_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'البحث عن شخص', value: 'search_person' },
                    { label: 'سجل الجرائم', value: 'crime_record' },
                    { label: 'إدارة الجرائم', value: 'manage_crimes' },
                    { label: 'إصدار مذكرة قبض', value: 'arrest_warrant' },
                    { label: 'إضافة مخالفة', value: 'add_violation' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        const nationalId = interaction.customId.replace('select_violation_to_edit_', '');
        const violationIndex = parseInt(interaction.values[0]);
        const userViolations = violations[nationalId] || [];
        const selectedViolation = userViolations[violationIndex];
        
        if (!selectedViolation) {
            await interaction.reply({ content: '❌ لم يتم العثور على المخالفة المحددة أو تم حذفها.', ephemeral: true });
            return;
        }
        
        // تغيير الحالة
        selectedViolation.executed = !selectedViolation.executed;
        saveViolations(violations);
        
        // إرسال لوق
        sendCrimeLog(interaction, 'edit', identities[nationalId].fullName, selectedViolation.title, selectedViolation.desc, 0, selectedViolation.fine, selectedViolation.executed ? 'مسددة' : 'غير مسددة', 'violation');
        
        await interaction.reply({ 
            content: `✅ تم تغيير حالة المخالفة **${selectedViolation.title}** إلى: ${selectedViolation.executed ? '✅ مسددة' : '❌ غير مسددة'}`, 
            ephemeral: true 
        });
        return;
    }



    // التعامل مع زر رؤية المزيد في نظام التفعيل
    if (interaction.isButton() && interaction.customId.startsWith('view_more_guilds_activate_')) {
        const pageNumber = parseInt(interaction.customId.split('_')[4]);
        const guilds = client.guilds.cache;
        const guildsArray = Array.from(guilds.values());
        const pageSize = 24;
        const totalPages = Math.ceil(guildsArray.length / pageSize);
        const startIndex = pageNumber * pageSize;
        const endIndex = Math.min(startIndex + pageSize, guildsArray.length);
        const pageGuilds = guildsArray.slice(startIndex, endIndex);
        const guildOptions = pageGuilds.map(guild => ({
            label: `${guild.name} (${guild.memberCount} عضو)`,
            value: guild.id
        }));
        guildOptions.push({ label: 'إعادة تعيين', value: 'reset' });
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_guild_to_activate_page_${pageNumber}`)
            .setPlaceholder('اختر سيرفر لتفعيل البريميوم')
            .addOptions(guildOptions);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        let components = [row];
        if (endIndex < guildsArray.length) {
            const moreButton = new ButtonBuilder()
                .setCustomId(`view_more_guilds_activate_${pageNumber + 1}`)
                .setLabel('رؤية المزيد')
                .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder().addComponents(moreButton);
            components.push(buttonRow);
        }
        const embed = new EmbedBuilder()
            .setTitle('🔑 تفعيل البريميوم')
            .setDescription(`اختر سيرفر من القائمة لتفعيل أو إيقاف البريميوم فيه (الصفحة ${pageNumber + 1} من ${totalPages})`)
            .setColor('#f1c40f')
            .setImage(IMAGE_URL);
        await interaction.update({ embeds: [embed], components: components, ephemeral: true });
        return;
    }
    // التعامل مع اختيار سيرفر من قائمة التفعيل
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_guild_to_activate_page_')) {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🔧 لوحة تحكم المطورين')
                .setDescription('مرحباً بك في لوحة تحكم المطورين. اختر إجراء من القائمة أدناه:')
                .setColor('#ff6b6b')
                .setImage(IMAGE_URL);
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('owner_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'إحصائيات البوت', value: 'bot_stats' },
                    { label: 'إيقاف | تشغيل البوت', value: 'bot_toggle' },
                    { label: 'تغيير إمبد', value: 'change_embed' },
                    { label: 'تفعيل', value: 'activate' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        const selectedGuildId = interaction.values[0];
        const selectedGuild = client.guilds.cache.get(selectedGuildId);
        if (!selectedGuild) {
            await interaction.reply({ content: '❌ لم يتم العثور على السيرفر المحدد.', ephemeral: true });
            return;
        }
        const isPremium = !!premium[selectedGuildId];
        const embed = new EmbedBuilder()
            .setTitle(`🔑 معلومات السيرفر: ${selectedGuild.name}`)
            .setColor(isPremium ? '#ffd700' : '#7f8c8d')
            .setThumbnail(selectedGuild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👑 أونر السيرفر', value: `<@${selectedGuild.ownerId}>`, inline: true },
                { name: '🆔 آيدي السيرفر', value: selectedGuild.id, inline: true },
                { name: '👥 عدد الأعضاء', value: selectedGuild.memberCount.toString(), inline: true },
                { name: '🔗 رابط السيرفر', value: `https://discord.gg/${selectedGuild.vanityURLCode || 'غير متوفر'}`, inline: true },
                { name: '💎 حالة البريميوم', value: isPremium ? 'مفعل ✅' : 'غير مفعل ❌', inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(selectedGuild.createdTimestamp / 1000)}:F>`, inline: true }
            )
            .setImage(IMAGE_URL)
            .setTimestamp();
        // زر تفعيل/إيقاف البريميوم
        const premiumBtn = new ButtonBuilder()
            .setCustomId(`toggle_premium_${selectedGuildId}`)
            .setLabel(isPremium ? 'إيقاف تفعيل البريميوم' : 'تفعيل البريميوم')
            .setStyle(isPremium ? ButtonStyle.Danger : ButtonStyle.Success);
        const row = new ActionRowBuilder().addComponents(premiumBtn);
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }
    // التعامل مع زر تفعيل/إيقاف البريميوم
    if (interaction.isButton() && interaction.customId.startsWith('toggle_premium_')) {
        const guildId = interaction.customId.replace('toggle_premium_', '');
        const isPremium = !!premium[guildId];
        if (isPremium) {
            delete premium[guildId];
        } else {
            premium[guildId] = true;
        }
        savePremium(premium);
        // إعادة عرض معلومات السيرفر مع الزر الجديد
        const selectedGuild = client.guilds.cache.get(guildId);
        const newIsPremium = !!premium[guildId];
        const embed = new EmbedBuilder()
            .setTitle(`🔑 معلومات السيرفر: ${selectedGuild.name}`)
            .setColor(newIsPremium ? '#ffd700' : '#7f8c8d')
            .setThumbnail(selectedGuild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👑 أونر السيرفر', value: `<@${selectedGuild.ownerId}>`, inline: true },
                { name: '🆔 آيدي السيرفر', value: selectedGuild.id, inline: true },
                { name: '👥 عدد الأعضاء', value: selectedGuild.memberCount.toString(), inline: true },
                { name: '🔗 رابط السيرفر', value: `https://discord.gg/${selectedGuild.vanityURLCode || 'غير متوفر'}`, inline: true },
                { name: '💎 حالة البريميوم', value: newIsPremium ? 'مفعل ✅' : 'غير مفعل ❌', inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(selectedGuild.createdTimestamp / 1000)}:F>`, inline: true }
            )
            .setImage(IMAGE_URL)
            .setTimestamp();
        const premiumBtn = new ButtonBuilder()
            .setCustomId(`toggle_premium_${guildId}`)
            .setLabel(newIsPremium ? 'إيقاف تفعيل البريميوم' : 'تفعيل البريميوم')
            .setStyle(newIsPremium ? ButtonStyle.Danger : ButtonStyle.Success);
        const row = new ActionRowBuilder().addComponents(premiumBtn);
        await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // أمر /النضام
    if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'النضام') {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        // تحقق من رتبة الشرطة
        if (!config.militaryRoleId || !interaction.member.roles.cache.has(config.militaryRoleId)) {
            await interaction.reply({ content: '❌ هذا الأمر متاح فقط لأعضاء الشرطة.', ephemeral: true });
            return;
        }
        // تحقق من وجود هوية
        const identity = Object.values(identities).find(id => id.userId === interaction.user.id);
        if (!identity) {
            await interaction.reply({ content: '❌ يجب أن يكون لديك هوية وطنية لاستخدام هذا النظام.', ephemeral: true });
            return;
        }
        
        // إنشاء قائمة منسدلة مع الخيارات
        const options = [
            { label: 'تسجيل دخول', value: 'police_login_btn', description: 'تسجيل دخول/خروج/إنهاء عمل' }
        ];
        
        // إضافة زر نقاطي للجميع
        options.push({ label: 'نقاطي', value: 'my_points', description: 'عرض نقاطك الحالية' });
        
        // إضافة أزرار الإدارة لمسؤولي الشرطة فقط
        if (hasPoliceAdminRole(interaction.member)) {
            options.push(
                { label: 'إدارة النظام', value: 'manage_system', description: 'إدارة إعدادات النظام' },
                { label: 'إدارة النقاط', value: 'manage_points', description: 'إدارة نقاط العسكريين' }
            );
        }
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('system_menu')
            .setPlaceholder('اختر إجراء من القائمة')
            .addOptions(options);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle('نظام نقاط الشرطة')
            .setDescription('اختر إجراء من القائمة المنسدلة أدناه')
            .setColor('#2980b9')
            .setImage(getCustomImage(interaction.guildId));
        
        await interaction.reply({ embeds: [embed], components: [row] });
        return;
    }
    // التعامل مع القائمة المنسدلة في أمر النضام
    if (interaction.isStringSelectMenu() && interaction.customId === 'system_menu') {
        const selectedValue = interaction.values[0];
        
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        // تحقق من رتبة الشرطة
        if (!config.militaryRoleId || !interaction.member.roles.cache.has(config.militaryRoleId)) {
            await interaction.reply({ content: '❌ هذا الأمر متاح فقط لأعضاء الشرطة.', ephemeral: true });
            return;
        }
        // تحقق من وجود هوية
        const identity = Object.values(identities).find(id => id.userId === interaction.user.id);
        if (!identity) {
            await interaction.reply({ content: '❌ يجب أن يكون لديك هوية وطنية لاستخدام هذا النظام.', ephemeral: true });
            return;
        }
        
        if (selectedValue === 'police_login_btn') {
            // إذا لم يكن لديه كود عسكري، أظهر مودال لإدخاله
            if (!identity.policeCode) {
                const modal = new ModalBuilder()
                    .setCustomId('police_code_modal')
                    .setTitle('إدخال الكود العسكري')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('police_code')
                                .setLabel('أدخل كودك العسكري')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );
                await interaction.showModal(modal);
                return;
            }
            // إذا لديه كود عسكري، أظهر قائمة الحالة
            await showPoliceStatusEmbed(interaction, identity, 'login');
            return;
        }
        
        if (selectedValue === 'my_points') {
            // عرض نقاط العسكري
            const points = identity.points || 0;
            const embed = new EmbedBuilder()
                .setTitle('نقاطي')
                .setDescription(`**${identity.fullName}**`)
                .addFields(
                    { name: 'النقاط الحالية', value: `${points} نقطة`, inline: true },
                    { name: 'الكود العسكري', value: identity.policeCode || 'غير محدد', inline: true }
                )
                .setColor('#27ae60')
                .setImage(getCustomImage(interaction.guildId))
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        
        if (selectedValue === 'manage_system') {
            // تحقق من صلاحية مسؤول الشرطة
            if (!hasPoliceAdminRole(interaction.member)) {
                await interaction.reply({ content: '❌ هذا الخيار متاح فقط لمسؤولي الشرطة.', ephemeral: true });
                return;
            }
            
            // جلب جميع العسكريين الذين لديهم كود عسكري
            const militaryMembers = Object.values(identities).filter(id => id.policeCode);
            
            if (militaryMembers.length === 0) {
                await interaction.reply({ content: '❌ لا يوجد عسكريين مسجلين في النظام.', ephemeral: true });
                return;
            }
            
            // إنشاء قائمة منسدلة بالعسكريين (أول 24 فقط)
            const pageSize = 24;
            const firstPageMembers = militaryMembers.slice(0, pageSize);
            
            const memberOptions = firstPageMembers.map(member => ({
                label: `${member.fullName} (${member.policeCode})`,
                value: member.nationalId,
                description: `نقاط: ${member.points || 0}`
            }));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('manage_military_member_page_0')
                .setPlaceholder('اختر عسكري لإدارته')
                .addOptions(memberOptions);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            // إضافة زر "رؤية المزيد" إذا كان هناك أكثر من 24 عسكري
            let components = [row];
            if (militaryMembers.length > pageSize) {
                const moreButton = new ButtonBuilder()
                    .setCustomId('view_more_military_1')
                    .setLabel('رؤية المزيد')
                    .setStyle(ButtonStyle.Secondary);
                const buttonRow = new ActionRowBuilder().addComponents(moreButton);
                components.push(buttonRow);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('إدارة العسكريين')
                .setDescription(`اختر عسكري من القائمة لإدارته (الصفحة 1 من ${Math.ceil(militaryMembers.length / pageSize)})`)
                .setColor('#e74c3c')
                .setImage(getCustomImage(interaction.guildId));
            
            await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
            return;
        }
        
        if (selectedValue === 'manage_points') {
            // تحقق من صلاحية مسؤول الشرطة
            if (!hasPoliceAdminRole(interaction.member)) {
                await interaction.reply({ content: '❌ هذا الخيار متاح فقط لمسؤولي الشرطة.', ephemeral: true });
                return;
            }
            
            // جلب جميع العسكريين الذين لديهم كود عسكري
            const militaryMembers = Object.values(identities).filter(id => id.policeCode);
            
            if (militaryMembers.length === 0) {
                await interaction.reply({ content: '❌ لا يوجد عسكريين مسجلين في النظام.', ephemeral: true });
                return;
            }
            
            // إنشاء قائمة منسدلة بالعسكريين (أول 24 فقط)
            const pageSize = 24;
            const firstPageMembers = militaryMembers.slice(0, pageSize);
            
            const memberOptions = firstPageMembers.map(member => ({
                label: `${member.fullName} (${member.policeCode})`,
                value: member.nationalId,
                description: `نقاط: ${member.points || 0}`
            }));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('manage_points_member_page_0')
                .setPlaceholder('اختر عسكري لإدارة نقاطه')
                .addOptions(memberOptions);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            // إضافة زر "رؤية المزيد" إذا كان هناك أكثر من 24 عسكري
            let components = [row];
            if (militaryMembers.length > pageSize) {
                const moreButton = new ButtonBuilder()
                    .setCustomId('view_more_points_1')
                    .setLabel('رؤية المزيد')
                    .setStyle(ButtonStyle.Secondary);
                const buttonRow = new ActionRowBuilder().addComponents(moreButton);
                components.push(buttonRow);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('إدارة النقاط')
                .setDescription(`اختر عسكري من القائمة لإدارة نقاطه (الصفحة 1 من ${Math.ceil(militaryMembers.length / pageSize)})`)
                .setColor('#f39c12')
                .setImage(getCustomImage(interaction.guildId));
            
            await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
            return;
        }
    }
    // استقبال مودال الكود العسكري
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'police_code_modal') {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const userId = interaction.user.id;
        const policeCode = interaction.fields.getTextInputValue('police_code');
        // حفظ الكود العسكري في الهوية
        const nationalId = Object.keys(identities).find(nid => identities[nid].userId === userId);
        if (nationalId) {
            identities[nationalId].policeCode = policeCode;
            saveIdentities(identities);
            
            // إرسال لوق الشرطة عند تسجيل دخول عسكري لأول مرة
            sendPoliceLog(interaction, 'add', identities[nationalId].fullName, 'تسجيل دخول عسكري جديد', `تم تسجيل دخول عسكري جديد بالكود: ${policeCode}`, null, null, null);
        }
        // أظهر قائمة الحالة بعد الحفظ
        await showPoliceStatusEmbed(interaction, identities[nationalId], 'login', true);
        
        // تحديث صور جدول العسكريين عند أول تسجيل دخول
        try {
            await updatePoliceTableImages(interaction.guild);
        } catch (error) {
            console.error('خطأ في تحديث صور جدول العسكريين:', error);
        }
        return;
    }

    // استقبال مودال تعديل الكود العسكري
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('edit_military_code_modal_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const nationalId = interaction.customId.split('_')[4];
        const newCode = interaction.fields.getTextInputValue('new_military_code');
        const member = identities[nationalId];
        
        if (!member) {
            await interaction.reply({ content: '❌ لم يتم العثور على العسكري المحدد.', ephemeral: true });
            return;
        }
        
        const oldCode = member.policeCode;
        member.policeCode = newCode;
        saveIdentities(identities);
        
        // إرسال لوق الشرطة
        sendPoliceLog(interaction, 'edit', member.fullName, 'تعديل الكود العسكري', `تم تغيير الكود من ${oldCode} إلى ${newCode}`, null, null, null);
        
        // تحديث صور جدول العسكريين
        try {
            await updatePoliceTableImages(interaction.guild);
        } catch (error) {
            console.error('خطأ في تحديث صور جدول العسكريين:', error);
        }
        
        await interaction.reply({ 
            content: `✅ تم تعديل الكود العسكري للعسكري **${member.fullName}** بنجاح!\n**الكود القديم:** ${oldCode}\n**الكود الجديد:** ${newCode}`, 
            ephemeral: true 
        });
        return;
    }

    // استقبال مودال إضافة نقاط
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('add_points_modal_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const nationalId = interaction.customId.split('_')[3];
        const pointsToAdd = parseInt(interaction.fields.getTextInputValue('points_to_add'));
        const reason = interaction.fields.getTextInputValue('add_reason');
        const member = identities[nationalId];
        
        if (!member) {
            await interaction.reply({ content: '❌ لم يتم العثور على العسكري المحدد.', ephemeral: true });
            return;
        }
        
        if (isNaN(pointsToAdd) || pointsToAdd <= 0) {
            await interaction.reply({ content: '❌ يرجى إدخال عدد صحيح موجب من النقاط.', ephemeral: true });
            return;
        }
        
        const oldPoints = member.points || 0;
        member.points = oldPoints + pointsToAdd;
        saveIdentities(identities);
        
        // إرسال لوق الشرطة
        sendPoliceLog(interaction, 'edit', member.fullName, 'إضافة نقاط', `تم إضافة ${pointsToAdd} نقاط للعسكري. السبب: ${reason}`, member.points, null, null);
        
        // تحديث صور جدول العسكريين
        try {
            await updatePoliceTableImages(interaction.guild);
        } catch (error) {
            console.error('خطأ في تحديث صور جدول العسكريين:', error);
        }
        
        await interaction.reply({ 
            content: `✅ تم إضافة **${pointsToAdd}** نقاط للعسكري **${member.fullName}** بنجاح!\n**النقاط السابقة:** ${oldPoints}\n**النقاط الجديدة:** ${member.points}\n**السبب:** ${reason}`, 
            ephemeral: true 
        });
        return;
    }

    // استقبال مودال خصم نقاط
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('remove_points_modal_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const nationalId = interaction.customId.split('_')[3];
        const pointsToRemove = parseInt(interaction.fields.getTextInputValue('points_to_remove'));
        const reason = interaction.fields.getTextInputValue('remove_reason');
        const member = identities[nationalId];
        
        if (!member) {
            await interaction.reply({ content: '❌ لم يتم العثور على العسكري المحدد.', ephemeral: true });
            return;
        }
        
        if (isNaN(pointsToRemove) || pointsToRemove <= 0) {
            await interaction.reply({ content: '❌ يرجى إدخال عدد صحيح موجب من النقاط.', ephemeral: true });
            return;
        }
        
        const oldPoints = member.points || 0;
        member.points = Math.max(0, oldPoints - pointsToRemove); // لا تسمح بالنقاط السالبة
        saveIdentities(identities);
        
        // إرسال لوق الشرطة
        sendPoliceLog(interaction, 'edit', member.fullName, 'خصم نقاط', `تم خصم ${pointsToRemove} نقاط من العسكري. السبب: ${reason}`, member.points, null, null);
        
        // تحديث صور جدول العسكريين
        try {
            await updatePoliceTableImages(interaction.guild);
        } catch (error) {
            console.error('خطأ في تحديث صور جدول العسكريين:', error);
        }
        
        await interaction.reply({ 
            content: `✅ تم خصم **${pointsToRemove}** نقاط من العسكري **${member.fullName}** بنجاح!\n**النقاط السابقة:** ${oldPoints}\n**النقاط الجديدة:** ${member.points}\n**السبب:** ${reason}`, 
            ephemeral: true 
        });
        return;
    }
    // التعامل مع اختيار عسكري من قائمة الإدارة
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('manage_military_member_page_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const nationalId = interaction.values[0];
        const member = identities[nationalId];
        
        if (!member) {
            await interaction.reply({ content: '❌ لم يتم العثور على العسكري المحدد.', ephemeral: true });
            return;
        }
        
        // إنشاء إمبيد بمعلومات العسكري
        const embed = new EmbedBuilder()
            .setTitle(`معلومات العسكري: ${member.fullName}`)
            .setColor('#3498db')
            .addFields(
                { name: 'الاسم الكامل', value: member.fullName, inline: true },
                { name: 'الكود العسكري', value: member.policeCode || 'غير محدد', inline: true },
                { name: 'النقاط', value: `${member.points || 0} نقطة`, inline: true },
                { name: 'الجنس', value: member.gender, inline: true },
                { name: 'تاريخ الميلاد', value: `${member.day.padStart(2, '0')}/${convertArabicMonthToNumber(member.month)}/${member.year}`, inline: true },
                { name: 'مكان الولادة', value: member.city, inline: true },
                { name: 'الرقم الوطني', value: member.nationalId, inline: true },
                { name: 'صاحب الهوية', value: `<@${member.userId}>`, inline: true },
                { name: 'الحالة', value: member.policeStatus || 'غير محدد', inline: true }
            )
            .setImage(getCustomImage(interaction.guildId))
            .setTimestamp();
        
        // زر تعديل الكود العسكري
        const editButton = new ButtonBuilder()
            .setCustomId(`edit_military_code_${nationalId}`)
            .setLabel('تعديل الكود العسكري')
            .setStyle(ButtonStyle.Primary);
        
        const row = new ActionRowBuilder().addComponents(editButton);
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع اختيار عسكري من قائمة إدارة النقاط
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('manage_points_member_page_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const nationalId = interaction.values[0];
        const member = identities[nationalId];
        
        if (!member) {
            await interaction.reply({ content: '❌ لم يتم العثور على العسكري المحدد.', ephemeral: true });
            return;
        }
        
        // إنشاء إمبيد بمعلومات العسكري
        const embed = new EmbedBuilder()
            .setTitle(`إدارة نقاط العسكري: ${member.fullName}`)
            .setColor('#f39c12')
            .addFields(
                { name: 'الاسم الكامل', value: member.fullName, inline: true },
                { name: 'الكود العسكري', value: member.policeCode || 'غير محدد', inline: true },
                {name: 'النقاط الحالية', value: `${member.points || 0} نقطة`, inline: true },
                { name: 'الجنس', value: member.gender, inline: true },
                { name: 'تاريخ الميلاد', value: `${member.day.padStart(2, '0')}/${convertArabicMonthToNumber(member.month)}/${member.year}`, inline: true },
                { name: 'مكان الولادة', value: member.city, inline: true },
                { name: 'الرقم الوطني', value: member.nationalId, inline: true },
                { name: 'صاحب الهوية', value: `<@${member.userId}>`, inline: true },
                { name: 'الحالة', value: member.policeStatus || 'غير محدد', inline: true }
            )
            .setImage(getCustomImage(interaction.guildId))
            .setTimestamp();
        
        // أزرار إدارة النقاط
        const addPointsButton = new ButtonBuilder()
            .setCustomId(`add_points_${nationalId}`)
            .setLabel('إضافة نقاط')
            .setStyle(ButtonStyle.Success);
        
        const removePointsButton = new ButtonBuilder()
            .setCustomId(`remove_points_${nationalId}`)
            .setLabel('خصم نقاط')
            .setStyle(ButtonStyle.Danger);
        
        const row = new ActionRowBuilder().addComponents(addPointsButton, removePointsButton);
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع زر تعديل الكود العسكري
    if (interaction.isButton() && interaction.customId.startsWith('edit_military_code_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const nationalId = interaction.customId.split('_')[3];
        const member = identities[nationalId];
        
        if (!member) {
            await interaction.reply({ content: '❌ لم يتم العثور على العسكري المحدد.', ephemeral: true });
            return;
        }
        
        // إنشاء مودال لتعديل الكود العسكري
        const modal = new ModalBuilder()
            .setCustomId(`edit_military_code_modal_${nationalId}`)
            .setTitle('تعديل الكود العسكري')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('new_military_code')
                        .setLabel('الكود العسكري الجديد')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setValue(member.policeCode || '')
                )
            );
        
        await interaction.showModal(modal);
        return;
    }

    // التعامل مع زر إضافة نقاط
    if (interaction.isButton() && interaction.customId.startsWith('add_points_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const nationalId = interaction.customId.split('_')[2];
        const member = identities[nationalId];
        
        if (!member) {
            await interaction.reply({ content: '❌ لم يتم العثور على العسكري المحدد.', ephemeral: true });
            return;
        }
        
        // إنشاء مودال لإضافة نقاط
        const modal = new ModalBuilder()
            .setCustomId(`add_points_modal_${nationalId}`)
            .setTitle('إضافة نقاط')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('points_to_add')
                        .setLabel('عدد النقاط المراد إضافتها')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('مثال: 10')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('add_reason')
                        .setLabel('سبب إضافة النقاط')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setPlaceholder('مثال: أداء ممتاز في العمل')
                )
            );
        
        await interaction.showModal(modal);
        return;
    }

    // التعامل مع زر خصم نقاط
    if (interaction.isButton() && interaction.customId.startsWith('remove_points_')) {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        const nationalId = interaction.customId.split('_')[2];
        const member = identities[nationalId];
        
        if (!member) {
            await interaction.reply({ content: '❌ لم يتم العثور على العسكري المحدد.', ephemeral: true });
            return;
        }
        
        // إنشاء مودال لخصم نقاط
        const modal = new ModalBuilder()
            .setCustomId(`remove_points_modal_${nationalId}`)
            .setTitle('خصم نقاط')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('points_to_remove')
                        .setLabel('عدد النقاط المراد خصمها')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('مثال: 5')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('remove_reason')
                        .setLabel('سبب خصم النقاط')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setPlaceholder('مثال: تأخير في العمل')
                )
            );
        
        await interaction.showModal(modal);
        return;
    }

    // التعامل مع القائمة المنسدلة لحالة العسكري
    if (interaction.isStringSelectMenu() && interaction.customId === 'police_status_select') {
        // تحقق من البريميوم
        if (!premium[interaction.guildId]) {
            await interaction.reply({ 
                content: '❌ هذا الأمر اشتراك بريميوم يرجى التواصل مع أحد المطورين للاشتراك:\n<@1337512375355707412> <@1070609053065154631> <@1291805249815711826> <@1319791882389164072>', 
                ephemeral: true 
            });
            return;
        }
        
        // تحقق من رتبة الشرطة
        if (!config.militaryRoleId || !interaction.member.roles.cache.has(config.militaryRoleId)) {
            await interaction.reply({ content: '❌ هذا الأمر متاح فقط لأعضاء الشرطة.', ephemeral: true });
            return;
        }
        // تحقق من وجود هوية
        const identity = Object.values(identities).find(id => id.userId === interaction.user.id);
        if (!identity) {
            await interaction.reply({ content: '❌ يجب أن يكون لديك هوية وطنية لاستخدام هذا النظام.', ephemeral: true });
            return;
        }
        // تحديث الحالة
        const status = interaction.values[0]; // login, logout, end_shift
        const oldStatus = identity.policeStatus;
        identity.policeStatus = status;
        saveIdentities(identities);
        
        // إرسال لوق الشرطة عند تغيير الحالة
        let statusText = 'غير محدد';
        if (status === 'login') statusText = 'تسجيل دخول';
        if (status === 'logout') statusText = 'تسجيل خروج';
        if (status === 'end_shift') statusText = 'إنهاء عمل';
        
        sendPoliceLog(interaction, 'status', identity.fullName, 'تغيير حالة عسكري', `تم تغيير حالة العسكري من ${oldStatus || 'غير محدد'} إلى ${statusText}`, null, statusText, null);
        
        await showPoliceStatusEmbed(interaction, identity, status, false, true);
        return;
    }

    // التعامل مع زر إضافة جريمة
    if (interaction.isButton() && interaction.customId.startsWith('add_crime_')) {
        // التحقق من الصلاحيات: فقط مسؤولي الشرطة يمكنهم إضافة الجرائم
        if (!hasPoliceAdminRole(interaction.member)) {
            await interaction.reply({
                content: '❌ فقط مسؤولي الشرطة يمكنهم إضافة الجرائم.',
                ephemeral: true
            });
            return;
        }
        
        const nationalId = interaction.customId.replace('add_crime_', '');
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        // قائمة بعناوين الجرائم (24 عنوان)
        const crimeTitles = [
            'السرقة',
            'الاحتيال',
            'الاعتداء الجسدي',
            'التهديد',
            'الابتزاز',
            'الرشوة',
            'التزوير',
            'التهريب',
            'الغش التجاري',
            'التحرش',
            'السب والقذف',
            'إتلاف الممتلكات',
            'القيادة المتهورة',
            'تعاطي المخدرات',
            'بيع المخدرات',
            'السطو المسلح',
            'الخطف',
            'القتل',
            'الاغتصاب',
            'الحرق العمد',
            'الانتحال',
            'التهرب الضريبي',
            'الغسل المالي',
            'إعادة تعيين'
        ];
        
        // إنشاء قائمة منسدلة بعناوين الجرائم
        const crimeOptions = crimeTitles.map(title => ({
            label: title,
            value: title === 'إعادة تعيين' ? 'reset' : title
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_crime_title_${nationalId}`)
            .setPlaceholder('اختر عنوان الجريمة')
            .addOptions(crimeOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle(`🔧 إضافة جريمة - ${identity.fullName}`)
            .setDescription('اختر عنوان الجريمة من القائمة المنسدلة:')
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId));
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
    }

    // التعامل مع اختيار عنوان الجريمة
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_crime_title_')) {
        if (interaction.values[0] === 'reset') {
            // إعادة القائمة للوضع الأولي
            const embed = new EmbedBuilder()
                .setTitle('🚔 قسم الشرطة')
                .setDescription('مرحباً بك في قسم الشرطة. اختر إجراء من القائمة أدناه:')
                .setColor('#ff0000')
                .setImage(getCustomImage(interaction.guildId));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('police_select')
                .setPlaceholder('اختر إجراء')
                .addOptions([
                    { label: 'البحث عن شخص', value: 'search_person' },
                    { label: 'سجل الجرائم', value: 'crime_record' },
                    { label: 'إدارة الجرائم', value: 'manage_crimes' },
                    { label: 'إصدار مذكرة قبض', value: 'arrest_warrant' },
                    { label: 'إضافة مخالفة', value: 'add_violation' },
                    { label: 'إعادة تعيين', value: 'reset' }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }
        
        const nationalId = interaction.customId.replace('select_crime_title_', '');
        const crimeTitle = interaction.values[0];
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        // إنشاء مودال لإدخال تفاصيل الجريمة
        const modal = new ModalBuilder()
            .setCustomId(`add_crime_details_${nationalId}`)
            .setTitle(`إضافة جريمة - ${crimeTitle}`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('crime_title')
                        .setLabel('عنوان الجريمة')
                        .setStyle(TextInputStyle.Short)
                        .setValue(crimeTitle)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('crime_desc')
                        .setLabel('وصف الجريمة')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('أدخل وصف مفصل للجريمة...')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('crime_months')
                        .setLabel('مدة الجريمة (بالأشهر)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('مثال: 6')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('crime_fine')
                        .setLabel('المبلغ (بالدولار)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('مثال: 1000')
                        .setRequired(true)
                )
            );
        
        await interaction.showModal(modal);
        return;
    }

    // التعامل مع مودال إضافة تفاصيل الجريمة
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('add_crime_details_')) {
        const nationalId = interaction.customId.replace('add_crime_details_', '');
        const identity = identities[nationalId];
        
        if (!identity) {
            await interaction.reply({ content: '❌ لم يتم العثور على الهوية المحددة.', ephemeral: true });
            return;
        }
        
        const title = interaction.fields.getTextInputValue('crime_title');
        const desc = interaction.fields.getTextInputValue('crime_desc');
        const months = parseInt(interaction.fields.getTextInputValue('crime_months')) || 0;
        const fine = parseInt(interaction.fields.getTextInputValue('crime_fine')) || 0;
        
        // إضافة الجريمة
        if (!crimes[nationalId]) {
            crimes[nationalId] = [];
        }
        
        const crime = {
            title,
            desc,
            months,
            fine,
            executed: false,
            date: new Date().toISOString()
        };
        
        crimes[nationalId].push(crime);
        saveCrimes(crimes);
        
        // إرسال لوق
        sendCrimeLog(interaction, 'add', identity.fullName, crime.title, crime.desc, crime.months, crime.fine, null, 'crime');
        
        // إنشاء embed محدث مع معلومات الجرائم
        const userCrimes = crimes[nationalId] || [];
        const crimeOptions = userCrimes.map((crime, index) => ({
            label: `${crime.title} - ${crime.executed ? 'مسددة' : 'غير مسددة'}`,
            value: index.toString()
        }));
        
        crimeOptions.push({ label: 'إعادة تعيين', value: 'reset' });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`manage_crime_${nationalId}`)
            .setPlaceholder('اختر جريمة لإدارتها')
            .addOptions(crimeOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle(`🔧 إدارة الجرائم - ${identity.fullName}`)
            .setDescription(`✅ تم إضافة جريمة بنجاح!\n**العنوان:** ${title}\n**الوصف:** ${desc}\n**المدة:** ${months} شهر\n**المبلغ:** $${fine}\n\nاختر جريمة من القائمة لإدارتها:`)
            .setColor('#e74c3c')
            .setImage(getCustomImage(interaction.guildId));
        
        // إضافة زر إضافة جريمة
        const addCrimeButton = new ButtonBuilder()
            .setCustomId(`add_crime_${nationalId}`)
            .setLabel('إضافة جريمة')
            .setStyle(ButtonStyle.Success);
        
        const buttonRow = new ActionRowBuilder().addComponents(addCrimeButton);
        
        await interaction.reply({ embeds: [embed], components: [row, buttonRow], ephemeral: true });
        return;
    }

    // التعامل مع زر حذف الجريمة
    if (interaction.isButton() && interaction.customId.startsWith('delete_crime_')) {
        // التحقق من الصلاحيات: فقط مسؤولي الشرطة يمكنهم حذف الجرائم
        if (!hasPoliceAdminRole(interaction.member)) {
            await interaction.reply({
                content: '❌ فقط مسؤولي الشرطة يمكنهم حذف الجرائم.',
                ephemeral: true
            });
            return;
        }
        const parts = interaction.customId.split('_');
        const nationalId = parts[2];
        const crimeIndex = parseInt(parts[3]);
        const userCrimes = crimes[nationalId] || [];
        const selectedCrime = userCrimes[crimeIndex];
        if (!selectedCrime) {
            await interaction.reply({ content: '❌ لم يتم العثور على الجريمة المحددة أو تم حذفها.', ephemeral: true });
            return;
        }
        // حذف الجريمة من القائمة
        userCrimes.splice(crimeIndex, 1);
        crimes[nationalId] = userCrimes;
        saveCrimes(crimes);
        // إرسال لوق الحذف
        sendCrimeLog(
            interaction,
            'delete',
            identities[nationalId]?.fullName || 'غير معروف',
            selectedCrime.title,
            selectedCrime.desc,
            selectedCrime.months,
            selectedCrime.fine,
            null,
            'crime'
        );
        // إنشاء embed محدث مع معلومات الجرائم المتبقية
        const identity = identities[nationalId];
        const remainingCrimes = crimes[nationalId] || [];
        
        if (remainingCrimes.length === 0) {
            // إذا لم تتبق جرائم، عرض embed مع زر إضافة جريمة فقط
            const embed = new EmbedBuilder()
                .setTitle(`🔧 إدارة الجرائم - ${identity.fullName}`)
                .setDescription('لا توجد جرائم حالياً لهذا الشخص.')
                .setColor('#e74c3c')
                .setImage(getCustomImage(interaction.guildId));
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`add_crime_${nationalId}`)
                    .setLabel('إضافة جريمة')
                    .setStyle(ButtonStyle.Success)
            );
            
            await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            // إذا تبقيت جرائم، عرض قائمة الجرائم المتبقية
            const crimeOptions = remainingCrimes.map((crime, index) => ({
                label: `${crime.title} - ${crime.executed ? 'مسددة' : 'غير مسددة'}`,
                value: index.toString()
            }));
            
            crimeOptions.push({ label: 'إعادة تعيين', value: 'reset' });
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`manage_crime_${nationalId}`)
                .setPlaceholder('اختر جريمة لإدارتها')
                .addOptions(crimeOptions);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            const embed = new EmbedBuilder()
                .setTitle(`🔧 إدارة الجرائم - ${identity.fullName}`)
                .setDescription('اختر جريمة من القائمة لإدارتها:')
                .setColor('#e74c3c')
                .setImage(getCustomImage(interaction.guildId));
            
            // إضافة زر إضافة جريمة
            const addCrimeButton = new ButtonBuilder()
                .setCustomId(`add_crime_${nationalId}`)
                .setLabel('إضافة جريمة')
                .setStyle(ButtonStyle.Success);
            
            const buttonRow = new ActionRowBuilder().addComponents(addCrimeButton);
            
            await interaction.update({ embeds: [embed], components: [row, buttonRow], ephemeral: true });
        }
        return;
    }

});

// دالة إرسال لوق الجرائم والمخالفات
function sendCrimeLog(interaction, action, personName, title, desc, months, fine, status = null, type = 'crime') {
    const logChannel = config.crimesLogChannelId && interaction.guild.channels.cache.get(config.crimesLogChannelId);
    if (!logChannel) return;
    
    let description = '';
    let color = '#00b894';
    let logTitle = type === 'violation' ? '🚨 لوق المخالفات' : '🚔 لوق الجرائم';
    let itemType = type === 'violation' ? 'مخالفة' : 'جريمة';
    
    switch (action) {
        case 'add':
            if (type === 'violation') {
                description = `قام <@${interaction.user.id}> بإضافة مخالفة إلى **${personName}**\n\n**عنوان المخالفة:** ${title}\n**وصف المخالفة:** ${desc}\n**القيمة:** $${fine}`;
            } else {
                description = `قام <@${interaction.user.id}> بإضافة جريمة إلى **${personName}**\n\n**عنوان الجريمة:** ${title}\n**وصف الجريمة:** ${desc}\n**المدة بالأشهر:** ${months}\n**الغرامة:** $${fine}`;
            }
            color = '#e74c3c'; // أحمر للعناصر الجديدة
            break;
        case 'delete':
            if (type === 'violation') {
                description = `قام <@${interaction.user.id}> بإزالة مخالفة من **${personName}**\n\n**عنوان المخالفة:** ${title}\n**وصف المخالفة:** ${desc}\n**القيمة:** $${fine}`;
            } else {
                description = `قام <@${interaction.user.id}> بإزالة جريمة من **${personName}**\n\n**عنوان الجريمة:** ${title}\n**وصف الجريمة:** ${desc}\n**المدة بالأشهر:** ${months}\n**الغرامة:** $${fine}`;
            }
            color = '#f39c12'; // برتقالي للحذف
            break;
        case 'edit':
            if (type === 'violation') {
                description = `قام <@${interaction.user.id}> بتعديل مخالفة لـ **${personName}**\n\n**عنوان المخالفة:** ${title}\n**وصف المخالفة:** ${desc}\n**القيمة:** $${fine}\n**التعديل:** ${status}`;
            } else {
                description = `قام <@${interaction.user.id}> بتعديل جريمة لـ **${personName}**\n\n**عنوان الجريمة:** ${title}\n**وصف الجريمة:** ${desc}\n**المدة بالأشهر:** ${months}\n**الغرامة:** $${fine}\n**التعديل:** ${status}`;
            }
            color = '#3498db'; // أزرق للتعديل
            break;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(logTitle)
        .setDescription(description)
        .setColor(color)
        .setImage(getCustomImage(interaction.guildId))
        .setTimestamp();
    
    logChannel.send({ embeds: [embed] });
}

// دالة إرسال لوق الشرطة
function sendPoliceLog(interaction, action, personName, title, desc, points, status = null, type = 'police') {
    const logChannel = config.policeLogChannelId && interaction.guild.channels.cache.get(config.policeLogChannelId);
    if (!logChannel) return;
    
    let description = '';
    let color = '#00b894';
    let logTitle = '👮 لوق الشرطة';
    
    switch (action) {
        case 'add':
            description = `قام <@${interaction.user.id}> بإضافة عسكري جديد **${personName}**\n\n**العنوان:** ${title}\n**الوصف:** ${desc}`;
            color = '#27ae60'; // أخضر للإضافة
            break;
        case 'delete':
            description = `قام <@${interaction.user.id}> بإزالة عسكري **${personName}**\n\n**العنوان:** ${title}\n**الوصف:** ${desc}`;
            color = '#e74c3c'; // أحمر للحذف
            break;
        case 'edit':
            description = `قام <@${interaction.user.id}> بتعديل بيانات عسكري **${personName}**\n\n**العنوان:** ${title}\n**الوصف:** ${desc}`;
            color = '#3498db'; // أزرق للتعديل
            break;
        case 'status':
            description = `قام <@${interaction.user.id}> بتغيير حالة عسكري **${personName}**\n\n**الحالة الجديدة:** ${status}\n**الوصف:** ${desc}`;
            color = '#f39c12'; // برتقالي لتغيير الحالة
            break;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(logTitle)
        .setDescription(description)
        .setColor(color)
        .setImage(getCustomImage(interaction.guildId))
        .setTimestamp();
    
    logChannel.send({ embeds: [embed] });
}

// دالة إنشاء صفحة المخالفات
async function createViolationPage(identity, userViolations, pageNumber, interaction) {
    const violationsPerPage = 6;
    const startIndex = pageNumber * violationsPerPage;
    const endIndex = Math.min(startIndex + violationsPerPage, userViolations.length);
    const pageViolations = userViolations.slice(startIndex, endIndex);
    
    // توليد صورة Canvas
    const canvas = createCanvas(700, 430);
    const ctx = canvas.getContext('2d');
    
    // خلفية رمادية بدون حواف
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // عنوان "أبشر"
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#179c4b';
    ctx.textAlign = 'right';
    ctx.fillText('أبشر', 170, 40);
    
    // عنوان "مخالفاتي"
    ctx.font = 'bold 22px Arial';
    ctx.fillText('مخالفاتي', 170, 70);
    
    // مربع الاسم
    ctx.fillStyle = '#111222';
    ctx.fillRect(220, 30, 220, 38);
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(identity.fullName, 220 + 110, 30 + 19);
    
    // صورة المستخدم
    ctx.beginPath();
    ctx.arc(630, 50, 40, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    
    let avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(630, 50, 38, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 592, 12, 76, 76);
    ctx.restore();
    
    // رسم المخالفات
    let y = 100;
    for (let i = 0; i < pageViolations.length; i++) {
        const v = pageViolations[i];
        ctx.fillStyle = v.executed ? '#27ae60' : '#e74c3c';
        ctx.fillRect(60, y, 580, 38);
        ctx.font = 'bold 17px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`${v.title} - ${v.desc} - $${v.fine} - ${v.executed ? 'مسددة' : 'غير مسددة'}`, 70, y + 25);
        y += 45;
    }
    
    return canvas.toBuffer('image/png');
}

// دالة إنشاء صفحة الجرائم
async function createCrimePage(foundIdentity, userCrimes, pageNumber, interaction, noCrimes = false) {
    const crimesPerPage = 8;
    const startIndex = pageNumber * crimesPerPage;
    const endIndex = Math.min(startIndex + crimesPerPage, userCrimes.length);
    const pageCrimes = userCrimes.slice(startIndex, endIndex);
    
    // اسم العسكري وصورته من الهوية
    const officerIdentity = Object.values(identities).find(id => id.userId === interaction.user.id);
    const officerName = officerIdentity ? officerIdentity.fullName : interaction.user.username;
    let officerAvatar = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
    
    // توليد صورة Canvas
    const canvas = createCanvas(900, 480);
    const ctx = canvas.getContext('2d');
    
    // خلفية سوداء
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // صورة العسكري (avatar) - أقصى يسار
    const officerAvatarImg = await loadImage(officerAvatar);
    ctx.save();
    ctx.beginPath();
    ctx.arc(60, 60, 40, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(officerAvatarImg, 20, 20, 80, 80);
    ctx.restore();
    
    // اسم العسكري بجانب صورته
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(officerName, 120, 70);
    
    // صورة الشخص المطلوب (avatar) - أقصى يمين
    let userAvatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
    try {
        const user = await interaction.client.users.fetch(foundIdentity.userId);
        userAvatarUrl = user.displayAvatarURL({ extension: 'png', size: 128 });
    } catch (error) {
        console.log('لم يتم العثور على المستخدم:', foundIdentity.userId);
    }
    const userAvatar = await loadImage(userAvatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(840, 60, 40, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(userAvatar, 800, 20, 80, 80);
    ctx.restore();
    
    // اسم الشخص المطلوب بجانب صورته
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(foundIdentity.fullName, 780, 70);
    
    // عنوان "سجل الجرائم"
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#00b894';
    ctx.textAlign = 'center';
    ctx.fillText('سجل الجرائم', 450, 150);
    
    // إذا لم توجد جرائم، عرض نص أحمر
    if (noCrimes) {
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#e74c3c'; // لون أحمر
        ctx.textAlign = 'center';
        ctx.fillText('لا يوجد جرائم لهذا الشخص', 450, 250);
    }
    
    // مربعات الجرائم (فقط إذا كانت توجد جرائم)
    if (!noCrimes) {
    let x = 20, y = 180;
    for (const crime of pageCrimes) {
        // رسم المربع - لون برتقالي لمذكرة القبض
        let boxColor;
        if (crime.type === 'arrest_warrant') {
            boxColor = crime.executed ? '#27ae60' : '#ff8c00'; // برتقالي لمذكرة القبض
        } else {
            boxColor = crime.executed ? '#27ae60' : '#c0392b'; // أحمر للجرائم العادية
        }
        ctx.fillStyle = boxColor;
        ctx.fillRect(x, y, 200, 80);
        
        // إضافة حدود للمربع
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 200, 80);
        
        // النصوص داخل المربع
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(crime.title, x + 10, y + 25);
        
        // معالجة وصف الجريمة ليتناسب مع المربع
        ctx.font = '12px Arial';
        ctx.fillStyle = '#f1f1f1';
        ctx.textAlign = 'left';
        
        // تقسيم الوصف إلى أسطر متعددة
        const maxWidth = 180; // عرض النص داخل المربع
        const words = crime.desc.split(' ');
        let lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
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
        
        // رسم الأسطر (حد أقصى سطرين)
        const maxLines = 2;
        for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
            ctx.fillText(lines[i], x + 10, y + 42 + (i * 12));
        }
        
        // إضافة "..." إذا كان النص طويل
        if (lines.length > maxLines) {
            ctx.fillText('...', x + 10, y + 42 + (maxLines * 12));
        }
        
        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${crime.months} MONTHS | $${crime.fine}`, x + 10, y + 70);
        
        x += 220;
        if (x + 200 > canvas.width) {
            x = 20;
            y += 100;
        }
    }
    
        // إضافة رقم الصفحة (فقط إذا كانت توجد جرائم)
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`الصفحة ${pageNumber + 1} من ${Math.ceil(userCrimes.length / crimesPerPage)}`, 450, 450);
    }
    
    return canvas.toBuffer('image/png');
}

// دالة تحديث صور جدول العسكريين في روم مباشرة العسكر
async function updatePoliceTableImages(guild) {
    if (!config.directMilitaryRoomId) return;
    
    try {
        const channel = await guild.channels.fetch(config.directMilitaryRoomId);
        if (!channel) return;
        
        // جلب جميع العسكريين الذين لديهم هوية
        const militaryIdentities = Object.values(identities).filter(id => 
            id.policeCode && id.policeStatus
        );
        
        if (militaryIdentities.length === 0) return;
        
        // تقسيم العسكريين إلى مجموعات من 10
        const groups = [];
        for (let i = 0; i < militaryIdentities.length; i += 10) {
            groups.push(militaryIdentities.slice(i, i + 10));
        }
        
        // جلب الرسائل الموجودة في الروم
        const messages = await channel.messages.fetch({ limit: 50 });
        const tableMessages = messages.filter(msg => 
            msg.author.id === client.user.id && 
            msg.attachments.size > 0 &&
            msg.attachments.first().name.includes('police_table')
        );
        
        // حذف الرسائل الزائدة
        const tableMessagesArray = Array.from(tableMessages.values());
        for (let i = groups.length; i < tableMessagesArray.length; i++) {
            try {
                await tableMessagesArray[i].delete();
            } catch (error) {
                console.error('خطأ في حذف رسالة جدول:', error);
            }
        }
        
        // تحديث أو إنشاء الرسائل
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const soldiers = group.map(id => ({
                code: id.policeCode,
                name: id.fullName,
                status: id.policeStatus
            }));
            
            const imageBuffer = await generatePoliceTableImage(soldiers);
            const attachment = new AttachmentBuilder(imageBuffer, { name: `police_table_${i + 1}.png` });
            
            if (i < tableMessagesArray.length) {
                // تحديث الرسالة الموجودة
                try {
                    await tableMessagesArray[i].edit({ files: [attachment] });
                } catch (error) {
                    console.error('خطأ في تحديث رسالة جدول:', error);
                }
            } else {
                // إنشاء رسالة جديدة
                try {
                    await channel.send({ files: [attachment] });
                } catch (error) {
                    console.error('خطأ في إرسال رسالة جدول:', error);
                }
            }
        }
        
    } catch (error) {
        console.error('خطأ في تحديث صور جدول العسكريين:', error);
    }
}

client.login(process.env.DISCORD_TOKEN); 

// دالة مساعدة لإظهار إمبيد الحالة وقائمة المنسدلة
async function showPoliceStatusEmbed(interaction, identity, status, isModal = false, isUpdate = false) {
    // تحديد النص والدائرة حسب الحالة
    let statusText = 'غير محدد', statusColor = '#b2bec3', statusEmoji = '⚪';
    if (status === 'login') { statusText = 'تسجيل دخول'; statusColor = '#27ae60'; statusEmoji = '🟢'; }
    if (status === 'logout') { statusText = 'تسجيل خروج'; statusColor = '#e74c3c'; statusEmoji = '🔴'; }
    if (status === 'end_shift') { statusText = 'إنهاء عمل'; statusColor = '#636e72'; statusEmoji = '⚫'; }
    
    // تحديث حالة العسكري في الهوية
    identity.policeStatus = status;
    saveIdentities(identities);
    
    // إمبيد معلومات العسكري
    const embed = new EmbedBuilder()
        .setTitle('معلومات العسكري')
        .setColor(statusColor)
        .addFields(
            { name: 'الاسم', value: identity.fullName, inline: true },
            { name: 'الكود العسكري', value: identity.policeCode || 'غير محدد', inline: true },
            { name: 'الحالة', value: `${statusText} ${statusEmoji}`, inline: true }
        )
        .setTimestamp();
    
    // قائمة منسدلة للحالات
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('police_status_select')
        .setPlaceholder('اختر حالتك')
        .addOptions([
            { label: 'تسجيل دخول', value: 'login' },
            { label: 'تسجيل خروج', value: 'logout' },
            { label: 'إنهاء عمل', value: 'end_shift' }
        ]);
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    // إرسال الرد للمستخدم
    if (isModal) {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } else if (isUpdate) {
        await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
    } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
    
    // تحديث صور جدول العسكريين في روم مباشرة العسكر
    try {
        await updatePoliceTableImages(interaction.guild);
    } catch (error) {
        console.error('خطأ في تحديث صور جدول العسكريين:', error);
    }
}