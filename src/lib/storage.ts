import { DiaryEntry, WateringLog, GardenState, GrowthStage, FlowerPosition, GrowthProfile } from "@/types/emotion";
import { calculateGrowthStage, batchCalculateGrowth, INTENSITY_PROFILES } from "./gardenGrowth";

const STORAGE_KEY = "emotion-garden-entries";
const WATERING_KEY = "emotion-garden-watering";

// ============================================================
// 기록 관련
// ============================================================

/**
 * 기존 기록에 growthProfile/bloomScale이 없으면 intensity 기준으로 생성합니다.
 */
function ensureGrowthProfile(entry: DiaryEntry): DiaryEntry {
  const { analysis } = entry;
  const { gardenReward } = analysis;

  if (gardenReward.growthProfile && gardenReward.bloomScale != null) {
    return entry;
  }

  const rawIntensity = analysis.intensity ?? 3;
  const normalizedIntensity = Math.min(5, Math.max(1, Math.ceil(rawIntensity / 2)));
  const profile = INTENSITY_PROFILES[normalizedIntensity];
  const { bloomScale, ...growthProfile } = profile;

  return {
    ...entry,
    analysis: {
      ...analysis,
      gardenReward: {
        ...gardenReward,
        growthProfile,
        bloomScale,
      },
    },
  };
}

/**
 * 랜덤 위치를 생성합니다.
 * 기존 데이터 호환: position이 없으면 자동 생성
 */
export function generateRandomPosition(existingPositions: FlowerPosition[] = []): FlowerPosition {
  const x = Math.random() * 80 + 8; // 8~88
  const y = Math.random() * 40 + 45; // 45~85
  const scale = Math.random() * 0.4 + 0.85; // 0.85~1.25
  const rotation = (Math.random() - 0.5) * 20; // -10~10
  const zIndex = Math.floor(y); // y 값 기반

  return { x, y, scale, rotation, zIndex };
}

/**
 * 모든 감정일기 기록을 가져옵니다.
 * 기존 데이터 호환: growthStage/plantedAt/position/growthProfile/bloomScale 없으면 자동 생성
 */
export function getEntries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const entries: DiaryEntry[] = JSON.parse(data);
    const positions: FlowerPosition[] = [];
    // 기존 데이터에 필수 필드가 없으면 기본값 적용 + growthProfile/bloomScale 보장
    return entries
      .map((entry) => {
        const position = entry.analysis.gardenReward.position || generateRandomPosition(positions);
        positions.push(position);
        return {
          ...entry,
          analysis: {
            ...entry.analysis,
            gardenReward: {
              ...entry.analysis.gardenReward,
              growthStage: entry.analysis.gardenReward.growthStage || "seed",
              plantedAt: entry.analysis.gardenReward.plantedAt || entry.createdAt,
              position,
            },
          },
        };
      })
      .map((entry) => ensureGrowthProfile(entry));
  } catch {
    return [];
  }
}

/**
 * 새로운 감정일기 기록을 저장합니다.
 */
export function saveEntry(entry: DiaryEntry): void {
  if (typeof window === "undefined") return;
  const entries = getEntries();
  entries.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * 특정 날짜의 기록들을 가져옵니다.
 */
export function getEntriesByDate(date: string): DiaryEntry[] {
  const entries = getEntries();
  return entries.filter((entry) => entry.createdAt.startsWith(date));
}

/**
 * 오늘 날짜의 기록들을 가져옵니다.
 */
export function getTodayEntries(): DiaryEntry[] {
  const today = new Date().toISOString().split("T")[0];
  return getEntriesByDate(today);
}

/**
 * 특정 기록의 growthStage를 업데이트합니다.
 */
export function updateEntryGrowthStage(
  entryId: string,
  newStage: GrowthStage
): void {
  if (typeof window === "undefined") return;
  const entries = getEntries();
  const now = new Date().toISOString();
  const updatedEntries = entries.map((entry) => {
    if (entry.id === entryId) {
      return {
        ...entry,
        analysis: {
          ...entry.analysis,
          gardenReward: {
            ...entry.analysis.gardenReward,
            growthStage: newStage,
            lastGrowthAt: now,
          },
        },
      };
    }
    return entry;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
}

/**
 * 특정 기록의 위치를 업데이트합니다.
 * 사용자가 꽃을 드래그하여 배치한 위치를 저장합니다.
 */
export function updateEntryPosition(
  entryId: string,
  position: FlowerPosition
): void {
  if (typeof window === "undefined") return;
  const entries = getEntries();
  const updatedEntries = entries.map((entry) => {
    if (entry.id === entryId) {
      return {
        ...entry,
        analysis: {
          ...entry.analysis,
          gardenReward: {
            ...entry.analysis.gardenReward,
            position,
          },
        },
      };
    }
    return entry;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
}

// ============================================================
// 자동 성장 관련
// ============================================================

/**
 * 저장된 모든 기록의 자동 성장을 계산하고 업데이트합니다.
 * 앱 실행 시 또는 마음정원 화면 진입 시 호출되어야 합니다.
 * @returns 성장된 기록의 수
 */
export function applyAutoGrowth(): number {
  if (typeof window === "undefined") return 0;

  const entries = getEntries();
  const growthMap = batchCalculateGrowth(entries);

  if (growthMap.size === 0) return 0;

  const now = new Date().toISOString();
  const updatedEntries = entries.map((entry) => {
    const newStage = growthMap.get(entry.id);
    if (newStage) {
      return {
        ...entry,
        analysis: {
          ...entry.analysis,
          gardenReward: {
            ...entry.analysis.gardenReward,
            growthStage: newStage,
            lastGrowthAt: now,
          },
        },
      };
    }
    return entry;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
  return growthMap.size;
}

/**
 * 자동 성장 후의 엔트리 목록을 반환합니다 (즉시 반영).
 */
export function getEntriesWithGrowth(): DiaryEntry[] {
  const entries = getEntries();
  const now = Date.now();

  return entries.map((entry) => {
    const newStage = calculateGrowthStage(entry, now);
    if (newStage) {
      return {
        ...entry,
        analysis: {
          ...entry.analysis,
          gardenReward: {
            ...entry.analysis.gardenReward,
            growthStage: newStage,
          },
        },
      };
    }
    return entry;
  });
}

// ============================================================
// 물 주기 관련
// ============================================================

/**
 * 마지막 물 준 날짜를 가져옵니다.
 */
export function getWateringLog(): WateringLog {
  if (typeof window === "undefined") return { lastWateredDate: "" };
  const data = localStorage.getItem(WATERING_KEY);
  if (!data) return { lastWateredDate: "" };
  try {
    return JSON.parse(data);
  } catch {
    return { lastWateredDate: "" };
  }
}

/**
 * 물 준 날짜를 저장합니다.
 */
export function saveWateringLog(log: WateringLog): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WATERING_KEY, JSON.stringify(log));
}

/**
 * 오늘 물을 주었는지 확인합니다.
 */
export function hasWateredToday(): boolean {
  const today = new Date().toISOString().split("T")[0];
  const log = getWateringLog();
  return log.lastWateredDate === today;
}

/**
 * 오늘 물을 줍니다.
 * 자동 성장 먼저 적용한 후, 가장 오래된 seed를 sprout으로,
 * 또는 가장 오래된 sprout을 bloom으로 바꿉니다.
 * 물 주기는 자동 성장을 보완하는 보조 기능입니다.
 */
export function waterGarden(): { success: boolean; message: string } {
  if (hasWateredToday()) {
    return { success: false, message: "오늘은 이미 물을 주었어요. 💧" };
  }

  // 자동 성장 먼저 적용
  applyAutoGrowth();

  const entries = getEntries();

  // growthStage 기준으로 필터 (자동 성장 후 최신 상태)
  const seeds = entries
    .filter((e) => e.analysis.gardenReward.growthStage === "seed")
    .sort((a, b) => {
      const aTime = new Date(
        a.analysis.gardenReward.plantedAt || a.createdAt
      ).getTime();
      const bTime = new Date(
        b.analysis.gardenReward.plantedAt || b.createdAt
      ).getTime();
      return aTime - bTime;
    });

  if (seeds.length > 0) {
    updateEntryGrowthStage(seeds[0].id, "sprout");
    saveWateringLog({ lastWateredDate: new Date().toISOString().split("T")[0] });
    return { success: true, message: `${seeds[0].analysis.gardenReward.name} 씨앗이 새싹으로 자랐어요! 🌿` };
  }

  const sprouts = entries
    .filter((e) => e.analysis.gardenReward.growthStage === "sprout")
    .sort((a, b) => {
      const aTime = new Date(
        a.analysis.gardenReward.plantedAt || a.createdAt
      ).getTime();
      const bTime = new Date(
        b.analysis.gardenReward.plantedAt || b.createdAt
      ).getTime();
      return aTime - bTime;
    });

  if (sprouts.length > 0) {
    updateEntryGrowthStage(sprouts[0].id, "bloom");
    saveWateringLog({ lastWateredDate: new Date().toISOString().split("T")[0] });
    return { success: true, message: `${sprouts[0].analysis.gardenReward.name} 새싹이 꽃으로 피었어요! ${sprouts[0].analysis.gardenReward.emoji}` };
  }

  // 모두 bloom이면
  return {
    success: false,
    message: "오늘은 정원이 이미 활짝 피어 있어요. 🌺",
  };
}

// ============================================================
// 정원 상태 계산
// ============================================================

/**
 * 연속 기록일을 계산합니다.
 */
function calculateConsecutiveDays(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;

  const uniqueDates = [...new Set(entries.map((e) => e.createdAt.split("T")[0]))];
  uniqueDates.sort((a, b) => b.localeCompare(a)); // 최신순

  let consecutiveDays = 1;
  const today = new Date().toISOString().split("T")[0];

  // 오늘 기록이 없으면 0부터 시작
  if (uniqueDates[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    if (uniqueDates[0] !== yesterdayStr) {
      return 0;
    }
    consecutiveDays = 1;
  }

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const next = new Date(uniqueDates[i + 1]);
    const diffTime = current.getTime() - next.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  return consecutiveDays;
}

/**
 * 정원 단계 정보를 반환합니다.
 */
function getGardenLevel(totalEntries: number): { level: string; emoji: string } {
  if (totalEntries >= 30) return { level: "마음정원", emoji: "🏡" };
  if (totalEntries >= 15) return { level: "햇살 정원", emoji: "☀️" };
  if (totalEntries >= 7) return { level: "포근한 꽃밭", emoji: "🌷" };
  if (totalEntries >= 3) return { level: "작은 마음정원", emoji: "🌱" };
  return { level: "작은 화분", emoji: "🪴" };
}

/**
 * 현재 정원 상태를 계산합니다.
 * 자동 성장을 먼저 적용한 후 상태를 반환합니다.
 */
export function getGardenState(): GardenState {
  // 자동 성장 적용 후 가져오기
  applyAutoGrowth();
  const entries = getEntries();
  const totalEntries = entries.length;

  const seedCount = entries.filter((e) => e.analysis.gardenReward.growthStage === "seed").length;
  const sproutCount = entries.filter((e) => e.analysis.gardenReward.growthStage === "sprout").length;
  const bloomCount = entries.filter((e) => e.analysis.gardenReward.growthStage === "bloom").length;

  const consecutiveDays = calculateConsecutiveDays(entries);
  const { level, emoji } = getGardenLevel(totalEntries);

  return {
    totalEntries,
    seedCount,
    sproutCount,
    bloomCount,
    consecutiveDays,
    gardenLevel: level,
    gardenEmoji: emoji,
  };
}

/**
 * 모든 기록을 삭제합니다. (테스트용)
 */
export function clearEntries(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(WATERING_KEY);
}