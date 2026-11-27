import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

/*
 * 여러 화면이 함께 쓰는 작은 UI 조각들 (2026-11-27 추가).
 * 뒤로 가기 · 툴팁 · 아코디언 · 떠오르는 라벨 입력 칸 · 비밀번호 칸 ·
 * 진행 막대 · 완료 버튼 · 탭 전환.
 * 모양은 global.css 의 '공용 UI 조각' 절에 있다.
 */

/* ------------------------------------------------------------------ */
/* 뒤로 가기 — 화면 왼쪽 위에 둔다 */

export function BackButton({
  onClick,
  label = '뒤로',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button type="button" className="back-btn" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M15 5 L8 12 L15 19" />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 툴팁 — ⓘ 를 누르면(마우스는 올리면) 말풍선이 뜬다. 바깥을 누르거나 Esc 로 닫는다. */

export function Tooltip({
  lines,
  label = '안내 보기',
  align = 'center',
}: {
  lines: string[];
  label?: string;
  /** 말풍선을 아이콘 기준 어디에 붙일지. 화면 가장자리에 가까우면 start/end */
  align?: 'center' | 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className={`tip tip-${align}${open ? ' is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="tip-btn"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        i
      </button>
      <span role="tooltip" id={id} className="tip-bubble">
        {lines.map((l, i) => (
          <span key={i} className="tip-line">
            {l}
          </span>
        ))}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 아코디언 — 제목을 누르면 내용이 펼쳐진다. 한 번에 하나만 열린다. */

export interface AccordionItem {
  title: ReactNode;
  body: ReactNode;
}

export function Accordion({
  items,
  className,
}: {
  items: AccordionItem[];
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  return (
    <div className={`acc${className ? ` ${className}` : ''}`}>
      {items.map((it, i) => {
        const on = open === i;
        const panelId = `${base}-p${i}`;
        return (
          <div key={i} className={`acc-item${on ? ' is-open' : ''}`}>
            <button
              type="button"
              className="acc-head"
              aria-expanded={on}
              aria-controls={panelId}
              onClick={() => setOpen(on ? null : i)}
            >
              <span className="acc-title">{it.title}</span>
              <svg className="acc-chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 9 L12 15 L18 9" />
              </svg>
            </button>
            <div className="acc-panel" id={panelId} role="region" aria-hidden={!on}>
              <div className="acc-inner">
                <div className="acc-body">{it.body}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 떠오르는 라벨 입력 칸 (floating label) + 상태(기본·성공·오류) + 흔들기 */

export type FieldStatus = 'success' | 'error' | null;

type FloatingFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  label: string;
  value: string;
  /** 상태가 없을 때 아래에 보이는 안내 */
  hint?: string;
  status?: FieldStatus;
  /** 상태 문구 (성공·오류) — 있으면 hint 대신 보인다 */
  message?: string;
  /** 칸 오른쪽 끝에 붙는 것 (비밀번호 보기 버튼 등) */
  trailing?: ReactNode;
  /** 이 값이 바뀔 때마다 칸이 좌우로 흔들린다 (0 은 흔들지 않음) */
  shakeKey?: number;
};

export function FloatingField({
  label,
  value,
  hint,
  status = null,
  message,
  trailing,
  shakeKey = 0,
  id,
  className,
  ...input
}: FloatingFieldProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  const [shaking, setShaking] = useState(false);

  // 흔들기를 다시 틀려면 클래스를 한 번 뗐다가 다음 프레임에 붙인다
  useEffect(() => {
    if (!shakeKey) return;
    setShaking(false);
    const r = requestAnimationFrame(() => setShaking(true));
    return () => cancelAnimationFrame(r);
  }, [shakeKey]);

  const note = message ?? hint;
  return (
    <div
      className={[
        'ff',
        value ? 'has-value' : '',
        status ? `is-${status}` : '',
        shaking ? 'is-shaking' : '',
        trailing ? 'has-trailing' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      onAnimationEnd={() => setShaking(false)}
    >
      <div className="ff-box">
        <input
          id={fid}
          className="ff-input"
          value={value}
          aria-invalid={status === 'error' ? true : undefined}
          aria-describedby={note ? `${fid}-msg` : undefined}
          {...input}
        />
        <label htmlFor={fid} className="ff-label">
          {label}
        </label>
        {status === 'success' ? (
          <span className="ff-state" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M5 12.5 L10 17 L19 7.5" />
            </svg>
          </span>
        ) : null}
        {trailing}
      </div>
      {note ? (
        <small id={`${fid}-msg`} className="ff-msg" aria-live="polite">
          {note}
        </small>
      ) : null}
    </div>
  );
}

/** 비밀번호 칸 — 눈 모양 버튼으로 보이기·숨기기 (password toggle) */
export function PasswordField(
  props: Omit<FloatingFieldProps, 'type' | 'trailing'>,
) {
  const [shown, setShown] = useState(false);
  return (
    <FloatingField
      {...props}
      type={shown ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="ff-toggle"
          aria-label={shown ? '비밀번호 숨기기' : '비밀번호 보기'}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M2.5 12 C5 7 8.3 5 12 5 C15.7 5 19 7 21.5 12 C19 17 15.7 19 12 19 C8.3 19 5 17 2.5 12 Z" />
            <circle cx="12" cy="12" r="3.2" />
            {shown ? null : <path className="ff-toggle-slash" d="M4 4 L20 20" />}
          </svg>
        </button>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* 진행 막대 */

export function ProgressBar({
  value,
  label,
  tone = 'accent',
}: {
  /** 0 ~ 100 */
  value: number;
  label: string;
  tone?: 'accent' | 'danger';
}) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className={`pbar pbar-${tone}`}>
      <div className="pbar-head">
        <span>{label}</span>
        <span className="pbar-num">{pct}%</span>
      </div>
      <div
        className="pbar-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="pbar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** 진행이 끝나면 막대 자리에 뜨는 완료 버튼 — 초록 체크가 통통 튄다 */
export function DoneButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="btn done-btn" onClick={onClick} aria-live="polite">
      <span className="done-check" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 12.5 L10 17 L19 7.5" />
        </svg>
      </span>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 탭 전환 — 고른 탭 아래 바탕이 미끄러져 옮겨 간다 */

export function TabSwitch<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const place = () => {
      const el = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!el) return;
      setInd({ left: el.offsetLeft, width: el.offsetWidth });
    };
    place();
    // 글꼴이 늦게 들어와 폭이 바뀌어도 따라간다
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [value, options.length]);

  // 고른 탭이 가려져 있으면 목록만 옆으로 밀어 보이게 한다 (페이지는 움직이지 않는다)
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el) return;
    const target = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [value]);

  return (
    <div
      className={`tabsw${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label={label}
      ref={listRef}
    >
      {ind ? (
        <span
          className="tabsw-ind"
          aria-hidden="true"
          style={{ transform: `translateX(${ind.left}px)`, width: ind.width }}
        />
      ) : null}
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          className="tabsw-tab"
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 스위치 — 켜기·끄기 (2026-11-27, 배경 음악) */

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`ui-switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ui-switch-knob" aria-hidden="true" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 슬라이더 — 0~100 (2026-11-27, 음량) */

export function Slider({
  value,
  onChange,
  label,
  disabled = false,
}: {
  /** 0 ~ 100 */
  value: number;
  onChange: (next: number) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="range"
      className="ui-slider"
      min={0}
      max={100}
      step={1}
      value={value}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={`${value}%`}
      style={{ '--pct': `${value}%` } as React.CSSProperties}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 스낵바 — 화면 아래에 뜨는 한 줄 알림. '확인'을 눌러야 없어진다 (2026-11-27, 마이페이지) */

export function Snackbar({
  open,
  message,
  actionLabel = '확인',
  onAction,
}: {
  open: boolean;
  message: ReactNode;
  actionLabel?: string;
  onAction: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) {
      setShown(true);
      setLeaving(false);
    }
  }, [open]);
  if (!shown) return null;
  return (
    <div className={`snackbar${leaving ? ' is-leaving' : ''}`} role="alert">
      <span className="snackbar-text">{message}</span>
      <button
        type="button"
        className="snackbar-btn"
        onClick={() => {
          setLeaving(true);
          window.setTimeout(() => {
            setShown(false);
            onAction();
          }, 180);
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 아래에서 올라오는 시트 — 용수철처럼 살짝 넘쳤다 자리 잡는다 (2026-11-27, 온보딩) */

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>(open ? 'open' : 'closed');
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) setPhase('open');
    else setPhase((p) => (p === 'open' ? 'closing' : p));
  }, [open]);

  useEffect(() => {
    if (phase !== 'closing') return;
    const t = window.setTimeout(() => setPhase('closed'), 220);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'open') return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose]);

  if (phase === 'closed') return null;
  return (
    <div className={`bsheet-wrap${phase === 'closing' ? ' is-closing' : ''}`}>
      <div className="bsheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="bsheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="bsheet-grip" aria-hidden="true" />
        <h2 id={titleId} className="bsheet-title">
          {title}
        </h2>
        <div className="bsheet-body">{children}</div>
        <button ref={closeRef} type="button" className="btn bsheet-close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
