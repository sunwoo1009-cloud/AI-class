interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSummary: () => void;
  onOpenReview: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  /**
   * 주간 요약에 자원 제안 카드가 떠 있는가 (명세 7.2).
   * 요약이 시트 안으로 들어가면서 그 신호를 놓치기 쉬워져 표시를 붙인다.
   */
  escalated?: boolean;
}

/** 가판대 옆 나무 메뉴판을 누르면 아래에서 올라오는 시트 */
export function MenuSheet({
  open,
  onClose,
  onOpenSummary,
  onOpenReview,
  onOpenCalendar,
  onOpenSettings,
  escalated = false,
}: Props) {
  const items: {
    label: string;
    sub?: string;
    onClick: () => void;
    dot?: boolean;
  }[] = [
    { label: '주간 요약', sub: '지금 괜찮은가', onClick: onOpenSummary, dot: escalated },
    { label: '돌아보기', sub: '나아지고 있나', onClick: onOpenReview },
    { label: '캘린더', sub: '그날 뭘 했나', onClick: onOpenCalendar },
    { label: '설정', onClick: onOpenSettings },
  ];

  return (
    <>
      <div
        className={`sheet-backdrop${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`sheet${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="메뉴판"
        aria-hidden={!open}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden="true" />
        <h2 className="sheet-title">메뉴판</h2>

        {items.map((it) => (
          <button
            key={it.label}
            className="sheet-item"
            onClick={() => {
              onClose();
              it.onClick();
            }}
            tabIndex={open ? 0 : -1}
          >
            <span className="sheet-item-label">
              {it.label}
              {it.dot ? (
                <span className="sheet-dot" aria-label="살펴볼 것이 있어요" />
              ) : null}
            </span>
            {it.sub ? <span className="sheet-item-sub">{it.sub}</span> : null}
          </button>
        ))}

        <button className="sheet-close" onClick={onClose} tabIndex={open ? 0 : -1}>
          닫기
        </button>
      </div>
    </>
  );
}
