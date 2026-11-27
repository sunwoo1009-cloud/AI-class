import { REACTIONS } from '../constants';
import type { ReactionType } from '../types';
import { baseUrl } from '../dev/feedback';

/**
 * 반응 선택 AI 판단 (명세 6.1, 2026-11-27).
 * Supabase Edge Function `classify-reaction` 이 OpenRouter 를 거쳐 Claude 에게 묻는다 (supabase/functions/classify-reaction).
 * API 키는 서버에만 있다. 이 파일은 함수 주소와 공개 키(anon)만 쓴다.
 *
 * 실패하면(함수가 아직 없음·인터넷 끊김·10초 넘음·한도) null 을 돌려준다 —
 * 화면은 기기 안 판단(lib/emotionGuess.ts)으로 넘어간다.
 */
// 배포 비밀값이 '…supabase.co/rest/v1/' 로 들어가 있어서 꼬리를 떼야 한다 (feedback·account 와 같은 처리)
const URL_ = baseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const aiAvailable = Boolean(URL_ && KEY);

const IDS = new Set<string>(REACTIONS.map((r) => r.id));
const TIMEOUT_MS = 10_000;

export function cleanAiReactions(raw: unknown): ReactionType[] | null {
  if (!raw || typeof raw !== 'object') return null;
  const list = (raw as { reactions?: unknown }).reactions;
  if (!Array.isArray(list)) return null;
  const out: ReactionType[] = [];
  for (const r of list) {
    if (typeof r === 'string' && IDS.has(r) && !out.includes(r as ReactionType)) {
      out.push(r as ReactionType);
    }
  }
  return out.slice(0, 2);
}

/** 서버가 글에 내담자 정보가 섞였다고 봤는지 (2026-11-27). 옛 함수는 이 값을 안 보내므로 없으면 false. */
export function aiCaseInfo(raw: unknown): boolean {
  return Boolean(raw && typeof raw === 'object' && (raw as { caseInfo?: unknown }).caseInfo === true);
}

export interface AiAnswer {
  reactions: ReactionType[];
  caseInfo: boolean;
}

export async function aiGuess(text: string): Promise<AiAnswer | null> {
  if (!aiAvailable) return null;
  const t = text.trim().slice(0, 200);
  if (!t) return null;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${URL_}/functions/v1/classify-reaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
        apikey: KEY!,
      },
      body: JSON.stringify({ text: t }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const raw: unknown = await r.json();
    const reactions = cleanAiReactions(raw);
    return reactions ? { reactions, caseInfo: aiCaseInfo(raw) } : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
