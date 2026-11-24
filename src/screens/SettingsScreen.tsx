import { useRef, useState } from 'react';
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

/** 명세 9절 화면 13 */
export function SettingsScreen({
  settings,
  onChangeSettings,
  onReset,
  onBack,
}: Props) {
  const [name, setName] = useState(settings.displayName);
  const [nameSaved, setNameSaved] = useState(false);
  const [includeJournal, setIncludeJournal] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useState(loadLastExportAt);
  const [installed] = useState(isInstalled);

  const trimmed = name.trim();
  const showBackupNote = backupDue({
    lastExportAt: lastExport,
    oldestRecordAt: oldestRecordAt(),
    now: new Date(),
  });

  function saveName() {
    if (trimmed.length === 0) return;
    const next = { ...settings, displayName: trimmed };
    saveSettings(next);
    onChangeSettings(next);
    setNameSaved(true);
  }

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

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn-quiet" onClick={onBack}>
          홈으로
        </button>
        <span className="topbar-title">설정</span>
      </div>

      {/* 명세 7.6 — 한 달 넘게 내보내지 않았으면 조용히 알린다 */}
      {showBackupNote ? (
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

      {/* 명세 7.6 — 브라우저 주소로 쓰면 기록이 지워질 수 있다 */}
      {installed ? null : (
        <div className="card card-note">
          <p style={{ marginBottom: 8, fontWeight: 650 }}>
            홈 화면에 추가해서 쓰세요
          </p>
          <p className="muted" style={{ marginBottom: 6 }}>
            브라우저 주소로만 쓰면, 오래 열지 않았을 때 브라우저가 기록을 지울 수
            있어요. 설치해서 쓰면 이 일이 생기지 않아요.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            아이폰 사파리: 공유 버튼 → ‘홈 화면에 추가’
            <br />
            안드로이드 크롬: 오른쪽 위 ⋮ → ‘홈 화면에 추가’ 또는 ‘앱 설치’
          </p>
        </div>
      )}

      <h2>표시 이름</h2>
      <p className="muted">자기 거리두기 기법에서 이름을 부를 때 써요.</p>
      <div className="btn-row" style={{ marginBottom: 22 }}>
        <input
          className="btn"
          type="text"
          value={name}
          maxLength={20}
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
            setNameSaved(false);
          }}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary"
          style={{ width: 'auto', padding: '16px 20px' }}
          disabled={trimmed.length === 0 || trimmed === settings.displayName}
          onClick={saveName}
        >
          {nameSaved ? '저장됨' : '저장'}
        </button>
      </div>

      <h2>데이터 내보내기</h2>
      <p className="muted">
        백업하거나 기기를 바꿀 때 쓰세요. 파일은 이 기기에 저장되고 어디로도 전송되지 않아요.
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
        체크인, 일기, 회기 수, 쿠폰 도장, 꾸민 직장인, 표시 이름을 모두 지워요. 되돌릴 수 없어요. 기관
        공용 기기에서 쓰셨다면 나가기 전에 지우세요.
      </p>
      {confirmingReset ? (
        <div className="btn-row">
          <button
            className="btn"
            style={{ textAlign: 'center' }}
            onClick={() => setConfirmingReset(false)}
          >
            그만두기
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              clearAllData();
              onReset();
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

      <div className="spacer" />
      <p className="muted" style={{ marginTop: 24 }}>
        이 앱은 계정도 서버도 쓰지 않아요. 기록은 이 브라우저에만 남아요.
      </p>
    </div>
  );
}
