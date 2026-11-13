import { config } from './config.js';
import { HttpError } from './http.js';

/* The AI runs here, so no key ever reaches a phone or a browser.
   - classifyPhoto: the citizen's photo becomes a category, severity, cost and questions
   - chatReply: AIDIN for citizens (app) and for staff (website, with the reports on screen)
   - verifyFix: the manager's "after" photo is checked against the original problem
   OpenAI is used when OPENAI_API_KEY is set. The fix check falls back to Gemini when only
   GEMINI_API_KEY is set. */

export const openaiEnabled = () => Boolean(config.openaiKey);
export const aiEnabled = () => Boolean(config.openaiKey || config.geminiKey);

const unavailable = () => new HttpError(503, 'ai_unavailable', 'AIDIN hələ qoşulmayıb');
const failed = () => new HttpError(502, 'ai_failed', 'AI cavab vermədi, bir az sonra yenidən cəhd edin');

// If the configured model is unknown to the account (renamed or retired), the next one is tried.
const FALLBACK_MODELS = ['gpt-5.4-mini', 'gpt-5-mini', 'gpt-4.1-mini'];
let workingModel = null;
const modelOrder = () => [...new Set([workingModel, config.openaiModel, ...FALLBACK_MODELS].filter(Boolean))];

async function openai(messages, { json = false, maxTokens = 1500, timeoutMs = 45000 } = {}) {
  if (!openaiEnabled()) throw unavailable();
  for (const model of modelOrder()) {
    let res;
    try {
      res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiKey}` },
        body: JSON.stringify({
          model,
          messages,
          max_completion_tokens: maxTokens,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw failed();
    }
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      if (!text.trim()) throw failed();
      workingModel = model;
      return text;
    }
    const body = await res.json().catch(() => null);
    const code = body?.error?.code || '';
    if (res.status === 404 || code === 'model_not_found') {
      console.warn(`[ai] model ${model} is not available on this key, trying the next one`);
      continue;
    }
    console.error('[ai] openai status', res.status, code, String(body?.error?.message || '').slice(0, 200));
    if (res.status === 401) throw new HttpError(502, 'ai_key', 'OpenAI açarı qəbul edilmədi');
    if (res.status === 429) throw new HttpError(503, 'ai_busy', 'AI limiti doldu, bir az sonra yenidən cəhd edin');
    throw failed();
  }
  throw failed();
}

function parseJson(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

// Models often ignore "no markdown, no emoji". Both chats show plain text, so strip it.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}]/gu;

export function plainText(text) {
  return String(text || '')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s{0,3}[*+]\s+/gm, '- ')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
    // a lone "#" stays: "#12" is how both chats point at a report
    .replace(/[*`]/g, '')
    .replace(EMOJI_RE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ------------------------------------------------------------- photos */

const CATEGORIES = {
  roads: 'Yollar və asfalt: çuxur, dağılmış asfalt, səki, bordür, yol nişanı',
  water: 'Su və subasma: subasma, kanalizasiya, su xətti',
  sanitation: 'Təmizlik və tullantılar: zibil, konteyner, tullantı',
  greenery: 'Yaşıllıq və ağaclar',
  lighting: 'Küçə işıqlandırması',
  facades: 'Bina fasadları',
  signage: 'Reklam və vitrinlər',
  parks: 'Parklar və avadanlıq: skamya, fontan, uşaq meydançası',
  construction: 'Tikinti sahələri',
  seasonal: 'Buz və mövsümi: buzlaşma, qar',
};

const CLASSIFY_SYSTEM = `Sən Xətai rayonu (Bakı, Azərbaycan) üçün şəhər problemlərini təsnif edən sistemsən.
Vətəndaşın çəkdiyi şəkli analiz et və problemi bu kateqoriyalardan BİRİNƏ aid et:
${Object.entries(CATEGORIES).map(([id, text]) => `- ${id}: ${text}`).join('\n')}

Qaydalar:
- Bütün mətnlər Azərbaycan dilində olsun.
- severity: "low", "medium" və ya "critical".
- costMin və costMax: təmirin təxmini qiyməti, manatla (AZN), real rəqəmlər.
- confidence: 0 ilə 100 arası əminlik.
- summary: problemi bir qısa cümlə ilə təsvir et.
- Şəkil bulanıq, qaranlıqdırsa və ya şəhər problemi görünmürsə: imageQualityOk=false və retakeReason yaz.
- Əminlik 85-dən azdırsa, clarifyingQuestions-da 1-2 qısa sual ver, əks halda boş massiv.

Yalnız bu JSON obyekti ilə cavab ver:
{"imageQualityOk": boolean, "retakeReason": string, "categoryId": string, "severity": string, "severityReason": string, "costMin": number, "costMax": number, "confidence": number, "summary": string, "clarifyingQuestions": string[]}`;

export async function classifyPhoto({ image, mime, note, answers = [] }) {
  const parts = [];
  if (note) parts.push({ type: 'text', text: `Vətəndaşın qeydi: ${note}` });
  if (answers.length) {
    const qa = answers.map((a) => `S: ${a.question}\nC: ${a.answer || 'Bilmirəm'}`).join('\n');
    parts.push({
      type: 'text',
      text: `Vətəndaş dəqiqləşdirici suallara cavab verdi:\n${qa}\nBu cavabları nəzərə al, təsnifatı dəqiqləşdir. clarifyingQuestions boş olsun.`,
    });
  }
  parts.push({ type: 'text', text: 'Bu şəkildəki şəhər problemini analiz et.' });
  parts.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${image.toString('base64')}`, detail: 'auto' } });

  const text = await openai(
    [
      { role: 'system', content: CLASSIFY_SYSTEM },
      { role: 'user', content: parts },
    ],
    { json: true, timeoutMs: 60000 },
  );
  let j;
  try {
    j = parseJson(text);
  } catch {
    throw failed();
  }
  const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
  return {
    imageQualityOk: j.imageQualityOk !== false,
    retakeReason: String(j.retakeReason || '').slice(0, 300),
    categoryId: CATEGORIES[j.categoryId] ? j.categoryId : 'roads',
    severity: ['low', 'medium', 'critical'].includes(j.severity) ? j.severity : 'medium',
    severityReason: String(j.severityReason || '').slice(0, 300),
    costMin: num(j.costMin),
    costMax: num(j.costMax),
    confidence: Math.min(100, num(j.confidence)),
    summary: String(j.summary || '').slice(0, 400),
    clarifyingQuestions: answers.length
      ? []
      : (Array.isArray(j.clarifyingQuestions) ? j.clarifyingQuestions : [])
          .filter((q) => typeof q === 'string' && q.trim())
          .slice(0, 2)
          .map((q) => q.slice(0, 200)),
  };
}

/* --------------------------------------------------------------- chat */

const CITIZEN_SYSTEM = `Sən AIDIN-sən: Xətai rayonu (Bakı) sakinləri üçün şəhər xidmətləri üzrə köməkçi.
Sakinlərə şəhər problemlərini (yol, işıq, zibil, yaşıllıq, subasma, fasad, reklam, park, tikinti, buzlaşma) bildirməkdə kömək et, hansı qurumun məsul olduğunu izah et və müraciəti asanlaşdır.
Həmişə Azərbaycan dilində, qısa və mehriban yaz. Lazım olanda vətəndaşa "+" düyməsi ilə şəkil çəkib müraciət göndərməyi tövsiyə et.
Həyat üçün təhlükə varsa, 112-yə zəng etməyi de.
Yalnız adi mətn yaz: markdown, ulduz, başlıq və emoji işlətmə.`;

const STAFF_SYSTEM = `Sən AIDIN-sən: Xətai rayonu komanda mərkəzinin süni intellekt köməkçisi.
Rayon işçilərinə müraciətləri təhlil etməkdə, nəyə əvvəl baxmaq lazım olduğunu seçməkdə və qısa hesabat mətni yazmaqda kömək edirsən.
Aşağıda paneldə hazırda görünən müraciətlər var. Yalnız bu məlumata əsaslan, bilmədiyini uydurma, rəqəmləri dəqiq say.
Müraciəti nömrəsi ilə göstər, məsələn #12.
Azərbaycan dilində qısa və aydın yaz. Yalnız adi mətn: markdown, ulduz, başlıq və emoji işlətmə; siyahı lazımdırsa sətirləri "- " ilə başla.`;

export async function chatReply({ mode, messages, context = '' }) {
  const system =
    mode === 'staff'
      ? `${STAFF_SYSTEM}\n\nBu gün: ${new Date().toLocaleDateString('az-Latn-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n${context || 'Paneldə hələ müraciət yoxdur.'}`
      : CITIZEN_SYSTEM;
  const text = await openai(
    [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.text }))],
    { maxTokens: 1500 },
  );
  return plainText(text) || 'Bağışlayın, cavab verə bilmədim. Yenidən yazın.';
}

/* ---------------------------------------------------------- fix check */

const SEVERITY_AZ = { low: 'Aşağı', medium: 'Orta', high: 'Yüksək', critical: 'Kritik' };

function verifyPrompt(report) {
  return `Sən "CivicWave" (Xətai rayonu, Bakı) şəhər problemləri YOXLAMA sistemisən.
Əvvəlcədən vətəndaş tərəfindən bildirilmiş problem:
- Kateqoriya: ${report.category || report.category_id}
- Ciddiyət: ${SEVERITY_AZ[report.severity] || report.severity}
- Təsvir: "${String(report.explanation || '').slice(0, 1500)}"

Aşağıdakı şəkil HƏMİN YERİN TƏMİRDƏN SONRAKI vəziyyətidir.
Şəkli diqqətlə analiz et və problemin TAM həll olunub-olunmadığını qiymətləndir.
Əgər problem hələ də görünürsə, yarımçıq həll olunubsa və ya şəkil əlaqəsiz/bulanıqdırsa, resolved=false yaz.
"reason" sahəsini qısa, sadə Azərbaycan dilində yaz.

YALNIZ bu JSON formatında cavab ver, başqa heç nə yazma:
{"resolved": boolean, "confidence": number, "reason": string}`;
}

async function verifyWithGemini(report, image, mime) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: verifyPrompt(report) }, { inline_data: { mime_type: mime, data: image.toString('base64') } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new HttpError(502, 'ai_failed', 'AI yoxlaması alınmadı, bir az sonra yenidən cəhd edin');
  }
  if (!res.ok) {
    console.error('[ai] verify-fix upstream status', res.status);
    throw new HttpError(502, 'ai_failed', 'AI yoxlaması alınmadı, bir az sonra yenidən cəhd edin');
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

export async function verifyFix(report, image, mime) {
  if (!aiEnabled()) throw new HttpError(503, 'ai_unavailable', 'AI yoxlaması bu serverdə qoşulmayıb');
  const text = openaiEnabled()
    ? await openai(
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: verifyPrompt(report) },
              { type: 'image_url', image_url: { url: `data:${mime};base64,${image.toString('base64')}`, detail: 'auto' } },
            ],
          },
        ],
        { json: true },
      )
    : await verifyWithGemini(report, image, mime);
  let j;
  try {
    j = parseJson(text);
  } catch {
    throw new HttpError(502, 'ai_failed', 'AI cavabı oxunmadı');
  }
  const confidence = Math.max(0, Math.min(100, Math.round(Number(j.confidence) || 0)));
  const resolved = j.resolved === true || String(j.resolved).toLowerCase() === 'true';
  return { approved: resolved && confidence >= 70, resolved, confidence, reason: String(j.reason || '').slice(0, 600) };
}
