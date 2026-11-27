import { REACTIONS } from '../constants';
import type { ReactionType } from '../types';

/**
 * 반응 선택 AI 판단 (명세 6.1, 2026-11-27).
 * Supabase Edge Function `classify-reaction` 이 OpenRouter 를 거쳐 Claude 에게 묻는다 (supabase/functions/classify-reaction).
 * API 키는 서버에만 있다. 이 파일은 함수 주소와 공개 키(anon)만 쓴다.
 *
 * 실패하면(함수가 아직 없음·인터넷 끊김·10초 넘음·한도) null 을 돌려준다 —
 * 화면은 기기 안 판단(lib/emotionGuess.ts)으로 넘어간다.
 */
const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
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

export async function aiGuess(text: string): Promise<ReactionType[] | null> {
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
    return cleanAiReactions(await r.json());
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
