import { WaterState, DailyRewardHistory } from "@/types/emotion";

// ============================================================
// 상수
// ============================================================

const WATER_STATE_KEY = "mindGardenWaterState";

/** 하루 기본 물방울 */
export const DAILY_BASE_WATER = 1;

/** 감정기록 보상 (첫 기록, 두 번째 기록 각 1개) */
export const ENTRY_REWARD_WATER = 1;

/** 깊은 마음 기록 보상 */
export const DEEP_EMOTION_REWARD_WATER = 1;

/** 리포트 확인 보상 */
export const REPORT_REWARD_WATER = 1;

/** 하루 최대 물방울 (기본 + 행동 보상) */
export const DAILY_MAX_WATER_DROPS = 4;

/** 깊은 마음 기준 intensity */
export const DEEP_EMOTION_THRESHOLD = 4;

// ============================================================
// 유틸리티
// ============================================================

/** 오늘 날짜 키를 반환합니다. (YYYY-MM-DD 형식) */
export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/** 빈 보상 히스토리를 생성합니다. */
function createEmptyDailyHistory(): DailyRewardHistory {
  return {
    dailyBaseClaimed: false,
    firstEntryRewardClaimed: false,
    secondEntryRewardClaimed: false,
    reportRewardClaimed: false,
    deepEmotionRewardClaimed: false,
  };
}

// ============================================================
// 상태 관리
// ============================================================

/** 물방울 상태를 가져옵니다. */
export function getWaterState(): WaterState {
  if (typeof window === "undefined") {
    return { waterDrops: 0, rewardHistory: {} };
  }
  const data = localStorage.getItem(WATER_STATE_KEY);
  if (!data) {
    return { waterDrops: 0, rewardHistory: {} };
  }
  try {
    return JSON.parse(data);
  } catch {
    return { waterDrops: 0, rewardHistory: {} };
  }
}

/** 물방울 상태를 저장합니다. */
export function saveWaterState(state: WaterState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WATER_STATE_KEY, JSON.stringify(state));
}

/** 오늘 날짜의 보상 히스토리를 가져옵니다. */
export function getTodayRewardHistory(): DailyRewardHistory {
  const state = getWaterState();
  const todayKey = getTodayKey();
  return state.rewardHistory[todayKey] || createEmptyDailyHistory();
}

/** 오늘 날짜의 보상 히스토리를 업데이트합니다. */
function updateTodayRewardHistory(history: DailyRewardHistory): void {
  const state = getWaterState();
  const todayKey = getTodayKey();
  state.rewardHistory[todayKey] = history;
  saveWaterState(state);
}

/** 현재 보유 물방울 개수를 가져옵니다. */
export function getWaterDrops(): number {
  return getWaterState().waterDrops;
}

/** 물방울을 추가합니다. */
function addWaterDrops(amount: number): void {
  const state = getWaterState();
  state.waterDrops += amount;
  saveWaterState(state);
}

/** 물방울을 사용합니다. */
function useWaterDrops(amount: number): boolean {
  const state = getWaterState();
  if (state.waterDrops < amount) return false;
  state.waterDrops -= amount;
  saveWaterState(state);
  return true;
}

// ============================================================
// 보상 지급 함수
// ============================================================

/** 보상 지급 결과 */
export interface RewardResult {
  success: boolean;
  message: string;
  dropsAdded: number;
}

/**
 * 하루 기본 물방울을 받습니다.
 * @returns 보상 결과
 */
export function claimDailyWater(): RewardResult {
  const history = getTodayRewardHistory();

  if (history.dailyBaseClaimed) {
    return {
      success: false,
      message: "오늘의 물방울을 이미 받았어요.",
      dropsAdded: 0,
    };
  }

  history.dailyBaseClaimed = true;
  updateTodayRewardHistory(history);
  addWaterDrops(DAILY_BASE_WATER);

  return {
    success: true,
    message: "오늘의 마음정원에 물방울이 도착했어요. 💧",
    dropsAdded: DAILY_BASE_WATER,
  };
}

/**
 * 감정기록 보상을 지급합니다.
 * 하루 첫 기록: +1, 두 번째 기록: +1, 세 번째부터: 0
 * @param todayEntryCount 오늘 작성한 기록 수 (보상 지급 전 기준)
 * @returns 보상 결과
 */
export function grantEntryReward(todayEntryCount: number): RewardResult {
  const history = getTodayRewardHistory();

  // 첫 번째 기록 보상
  if (todayEntryCount === 0 && !history.firstEntryRewardClaimed) {
    history.firstEntryRewardClaimed = true;
    updateTodayRewardHistory(history);
    addWaterDrops(ENTRY_REWARD_WATER);
    return {
      success: true,
      message: "오늘 마음을 처음 들여다봤어요. 물방울 1개를 받았어요. 💧",
      dropsAdded: ENTRY_REWARD_WATER,
    };
  }

  // 두 번째 기록 보상
  if (todayEntryCount === 1 && !history.secondEntryRewardClaimed) {
    history.secondEntryRewardClaimed = true;
    updateTodayRewardHistory(history);
    addWaterDrops(ENTRY_REWARD_WATER);
    return {
      success: true,
      message: "오늘의 마음을 한 번 더 살펴봤어요. 물방울 1개를 받았어요. 💧",
      dropsAdded: ENTRY_REWARD_WATER,
    };
  }

  // 세 번째 기록부터는 보상 없음
  return {
    success: false,
    message: "오늘의 기록 보상은 모두 받았어요.",
    dropsAdded: 0,
  };
}

/**
 * 깊은 마음 기록 보상을 지급합니다.
 * intensity >= 4일 때 하루 1회만 지급
 * @param intensity 감정 강도
 * @returns 보상 결과
 */
export function grantDeepEmotionReward(intensity: number): RewardResult {
  if (intensity < DEEP_EMOTION_THRESHOLD) {
    return {
      success: false,
      message: "",
      dropsAdded: 0,
    };
  }

  const history = getTodayRewardHistory();

  if (history.deepEmotionRewardClaimed) {
    return {
      success: false,
      message: "깊은 마음 보상은 오늘 이미 받았어요.",
      dropsAdded: 0,
    };
  }

  history.deepEmotionRewardClaimed = true;
  updateTodayRewardHistory(history);
  addWaterDrops(DEEP_EMOTION_REWARD_WATER);

  return {
    success: true,
    message: "깊은 마음을 꺼내어 기록했어요. 정원이 물방울을 선물했어요. 💧",
    dropsAdded: DEEP_EMOTION_REWARD_WATER,
  };
}

/**
 * 오늘 리포트 확인 보상을 지급합니다.
 * @returns 보상 결과
 */
export function claimReportReward(): RewardResult {
  const history = getTodayRewardHistory();

  if (history.reportRewardClaimed) {
    return {
      success: false,
      message: "오늘의 리포트 보상은 이미 받았어요.",
      dropsAdded: 0,
    };
  }

  history.reportRewardClaimed = true;
  updateTodayRewardHistory(history);
  addWaterDrops(REPORT_REWARD_WATER);

  return {
    success: true,
    message: "오늘의 마음을 정리했어요. 물방울 1개를 받았어요. 💧",
    dropsAdded: REPORT_REWARD_WATER,
  };
}

// ============================================================
// 물방울 사용
// ============================================================

/** 물방울 사용 결과 */
export interface UseWaterResult {
  success: boolean;
  message: string;
  targetId?: string;
  targetName?: string;
  fromStage?: string;
  toStage?: string;
}

/**
 * 물방울 1개를 사용하여 가장 오래된 seed/sprout을 성장시킵니다.
 * @returns 사용 결과
 */
export function useWaterDropOnGarden(): UseWaterResult {
  // 물방울 확인
  const state = getWaterState();
  if (state.waterDrops <= 0) {
    return {
      success: false,
      message: "사용할 수 있는 물방울이 없어요.",
    };
  }

  // dynamic import로 순환 참조 방지
  const { getEntries, updateEntryGrowthStage } = require("./storage");
  const entries = getEntries();

  // 가장 오래된 seed 찾기
  const seeds = entries
    .filter((e: any) => e.analysis.gardenReward.growthStage === "seed")
    .sort((a: any, b: any) => {
      const aTime = new Date(a.analysis.gardenReward.plantedAt || a.createdAt).getTime();
      const bTime = new Date(b.analysis.gardenReward.plantedAt || b.createdAt).getTime();
      return aTime - bTime;
    });

  if (seeds.length > 0) {
    const target = seeds[0];
    updateEntryGrowthStage(target.id, "sprout");
    useWaterDrops(1);
    return {
      success: true,
      message: `물방울을 주었어요. ${target.analysis.gardenReward.name} 씨앗이 새싹이 되었어요. 🌿`,
      targetId: target.id,
      targetName: target.analysis.gardenReward.name,
      fromStage: "seed",
      toStage: "sprout",
    };
  }

  // 가장 오래된 sprout 찾기
  const sprouts = entries
    .filter((e: any) => e.analysis.gardenReward.growthStage === "sprout")
    .sort((a: any, b: any) => {
      const aTime = new Date(a.analysis.gardenReward.plantedAt || a.createdAt).getTime();
      const bTime = new Date(b.analysis.gardenReward.plantedAt || b.createdAt).getTime();
      return aTime - bTime;
    });

  if (sprouts.length > 0) {
    const target = sprouts[0];
    updateEntryGrowthStage(target.id, "bloom");
    useWaterDrops(1);
    return {
      success: true,
      message: `새싹이 물을 머금고 ${target.analysis.gardenReward.name} 꽃으로 피어났어요. ${target.analysis.gardenReward.emoji}`,
      targetId: target.id,
      targetName: target.analysis.gardenReward.name,
      fromStage: "sprout",
      toStage: "bloom",
    };
  }

  // 모두 bloom이면
  return {
    success: false,
    message: "오늘은 정원이 이미 활짝 피어 있어요. 🌺",
  };
}

// ============================================================
// 하루 최대 보상 체크
// ============================================================

/**
 * 오늘 더 이상 받을 수 있는 보상이 있는지 확인합니다.
 */
export function canClaimMoreRewardsToday(): boolean {
  const history = getTodayRewardHistory();
  return (
    !history.dailyBaseClaimed ||
    !history.firstEntryRewardClaimed ||
    !history.secondEntryRewardClaimed ||
    !history.reportRewardClaimed ||
    !history.deepEmotionRewardClaimed
  );
}

/**
 * 오늘 받은 총 보상 개수를 계산합니다.
 */
export function getTodayClaimedCount(): number {
  const history = getTodayRewardHistory();
  let count = 0;
  if (history.dailyBaseClaimed) count++;
  if (history.firstEntryRewardClaimed) count++;
  if (history.secondEntryRewardClaimed) count++;
  if (history.reportRewardClaimed) count++;
  if (history.deepEmotionRewardClaimed) count++;
  return count;
}

/**
 * 오늘 남은 보상 가능 개수를 반환합니다.
 */
export function getTodayRemainingRewards(): number {
  return DAILY_MAX_WATER_DROPS - getTodayClaimedCount();
}