import {
  AROUSAL_RANK,
  FLOW,
  bodyTechniqueFor,
  reactionInfo,
} from '../constants';
import type {
  CheckIn,
  FlowEvent,
  FlowState,
  ReactionType,
  TechniqueId,
} from '../types';

/**
 * 명세 6.3 1문장 — 반응을 두 개 골랐다면 각성 수준이 높은 쪽을 먼저 다룬다.
 * 같은 수준이면 먼저 고른 반응을 먼저 다룬다. (Array.sort는 안정 정렬)
 *
 * 기록용 주 반응(recordedPrimary)은 명세 6.1·4절에 따라 선택 순서를 유지하고,
 * 분기에 쓰는 주 반응(pri)은 각성 수준으로 정한다.
 */
export function derive(reactions: ReactionType[]) {
  if (reactions.length === 0) {
    throw new Error('반응이 선택되지 않았습니다');
  }
  const order = [...reactions].sort(
    (a, b) =>
      AROUSAL_RANK[reactionInfo(a).arousal] -
      AROUSAL_RANK[reactionInfo(b).arousal],
  );
  const pri = order[0];
  const sec = order[1] ?? null;
  return {
    order,
    recordedPrimary: reactions[0],
    pri,
    sec,
    priTech: reactionInfo(pri).technique,
    secTech: sec ? reactionInfo(sec).technique : null,
    bodyTech: bodyTechniqueFor(reactionInfo(pri).arousal),
  };
}

export function initialFlowState(): FlowState {
  return {
    step: { kind: 'reaction_select' },
    reactions: [],
    sudsPre: null,
    techniques: [],
    declinedExtra: false,
    ruminationSafetyFlag: false,
    externalResourceOffered: false,
    readiness: null,
  };
}

/**
 * 명세 6.4 — 아직 하지 않은 기법 중 주 반응 → 보조 반응 → 신체 기법 순.
 */
function nextCandidate(state: FlowState): TechniqueId | null {
  const d = derive(state.reactions);
  const done = state.techniques.map((t) => t.id);
  const ordered = [d.priTech, d.secTech, d.bodyTech].filter(
    (t): t is TechniqueId => t !== null,
  );
  return ordered.find((t) => !done.includes(t)) ?? null;
}

/** 종결 의례에서 '조금 더 시간이 필요해요'를 골랐을 때 줄 수 있는 기법 */
export function moreTechniqueCandidate(state: FlowState): TechniqueId | null {
  if (state.techniques.length >= FLOW.maxTechniques) return null;
  return nextCandidate(state);
}

function startTechnique(state: FlowState, technique: TechniqueId): FlowState {
  return {
    ...state,
    step: { kind: 'technique', technique },
    techniques: [...state.techniques, { id: technique, sudsPost: null }],
  };
}

function goExternalResource(state: FlowState): FlowState {
  return {
    ...state,
    step: { kind: 'external_resource' },
    externalResourceOffered: true,
  };
}

/**
 * 기법이 끝나고 재평정을 받은 뒤의 분기.
 * 명세 6.3 고강도 경로의 선택 제안과 6.4 재평정 규칙을 한 곳에서 처리한다.
 */
function resolveAfterRerate(state: FlowState): FlowState {
  const d = derive(state.reactions);
  const sudsPre = state.sudsPre;
  const last = state.techniques[state.techniques.length - 1];
  if (sudsPre === null || !last) {
    return { ...state, step: { kind: 'closing_ritual' } };
  }

  // 명세 6.3 — sudsPre 7~10 경로에서 신체 기법 직후 한 번만 제안한다.
  // 주 반응 기법이 방금 한 신체 기법과 같으면 이 선택지를 생략한다.
  if (
    sudsPre > FLOW.midSudsMax &&
    state.techniques.length === 1 &&
    last.id === d.bodyTech &&
    d.priTech !== d.bodyTech &&
    !state.declinedExtra
  ) {
    return {
      ...state,
      step: { kind: 'offer_extra', variant: 'caseC', technique: d.priTech },
    };
  }

  // 재평정을 받지 못한 경우(안전 경로 등)는 종결 의례로 보낸다.
  if (last.sudsPost === null) {
    return { ...state, step: { kind: 'closing_ritual' } };
  }

  // 명세 6.4 재평정 규칙
  const sudsPost = last.sudsPost;
  if (
    sudsPost <= FLOW.resolvedSudsMax ||
    sudsPre - sudsPost >= FLOW.resolvedDrop
  ) {
    return { ...state, step: { kind: 'closing_ritual' } };
  }

  // 추가 기법 제안을 이미 거절했다면 같은 질문을 다시 하지 않고
  // 앱 밖 자원으로 보낸다. (설계 원칙 4)
  if (state.techniques.length < FLOW.maxTechniques && !state.declinedExtra) {
    const candidate = nextCandidate(state);
    if (candidate) {
      return {
        ...state,
        step: { kind: 'offer_extra', variant: 'rule', technique: candidate },
      };
    }
    return goExternalResource(state);
  }

  return goExternalResource(state);
}

export function reduce(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case 'SELECT_REACTIONS': {
      if (event.reactions.length < 1 || event.reactions.length > 2) {
        return state;
      }
      return {
        ...state,
        reactions: event.reactions,
        step: { kind: 'suds_pre' },
      };
    }

    case 'SUBMIT_SUDS_PRE': {
      const d = derive(state.reactions);
      const value = event.value;
      const next = { ...state, sudsPre: value };

      // 명세 6.3
      if (value <= FLOW.lowSudsMax) {
        // 기법 없이 종결 의례로 가되, 그 전에 선택지를 보여준다.
        return {
          ...next,
          step: { kind: 'offer_extra', variant: 'low', technique: d.priTech },
        };
      }
      if (value <= FLOW.midSudsMax) {
        return startTechnique(next, d.priTech);
      }
      return startTechnique(next, d.bodyTech);
    }

    case 'TECHNIQUE_DONE': {
      if (state.step.kind !== 'technique') return state;
      return { ...state, step: { kind: 'suds_post', technique: state.step.technique } };
    }

    case 'SUBMIT_SUDS_POST': {
      if (state.step.kind !== 'suds_post') return state;
      const techniques = state.techniques.map((t, i) =>
        i === state.techniques.length - 1 ? { ...t, sudsPost: event.value } : t,
      );
      return resolveAfterRerate({ ...state, techniques });
    }

    case 'ACCEPT_OFFER': {
      if (state.step.kind !== 'offer_extra') return state;
      if (state.techniques.length >= FLOW.maxTechniques) return state;
      return startTechnique(state, state.step.technique);
    }

    case 'DECLINE_OFFER': {
      if (state.step.kind !== 'offer_extra') return state;
      // sudsPre <= 3 경로의 제안은 거절하면 그대로 종결 의례로 간다.
      if (state.step.variant === 'low') {
        return { ...state, step: { kind: 'closing_ritual' } };
      }
      return resolveAfterRerate({ ...state, declinedExtra: true });
    }

    case 'EXTERNAL_RESOURCE_NEXT': {
      if (state.step.kind !== 'external_resource') return state;
      return { ...state, step: { kind: 'closing_ritual' } };
    }

    // 명세 8.4 — '내담자 안전에 대한 걱정' → '지금 바로 확인 필요'
    case 'SAFETY_CONCERN_IMMEDIATE': {
      if (state.step.kind !== 'technique') return state;
      return {
        ...state,
        step: { kind: 'safety_notice' },
        ruminationSafetyFlag: true,
      };
    }

    case 'SAFETY_NOTICE_NEXT': {
      if (state.step.kind !== 'safety_notice') return state;
      return { ...state, step: { kind: 'closing_ritual' } };
    }

    case 'CLOSING_READY': {
      if (state.step.kind !== 'closing_ritual') return state;
      return { ...state, readiness: 'ready', step: { kind: 'done' } };
    }

    case 'CLOSING_MORE': {
      if (state.step.kind !== 'closing_ritual') return state;
      return { ...state, readiness: 'more', step: { kind: 'closing_more' } };
    }

    case 'CLOSING_MORE_TECHNIQUE': {
      if (state.step.kind !== 'closing_more') return state;
      const candidate = moreTechniqueCandidate(state);
      if (!candidate) return state;
      // 본인이 직접 요청한 경우이므로 앞서의 거절은 지운다.
      return startTechnique({ ...state, declinedExtra: false }, candidate);
    }

    case 'CLOSING_MORE_EXIT': {
      if (state.step.kind !== 'closing_more') return state;
      return { ...state, step: { kind: 'done' } };
    }
  }
}

/** 명세 4절 CheckIn 레코드로 변환한다. reactions는 선택 순서를 보존한다. */
export function toCheckIn(
  state: FlowState,
  id: string,
  timestamp: string,
): CheckIn {
  if (state.sudsPre === null) {
    throw new Error('sudsPre 없이 체크인을 저장할 수 없습니다');
  }
  return {
    id,
    timestamp,
    reactions: state.reactions,
    sudsPre: state.sudsPre,
    techniques: state.techniques,
    ruminationSafetyFlag: state.ruminationSafetyFlag,
    externalResourceOffered: state.externalResourceOffered,
    readiness: state.readiness,
  };
}
