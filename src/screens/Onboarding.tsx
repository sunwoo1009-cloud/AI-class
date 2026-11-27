import { useState } from 'react';
import { Lines } from '../components/Lines';
import { BottomSheet } from '../components/ui';

interface Props {
  onDone: () => void;
}

/** 온보딩 칸 — 처음에는 제목만 보이고, 누르면 아래에서 내용이 올라온다 */
export const ONBOARDING_CARDS: {
  id: string;
  label: string;
  title: string;
  lines: string[];
  note?: boolean;
}[] = [
  {
    id: 'record',
    label: '사용 기록',
    title: '기록은 기본으로 기기에만 저장돼요',
    lines: [
      '가입하지 않아도 모든 기능을 쓸 수 있어요',
      '기록은 이 브라우저에만 남고 기관과 공유되지 않아요',
      '원하면 설정에서 가입해 백업할 수 있어요',
      '설정에서 언제든 전부 지울 수 있어요',
    ],
  },
  {
    id: 'caution',
    label: '주의할 점',
    title: '이 앱은 치료나 위기 대응 도구가 아니에요',
    note: true,
    lines: [
      '내담자 안전에 관한 판단이 필요한 상황에서는 기관의 위기 대응 절차를 따르세요',
      '소진은 개인의 대처 문제가 아니라 업무 구조의 문제이기도 해요',
      '이 앱은 수퍼비전이나 동료 상담을 대신하지 않아요',
      '자가 진단을 임상적 진단으로 보지 않도록 주의하시고, 우울이나 외상 후 반응이 의심된다면 전문가의 평가와 상담을 받는 것이 안전합니다',
    ],
  },
  {
    id: 'know',
    label: '알아두세요',
    title: '조기 신호 인식은 상담사 소진 예방 방법입니다',
    lines: [
      '마이페이지의 2주 점검에서 세 가지 신호를 살펴볼 수 있어요',
      '회기 후 피로 회복 시간 · 내담자와의 정서적 거리감 · 사례 개념화 흥미',
    ],
  },
];

/**
 * 명세 9절 화면 1.
 * 2026-11-25 — 부를 이름 입력을 뺐다. 이름(닉네임)은 선택 가입할 때 정한다 (명세 7.7).
 * 2026-11-27 — 안내 칸 세 개(사용 기록 · 주의할 점 · 알아두세요)가 제목만 단 채 차례로(stagger)
 * 떠올라 자리 잡는다. 칸을 누르면 아래에서 시트가 용수철처럼(spring) 올라와 내용을 보여준다.
 */
export function Onboarding({ onDone }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  // 닫히는 동안에도 내용이 남아 있게 마지막으로 연 칸을 기억한다
  const [lastId, setLastId] = useState<string>(ONBOARDING_CARDS[0].id);
  const shown = ONBOARDING_CARDS.find((c) => c.id === lastId)!;

  return (
    <div className="app">
      <h1>퇴근길 붕어빵 한 입</h1>
      <div className="lines-box">
        <Lines
          className="muted"
          base="0.875rem"
          text={'회기 직후에 남아 있는 반응을 기록하고\n조절 기법을 안내받는 앱이에요'}
        />
      </div>

      <div className="onb-cards">
        {ONBOARDING_CARDS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`onb-card${c.note ? ' is-note' : ''}`}
            style={{ animationDelay: `${120 + i * 140}ms` }}
            aria-haspopup="dialog"
            onClick={() => {
              setLastId(c.id);
              setOpenId(c.id);
            }}
          >
            <span className="onb-card-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="onb-card-label">{c.label}</span>
            <span className="onb-card-chev" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>

      <div className="spacer" />
      <button className="btn btn-primary" onClick={onDone}>
        시작하기
      </button>

      <BottomSheet
        open={openId !== null}
        title={
          <>
            <small className="bsheet-kicker">{shown.label}</small>
            {shown.title}
          </>
        }
        onClose={() => setOpenId(null)}
      >
        <ul className={`onb-sheet-list${shown.note ? ' is-note' : ''}`}>
          {shown.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
