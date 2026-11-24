/**
 * 발표용 화면 모음(?screens=1)에서 '앱으로 돌아가기'로 앱에 왔을 때,
 * 다시 발표 화면으로 돌아갈 수 있는 작은 버튼.
 *
 * 발표 화면에서 넘어온 경우에만 보인다 (sessionStorage — 탭을 닫으면 사라진다).
 * 앱을 그냥 쓰는 사람에게는 나타나지 않는다.
 */

const KEY = 'cbd:presentReturn';

/** 발표 화면 → 앱. 돌아올 주소(시트 번호 포함)를 기억해 둔다. */
export function leaveToApp(): void {
  try {
    sessionStorage.setItem(KEY, window.location.search);
  } catch {
    // 저장이 막혀 있으면 돌아오기 버튼만 안 보인다
  }
  window.location.search = '';
}

function savedSearch(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function ReturnToPresentation() {
  const saved = savedSearch();
  if (!saved) return null;
  if (new URLSearchParams(window.location.search).has('screens')) return null;

  return (
    <button
      className="present-return"
      onClick={() => {
        window.location.search = saved;
      }}
    >
      ← 발표 화면으로 돌아가기
    </button>
  );
}
