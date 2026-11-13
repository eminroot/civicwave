/**
 * CivicWave Telegram bot (@zengezur_bot)
 * Flow: /start → citizen sends a photo → Gemini classifies & asks clarifying questions →
 *       citizen confirms (or changes category) → shares location → rates urgency →
 *       writes feedback → report is uploaded to Firebase (same schema as the mobile app).
 */
import TelegramBot from 'node-telegram-bot-api';

import { TELEGRAM_TOKEN, NARIMANOV } from '../config.js';
import {
  CATEGORY_NAMES,
  CATEGORY_IDS,
  CATEGORY_EMOJI,
  DEPARTMENTS,
  SEVERITY_LABEL,
  SEVERITY_EMOJI,
} from './categories.js';
import { classifyIssue, refineClassification } from './gemini.js';
import { reverseGeocode } from './geocode.js';
import { uploadReportToFirebase } from './firebase.js';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
bot.on('polling_error', (e) => console.error('polling_error:', e?.message || e));

/** chatId -> session */
const sessions = new Map();

function reset(chatId) {
  sessions.delete(chatId);
}
function getSession(chatId) {
  let s = sessions.get(chatId);
  if (!s) {
    s = { step: 'idle' };
    sessions.set(chatId, s);
  }
  return s;
}

const WELCOME = `👋 *Salam!* Mən *CivicWave* botuyam — Nərimanov rayonundakı şəhər problemlərini bildirmək üçün köməkçinizəm.

Şəhərdə bir problem görmüsünüz? 📷 *Sadəcə problemin şəklini göndərin* — qalanını mən edərəm:
1️⃣ Süni intellekt problemi avtomatik təyin edəcək
2️⃣ Bir neçə sual verə bilərəm
3️⃣ Məkanı paylaşacaqsınız
4️⃣ Ciddiyəti qiymətləndirəcəksiniz
5️⃣ Rəy yazıb göndərəcəksiniz

Başlamaq üçün indi bir şəkil göndərin 📸`;

const HELP = `ℹ️ *CivicWave bot — kömək*

📷 Problem bildirmək üçün sadəcə şəkil göndərin.

Əmrlər:
/start — başla
/cancel — cari müraciəti ləğv et
/help — kömək`;

bot.setMyCommands([
  { command: 'start', description: 'Başla' },
  { command: 'cancel', description: 'Müraciəti ləğv et' },
  { command: 'help', description: 'Kömək' },
]);

bot.onText(/^\/start/, (msg) => {
  reset(msg.chat.id);
  bot.sendMessage(msg.chat.id, WELCOME, { parse_mode: 'Markdown' });
});

bot.onText(/^\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, HELP, { parse_mode: 'Markdown' });
});

bot.onText(/^\/cancel/, (msg) => {
  reset(msg.chat.id);
  bot.sendMessage(msg.chat.id, '❌ Müraciət ləğv edildi. Yenidən başlamaq üçün şəkil göndərin.');
});

/* ---------------- Photo ---------------- */
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  try {
    const photos = msg.photo;
    const fileId = photos[photos.length - 1].file_id; // largest size
    const link = await bot.getFileLink(fileId);
    const resp = await fetch(link);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mime = 'image/jpeg';

    const s = getSession(chatId);
    s.buffer = buffer;
    s.base64 = base64;
    s.mime = mime;
    s.qa = [];
    s.reporter = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || 'Telegram istifadəçisi';
    s.telegramUserId = msg.from.id;

    await analyze(chatId);
  } catch (e) {
    console.error('photo error:', e);
    bot.sendMessage(chatId, '⚠️ Şəkli emal edə bilmədim. Zəhmət olmasa yenidən cəhd edin.');
  }
});

async function analyze(chatId) {
  const s = getSession(chatId);
  await bot.sendChatAction(chatId, 'typing');
  const waitMsg = await bot.sendMessage(chatId, '🔍 Süni intellekt şəkli analiz edir…');
  try {
    const a = s.qa.length
      ? await refineClassification(s.base64, s.mime, s.qa, s.note)
      : await classifyIssue(s.base64, s.mime, s.note);
    s.analysis = a;
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

    if (!a.imageQualityOk) {
      reset(chatId);
      bot.sendMessage(
        chatId,
        `⚠️ ${a.retakeReason || 'Şəkil keyfiyyəti aşağıdır.'}\n\nZəhmət olmasa daha aydın şəkil göndərin.`
      );
      return;
    }

    if (a.confidence < 85 && a.clarifyingQuestions.length && s.qa.length === 0) {
      s.step = 'clarify';
      s.pendingQuestions = a.clarifyingQuestions;
      const q = a.clarifyingQuestions.map((x, i) => `${i + 1}. ${x}`).join('\n');
      bot.sendMessage(
        chatId,
        `🤔 Dəqiq təyin etmək üçün bir neçə sual (${a.confidence}% əminlik):\n\n${q}\n\n✍️ Cavabınızı bir mesajda yazın.`
      );
      return;
    }

    showResult(chatId);
  } catch (e) {
    console.error('analyze error:', e);
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
    bot.sendMessage(chatId, '⚠️ AI analizində xəta oldu. Bir azdan yenidən cəhd edin.');
  }
}

function formatResult(a) {
  return (
    `${CATEGORY_EMOJI[a.categoryId]} *Təyin edilən problem:* ${a.categoryName}\n` +
    `${SEVERITY_EMOJI[a.severity]} *Ciddiyət:* ${SEVERITY_LABEL[a.severity]}\n` +
    `🏛️ *Məsul idarə:* ${a.department}\n` +
    `📊 *AI əminliyi:* ${a.confidence}%\n\n` +
    `📝 ${a.summary}`
  );
}

function showResult(chatId) {
  const s = getSession(chatId);
  s.step = 'confirm';
  bot.sendMessage(chatId, `${formatResult(s.analysis)}\n\nBu düzdür?`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Bəli, təsdiqlə', callback_data: 'confirm_yes' }],
        [{ text: '📂 Kateqoriyanı dəyiş', callback_data: 'confirm_changecat' }],
        [{ text: '🔁 Yeni şəkil', callback_data: 'confirm_retry' }],
      ],
    },
  });
}

/* ---------------- Callback queries ---------------- */
bot.on('callback_query', async (cq) => {
  const chatId = cq.message.chat.id;
  const data = cq.data;
  const s = getSession(chatId);
  bot.answerCallbackQuery(cq.id).catch(() => {});

  if (data === 'confirm_yes') {
    askLocation(chatId);
  } else if (data === 'confirm_retry') {
    reset(chatId);
    bot.sendMessage(chatId, '📷 Yaxşı, yeni şəkil göndərin.');
  } else if (data === 'confirm_changecat') {
    const rows = [];
    for (let i = 0; i < CATEGORY_IDS.length; i += 2) {
      rows.push(
        CATEGORY_IDS.slice(i, i + 2).map((id) => ({
          text: `${CATEGORY_EMOJI[id]} ${CATEGORY_NAMES[id]}`,
          callback_data: `cat_${id}`,
        }))
      );
    }
    bot.sendMessage(chatId, '📂 Düzgün kateqoriyanı seçin:', {
      reply_markup: { inline_keyboard: rows },
    });
  } else if (data.startsWith('cat_')) {
    const id = data.slice(4);
    if (s.analysis && CATEGORY_NAMES[id]) {
      s.analysis.categoryId = id;
      s.analysis.categoryName = CATEGORY_NAMES[id];
      s.analysis.department = DEPARTMENTS[id];
    }
    bot.sendMessage(chatId, `✅ Kateqoriya: ${CATEGORY_EMOJI[id]} ${CATEGORY_NAMES[id]}`);
    askLocation(chatId);
  } else if (data.startsWith('rate_')) {
    s.rating = Number(data.slice(5));
    askFeedback(chatId);
  }
});

/* ---------------- Location ---------------- */
function askLocation(chatId) {
  const s = getSession(chatId);
  s.step = 'location';
  bot.sendMessage(
    chatId,
    '📍 Problemin yerini paylaşın (aşağıdakı düymə ilə) və ya ünvanı mətnlə yazın.',
    {
      reply_markup: {
        keyboard: [[{ text: '📍 Məkanı paylaş', request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
}

bot.on('location', async (msg) => {
  const chatId = msg.chat.id;
  const s = getSession(chatId);
  if (s.step !== 'location') return;
  const { latitude, longitude } = msg.location;
  s.lat = latitude;
  s.lng = longitude;
  await bot.sendChatAction(chatId, 'typing');
  s.address = await reverseGeocode(latitude, longitude);
  bot.sendMessage(chatId, `📍 Ünvan: ${s.address}`, { reply_markup: { remove_keyboard: true } });
  askRating(chatId);
});

/* ---------------- Rating ---------------- */
function askRating(chatId) {
  const s = getSession(chatId);
  s.step = 'rating';
  bot.sendMessage(chatId, '⭐ Problemin təcililiyini qiymətləndirin (1 = az təcili, 5 = çox təcili):', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⭐', callback_data: 'rate_1' },
          { text: '⭐⭐', callback_data: 'rate_2' },
          { text: '⭐⭐⭐', callback_data: 'rate_3' },
        ],
        [
          { text: '⭐⭐⭐⭐', callback_data: 'rate_4' },
          { text: '⭐⭐⭐⭐⭐', callback_data: 'rate_5' },
        ],
      ],
    },
  });
}

/* ---------------- Feedback ---------------- */
function askFeedback(chatId) {
  const s = getSession(chatId);
  s.step = 'feedback';
  bot.sendMessage(
    chatId,
    `${'⭐'.repeat(s.rating)} qeyd olundu.\n\n✍️ Əlavə rəy və ya qeydinizi yazın (yoxdursa /keç yazın):`
  );
}

/* ---------------- Free-text router ---------------- */
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  // ignore non-text, commands, and messages handled elsewhere (photo/location)
  if (!text || text.startsWith('/') || msg.photo || msg.location) {
    if (text === '/keç') handleFeedback(chatId, '');
    return;
  }
  const s = getSession(chatId);

  if (s.step === 'clarify') {
    s.qa = s.pendingQuestions.map((q, i) => ({
      question: q,
      answer: i === 0 ? text : 'Bilmirəm',
    }));
    // a single combined answer is fine; attach the whole reply to the first question
    s.qa[0].answer = text;
    await analyze(chatId);
  } else if (s.step === 'location') {
    s.address = text;
    s.lat = NARIMANOV.lat;
    s.lng = NARIMANOV.lng;
    bot.sendMessage(chatId, `📍 Ünvan qeydə alındı: ${text}`, {
      reply_markup: { remove_keyboard: true },
    });
    askRating(chatId);
  } else if (s.step === 'feedback') {
    handleFeedback(chatId, text);
  } else {
    bot.sendMessage(chatId, '📷 Problem bildirmək üçün şəkil göndərin. Kömək: /help');
  }
});

function handleFeedback(chatId, note) {
  const s = getSession(chatId);
  if (s.step !== 'feedback') return;
  s.note = (note || '').trim();
  submit(chatId);
}

/* ---------------- Submit ---------------- */
async function submit(chatId) {
  const s = getSession(chatId);
  const a = s.analysis;
  if (!a || !s.buffer) {
    bot.sendMessage(chatId, '⚠️ Məlumat tapılmadı. Yenidən şəkil göndərin.');
    reset(chatId);
    return;
  }
  await bot.sendChatAction(chatId, 'typing');
  const sending = await bot.sendMessage(chatId, '📤 Müraciətiniz göndərilir…');
  try {
    const { id } = await uploadReportToFirebase(s.buffer, s.mime, {
      explanation: a.summary || a.categoryName,
      category: a.categoryName,
      categoryId: a.categoryId,
      severity: a.severity,
      confidence: a.confidence,
      department: a.department,
      note: s.note,
      rating: s.rating,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      reporter: s.reporter,
      telegramUserId: s.telegramUserId,
    });
    await bot.deleteMessage(chatId, sending.message_id).catch(() => {});
    bot.sendMessage(
      chatId,
      `✅ *Müraciət göndərildi!* (№${id})\n\n` +
        `${CATEGORY_EMOJI[a.categoryId]} ${a.categoryName}\n` +
        `${SEVERITY_EMOJI[a.severity]} Ciddiyət: ${SEVERITY_LABEL[a.severity]}\n` +
        `🏛️ ${a.department}\n` +
        `📍 ${s.address}\n` +
        `⭐ Qiymət: ${s.rating}/5\n\n` +
        `Müraciətiniz ${a.department} tərəfindən nəzərdən keçiriləcək. Təşəkkürlər! 🙏\n\n` +
        `Yeni problem bildirmək üçün yenidən şəkil göndərin.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('submit error:', e);
    await bot.deleteMessage(chatId, sending.message_id).catch(() => {});
    bot.sendMessage(chatId, '⚠️ Göndərilmə zamanı xəta oldu. Bir azdan yenidən cəhd edin.');
  }
  reset(chatId);
}

console.log('🤖 CivicWave Telegram bot işə düşdü (@zengezur_bot). Polling…');
