import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSummary: () => void;
  onOpenReview: () => void;
  onOpenCalendar: () => void;
  onOpenCoupons: () => void;
  onOpenBoutique: () => void;
  onOpenRate: () => void;
  onOpenSettings: () => void;
  /**
   * 주간 요약에 자원 제안 카드가 떠 있는가 (명세 7.2).
   * 요약이 메뉴 안으로 들어가면서 그 신호를 놓치기 쉬워져 표시를 붙인다.
   */
  escalated?: boolean;
}

/** 왼쪽 위 메뉴 바를 누르면 왼쪽에서 밀려 나오는 서랍 */
export function MenuDrawer({
  open,
  onClose,
  onOpenSummary,
  onOpenReview,
  onOpenCalendar,
  onOpenCoupons,
  onOpenBoutique,
  onOpenRate,
  onOpenSettings,
  escalated = false,
}: Props) {
  // 열려 있을 때 Esc 로 닫는다
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items: {
    label: string;
    sub?: string;
    onClick: () => void;
    dot?: boolean;
  }[] = [
    { label: '주간 요약', sub: '지금 괜찮은가', onClick: onOpenSummary, dot: escalated },
    { label: '돌아보기', sub: '나아지고 있나', onClick: onOpenReview },
    { label: '캘린더', sub: '그날 뭘 했나', onClick: onOpenCalendar },
    { label: '붕어빵 쿠폰', sub: '모은 도장', onClick: onOpenCoupons },
    { label: '부티크', sub: '도장으로 직장인 꾸미기', onClick: onOpenBoutique },
    { label: '별점·리뷰', sub: '이 앱 어땠나요', onClick: onOpenRate },
    { label: '설정', onClick: onOpenSettings },
  ];

  return (
    <>
      <div
        className={`drawer-backdrop${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        className={`drawer${open ? ' is-open' : ''}`}
        aria-label="메뉴"
        aria-hidden={!open}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <h2 className="drawer-title">메뉴</h2>
          <button
            className="drawer-close"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>

        {items.map((it) => (
          <button
            key={it.label}
            className="drawer-item"
            onClick={() => {
              onClose();
              it.onClick();
            }}
            tabIndex={open ? 0 : -1}
          >
            <span className="drawer-item-label">
              {it.label}
              {it.dot ? (
                <span className="menu-dot" aria-label="살펴볼 것이 있어요" />
              ) : null}
            </span>
            {it.sub ? <span className="drawer-item-sub">{it.sub}</span> : null}
          </button>
        ))}
      </nav>
    </>
  );
}
