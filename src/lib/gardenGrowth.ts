import { GrowthStage, DiaryEntry, GrowthProfile } from "@/types/emotion";

// ============================================================
// 기본 성장 시간 상수 (fallback - intensity 없을 때 사용)
// 개발 테스트용 - 나중에 쉽게 조정 가능
// ============================================================

/** 씨앗 → 새싹 성장에 필요한 시간 (밀리초). 기본값: 6시간 */
export const SEED_TO_SPROUT_MS = 6 * 60 * 60 * 1000;

/** 새싹 → 꽃 성장에 필요한 시간 (밀리초). 기본값: 24시간 */
export const SPROUT_TO_BLOOM_MS = 24 * 60 * 60 * 1000;

// ============================================================
// 🌸 intensity(감정의 깊이) 기반 성장 규칙
// 감정이 깊을수록 성장 속도는 느리지만, 더 큰 꽃이 핌
// ============================================================

/**
 * intensity별 성장 프로필 테이블
 * intensity: 1(얕은 감정) ~ 5+ (매우 깊은 감정)
 * - intensity가 높을수록 seedToSproutMs / sproutToBloomMs 가 김
 * - intensity가 높을수록 bloomScale 이 큼 (꽃이 더 크게)
 */
export const INTENSITY_PROFILES: Record<number, GrowthProfile & { bloomScale: number }> = {
  1: {
    intensity: 1,
    seedToSproutMs: 10 * 60 * 1000,        // 10분
    sproutToBloomMs: 20 * 60 * 1000,       // 20분
    bloomScale: 0.85,
  },
  2: {
    intensity: 2,
    seedToSproutMs: 20 * 60 * 1000,        // 20분
    sproutToBloomMs: 40 * 60 * 1000,       // 40분
    bloomScale: 0.95,
  },
  3: {
    intensity: 3,
    seedToSproutMs: 40 * 60 * 1000,        // 40분
    sproutToBloomMs: 80 * 60 * 1000,       // 80분
    bloomScale: 1.05,
  },
  4: {
    intensity: 4,
    seedToSproutMs: 60 * 60 * 1000,        // 60분 (1시간)
    sproutToBloomMs: 180 * 60 * 1000,      // 180분 (3시간)
    bloomScale: 1.18,
  },
  5: {
    intensity: 5,
    seedToSproutMs: 120 * 60 * 1000,       // 120분 (2시간)
    sproutToBloomMs: 360 * 60 * 1000,      // 360분 (6시간)
    bloomScale: 1.3,
  },
};

/**
 * intensity 값을 1~5 범위로 정규화합니다.
 * 10까지 입력될 수 있지만 성장 규칙은 5단계로 그룹화합니다.
 */
function normalizeIntensity(intensity: number): number {
  const rounded = Math.round(intensity);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded;
}

/**
 * intensity에 해당하는 성장 프로필을 가져옵니다.
 * growthProfile이 이미 저장되어 있으면 그것을 우선 사용합니다.
 * 없으면 intensity 기준으로 생성합니다.
 */
export function getGrowthProfile(entry: DiaryEntry): GrowthProfile & { bloomScale: number } {
  const saved = entry.analysis.gardenReward.growthProfile;
  const savedBloomScale = entry.analysis.gardenReward.bloomScale;

  if (saved && savedBloomScale) {
    return { ...saved, bloomScale: savedBloomScale };
  }

  // intensity 가져오기 (analysis.intensity 또는 기본값 3)
  const intensity = normalizeIntensity(entry.analysis.intensity ?? 3);
  return INTENSITY_PROFILES[intensity] || INTENSITY_PROFILES[3];
}

/**
 * intensity에 해당하는 bloom scale을 가져옵니다.
 */
export function getBloomScale(entry: DiaryEntry): number {
  return getGrowthProfile(entry).bloomScale;
}

// ============================================================
// 성장 계산 함수
// ============================================================

/**
 * 기록의 심어진 시간을 가져옵니다.
 * plantedAt이 없으면 createdAt을 사용합니다 (기존 데이터 호환).
 */
function getPlantedTime(entry: DiaryEntry): number {
  const plantedAt = entry.analysis.gardenReward.plantedAt || entry.createdAt;
  return new Date(plantedAt).getTime();
}

/**
 * 단일 기록의 현재 growthStage를 계산합니다.
 * plantedAt, growthProfile(seedToSproutMs / sproutToBloomMs) 기준으로 자동 성장을 결정합니다.
 * @param entry 감정일기 기록
 * @param now 현재 시각 (테스트용, 기본값은 Date.now())
 */
export function calculateGrowthStage(
  entry: DiaryEntry,
  now: number = Date.now()
): GrowthStage | null {
  const plantedTime = getPlantedTime(entry);
  const elapsed = now - plantedTime;
  const currentStage = entry.analysis.gardenReward.growthStage || "seed";

  // 이미 꽃이면 성장 안 함
  if (currentStage === "bloom") {
    return null;
  }

  // intensity에 따른 성장 시간 가져오기
  const profile = getGrowthProfile(entry);
  const seedToSprout = profile.seedToSproutMs;
  const sproutToBloom = profile.sproutToBloomMs;

  // 새싹 → 꽃 체크 (seedToSprout + sproutToBloom 경과 시)
  if (elapsed >= seedToSprout + sproutToBloom) {
    return "bloom";
  }

  // 씨앗 → 새싹 체크 (seedToSprout 경과 시)
  if (elapsed >= seedToSprout) {
    if (currentStage === "seed") {
      return "sprout";
    }
  }

  return null; // 성장할 단계 없음
}

/**
 * 기록이 다음 단계로 성장하기까지 남은 시간을 계산합니다.
 */
export function getTimeUntilNextGrowth(
  entry: DiaryEntry,
  now: number = Date.now()
): {
  canGrow: boolean;
  nextStage: GrowthStage | null;
  remainingMs: number;
  remainingString: string;
} {
  const plantedTime = getPlantedTime(entry);
  const elapsed = now - plantedTime;
  const currentStage = entry.analysis.gardenReward.growthStage || "seed";
  const profile = getGrowthProfile(entry);

  if (currentStage === "bloom") {
    return {
      canGrow: false,
      nextStage: null,
      remainingMs: 0,
      remainingString: "이미 활짝 피었어요 🌸",
    };
  }

  if (currentStage === "seed") {
    const remaining = profile.seedToSproutMs - elapsed;
    if (remaining <= 0) {
      return {
        canGrow: true,
        nextStage: "sprout",
        remainingMs: 0,
        remainingString: "곧 새싹이 될 예정이에요 🌿",
      };
    }
    return {
      canGrow: false,
      nextStage: "sprout",
      remainingMs: remaining,
      remainingString: formatRemainingTime(remaining) + " 후 새싹이 될 거예요",
    };
  }

  // sprout
  const remaining = profile.sproutToBloomMs - (elapsed - profile.seedToSproutMs);
  if (remaining <= 0) {
    return {
      canGrow: true,
      nextStage: "bloom",
      remainingMs: 0,
      remainingString: "곧 꽃이 피어요 🌸",
    };
  }
  return {
    canGrow: false,
    nextStage: "bloom",
    remainingMs: remaining,
    remainingString: formatRemainingTime(remaining) + " 후 꽃이 필 거예요",
  };
}

/**
 * 남은 시간을 읽기 좋은 문자열로 포맷합니다.
 */
function formatRemainingTime(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `약 ${days}일`;
  }
  if (hours > 0) {
    return `약 ${hours}시간 ${minutes}분`;
  }
  return `약 ${minutes}분`;
}

/**
 * 감정 문구를 반환합니다.
 * intensity에 따라 감성적인 표현이 달라집니다.
 */
export function getGrowthStatusMessage(
  entry: DiaryEntry,
  now: number = Date.now()
): string {
  const stage = entry.analysis.gardenReward.growthStage || "seed";
  const { canGrow, nextStage, remainingString } = getTimeUntilNextGrowth(
    entry,
    now
  );
  const intensity = entry.analysis.intensity ?? 3;
  const deep = normalizeIntensity(intensity) >= 4;

  if (stage === "bloom") {
    return deep
      ? `${entry.analysis.gardenReward.name}이(가) 감정의 깊이만큼 크게 피어났어요 🌸`
      : `${entry.analysis.gardenReward.name}이(가) 활짝 피었어요! 🌸`;
  }

  if (canGrow) {
    return `${entry.analysis.gardenReward.name}이(가) 곧 ${nextStage === "sprout" ? "새싹" : "꽃"}으로 자랄 거예요!`;
  }

  // 깊은 감정은 천천히 자라는 문구
  if (deep) {
    return `깊은 마음이라 천천히 자라고 있어요. (${remainingString})`;
  }

  return remainingString;
}

/**
 * intensity에 따른 감성 문구를 반환합니다.
 * 분석 결과 화면이나 툴팁에 사용합니다.
 */
export function getIntensityMessage(intensity: number): string {
  const level = normalizeIntensity(intensity);
  if (level <= 1) {
    return "가벼운 마음은 금방 꽃으로 피어나요 🌼";
  }
  if (level === 2) {
    return "잔잔한 감정은 부드럽게 자라나 꽃이 돼요 🌿";
  }
  if (level === 3) {
    return "깊이 남은 감정이 서서히 큰 꽃으로 피어날 거예요 🌷";
  }
  if (level === 4) {
    return "깊은 감정은 천천히 자라나지만, 더 크게 꽃을 피워요 🌺";
  }
  return "가장 깊게 남은 감정이 가장 큰 꽃으로 오래 피어날 거예요 🌸";
}

// ============================================================
// 일괄 성장 처리
// ============================================================

/**
 * 여러 기록의 growthStage를 현재 시각 기준으로 일괄 계산합니다.
 * 성장할 기록만 선별하여 새로운 growthStage를 반환합니다.
 */
export function batchCalculateGrowth(
  entries: DiaryEntry[],
  now: number = Date.now()
): Map<string, GrowthStage> {
  const growthMap = new Map<string, GrowthStage>();

  for (const entry of entries) {
    const newStage = calculateGrowthStage(entry, now);
    if (newStage) {
      growthMap.set(entry.id, newStage);
    }
  }

  return growthMap;
}

/**
 * 기록 목록을 growthStage별로 분류합니다.
 */
export function groupEntriesByStage(entries: DiaryEntry[]): {
  seeds: DiaryEntry[];
  sprouts: DiaryEntry[];
  blooms: DiaryEntry[];
} {
  return {
    seeds: entries.filter((e) => (e.analysis.gardenReward.growthStage || "seed") === "seed"),
    sprouts: entries.filter((e) => e.analysis.gardenReward.growthStage === "sprout"),
    blooms: entries.filter((e) => e.analysis.gardenReward.growthStage === "bloom"),
  };
}

/**
 * 정원 상태를 요약합니다.
 */
export function summarizeGardenGrowth(entries: DiaryEntry[]): {
  total: number;
  seeds: number;
  sprouts: number;
  blooms: number;
  fullyBloomed: boolean;
} {
  const { seeds, sprouts, blooms } = groupEntriesByStage(entries);
  return {
    total: entries.length,
    seeds: seeds.length,
    sprouts: sprouts.length,
    blooms: blooms.length,
    fullyBloomed: entries.length > 0 && seeds.length === 0 && sprouts.length === 0,
  };
}