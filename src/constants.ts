import type { ArousalLevel, ReactionType, TechniqueId } from './types';

/**
 * 명세 5절 — 반응 유형별 라벨 (반응 선택 화면 표시 순서).
 *
 * menuItem 은 노점 메뉴판 화면에서만 쓰는 표시용 이름과 값이다.
 * 기록·요약·캘린더·기법 선택에는 label 과 arousal 만 쓴다.
 */
export const REACTIONS: {
  id: ReactionType;
  label: string;
  arousal: ArousalLevel;
  technique: TechniqueId;
  menuItem: { name: string; price: number };
}[] = [
  {
    id: 'hyperarousal',
    label: '과각성',
    arousal: 'hyper',
    technique: 'slow_breathing',
    menuItem: { name: '팥붕어빵', price: 2000 },
  },
  {
    id: 'anger',
    label: '분노·짜증',
    arousal: 'hyper',
    technique: 'self_distancing',
    menuItem: { name: '슈크림 붕어빵', price: 2000 },
  },
  {
    id: 'intrusion',
    label: '침습적 장면',
    arousal: 'hyper',
    technique: 'containment',
    menuItem: { name: '어묵', price: 2000 },
  },
  {
    id: 'numbness',
    label: '멍함',
    arousal: 'hypo',
    technique: 'grounding',
    menuItem: { name: '계란빵', price: 3000 },
  },
  {
    id: 'heaviness',
    label: '무력감',
    arousal: 'mid',
    technique: 'compassion',
    menuItem: { name: '팥호빵', price: 3000 },
  },
  {
    id: 'rumination',
    label: '반추',
    arousal: 'mid',
    technique: 'detachment',
    menuItem: { name: '피자호빵', price: 3000 },
  },
];

/** 메뉴판·영수증에 쓰는 값 표기 — 2000 → "2,000원" */
export function won(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

const REACTION_MAP = new Map(REACTIONS.map((r) => [r.id, r]));

export function reactionInfo(id: ReactionType) {
  const found = REACTION_MAP.get(id);
  if (!found) throw new Error(`알 수 없는 반응 유형: ${id}`);
  return found;
}

/** 명세 6.3 — 과각성 > 중간 > 저각성 순으로 먼저 다룬다 */
export const AROUSAL_RANK: Record<ArousalLevel, number> = {
  hyper: 0,
  mid: 1,
  hypo: 2,
};

/**
 * 명세 5절 — 신체 기법은 각성 수준에 따라 정한다.
 * 과각성이나 중간 수준이면 느린 호흡, 저각성이면 감각 그라운딩.
 */
export function bodyTechniqueFor(arousal: ArousalLevel): TechniqueId {
  return arousal === 'hypo' ? 'grounding' : 'slow_breathing';
}

export const TECHNIQUE_LABELS: Record<TechniqueId, string> = {
  slow_breathing: '느린 호흡',
  grounding: '감각 그라운딩',
  containment: '컨테인먼트 심상',
  detachment: '심리적 분리',
  compassion: '연민 재정향',
  self_distancing: '자기 거리두기',
};

/** 명세 6.2 — SUDS 앵커 문구는 세 지점에만 단다 */
export const SUDS_ANCHORS: { value: number; label: string }[] = [
  { value: 0, label: '전혀 없음' },
  { value: 5, label: '신경 쓰이지만 다음 회기는 가능' },
  { value: 10, label: '다음 회기가 어려울 정도' },
];

/** 명세 6.3 / 6.4 분기 임계값 */
export const FLOW = {
  /** sudsPre 이하면 기법 없이 종결 의례로 간다 */
  lowSudsMax: 3,
  /** sudsPre 이하면 주 반응 기법 1개 */
  midSudsMax: 6,
  /** 재평정 점수가 이하면 종결 의례 */
  resolvedSudsMax: 6,
  /** 개입 전 대비 이만큼 내려가면 종결 의례 */
  resolvedDrop: 3,
  /** 한 번의 체크인에서 기법은 최대 이만큼만 */
  maxTechniques: 2,
};

/**
 * 명세 7.2 — 기준 수치는 검증된 값이 아니라 설계 가정이다.
 * 조정할 수 있게 상수로 분리한다.
 */
export const ESCALATION = {
  windowDays: 7,
  highSudsThreshold: 7,
  highSudsCount: 3,
  sameReactionHighCount: 2,
  /** 조건 ②를 선택한 모든 반응으로 셀지, 주 반응만 셀지 */
  sameReactionScope: 'all' as 'all' | 'primary',
  noImprovementCount: 2,
};

/** 명세 7.4 — 돌아보기. 기준 수치는 설계 가정이므로 상수로 분리한다. */
export const REVIEW = {
  bucketDays: 28,
  maxBuckets: 4,
  /** 구간 비교에 필요한 최소 재평정 수 */
  minRatingsPerBucket: 3,
};
