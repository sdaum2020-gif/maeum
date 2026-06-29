const CACHE_KEY = "mindGardenDailySentences";

interface DailySentenceCache {
  entrySignature: string;
  dailySentence: string;
  createdAt: string;
}

/**
 * 특정 날짜의 기록 id들을 조합해서 signature 문자열을 만듭니다.
 * (기록이 추가/변경되면 signature가 달라져 재생성됩니다.)
 */
export function buildEntrySignature(ids: string[]): string {
  return ids.join("-");
}

function readCache(): Record<string, DailySentenceCache> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, DailySentenceCache>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/**
 * 캐시된 daily sentence가 있으면 반환하고, 없거나 signature가 다르면 null을 반환합니다.
 */
export function getCachedDailySentence(
  dateKey: string,
  entrySignature: string
): string | null {
  const cache = readCache();
  const entry = cache[dateKey];
  if (!entry) return null;
  if (entry.entrySignature !== entrySignature) return null;
  if (!entry.dailySentence || entry.dailySentence.trim().length === 0) return null;
  return entry.dailySentence;
}

/**
 * 특정 날짜의 daily sentence를 캐시에 저장합니다.
 */
export function saveDailySentenceToCache(
  dateKey: string,
  entrySignature: string,
  dailySentence: string
): void {
  const cache = readCache();
  cache[dateKey] = {
    entrySignature,
    dailySentence,
    createdAt: new Date().toISOString(),
  };
  writeCache(cache);
}

/**
 * 특정 날짜의 daily sentence 캐시를 무효화합니다.
 * 기록 삭제 시 해당 날짜의 캐시를 제거합니다.
 * @param dateKey 삭제할 날짜의 키 (YYYY-MM-DD 형식)
 */
export function invalidateDailySentenceCache(dateKey: string): void {
  if (typeof window === "undefined") return;
  const cache = readCache();
  if (cache[dateKey]) {
    delete cache[dateKey];
    writeCache(cache);
  }
}
