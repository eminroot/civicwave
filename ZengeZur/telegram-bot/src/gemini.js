/** Gemini vision classification — mirrors the mobile app's src/lib/gemini.ts. */
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config.js';
import { CATEGORY_NAMES, CATEGORY_IDS, DEPARTMENTS } from './categories.js';

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const CATEGORY_LIST = CATEGORY_IDS.map(
  (id) => `- ${id}: ${CATEGORY_NAMES[id]} (məsul: ${DEPARTMENTS[id]})`
).join('\n');

const SYSTEM_RULES = `Sən Nərimanov rayonu (Bakı, Azərbaycan) üçün "CivicWave" şəhər problemləri təsnifat sistemisən.
Vətəndaşın çəkdiyi şəkli analiz et və problemi aşağıdakı kateqoriyalardan BİRİNƏ təsnif et:
${CATEGORY_LIST}

Bütün mətnlər AZƏRBAYCAN dilində olmalıdır.
Ciddiyət (severity): "low" (aşağı), "medium" (orta), "critical" (kritik).
confidence: 0-100 arası əminlik faizi.
Əgər şəkil bulanıq, qaranlıq və ya problemi göstərmirsə, imageQualityOk=false və retakeReason yaz.
Əgər əminlik 85-dən aşağıdırsa, clarifyingQuestions sahəsində 1-2 qısa dəqiqləşdirici sual ver (Azərbaycan dilində). Əks halda boş massiv.

YALNIZ aşağıdakı JSON formatında cavab ver, başqa heç nə yazma:
{
  "imageQualityOk": boolean,
  "retakeReason": string,
  "categoryId": one of [${CATEGORY_IDS.map((c) => `"${c}"`).join(', ')}],
  "severity": "low" | "medium" | "critical",
  "severityReason": string,
  "confidence": number,
  "summary": string,
  "clarifyingQuestions": string[]
}`;

async function callGemini(parts, jsonMode) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.4,
        thinkingConfig: { thinkingBudget: 0 },
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? '').join('');
  if (!text) throw new Error('Gemini boş cavab qaytardı');
  return text;
}

function parseJson(raw) {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

function normalize(raw) {
  const categoryId = CATEGORY_NAMES[raw.categoryId] ? raw.categoryId : 'roads';
  const severity = ['low', 'medium', 'critical'].includes(raw.severity) ? raw.severity : 'medium';
  return {
    imageQualityOk: raw.imageQualityOk !== false,
    retakeReason: raw.retakeReason || '',
    categoryId,
    categoryName: CATEGORY_NAMES[categoryId],
    severity,
    severityReason: raw.severityReason || '',
    department: DEPARTMENTS[categoryId],
    confidence: Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 0))),
    summary: raw.summary || '',
    clarifyingQuestions: Array.isArray(raw.clarifyingQuestions)
      ? raw.clarifyingQuestions.filter((q) => typeof q === 'string').slice(0, 2)
      : [],
  };
}

export async function classifyIssue(base64, mime, note) {
  const parts = [
    { text: SYSTEM_RULES },
    ...(note ? [{ text: `Vətəndaşın qeydi: ${note}` }] : []),
    { text: 'Bu şəkildəki şəhər problemini analiz et:' },
    { inline_data: { mime_type: mime, data: base64 } },
  ];
  return normalize(parseJson(await callGemini(parts, true)));
}

export async function refineClassification(base64, mime, qa, note) {
  const qaText = qa.map((x) => `S: ${x.question}\nC: ${x.answer}`).join('\n');
  const parts = [
    { text: SYSTEM_RULES },
    { text: `Vətəndaş bu dəqiqləşdirici suallara cavab verdi:\n${qaText}` },
    ...(note ? [{ text: `Əlavə qeyd: ${note}` }] : []),
    {
      text: 'Bu cavabları nəzərə alaraq təsnifatı yenidən dəqiqləşdir və əminliyi yenilə. clarifyingQuestions indi boş olmalıdır.',
    },
    { inline_data: { mime_type: mime, data: base64 } },
  ];
  const result = normalize(parseJson(await callGemini(parts, true)));
  result.clarifyingQuestions = [];
  return result;
}
