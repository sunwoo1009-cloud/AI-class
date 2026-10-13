import { describe, expect, it } from 'vitest';
import {
  derive,
  initialFlowState,
  moreTechniqueCandidate,
  reduce,
  toCheckIn,
} from './checkinMachine';
import type { FlowEvent, FlowState, ReactionType } from '../types';

/** 이벤트를 순서대로 흘려보내는 헬퍼 */
function run(reactions: ReactionType[], ...events: FlowEvent[]): FlowState {
  let s = reduce(initialFlowState(), { type: 'SELECT_REACTIONS', reactions });
  for (const e of events) s = reduce(s, e);
  return s;
}

const pre = (value: number): FlowEvent => ({ type: 'SUBMIT_SUDS_PRE', value });
const post = (value: number): FlowEvent => ({ type: 'SUBMIT_SUDS_POST', value });
const DONE: FlowEvent = { type: 'TECHNIQUE_DONE' };
const ACCEPT: FlowEvent = { type: 'ACCEPT_OFFER' };
const DECLINE: FlowEvent = { type: 'DECLINE_OFFER' };

// ---------------------------------------------------------------------------
// 명세 6.3 1문장 — 각성 수준 우선, 동급이면 선택 순서
// ---------------------------------------------------------------------------

describe('derive — 주 반응 결정 (명세 6.3)', () => {
  it('각성 수준이 높은 쪽을 먼저 다룬다', () => {
    const d = derive(['heaviness', 'hyperarousal']);
    expect(d.pri).toBe('hyperarousal');
    expect(d.sec).toBe('heaviness');
  });

  it('기록용 주 반응은 선택 순서를 유지한다 (명세 6.1)', () => {
    const d = derive(['heaviness', 'hyperarousal']);
    expect(d.recordedPrimary).toBe('heaviness');
  });

  it('같은 각성 수준이면 먼저 고른 반응을 먼저 다룬다', () => {
    expect(derive(['anger', 'intrusion']).pri).toBe('anger');
    expect(derive(['intrusion', 'anger']).pri).toBe('intrusion');
  });

  it('신체 기법은 주 반응의 각성 수준으로 정한다 (명세 5절)', () => {
    expect(derive(['hyperarousal']).bodyTech).toBe('slow_breathing');
    expect(derive(['heaviness']).bodyTech).toBe('slow_breathing'); // 중간 → 호흡
    expect(derive(['numbness']).bodyTech).toBe('grounding'); // 저각성 → 그라운딩
    // 저각성 + 중간을 함께 고르면 중간이 먼저 → 호흡
    expect(derive(['numbness', 'heaviness']).bodyTech).toBe('slow_breathing');
  });
});

// ---------------------------------------------------------------------------
// 명세 6.3 분기표
// ---------------------------------------------------------------------------

describe('6.3 분기 — sudsPre <= 3', () => {
  it('#1 제안을 거절하면 기법 없이 종결 의례로 간다', () => {
    const s = run(['hyperarousal'], pre(2), DECLINE);
    expect(s.step.kind).toBe('closing_ritual');
    expect(s.techniques).toHaveLength(0);
  });

  it('#2 제안을 수락하면 주 반응 기법 1개를 한다', () => {
    let s = run(['hyperarousal'], pre(2));
    expect(s.step).toEqual({
      kind: 'offer_extra',
      variant: 'low',
      technique: 'slow_breathing',
    });
    s = reduce(s, ACCEPT);
    expect(s.step).toEqual({ kind: 'technique', technique: 'slow_breathing' });
    s = reduce(reduce(s, DONE), post(1));
    expect(s.step.kind).toBe('closing_ritual');
  });
});

describe('6.3 분기 — sudsPre 4~6', () => {
  it('#3 주 반응 기법 1개 → 점수가 내려가면 종결', () => {
    let s = run(['anger'], pre(5));
    expect(s.step).toEqual({ kind: 'technique', technique: 'self_distancing' });
    s = reduce(reduce(s, DONE), post(3));
    expect(s.step.kind).toBe('closing_ritual');
  });

  it('#4 점수가 안 내려가면 아직 안 한 기법을 제안한다', () => {
    const s = run(['anger'], pre(6), DONE, post(8));
    expect(s.step).toEqual({
      kind: 'offer_extra',
      variant: 'rule',
      technique: 'slow_breathing',
    });
  });
});

describe('6.3 분기 — sudsPre 7~10', () => {
  it('#5 신체 기법 먼저 → 반응 기법 제안 → 수락 후 해소되면 종결', () => {
    let s = run(['intrusion'], pre(9));
    expect(s.step).toEqual({ kind: 'technique', technique: 'slow_breathing' });
    s = reduce(reduce(s, DONE), post(8));
    expect(s.step).toEqual({
      kind: 'offer_extra',
      variant: 'caseC',
      technique: 'containment',
    });
    s = reduce(s, ACCEPT);
    expect(s.step).toEqual({ kind: 'technique', technique: 'containment' });
    s = reduce(reduce(s, DONE), post(5));
    expect(s.step.kind).toBe('closing_ritual');
  });

  it('#6 주 반응 기법이 방금 한 신체 기법과 같으면 제안을 생략한다', () => {
    const s = run(['hyperarousal'], pre(9), DONE, post(8));
    expect(s.step.kind).not.toBe('offer_extra');
    // 후보 기법이 더 없으므로 앱 밖 자원으로 간다
    expect(s.step.kind).toBe('external_resource');
    expect(s.externalResourceOffered).toBe(true);
  });

  it('#7 저각성 단일 반응도 같은 이유로 후보가 소진된다', () => {
    const s = run(['numbness'], pre(9), DONE, post(8));
    expect(s.techniques.map((t) => t.id)).toEqual(['grounding']);
    expect(s.step.kind).toBe('external_resource');
  });

  it('#8 과각성이 섞이면 호흡 먼저, 제안은 보조 반응 기법으로', () => {
    const s = run(['heaviness', 'hyperarousal'], pre(8), DONE, post(8));
    expect(s.techniques.map((t) => t.id)).toEqual(['slow_breathing']);
    expect(s.step).toEqual({
      kind: 'offer_extra',
      variant: 'rule',
      technique: 'compassion',
    });
  });

  it('#9 저각성+중간이면 중간이 주 반응이 되어 호흡을 먼저 한다', () => {
    const s = run(['numbness', 'heaviness'], pre(8), DONE, post(7));
    expect(s.techniques.map((t) => t.id)).toEqual(['slow_breathing']);
    expect(s.step).toEqual({
      kind: 'offer_extra',
      variant: 'caseC',
      technique: 'compassion',
    });
  });
});

// ---------------------------------------------------------------------------
// 명세 6.4 재평정 규칙
// ---------------------------------------------------------------------------

describe('6.4 재평정 규칙', () => {
  it('중간 경로에서 점수가 3 이상 내려가면 종결로 간다', () => {
    const s = run(['rumination'], pre(6), DONE, post(3));
    expect(s.step.kind).toBe('closing_ritual');
  });

  // 명세 6.3 고강도 경로는 "재평정 → 선택지 → 재평정 규칙" 순서다.
  // 따라서 점수가 크게 내려가도 선택지가 먼저 나오고, 거절하면 6.4가 적용된다.
  it('고강도 경로에서는 점수가 내려가도 선택지를 먼저 보여준다', () => {
    let s = run(['intrusion'], pre(10), DONE, post(7));
    expect(s.step).toEqual({
      kind: 'offer_extra',
      variant: 'caseC',
      technique: 'containment',
    });
    s = reduce(s, DECLINE);
    expect(s.step.kind).toBe('closing_ritual'); // 개입 전 대비 3 내려감
  });

  it('고강도 경로에서 거의 해소돼도 선택지가 나오고, 거절하면 종결된다', () => {
    let s = run(['intrusion'], pre(10), DONE, post(2));
    expect(s.step.kind).toBe('offer_extra');
    s = reduce(s, DECLINE);
    expect(s.step.kind).toBe('closing_ritual');
    expect(s.externalResourceOffered).toBe(false);
  });

  it('#10 기법 2개를 했는데 안 내려가면 앱 밖 자원을 제안한다', () => {
    const s = run(['intrusion'], pre(9), DONE, post(9), ACCEPT, DONE, post(9));
    expect(s.techniques.map((t) => t.id)).toEqual([
      'slow_breathing',
      'containment',
    ]);
    expect(s.step.kind).toBe('external_resource');
    expect(s.externalResourceOffered).toBe(true);
  });

  it('한 체크인에서 기법은 2개를 넘지 않는다', () => {
    let s = run(['intrusion'], pre(9), DONE, post(9), ACCEPT, DONE, post(9));
    s = reduce(s, { type: 'EXTERNAL_RESOURCE_NEXT' });
    expect(s.step.kind).toBe('closing_ritual');
    s = reduce(s, { type: 'CLOSING_MORE' });
    expect(moreTechniqueCandidate(s)).toBeNull();
    s = reduce(s, { type: 'CLOSING_MORE_TECHNIQUE' });
    // 후보가 없으므로 기법이 추가되지 않는다
    expect(s.techniques).toHaveLength(2);
  });

  it('재평정 비교 기준은 최초 개입 전 점수다', () => {
    // pre 9 → post 9 → 두 번째 기법 post 7 : 직전(9) 대비 2지만 pre 대비 2 → 미해소
    const s = run(['intrusion'], pre(9), DONE, post(9), ACCEPT, DONE, post(7));
    expect(s.step.kind).toBe('external_resource');
  });
});

// ---------------------------------------------------------------------------
// 추가 기법 제안을 거절했을 때 (확인 항목 ②)
// ---------------------------------------------------------------------------

describe('추가 기법 제안 거절', () => {
  it('거절했고 점수가 내려갔으면 바로 종결 의례로 간다', () => {
    const s = run(['intrusion'], pre(9), DONE, post(6), DECLINE);
    expect(s.step.kind).toBe('closing_ritual');
  });

  it('거절했고 점수가 그대로면 앱 밖 자원을 보여준다', () => {
    const s = run(['intrusion'], pre(9), DONE, post(8), DECLINE);
    expect(s.step.kind).toBe('external_resource');
    expect(s.externalResourceOffered).toBe(true);
  });

  it('같은 제안을 두 번 하지 않는다', () => {
    const s = run(['anger'], pre(6), DONE, post(8), DECLINE);
    expect(s.step.kind).toBe('external_resource');
  });

  it('sudsPre <= 3에서 거절하면 앱 밖 자원을 띄우지 않는다', () => {
    const s = run(['heaviness'], pre(3), DECLINE);
    expect(s.step.kind).toBe('closing_ritual');
    expect(s.externalResourceOffered).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 명세 8.4 반추 안전 경로
// ---------------------------------------------------------------------------

describe('8.4 반추 — 내담자 안전 걱정', () => {
  it('#11 기법을 중단하고 재평정 없이 종결 의례로 간다', () => {
    let s = run(['rumination'], pre(5));
    expect(s.step).toEqual({ kind: 'technique', technique: 'detachment' });
    s = reduce(s, { type: 'SAFETY_CONCERN_IMMEDIATE' });
    expect(s.step.kind).toBe('safety_notice');
    expect(s.ruminationSafetyFlag).toBe(true);
    expect(s.techniques).toEqual([{ id: 'detachment', sudsPost: null }]);
    s = reduce(s, { type: 'SAFETY_NOTICE_NEXT' });
    expect(s.step.kind).toBe('closing_ritual');
  });
});

// ---------------------------------------------------------------------------
// 명세 6.5 종결 의례
// ---------------------------------------------------------------------------

describe('6.5 종결 의례', () => {
  it('준비됐으면 readiness를 ready로 기록하고 끝낸다', () => {
    const s = run(['anger'], pre(5), DONE, post(2), { type: 'CLOSING_READY' });
    expect(s.readiness).toBe('ready');
    expect(s.step.kind).toBe('done');
  });

  it('조금 더 필요하면 기법 하나를 더 할 수 있다', () => {
    let s = run(['anger'], pre(5), DONE, post(2), { type: 'CLOSING_MORE' });
    expect(s.readiness).toBe('more');
    expect(s.step.kind).toBe('closing_more');
    expect(moreTechniqueCandidate(s)).toBe('slow_breathing');
    s = reduce(s, { type: 'CLOSING_MORE_TECHNIQUE' });
    expect(s.step).toEqual({ kind: 'technique', technique: 'slow_breathing' });
  });

  it('앞서 제안을 거절했어도 본인이 요청하면 기법을 준다', () => {
    let s = run(['anger'], pre(6), DONE, post(8), DECLINE);
    expect(s.step.kind).toBe('external_resource');
    s = reduce(s, { type: 'EXTERNAL_RESOURCE_NEXT' });
    s = reduce(s, { type: 'CLOSING_MORE' });
    expect(moreTechniqueCandidate(s)).toBe('slow_breathing');
    s = reduce(s, { type: 'CLOSING_MORE_TECHNIQUE' });
    expect(s.step).toEqual({ kind: 'technique', technique: 'slow_breathing' });
  });

  it('앱 닫기를 고르면 끝낸다', () => {
    const s = run(
      ['anger'],
      pre(5),
      DONE,
      post(2),
      { type: 'CLOSING_MORE' },
      { type: 'CLOSING_MORE_EXIT' },
    );
    expect(s.step.kind).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// 저장 레코드 변환 (명세 4절)
// ---------------------------------------------------------------------------

describe('toCheckIn', () => {
  it('선택 순서를 그대로 보존한다', () => {
    const s = run(['heaviness', 'hyperarousal'], pre(8), DONE, post(4), {
      type: 'CLOSING_READY',
    });
    const record = toCheckIn(s, 'id-1', '2026-10-13T09:00:00.000Z');
    expect(record).toEqual({
      id: 'id-1',
      timestamp: '2026-10-13T09:00:00.000Z',
      reactions: ['heaviness', 'hyperarousal'],
      sudsPre: 8,
      techniques: [{ id: 'slow_breathing', sudsPost: 4 }],
      ruminationSafetyFlag: false,
      externalResourceOffered: false,
      readiness: 'ready',
    });
  });
});
