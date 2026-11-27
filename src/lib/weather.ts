/**
 * 인트로 날씨 (2026-11-27) — 그날 날씨에 맞춰 퇴근길 장면을 바꾼다: 맑음 · 흐림 · 비 · 눈.
 *
 * 날씨는 Open-Meteo(open-meteo.com)에서 받는다. 무료이고 키가 없어 비용이 들지 않는다.
 * - 위치는 기본으로 **서울**을 쓴다. 기기 위치를 묻지 않는다(인트로마다 권한 창이 뜨면 안 된다).
 * - 설정에서 '내 지역 날씨 쓰기'를 켜면 그때 한 번 위치를 묻고, **소수 첫째 자리(약 10km)로 뭉갠 좌표**만 기기에 둔다.
 * - 받은 날씨는 1시간 동안 기기에 두고 다시 묻지 않는다.
 * - 닿지 않으면(4초) 마지막으로 받은 날씨, 그것도 없으면 맑음으로 보여준다. 장면만 바뀌고 기능에는 영향이 없다.
 *
 * 확인용: `?weather=clear|cloudy|rain|snow`
 */

export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow';

export const WEATHERS: Weather[] = ['clear', 'cloudy', 'rain', 'snow'];

export const WEATHER_LABELS: Record<Weather, string> = {
  clear: '맑음',
  cloudy: '흐림',
  rain: '비',
  snow: '눈',
};

/** 서울 시청 근처 */
export const DEFAULT_PLACE = { lat: 37.57, lon: 126.98 };

export const WEATHER_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

const CACHE_KEY = 'cbd:weather';
const PLACE_KEY = 'cbd:weatherPlace';

/**
 * WMO 날씨 코드 → 네 가지.
 * 0·1 맑음 / 2·3·45·48 흐림(구름·안개) / 51~67·80~82·95~99 비(이슬비·어는 비·소나기·뇌우) / 71~77·85·86 눈
 */
export function weatherFromCode(code: number): Weather {
  if (code === 0 || code === 1) return 'clear';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  return 'cloudy';
}

export function parseWeatherOverride(search: string): Weather | null {
  const raw = new URLSearchParams(search).get('weather');
  return raw && (WEATHERS as string[]).includes(raw) ? (raw as Weather) : null;
}

/** 좌표를 소수 첫째 자리로 뭉갠다 (약 10km) */
export function coarse(n: number): number {
  return Math.round(n * 10) / 10;
}

interface Cached {
  kind: Weather;
  at: string;
  lat: number;
  lon: number;
  /** 그날 일몰 시각 — 그 지역 시각 "YYYY-MM-DDTHH:mm" (2026-11-27) */
  sunset?: string;
}

/** 저장해 둔 날씨가 아직 쓸 만한가 (같은 곳, 1시간 안) */
export function cacheFresh(c: Cached | null, place: { lat: number; lon: number }, now: Date = new Date()): boolean {
  if (!c || !(WEATHERS as string[]).includes(c.kind)) return false;
  const t = new Date(c.at).getTime();
  if (Number.isNaN(t)) return false;
  return c.lat === place.lat && c.lon === place.lon && now.getTime() - t < WEATHER_TTL_MS && now.getTime() >= t;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 설정에서 고른 지역 — 없으면 서울 */
export function loadWeatherPlace(): { lat: number; lon: number; mine: boolean } {
  const p = readJson<{ lat: number; lon: number }>(PLACE_KEY);
  if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) return { lat: p.lat, lon: p.lon, mine: true };
  return { ...DEFAULT_PLACE, mine: false };
}

/** 지금 저장된 날씨 (시간이 지났어도) — 받기 전 첫 화면에 쓴다 */
export function lastWeather(): Weather {
  const c = readJson<Cached>(CACHE_KEY);
  return c && (WEATHERS as string[]).includes(c.kind) ? c.kind : 'clear';
}

/** 노을로 바꾸는 때 — 일몰 이만큼 전부터 (해가 기울며 하늘이 물드는 때) */
export const DUSK_BEFORE_MIN = 40;

/**
 * 지금이 노을(저녁) 장면인가 — 실제 일몰 기준 (순수 함수, 2026-11-27).
 * sunset 이 오늘 것이면 "일몰 40분 전 ~ 자정", 없거나 다른 날 것이면 null (부르는 쪽이 옛 기준 17시를 쓴다).
 * sunset 은 그 지역 시각 "YYYY-MM-DDTHH:mm" — 기기 시각으로 읽는다(같은 나라 안이라 같다).
 */
export function duskBySunset(sunset: string | undefined, now: Date): boolean | null {
  if (!sunset) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(sunset);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y !== now.getFullYear() || mo !== now.getMonth() + 1 || d !== now.getDate()) return null;
  const at = new Date(y, mo - 1, d, h, mi).getTime() - DUSK_BEFORE_MIN * 60 * 1000;
  return now.getTime() >= at;
}

/** 저장해 둔 오늘 일몰 시각 (없으면 undefined) */
export function cachedSunset(): string | undefined {
  return readJson<Cached>(CACHE_KEY)?.sunset;
}

/** 오늘 날씨. 1시간 안에 받은 게 있으면 그걸 쓰고, 없으면 Open-Meteo 에 묻는다. */
export async function fetchWeather(): Promise<Weather> {
  const place = loadWeatherPlace();
  const cached = readJson<Cached>(CACHE_KEY);
  if (cached && cacheFresh(cached, place)) return cached.kind;

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // 같은 요청에 그날 일몰 시각도 받는다 — 노점이 실제 해 질 녘에 노을로 바뀌게 (요청 수는 늘지 않는다)
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
      '&current=weather_code&daily=sunset&forecast_days=1&timezone=auto';
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return lastWeather();
    const data = (await r.json()) as { current?: { weather_code?: unknown }; daily?: { sunset?: unknown[] } };
    const code = data.current?.weather_code;
    if (typeof code !== 'number') return lastWeather();
    const kind = weatherFromCode(code);
    const ss = data.daily?.sunset?.[0];
    const sunset = typeof ss === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(ss) ? ss.slice(0, 16) : undefined;
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          kind,
          at: new Date().toISOString(),
          lat: place.lat,
          lon: place.lon,
          sunset,
        } satisfies Cached),
      );
    } catch {
      // 저장 못 해도 이번 장면에는 쓴다
    }
    return kind;
  } catch {
    return lastWeather();
  } finally {
    window.clearTimeout(timer);
  }
}

/** 설정 '내 지역 날씨 쓰기' — 위치를 한 번 묻고 뭉갠 좌표만 남긴다 */
export function askMyPlace(): Promise<{ ok: true } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, reason: '이 브라우저는 위치를 알려 주지 않아요' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem(
            PLACE_KEY,
            JSON.stringify({ lat: coarse(pos.coords.latitude), lon: coarse(pos.coords.longitude) }),
          );
          localStorage.removeItem(CACHE_KEY);
        } catch {
          // 저장 못 하면 서울 그대로
        }
        resolve({ ok: true });
      },
      () => resolve({ ok: false, reason: '위치를 받지 못했어요. 브라우저에서 위치 허용을 확인해 주세요' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60 * 60 * 1000 },
    );
  });
}

/** 다시 서울로 */
export function clearMyPlace(): void {
  try {
    localStorage.removeItem(PLACE_KEY);
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // 무시
  }
}
