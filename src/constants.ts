import type { ArousalLevel, ReactionType, TechniqueId } from './types';

/** 명세 5절 — 반응 유형별 라벨 (반응 선택 화면 표시 순서) */
export const REACTIONS: {
  id: ReactionType;
  label: string;
  hint: string;
  arousal: ArousalLevel;
  technique: TechniqueId;
}[] = [
  {
    id: 'hyperarousal',
    label: '과각성',
    hint: '긴장, 심장이 뜀',
    arousal: 'hyper',
    technique: 'slow_breathing',
  },
  {
    id: 'anger',
    label: '분노·짜증',
    hint: '',
    arousal: 'hyper',
    technique: 'self_distancing',
  },
  {
    id: 'intrusion',
    label: '침습적 장면',
    hint: '장면이 자꾸 떠오름',
    arousal: 'hyper',
    technique: 'containment',
  },
  {
    id: 'numbness',
    label: '멍함·해리감',
    hint: '',
    arousal: 'hypo',
    technique: 'grounding',
  },
  {
    id: 'heaviness',
    label: '무거움·무력감',
    hint: '',
    arousal: 'mid',
    technique: 'compassion',
  },
  {
    id: 'rumination',
    label: '반추',
    hint: '같은 생각이 반복됨',
    arousal: 'mid',
    technique: 'detachment',
  },
];

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
