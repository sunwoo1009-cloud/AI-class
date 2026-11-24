import { describe, expect, it } from 'vitest';
import { BACKUP_REMIND_DAYS, backupDue } from './backup';

const now = new Date('2026-11-24T12:00:00.000Z');
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe('backupDue — 백업 알림을 띄울지', () => {
  it('기록이 하나도 없으면 띄우지 않는다', () => {
    expect(backupDue({ lastExportAt: null, oldestRecordAt: null, now })).toBe(false);
  });

  it('내보낸 적 없어도 기록이 쌓인 지 한 달이 안 됐으면 띄우지 않는다', () => {
    expect(
      backupDue({ lastExportAt: null, oldestRecordAt: daysAgo(10), now }),
    ).toBe(false);
  });

  it('내보낸 적 없고 첫 기록이 한 달 넘었으면 띄운다', () => {
    expect(
      backupDue({
        lastExportAt: null,
        oldestRecordAt: daysAgo(BACKUP_REMIND_DAYS),
        now,
      }),
    ).toBe(true);
  });

  it('최근에 내보냈으면 띄우지 않는다', () => {
    expect(
      backupDue({ lastExportAt: daysAgo(5), oldestRecordAt: daysAgo(90), now }),
    ).toBe(false);
  });

  it('마지막으로 내보낸 지 한 달이 넘었으면 띄운다', () => {
    expect(
      backupDue({
        lastExportAt: daysAgo(BACKUP_REMIND_DAYS + 1),
        oldestRecordAt: daysAgo(90),
        now,
      }),
    ).toBe(true);
  });

  it('날짜가 망가져 있으면 내보낸 적 없는 것으로 본다', () => {
    expect(
      backupDue({ lastExportAt: '아무거나', oldestRecordAt: daysAgo(40), now }),
    ).toBe(true);
  });
});
