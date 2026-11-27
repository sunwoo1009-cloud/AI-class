import { useEffect, useRef, useState } from 'react';
import { backupDue } from '../lib/backup';
import { buildExport, parseImport } from '../lib/dataTransfer';
import type { Snapshot } from '../lib/dataTransfer';
import {
  clearAllData,
  loadCheckIns,
  loadCloset,
  saveCloset,
  loadJournal,
  loadLastExportAt,
  loadSettings,
  loadStampTotal,
  loadWeeklySessions,
  oldestRecordAt,
  saveCheckIns,
  saveJournal,
  saveLastExportAt,
  saveSettings,
  saveStampTotal,
  writeWeeklySessions,
} from '../storage/store';
import type { Settings } from '../types';
import { AccountSection } from './AccountSection';
import { Accordion, BackButton, ProgressBar } from '../components/ui';
import { useProgress } from '../lib/useProgress';
import { askMyPlace, clearMyPlace, loadWeatherPlace } from '../lib/weather';

/**
 * 인트로 날씨 지역 (2026-11-27, lib/weather.ts).
 * 기본은 서울. '내 지역으로'를 누를 때만 위치를 묻고, 약 10km 로 뭉갠 좌표만 기기에 둔다.
 */
function WeatherPlaceSection() {
  const [mine, setMine] = useState(() => loadWeatherPlace().mine);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <h2 style={{ marginTop: 22 }}>인트로 날씨 지역</h2>
      <p className="muted">
        퇴근길 장면이 그날 날씨(맑음·흐림·비·눈)에 맞춰 바뀌어요.
        <br />
        지금은 <b>{mine ? '내 지역' : '서울'}</b> 날씨예요.
      </p>
      {mine ? (
        <button
          className="btn"
          style={{ textAlign: 'center' }}
          onClick={() => {
            clearMyPlace();
            setMine(false);
            setNote('서울 날씨로 바꿨어요');
          }}
        >
          서울 날씨로 되돌리기
        </button>
      ) : (
        <button
          className="btn"
          style={{ textAlign: 'center' }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNote(null);
            const r = await askMyPlace();
            setBusy(false);
            if (r.ok) {
              setMine(true);
              setNote('내 지역 날씨로 바꿨어요');
            } else setNote(r.reason);
          }}
        >
          {busy ? '위치를 받는 중…' : '내 지역 날씨로'}
        </button>
      )}
      <small className="muted" style={{ display: 'block', marginTop: 6 }}>
        위치는 약 10km 단위로만 기기에 남기고, 날씨를 물을 때만 날씨 서비스(Open-Meteo)에 보내요.
      </small>
      {note ? <p className="account-note">{note}</p> : null}
    </>
  );
}

/** 홈 화면에 설치해서 연 것인지. 설치해서 쓰면 브라우저가 기록을 덜 지운다. */
function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return (
    iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

interface Props {
  settings: Settings;
  onChangeSettings: (next: Settings) => void;
  onReset: () => void;
  onBack: () => void;
  /** 발표용 모음 — 삭제를 눌러도 진행·완료 화면만 보이고 기록은 지우지 않는다 */
  demo?: boolean;
  /** 처음 열 화면 (화면 모음에서 세부 화면을 바로 보려고) */
  initialPage?: SettingsPage;
}

function snapshot(): Snapshot {
  return {
    settings: loadSettings(),
    checkIns: loadCheckIns(),
    weeklySessions: loadWeeklySessions(),
    journal: loadJournal(),
    stampTotal: loadStampTotal(),
    closet: loadCloset(),
  };
}

/** 설정 안의 화면 (2026-11-27) — 목록과 네 세부 화면 */
export type SettingsPage = 'menu' | 'install' | 'account' | 'weather' | 'data';

/** 명세 9절 화면 13 */
export function SettingsScreen({
  onChangeSettings,
  onReset,
  onBack,
  demo = false,
  initialPage = 'menu',
}: Props) {
  const [page, setPage] = useState<SettingsPage>(initialPage);
  function openPage(next: SettingsPage) {
    setPage(next);
    setImportNote(null);
    setConfirmingReset(false);
    window.scrollTo({ top: 0 });
  }
  const [includeJournal, setIncludeJournal] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useState(loadLastExportAt);
  const [installed] = useState(isInstalled);
  const wipe = useProgress();
  const [wiped, setWiped] = useState(false);
  const wipedRef = useRef<HTMLDivElement>(null);
  // 지운 뒤 화면은 맨 위부터 보이게 (발표 틀 안에서 스크롤이 남아 있어도)
  useEffect(() => {
    if (wiped) wipedRef.current?.scrollIntoView({ block: 'start' });
  }, [wiped]);

  const showBackupNote = backupDue({
    lastExportAt: lastExport,
    oldestRecordAt: oldestRecordAt(),
    now: new Date(),
  });

  function exportJson() {
    const text = buildExport(snapshot(), includeJournal);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `퇴근길붕어빵-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const at = new Date().toISOString();
    saveLastExportAt(at);
    setLastExport(at);
  }

  async function importJson(file: File) {
    const raw = await file.text();
    const result = parseImport(raw, snapshot());
    if (!result.ok) {
      setImportNote(result.reason);
      return;
    }
    const { merged, added, skipped } = result;
    saveCheckIns(merged.checkIns);
    saveJournal(merged.journal);
    writeWeeklySessions(merged.weeklySessions);
    saveStampTotal(merged.stampTotal);
    saveCloset(merged.closet);
    if (merged.settings) {
      saveSettings(merged.settings);
      onChangeSettings(merged.settings);
    }
    const parts = [
      `체크인 ${added.checkIns}개`,
      `일기 ${added.journal}개`,
      `주간 회기 수 ${added.weeklySessions}개`,
    ];
    setImportNote(
      `${parts.join(', ')}를 더했어요.` +
        (skipped > 0 ? ` 모양이 맞지 않는 기록 ${skipped}개는 건너뛰었어요.` : ''),
    );
  }

  // 지운 뒤 화면 — 이 기기의 기록이 모두 사라졌다는 것을 확인시키고 처음으로 보낸다
  if (wiped) {
    return (
      // 아래 탭 막대까지 덮는다 — 지운 뒤에는 '처음 화면으로'로만 나간다
      <div className="app after-delete-screen" ref={wipedRef}>
        <div className="after-delete" role="status">
          <span className="after-delete-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" focusable="false">
              <path className="ad-can" d="M14 16 H34 L32 40 H16 Z" />
              <path className="ad-lid" d="M11 16 H37 M20 16 V12 H28 V16" />
              <path className="ad-check" d="M19 28 L23 32 L30 24" />
            </svg>
          </span>
          <h1>모두 지웠어요</h1>
          <p className="muted">
            이 기기의 체크인, 일기, 회기 수, 쿠폰 도장, 꾸민 직장인을 지우고 로그아웃했어요.
            <br />
            서버에 백업한 기록은 그대로 남아 있어요.
          </p>
        </div>
        <div className="spacer" />
        <button
          className="btn btn-primary"
          onClick={() => {
            if (demo) setWiped(false);
            else onReset();
          }}
        >
          처음 화면으로
        </button>
      </div>
    );
  }

  // 2026-11-27 — 설정을 제목 목록과 세부 화면으로 나눴다 (사용자 요청)
  if (page === 'menu') {
    const rows: { id: Exclude<SettingsPage, 'menu'>; label: string; dot?: boolean }[] = [
      { id: 'install', label: '홈 화면 추가' },
      { id: 'account', label: '기록 백업·동기화' },
      { id: 'weather', label: '인트로 날씨 지역' },
      { id: 'data', label: '데이터', dot: showBackupNote },
    ];
    return (
      <div className="app">
        <div className="topbar">
          <BackButton onClick={onBack} label="홈으로" />
          <span className="topbar-title">설정</span>
        </div>
        <h1>설정</h1>
        <nav className="my-list" aria-label="설정 메뉴">
          {rows.map((r) => (
            <button key={r.id} type="button" className="my-row" onClick={() => openPage(r.id)}>
              <span className="my-row-text">
                <b>{r.label}</b>
              </span>
              {r.dot ? <span className="my-dot" aria-label="살펴볼 것이 있어요" /> : null}
              <span className="my-chev" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <p className="muted" style={{ marginTop: 24 }}>
          가입하지 않으면 기록은 이 브라우저에만 남아요. 가입은 선택이에요.
        </p>
      </div>
    );
  }

  const TITLES: Record<Exclude<SettingsPage, 'menu'>, string> = {
    install: '홈 화면 추가',
    account: '기록 백업·동기화',
    weather: '인트로 날씨 지역',
    data: '데이터',
  };

  return (
    <div className="app">
      <div className="topbar">
        <BackButton onClick={() => openPage('menu')} label="설정으로" />
        <span className="topbar-title">{TITLES[page]}</span>
      </div>

      {page === 'install' ? (
        <>
          <h1>홈 화면 추가</h1>
          {installed ? (
            <p className="muted">이미 홈 화면에 추가해서 쓰고 있어요.</p>
          ) : null}
        </>
      ) : null}
      {page === 'account' ? <h1 className="sr-only">기록 백업·동기화</h1> : null}
      {page === 'weather' ? <h1 className="sr-only">인트로 날씨 지역</h1> : null}
      {page === 'data' ? <h1>데이터</h1> : null}

      {/* 명세 7.6 — 한 달 넘게 내보내지 않았으면 조용히 알린다 */}
      {page === 'data' && showBackupNote ? (
        <div className="card card-note">
          <p style={{ marginBottom: 0 }}>
            {lastExport
              ? `마지막 백업이 ${lastExport.slice(0, 10)}이에요.`
              : '아직 백업한 적이 없어요.'}{' '}
            기록은 이 기기에만 있어서, 기기를 잃어버리면 함께 사라져요. 아래
            ‘JSON 파일로 내보내기’로 백업할 수 있어요.
          </p>
        </div>
      ) : null}

      {/* 명세 7.6 — 브라우저 주소로 쓰면 기록이 지워질 수 있다.
          2026-11-27 제목 아래 내용을 아코디언으로 접었다. 같은 날 '홈 화면 추가' 화면으로 옮겼다. */}
      {page !== 'install' ? null : (
        <div className="card card-note">
          <p style={{ marginBottom: 8, fontWeight: 650 }}>
            {installed ? '다른 기기에서도 이렇게 추가하세요' : '홈 화면에 추가해서 쓰세요'}
          </p>
          <Accordion
            items={[
              {
                title: '왜 추가해야 하나요?',
                body: '브라우저 주소로만 쓰면, 오래 열지 않았을 때 브라우저가 기록을 지울 수 있어요. 설치해서 쓰면 이 일이 생기지 않아요.',
              },
              {
                title: '아이폰 사파리',
                body: '공유 버튼 → ‘홈 화면에 추가’',
              },
              {
                title: '안드로이드 크롬',
                body: '오른쪽 위 ⋮ → ‘홈 화면에 추가’ 또는 ‘앱 설치’',
              },
            ]}
          />
        </div>
      )}

      {/* 명세 7.7 — 선택 가입. 닉네임도 가입할 때 정한다 (예전 '표시 이름' 칸을 대신한다) */}
      {page === 'account' ? <AccountSection onChangeSettings={onChangeSettings} onReset={onReset} /> : null}

      {page === 'weather' ? <WeatherPlaceSection /> : null}

      {page === 'data' ? (
        <>
      <h2 style={{ marginTop: 22 }}>데이터 내보내기</h2>
      <p className="muted">
        백업하거나 기기를 바꿀 때 쓰세요.
        <br />
        파일은 이 기기에 저장되고 어디로도 전송되지 않아요.
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={includeJournal}
          onChange={(e) => setIncludeJournal(e.target.checked)}
        />
        <span>일기도 포함하기</span>
      </label>
      <button className="btn" style={{ textAlign: 'center' }} onClick={exportJson}>
        JSON 파일로 내보내기
      </button>

      <h2 style={{ marginTop: 22 }}>데이터 가져오기</h2>
      <p className="muted">
        내보낸 JSON 파일을 불러와요. 기존 기록을 지우지 않고 없는 것만 더해요.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importJson(file);
          e.target.value = '';
        }}
      />
      <button
        className="btn"
        style={{ textAlign: 'center' }}
        onClick={() => fileRef.current?.click()}
      >
        JSON 파일 고르기
      </button>
      {importNote ? (
        <p className="muted" style={{ marginTop: 10 }}>
          {importNote}
        </p>
      ) : null}

      <h2 style={{ marginTop: 22 }}>모든 데이터 삭제</h2>
      <p className="muted">
        이 기기의 체크인, 일기, 회기 수, 쿠폰 도장, 꾸민 직장인을 모두 지우고 로그아웃해요.
        되돌릴 수 없어요. 기관 공용 기기에서 쓰셨다면 나가기 전에 지우세요. 서버에 백업한
        기록은 남아요 — 서버 기록까지 지우려면 설정 → ‘기록 백업·동기화’의 ‘계정 삭제’를 쓰세요.
      </p>
      {/* 2026-11-27 — 전부 지우기 → 진행 막대 → 100% 가 되면 지운 뒤 화면(After delete) */}
      {wipe.pct !== null ? (
        <ProgressBar value={wipe.pct} label="지우는 중" tone="danger" />
      ) : confirmingReset ? (
        <div className="btn-row">
          <button
            className="btn"
            style={{ textAlign: 'center' }}
            onClick={() => setConfirmingReset(false)}
          >
            닫기
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              void (async () => {
                await wipe.fill(1200);
                // 발표 화면에서는 보여주기만 하고 실제 기록은 지우지 않는다
                if (!demo) clearAllData();
                wipe.clear();
                setWiped(true);
              })();
            }}
          >
            전부 지우기
          </button>
        </div>
      ) : (
        <button
          className="btn btn-danger"
          onClick={() => setConfirmingReset(true)}
        >
          모든 데이터 삭제
        </button>
      )}
        </>
      ) : null}

      <div className="spacer" />
    </div>
  );
}
