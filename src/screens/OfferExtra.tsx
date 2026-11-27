import { TECHNIQUE_LABELS } from '../constants';
import type { OfferVariant, TechniqueId } from '../types';
import { BackButton } from '../components/ui';

interface Props {
  variant: OfferVariant;
  technique: TechniqueId;
  onAccept: () => void;
  onDecline: () => void;
  onBack?: () => void;
}

/** 명세 6.3 — 경로별 문구 */
const QUESTION: Record<OfferVariant, string> = {
  low: '기법을 하나 해볼래요?',
  caseC: '반응에 맞는 기법을 하나 더 할래요?',
  rule: '기법을 하나 더 해볼래요?',
};

const DECLINE_LABEL: Record<OfferVariant, string> = {
  low: '그냥 마무리할게요',
  caseC: '여기까지 할게요',
  rule: '여기까지 할게요',
};

/** 명세 9절 화면 6 */
export function OfferExtra({ variant, technique, onAccept, onDecline, onBack }: Props) {
  return (
    <div className="app app-paper">
      <div className="topbar">
        {onBack ? <BackButton onClick={onBack} /> : null}
        <span className="topbar-title">선택</span>
      </div>

      <h1>{QUESTION[variant]}</h1>
      <p className="muted">선택이에요. 하지 않아도 돼요.</p>

      <div className="spacer" />

      <button className="btn btn-primary" onClick={onAccept}>
        {TECHNIQUE_LABELS[technique]} 하기
      </button>
      <button className="btn" style={{ textAlign: 'center' }} onClick={onDecline}>
        {DECLINE_LABEL[variant]}
      </button>
    </div>
  );
}
