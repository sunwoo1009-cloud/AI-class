/**
 * 백업 알림 (명세 7.6).
 *
 * 기록은 이 기기 브라우저에만 있으므로, 기기 분실·브라우저 데이터 삭제에
 * 대비하는 방법은 내보내기 파일 하나뿐이다. 한 달 동안 내보내지 않았으면
 * 설정 화면에 조용히 알린다. 홈이나 체크인 흐름에는 띄우지 않는다.
 */
export const BACKUP_REMIND_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

function parse(iso: string | null): number | null {
  if (iso === null) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

export function backupDue({
  lastExportAt,
  oldestRecordAt,
  now,
}: {
  /** 마지막으로 내보낸 시각. 없으면 null */
  lastExportAt: string | null;
  /** 가장 오래된 체크인·일기 시각. 기록이 없으면 null */
  oldestRecordAt: string | null;
  now: Date;
}): boolean {
  const oldest = parse(oldestRecordAt);
  if (oldest === null) return false;

  // 내보낸 적이 없으면 첫 기록부터 센다
  const since = parse(lastExportAt) ?? oldest;
  return now.getTime() - since >= BACKUP_REMIND_DAYS * DAY_MS;
}
