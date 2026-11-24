/**
 * 운영자 화면(?admin=1)의 서버 쪽 호출. 서버 규칙: supabase/admin.sql
 *
 * 운영자인지는 서버가 판단한다(admins 표 + is_admin()). 이 코드를 누가 열어 봐도
 * 운영자 계정으로 로그인하지 않으면 숫자도, 피드백 지우기도 거절된다.
 * 개인별 기록은 여기서 다루지 않는다 — 숫자만.
 */
import { client, friendlyError } from './account';

export interface AdminStats {
  users: number;
  users_7d: number;
  synced_users: number;
  checkins: number;
  checkins_7d: number;
  journal_users: number;
  journals: number;
  feedback: number;
}

export type AdminCheck = 'not-signed-in' | 'not-admin' | 'admin' | 'not-set-up';

export async function checkAdmin(): Promise<AdminCheck> {
  const sb = await client();
  const { data: sess } = await sb.auth.getSession();
  if (!sess.session) return 'not-signed-in';
  const { data, error } = await sb.rpc('is_admin');
  // 함수가 없으면 admin.sql 을 아직 실행하지 않은 것
  if (error) return error.message.includes('is_admin') ? 'not-set-up' : 'not-admin';
  return data === true ? 'admin' : 'not-admin';
}

export async function loadAdminStats(): Promise<{ ok: true; stats: AdminStats } | { ok: false; reason: string }> {
  const sb = await client();
  const { data, error } = await sb.rpc('admin_stats');
  if (error) return { ok: false, reason: friendlyError(error.message) };
  return { ok: true, stats: data as AdminStats };
}

export async function deleteFeedbackItem(id: number): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sb = await client();
  const { error, count } = await sb.from('feedback').delete({ count: 'exact' }).eq('id', id);
  if (error) return { ok: false, reason: friendlyError(error.message) };
  if (count === 0) return { ok: false, reason: '지우지 못했어요 (운영자 권한을 확인해 주세요)' };
  return { ok: true };
}
