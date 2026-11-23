// 명세 4절 데이터 모델

export type ReactionType =
  | 'hyperarousal' // 과각성 (긴장, 심장이 뜀)
  | 'anger' // 분노·짜증
  | 'intrusion' // 침습적 장면
  | 'numbness' // 멍함
  | 'heaviness' // 무력감
  | 'rumination'; // 반추

export type TechniqueId =
  | 'slow_breathing'
  | 'grounding'
  | 'containment'
  | 'detachment'
  | 'compassion'
  | 'self_distancing';

export interface CheckIn {
  id: string;
  timestamp: string; // ISO 8601
  reactions: ReactionType[]; // 1~2개, 첫 번째가 주 반응
  sudsPre: number; // 0~10
  techniques: {
    id: TechniqueId;
    sudsPost: number | null; // 기법 직후 재평정
  }[];
  ruminationSafetyFlag: boolean; // 반추에서 '내담자 안전 걱정' 선택 여부
  externalResourceOffered: boolean;
  readiness: 'ready' | 'more' | null;
}

export interface WeeklySessionCount {
  weekStart: string; // 해당 주 월요일, YYYY-MM-DD
  sessions: number | null; // 사용자가 입력한 그 주의 전체 회기 수 (선택)
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD, 하루 1개
  answers: {
    promptId: 'drain' | 'response' | 'let_go';
    text: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  displayName: string; // 자기 거리두기 기법용, 기기에만 저장
  onboardedAt: string;
}

// --- 흐름 전용 타입 (명세 6절) ---

/** 각성 수준. 숫자가 작을수록 먼저 다룬다 (명세 6.3) */
export type ArousalLevel = 'hyper' | 'mid' | 'hypo';

/** 추가 기법 제안 화면의 종류 (명세 6.3) */
export type OfferVariant =
  | 'low' // sudsPre <= 3 : "기법을 하나 해볼래요?"
  | 'caseC' // sudsPre >= 7 신체 기법 직후 : "반응에 맞는 기법을 하나 더 할래요?"
  | 'rule'; // 6.4 재평정 규칙에서의 제안

export type FlowStep =
  | { kind: 'reaction_select' }
  | { kind: 'suds_pre' }
  | { kind: 'technique'; technique: TechniqueId }
  | { kind: 'suds_post'; technique: TechniqueId }
  | { kind: 'offer_extra'; variant: OfferVariant; technique: TechniqueId }
  | { kind: 'external_resource' }
  | { kind: 'safety_notice' }
  | { kind: 'closing_ritual' }
  | { kind: 'closing_more' }
  | { kind: 'done' };

export interface FlowState {
  step: FlowStep;
  reactions: ReactionType[];
  sudsPre: number | null;
  /** 수행한 기법과 그 직후 재평정 점수. 순서대로 쌓인다 */
  techniques: { id: TechniqueId; sudsPost: number | null }[];
  /** 추가 기법 제안을 한 번 거절했는지 (명세 6.3/6.4 중복 질문 방지) */
  declinedExtra: boolean;
  ruminationSafetyFlag: boolean;
  externalResourceOffered: boolean;
  readiness: 'ready' | 'more' | null;
}

export type FlowEvent =
  | { type: 'SELECT_REACTIONS'; reactions: ReactionType[] }
  | { type: 'SUBMIT_SUDS_PRE'; value: number }
  | { type: 'TECHNIQUE_DONE' }
  | { type: 'SUBMIT_SUDS_POST'; value: number }
  | { type: 'ACCEPT_OFFER' }
  | { type: 'DECLINE_OFFER' }
  | { type: 'EXTERNAL_RESOURCE_NEXT' }
  | { type: 'SAFETY_CONCERN_IMMEDIATE' }
  | { type: 'SAFETY_NOTICE_NEXT' }
  | { type: 'CLOSING_READY' }
  | { type: 'CLOSING_MORE' }
  | { type: 'CLOSING_MORE_TECHNIQUE' }
  | { type: 'CLOSING_MORE_EXIT' };
