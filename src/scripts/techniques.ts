import type { ArtKind } from '../screens/menu/TechniqueArt';
import type { TechniqueId } from '../types';

/** 선택지 하나. action이 있으면 흐름에 신호를 보낸다. */
export interface ScriptOption {
  id: string;
  label: string;
  /** 명세 8.4 — '지금 바로 확인 필요' */
  action?: 'safety_immediate';
}

export type ScriptStep =
  | {
      kind: 'text';
      seconds: number;
      text: string;
      /** 글과 함께 보여줄 그림 */
      art?: ArtKind;
      /** 글을 그림 위 말풍선 안에 넣는다 */
      speech?: boolean;
    }
  | {
      kind: 'breathing';
      seconds: number;
      cycles: number;
      inhaleSec: number;
      exhaleSec: number;
    }
  | {
      kind: 'choice';
      seconds: number;
      text: string;
      choiceId: string;
      options: ScriptOption[];
      /** 앞선 선택에 따라 선택지를 교체한다 */
      variants?: {
        whenChoiceId: string;
        whenValue: string;
        options: ScriptOption[];
      }[];
    };

export interface TechniqueScript {
  id: TechniqueId;
  steps: ScriptStep[];
}

/**
 * 줄을 나눠 보여줄 문구. 줄바꿈은 .script-text 의 white-space: pre-line 이 살린다.
 * 화면이 좁으면 각 줄이 그 안에서 한 번 더 접힌다.
 */
const lines = (...parts: string[]) => parts.join('\n');

/** 명세 8.1 느린 호흡 (약 90초) */
const slowBreathing: TechniqueScript = {
  id: 'slow_breathing',
  steps: [
    {
      kind: 'text',
      seconds: 5,
      text: '붕어빵이 아직 뜨거워요. 붕어빵이 커질 때 숨을 들이쉬고, 작아질 때 내쉬며 식혀봐요.',
    },
    { kind: 'breathing', seconds: 80, cycles: 8, inhaleSec: 4, exhaleSec: 6 },
    {
      kind: 'text',
      seconds: 5,
      text: '마지막 날숨에서 어깨가 내려가는지 확인해 보세요.',
      art: 'taiyakiCool',
    },
  ],
};

/** 명세 8.2 감각 그라운딩 (약 90초) */
const grounding: TechniqueScript = {
  id: 'grounding',
  steps: [
    {
      kind: 'text',
      seconds: 15,
      text: '발바닥으로 바닥을 꾹 눌러보세요. 몇 초 누르고 있다가 힘을 빼세요.',
    },
    {
      kind: 'text',
      seconds: 20,
      text: '지금 보이는 것 중에서 색깔이 다른 물건 세 개를 찾아보세요. 속으로 이름을 불러도 돼요.',
    },
    {
      kind: 'text',
      seconds: 15,
      text: '들리는 소리 두 가지에 귀를 기울여 보세요.',
    },
    {
      kind: 'text',
      seconds: 20,
      text: '손에 닿는 물건 하나를 만져보세요. 온도와 질감에 주의를 두세요.',
    },
    {
      kind: 'text',
      seconds: 10,
      text: '지금 어디에 있는지, 다음 일정이 무엇인지 떠올려 보세요.',
    },
  ],
};

/** 명세 8.3 컨테인먼트 심상 (약 2분) */
const containment: TechniqueScript = {
  id: 'containment',
  steps: [
    {
      kind: 'text',
      seconds: 15,
      text: lines(
        '회기에서 들은 이야기 중에',
        '떠오르는 장면이 있다면',
        '그걸 지우려 하지 말고',
        '잠시 바라보세요',
      ),
    },
    {
      kind: 'text',
      seconds: 20,
      text: lines(
        '그 장면을 담아둘 수 있는',
        '상자나 서랍을 하나 떠올려 보세요',
        '뚜껑이 단단히 닫히는 것이면 좋아요',
      ),
    },
    {
      kind: 'text',
      seconds: 30,
      text: lines(
        '장면을 그 안에 넣어보세요',
        '다 들어가지 않으면 크기를 줄이거나',
        '흐리게 만들어서 넣어도 돼요',
      ),
    },
    {
      kind: 'text',
      seconds: 20,
      text: lines(
        '뚜껑을 닫으세요',
        '이건 지우는 게 아니라 보관해 두는 거예요',
      ),
    },
    {
      kind: 'text',
      seconds: 15,
      text: lines(
        '상자를 어디에 둘지 정하세요',
        '사무실 밖이어도 괜찮아요',
      ),
    },
  ],
};

/** 명세 8.4 심리적 분리 (약 90초) */
const detachment: TechniqueScript = {
  id: 'detachment',
  steps: [
    {
      kind: 'choice',
      seconds: 15,
      text: '지금 머릿속에 남아 있는 생각이 어떤 종류인지 골라보세요.',
      choiceId: 'thought_kind',
      options: [
        { id: 'missed', label: '내가 놓친 것 같은 부분' },
        { id: 'client_safety', label: '내담자 안전에 대한 걱정' },
        { id: 'next_session', label: '다음 회기에 할 것' },
        { id: 'keeps_coming', label: '그냥 계속 떠오름' },
      ],
    },
    {
      kind: 'choice',
      seconds: 15,
      text: '이 생각을 다룰 시간을 정해 두세요.',
      choiceId: 'when_to_handle',
      options: [
        { id: 'today_record', label: '오늘 기록 시간' },
        { id: 'supervision', label: '수퍼비전·사례회의' },
        { id: 'ask_colleague', label: '동료에게 물어보기' },
        { id: 'undecided', label: '정하지 않음' },
      ],
      // 명세 8.4 — '내담자 안전에 대한 걱정'을 골랐다면
      // '정하지 않음' 대신 '지금 바로 확인 필요'를 보여준다.
      variants: [
        {
          whenChoiceId: 'thought_kind',
          whenValue: 'client_safety',
          options: [
            { id: 'today_record', label: '오늘 기록 시간' },
            { id: 'supervision', label: '수퍼비전·사례회의' },
            { id: 'ask_colleague', label: '동료에게 물어보기' },
            {
              id: 'immediate',
              label: '지금 바로 확인 필요',
              action: 'safety_immediate',
            },
          ],
        },
      ],
    },
    {
      kind: 'text',
      seconds: 45,
      text: '이제 잠깐 자리에서 일어나 보세요. 창밖을 보거나, 물을 마시거나, 복도를 한 번 걸어도 돼요.',
    },
    { kind: 'text', seconds: 15, text: '다음 회기는 다음 회기의 일이에요.' },
  ],
};

/** 명세 8.5 연민 재정향 (약 2분) */
const compassion: TechniqueScript = {
  id: 'compassion',
  steps: [
    {
      kind: 'text',
      seconds: 20,
      text: '회기에서 내담자의 고통이 지금 내 안에 얼마나 남아 있는지 느껴보세요.',
    },
    {
      kind: 'text',
      seconds: 20,
      text: '그 무게는 내 것이 아니라, 함께 있었기 때문에 전해진 거예요. 이름을 붙여보세요. "지금 나는 공감적 고통을 느끼고 있다."',
    },
    {
      kind: 'text',
      seconds: 40,
      text: '이번에는 그 사람을 떠올리면서, 고통을 함께 느끼는 대신 그 사람이 잘 지내기를 바라보세요. 문장은 자유롭게 정하세요. 예를 들어 "이 사람이 조금 덜 아프기를."',
    },
    {
      kind: 'text',
      seconds: 30,
      text: '같은 바람을 나에게도 돌려보세요. "나도 지금 무거운 걸 들고 있다. 내가 조금 가벼워지기를."',
    },
    { kind: 'text', seconds: 10, text: '숨을 한 번 길게 내쉬세요.' },
  ],
};

/** 명세 8.6 자기 거리두기 (약 60초) — {name는}에 표시 이름이 들어간다 */
const selfDistancing: TechniqueScript = {
  id: 'self_distancing',
  steps: [
    {
      kind: 'text',
      seconds: 20,
      text: '지금 상황을 내 이름으로 말해보세요. (예시: "{name는} 지금 화가 나 있다.")',
      art: 'creamSteam',
      speech: true,
    },
    {
      kind: 'text',
      seconds: 20,
      text: '이어서 물어보세요. "{name는} 왜 화가 났을까?" 답을 찾지 않아도 돼요. 질문만 해보세요.',
      art: 'creamRack',
    },
    {
      kind: 'text',
      seconds: 20,
      text: '일주일 뒤에 이 회기를 떠올린다고 생각해 보세요. 그때 이 감정은 어느 정도일까요?',
      art: 'creamClock',
    },
  ],
};

export const TECHNIQUE_SCRIPTS: Record<TechniqueId, TechniqueScript> = {
  slow_breathing: slowBreathing,
  grounding,
  containment,
  detachment,
  compassion,
  self_distancing: selfDistancing,
};

/** 명세 8.4 — 안전 경로로 중단되었을 때 보여주는 안내 */
export const SAFETY_NOTICE = {
  title: '기관의 위기 대응 절차를 먼저 확인하세요.',
  body: '내담자 안전에 대한 걱정은 기법으로 다룰 일이 아니에요. 기관의 위기 대응 절차에 따라 조치한 뒤에 돌아오세요.',
};

/** 명세 6.4 — 앱 밖 자원 화면 */
export const EXTERNAL_RESOURCE = {
  body: '다음 회기 전에 동료나 수퍼바이저와 잠깐 이야기할 수 있는지 생각해 보세요.',
};
