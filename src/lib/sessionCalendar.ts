/**
 * 캘린더 앱 연동 — 회기 끝 알림 (2026-11-27 추가). 계산만 한다 (구글 호출은 sync/googleCalendar.ts).
 *
 * 사용자가 캘린더 앱(안드로이드·iOS 의 구글 캘린더)에 그날 상담 회기를 넣어 두면,
 * 앱이 그 일정을 읽어 **회기가 끝나는 시각**에 짧은 알림 일정을 하나씩 만든다.
 * 그 알림 일정의 팝업 알림을 캘린더 앱이 띄우므로, 이 앱을 닫아 두어도 알림이 온다.
 *
 * 개인정보: 일정 제목에 내담자 이름이 있을 수 있다. 제목은 브라우저 안에서 '상담 일정인지'
 * 판단하는 데만 쓰고 **저장하지 않는다.** 기기에는 일정 id 와 시작·끝 시각만 남긴다.
 */

export const NUDGE_TEXT = '상담이 끝나셨나요? 남은 감정을 정리해봐요';

/** 기본으로 상담 일정을 알아보는 말 — 제목에 이 말이 들어간 일정 */
export const DEFAULT_KEYWORD = '상담';

/** 앞으로 며칠 치 회기에 알림을 미리 만들어 두나 */
export const PLAN_DAYS = 7;

/** 회기가 끝나고 이 시간 안에 앱을 열면 홈에 알림 띠를 보여준다 */
export const NUDGE_WINDOW_MIN = 180;

/** 구글 캘린더에서 받은 일정 (필요한 것만) */
export interface RawEvent {
  id: string;
  summary?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

/** 기기에 남기는 회기 — 제목은 남기지 않는다 */
export interface Session {
  id: string;
  start: string; // ISO
  end: string; // ISO
}

/** 이 앱이 만든 알림 일정 */
export interface Nudge {
  /** 알림 일정의 구글 id */
  id: string;
  /** 어느 회기의 알림인지 */
  sessionId: string;
  /** 알림 시각 = 회기 끝 시각 ISO */
  at: string;
}

export function isOwnNudge(ev: RawEvent): boolean {
  return ev.extendedProperties?.private?.cbdKind === 'nudge';
}

/**
 * 상담 회기 일정인가 — 하루 종일 일정이 아니고, 취소되지 않았고, 제목에 알아보는 말이 있다.
 * 알아보는 말을 비우면 시간이 정해진 일정을 모두 회기로 본다.
 */
export function isSessionEvent(ev: RawEvent, keyword: string): boolean {
  if (isOwnNudge(ev)) return false;
  if (ev.status === 'cancelled') return false;
  if (!ev.start?.dateTime || !ev.end?.dateTime) return false;
  const k = keyword.trim().toLowerCase();
  if (!k) return true;
  return (ev.summary ?? '').toLowerCase().includes(k);
}

export function toSessions(events: RawEvent[], keyword: string): Session[] {
  return events
    .filter((e) => isSessionEvent(e, keyword))
    .map((e) => ({
      id: e.id,
      start: new Date(e.start!.dateTime!).toISOString(),
      end: new Date(e.end!.dateTime!).toISOString(),
    }))
    .filter((s) => !Number.isNaN(new Date(s.end).getTime()))
    .sort((a, b) => (a.end < b.end ? -1 : 1));
}

export function toNudges(events: RawEvent[]): Nudge[] {
  return events
    .filter((e) => isOwnNudge(e) && e.status !== 'cancelled' && e.start?.dateTime)
    .map((e) => ({
      id: e.id,
      sessionId: e.extendedProperties?.private?.cbdSession ?? '',
      at: new Date(e.start!.dateTime!).toISOString(),
    }));
}

/**
 * 만들 알림과 지울 알림을 정한다.
 * - 아직 끝나지 않은 회기마다 끝 시각에 알림 하나
 * - 회기가 사라졌거나(지웠거나 제목이 바뀜) 끝 시각이 바뀐 알림은 지운다
 * - 같은 회기에 알림이 두 개면 하나만 남긴다
 */
export function planNudges(
  sessions: Session[],
  nudges: Nudge[],
  now: Date = new Date(),
): { create: Session[]; remove: Nudge[] } {
  const upcoming = sessions.filter((s) => new Date(s.end).getTime() > now.getTime());
  const byId = new Map(upcoming.map((s) => [s.id, s]));
  const kept = new Set<string>();
  const remove: Nudge[] = [];
  for (const n of nudges) {
    // 이미 지난 알림은 건드리지 않는다 (지난 기록으로 둔다)
    if (new Date(n.at).getTime() <= now.getTime()) continue;
    const s = byId.get(n.sessionId);
    const sameTime = s && new Date(s.end).getTime() === new Date(n.at).getTime();
    if (!s || !sameTime || kept.has(n.sessionId)) {
      remove.push(n);
      continue;
    }
    kept.add(n.sessionId);
  }
  const create = upcoming.filter((s) => !kept.has(s.id));
  return { create, remove };
}

/**
 * 홈에 보여줄 알림 띠 — 회기가 끝나고 3시간 안이고, 그 뒤로 체크인하지 않았고, 닫지 않았다.
 * 여러 개면 가장 최근에 끝난 회기.
 */
export function dueNudge(
  sessions: Session[],
  checkInTimes: string[],
  dismissed: string[],
  now: Date = new Date(),
): Session | null {
  const t = now.getTime();
  const lastCheckIn = checkInTimes.reduce(
    (m, x) => Math.max(m, new Date(x).getTime() || 0),
    0,
  );
  const ended = sessions.filter((s) => {
    const end = new Date(s.end).getTime();
    return (
      end <= t &&
      t - end <= NUDGE_WINDOW_MIN * 60 * 1000 &&
      lastCheckIn < end &&
      !dismissed.includes(s.id)
    );
  });
  return ended.length ? ended[ended.length - 1] : null;
}

/** 'MM월 DD일 (요) 오후 3:50' 같은 짧은 표시 */
export function sessionLabel(s: Session): string {
  const d = new Date(s.end);
  const dows = ['일', '월', '화', '수', '목', '금', '토'];
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dows[d.getDay()]}) ${ampm} ${h12}:${m}`;
}
