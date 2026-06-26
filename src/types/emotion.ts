export type GrowthStage = "seed" | "sprout" | "bloom";

export interface FlowerPosition {
  x: number;      // 8~88 퍼센트
  y: number;      // 45~85 퍼센트
  scale: number;  // 0.85~1.25
  rotation: number; // -10~10 도
  zIndex: number; // y 값 기반
}

export interface GrowthProfile {
  intensity: number;       // 1~10
  seedToSproutMs: number;  // 씨앗 → 새싹 성장 시간 (ms)
  sproutToBloomMs: number; // 새싹 → 꽃 성장 시간 (ms)
}

export interface GardenReward {
  type: string;
  name: string;
  emoji: string;
  description: string;
  growthStage: GrowthStage;
  plantedAt: string; // ISO string - 씨앗이 심어진 시간
  lastGrowthAt?: string; // ISO string - 마지막 성장 처리 시간
  position?: FlowerPosition;
  // intensity 기반 성장/크기 프로파일
  growthProfile?: GrowthProfile;
  bloomScale?: number; // 꽃이 피었을 때의 최종 크기 배율
}

export interface EmotionAnalysis {
  mainEmotion: "불안" | "슬픔" | "분노" | "기쁨" | "지침" | "복잡함";
  subEmotions: string[];
  intensity: number;
  empathyMessage: string;
  gardenReward: GardenReward;
}

export interface DiaryEntry {
  id: string;
  content: string;
  createdAt: string;
  analysis: EmotionAnalysis;
}

export interface DailyReport {
  date: string;
  entries: DiaryEntry[];
  mainEmotion: string;
  flowers: GardenReward[];
  emotionFlow: string[];
  dailyMessage: string;
}

export interface WateringLog {
  lastWateredDate: string; // "2026-06-26" 형식
}

// 물방울 보상 히스토리 (하루 단위)
export interface DailyRewardHistory {
  dailyBaseClaimed: boolean;        // 하루 기본 물방울 수령 여부
  firstEntryRewardClaimed: boolean; // 첫 번째 감정기록 보상 수령 여부
  secondEntryRewardClaimed: boolean; // 두 번째 감정기록 보상 수령 여부
  reportRewardClaimed: boolean;     // 오늘 리포트 확인 보상 수령 여부
  deepEmotionRewardClaimed: boolean; // 깊은 마음 기록 보상 수령 여부
}

// 물방울 상태
export interface WaterState {
  waterDrops: number;                          // 현재 보유 물방울 개수
  rewardHistory: Record<string, DailyRewardHistory>; // 날짜별 보상 히스토리
}

export interface GardenState {
  totalEntries: number;
  seedCount: number;
  sproutCount: number;
  bloomCount: number;
  consecutiveDays: number;
  gardenLevel: string;
  gardenEmoji: string;
}
