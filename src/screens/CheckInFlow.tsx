import { useEffect, useMemo, useReducer, useRef } from 'react';
import { FLOW, reactionInfo } from '../constants';
import {
  derive,
  initialFlowState,
  moreTechniqueCandidate,
  reduce,
  toCheckIn,
} from '../flow/checkinMachine';
import { josa } from '../lib/josa';
import { newId, upsertCheckIn } from '../storage/store';
import type { FlowState, TechniqueId } from '../types';
import { ClosingMore, ClosingRitual } from './ClosingRitual';
import { ExternalResource, SafetyNotice } from './Notices';
import { OfferExtra } from './OfferExtra';
import { ReactionSelect } from './ReactionSelect';
import { SudsSlider } from './SudsSlider';
import { TechniquePlayer } from './TechniquePlayer';

/**
 * 선택 순서와 다른 반응을 먼저 다루거나 신체 기법을 먼저 할 때,
 * 왜 이 기법이 먼저인지 한 줄로 밝힌다. (명세 6.3의 순서 규칙 설명)
 */
function reasonNoteFor(
  state: FlowState,
  technique: TechniqueId,
): string | undefined {
  if (state.reactions.length === 0) return undefined;
  const d = derive(state.reactions);
  const first = state.techniques.length <= 1;

  if (first && d.pri !== d.recordedPrimary) {
    const label = reactionInfo(d.pri).label;
    return `${label}${josa(label, '가/이')} 남아 있을 때는 이걸 먼저 해요.`;
  }
  if (
    first &&
    state.sudsPre !== null &&
    state.sudsPre > FLOW.midSudsMax &&
    technique === d.bodyTech
  ) {
    return '점수가 높을 때는 몸을 먼저 가라앉혀요.';
  }
  return undefined;
}

export function CheckInFlow({ onFinish, displayName }: {
  onFinish: () => void;
  displayName: string;
}) {
  const [state, dispatch] = useReducer(reduce, undefined, initialFlowState);
  const idRef = useRef(newId());
  const startedAtRef = useRef(new Date().toISOString());

  // 명세 4절 — sudsPre가 정해진 뒤부터 기록을 남기고 단계마다 갱신한다.
  // 흐름 중간에 앱을 닫아도 기록이 보존된다 (readiness는 null로 남는다).
  useEffect(() => {
    if (state.sudsPre === null) return;
    upsertCheckIn(toCheckIn(state, idRef.current, startedAtRef.current));
  }, [state]);

  useEffect(() => {
    if (state.step.kind === 'done') onFinish();
  }, [state.step.kind, onFinish]);

  const candidate = useMemo(
    () => (state.reactions.length ? moreTechniqueCandidate(state) : null),
    [state],
  );

  const step = state.step;

  switch (step.kind) {
    case 'reaction_select':
      return (
        <ReactionSelect
          onCancel={onFinish}
          onSubmit={(reactions) =>
            dispatch({ type: 'SELECT_REACTIONS', reactions })
          }
        />
      );

    case 'suds_pre':
      return (
        <SudsSlider
          mode="pre"
          onSubmit={(value) => dispatch({ type: 'SUBMIT_SUDS_PRE', value })}
        />
      );

    case 'technique':
      return (
        <TechniquePlayer
          key={`${step.technique}-${state.techniques.length}`}
          technique={step.technique}
          displayName={displayName}
          reasonNote={reasonNoteFor(state, step.technique)}
          onDone={() => dispatch({ type: 'TECHNIQUE_DONE' })}
          onSafetyImmediate={() =>
            dispatch({ type: 'SAFETY_CONCERN_IMMEDIATE' })
          }
        />
      );

    case 'suds_post':
      return (
        <SudsSlider
          mode="post"
          onSubmit={(value) => dispatch({ type: 'SUBMIT_SUDS_POST', value })}
        />
      );

    case 'offer_extra':
      return (
        <OfferExtra
          variant={step.variant}
          technique={step.technique}
          onAccept={() => dispatch({ type: 'ACCEPT_OFFER' })}
          onDecline={() => dispatch({ type: 'DECLINE_OFFER' })}
        />
      );

    case 'external_resource':
      return (
        <ExternalResource
          onNext={() => dispatch({ type: 'EXTERNAL_RESOURCE_NEXT' })}
        />
      );

    case 'safety_notice':
      return (
        <SafetyNotice onNext={() => dispatch({ type: 'SAFETY_NOTICE_NEXT' })} />
      );

    case 'closing_ritual':
      return (
        <ClosingRitual
          onReady={() => dispatch({ type: 'CLOSING_READY' })}
          onMore={() => dispatch({ type: 'CLOSING_MORE' })}
        />
      );

    case 'closing_more':
      return (
        <ClosingMore
          candidate={candidate}
          onTechnique={() => dispatch({ type: 'CLOSING_MORE_TECHNIQUE' })}
          onExit={() => dispatch({ type: 'CLOSING_MORE_EXIT' })}
        />
      );

    case 'done':
      return null;
  }
}
