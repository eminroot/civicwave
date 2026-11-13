/**
 * AIDIN in the app: the photo check (category, severity, cost, questions) and the chat.
 * Both run on the CivicWave server, which holds the OpenAI key; the app only sends the
 * photo or the conversation and never sees a key.
 */
import { CATEGORY_NAMES, CategoryId, DEPARTMENTS, Severity } from '@/constants/categories';
import { request } from '@/lib/api';

export type AIAnalysis = {
  imageQualityOk: boolean;
  retakeReason?: string;
  categoryId: CategoryId;
  categoryName: string;
  severity: Severity;
  severityReason: string;
  costMin: number;
  costMax: number;
  department: string;
  confidence: number; // 0-100
  summary: string;
  clarifyingQuestions: string[];
};

function normalize(raw: any): AIAnalysis {
  const categoryId: CategoryId = (CATEGORY_NAMES as any)[raw?.categoryId] ? raw.categoryId : 'roads';
  const severity: Severity = ['low', 'medium', 'critical'].includes(raw?.severity) ? raw.severity : 'medium';
  return {
    imageQualityOk: raw?.imageQualityOk !== false,
    retakeReason: raw?.retakeReason || undefined,
    categoryId,
    categoryName: CATEGORY_NAMES[categoryId],
    severity,
    severityReason: raw?.severityReason || '',
    costMin: Number(raw?.costMin) || 0,
    costMax: Number(raw?.costMax) || 0,
    department: DEPARTMENTS[categoryId],
    confidence: Math.max(0, Math.min(100, Math.round(Number(raw?.confidence) || 0))),
    summary: raw?.summary || '',
    clarifyingQuestions: Array.isArray(raw?.clarifyingQuestions)
      ? raw.clarifyingQuestions.filter((q: unknown) => typeof q === 'string').slice(0, 2)
      : [],
  };
}

async function classify(body: object) {
  const res = await request(
    '/api/ai/classify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    },
    60000
  );
  return normalize(res?.analysis);
}

export function classifyIssue(base64: string, mime: string, note?: string): Promise<AIAnalysis> {
  return classify({ photoBase64: base64, mime, note: note ?? '' });
}

export async function refineClassification(
  base64: string,
  mime: string,
  qa: { question: string; answer: string }[],
  note?: string
): Promise<AIAnalysis> {
  const result = await classify({ photoBase64: base64, mime, note: note ?? '', answers: qa });
  result.clarifyingQuestions = [];
  return result;
}

