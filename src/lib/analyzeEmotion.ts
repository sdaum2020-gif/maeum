import { EmotionAnalysis, GardenReward, GrowthStage, FlowerPosition, GrowthProfile } from "@/types/emotion";
import { INTENSITY_PROFILES } from "./gardenGrowth";

// 감정별 꽃 기본 정보 (plantedAt은 동적으로 설정)
interface FlowerBaseInfo {
  type: string;
  name: string;
  emoji: string;
  description: string;
}

const FLOWER_BASE_INFO: Record<string, FlowerBaseInfo> = {
  불안: {
    type: "lavender",
    name: "라벤더",
    emoji: "💜",
    description: "불안한 마음을 차분하게 감싸주는 라벤더가 피어났어요.",
  },
  슬픔: {
    type: "forget-me-not",
    name: "물망초",
    emoji: "🌼",
    description: "속상한 마음을 조용히 안아주는 물망초가 피어났어요.",
  },
  분노: {
    type: "cactus-flower",
    name: "선인장꽃",
    emoji: "🌵",
    description: "날카로웠던 마음을 천천히 식혀주는 선인장꽃이 피어났어요.",
  },
  기쁨: {
    type: "sunflower",
    name: "해바라기",
    emoji: "🌻",
    description: "기쁜 마음을 환하게 비추는 해바라기가 피어났어요.",
  },
  지침: {
    type: "cotton-flower",
    name: "목화꽃",
    emoji: "🤍",
    description: "지친 마음을 포근하게 쉬게 해주는 목화꽃이 피어났어요.",
  },
  복잡함: {
    type: "wildflower",
    name: "들꽃",
    emoji: "🌸",
    description: "복잡한 마음 사이에 작은 들꽃이 피어났어요.",
  },
};

// 감정별 공감 메시지
const EMPATHY_MESSAGES: Record<string, string[]> = {
  불안: [
    "오늘 마음이 많이 복잡했겠어요. 그래도 이렇게 기록한 것만으로도 마음을 정리하는 첫걸음이에요.",
    "불안한 마음은 잠시 옆에 두어도 괜찮아요. 당신은 이미 충분히 잘하고 있어요.",
    "걱정이 많았던 하루였네요. 당신의 마음이 조금이라도 rahat해지길 바라요.",
  ],
  슬픔: [
    "슬픈 마음을 안고 여기까지 와준 당신에게 박수를 보내요.",
    "눈물흘린 만큼 마음이 깨끗해질 거예요. 당신은 강해요.",
    "속상했던 마음, 여기 정원에 잠시 내려놓아도 좋아요.",
  ],
  분노: [
    "화났던 마음, 인정해도 괜찮아요. 당신은 소중한 사람이에요.",
    "짜증이 났던 순간들도 있었죠. 지금은 조금 진정돼길 바라요.",
    "분노는 잠시 머물다 가는 손님이에요. 당신의 본래 모습은 평온해요.",
  ],
  기쁨: [
    "행복한 마음이 정원에 꽃으로 피어났어요! 이 느낌 간직하세요.",
    "오늘의 기쁨이 내일의 힘이 될 거예요. 정말 멋져요!",
    "신나는 마음이 전해져서こちら까지 즐거워져요!",
  ],
  지침: [
    "지친 몸과 마음, 오늘은 정말 고생 많았어요. 이제 쉬어도 괜찮아요.",
    "힘든 하루였네요. 당신은 충분히がんばった어요.",
    "무기력했던 마음, 정원에서 잠시 쉬어가요.",
  ],
  복잡함: [
    "말 못 할 복잡한 마음, 그래도 기록으로 남겨준 것에 감사해요.",
    "정리되지 않는 감정도 괜찮아요. 그냥 있는 그대로 인정해봐요.",
    "복잡한 마음 속에 작은 평화가 찾아오길 바라요.",
  ],
};

// 감정 키워드 매핑
const EMOTION_KEYWORDS: Record<string, string[]> = {
  불안: ["불안", "걱정", "긴장", "무서"],
  슬픔: ["슬퍼", "우울", "눈물", "속상"],
  분노: ["화나", "짜증", "분노", "억울"],
  기쁨: ["좋아", "행복", "기뻐", "신나"],
  지침: ["피곤", "지쳐", "힘들", "무기력"],
};

/**
 * 텍스트에서 감정을 분석합니다.
 * 현재는 mock 함수이며, 나중에 AI API로 교체 가능합니다.
 */
export function fakeAnalyzeEmotion(text: string): EmotionAnalysis {
  let mainEmotion: string = "복잡함";
  const subEmotions: string[] = [];

  // 각 감정 키워드 체크
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const matchedKeywords = keywords.filter((keyword) => text.includes(keyword));
    if (matchedKeywords.length > 0) {
      mainEmotion = emotion;
      subEmotions.push(...matchedKeywords);
    }
  }

  // 감정 강도 계산 (0-10)
  // 매칭된 키워드 수와 텍스트 길이에 기반한 간단한 계산
  const intensity = Math.min(
    10,
    Math.max(1, Math.ceil((subEmotions.length * 2 + text.length / 50) * 1.5))
  );

  // 공감 메시지 선택
  const messages = EMPATHY_MESSAGES[mainEmotion] || EMPATHY_MESSAGES["복잡함"];
  const empathyMessage = messages[Math.floor(Math.random() * messages.length)];

  // 꽃 기본 정보 선택
  const baseInfo = FLOWER_BASE_INFO[mainEmotion] || FLOWER_BASE_INFO["복잡함"];

  // 랜덤 위치 생성
  const position: FlowerPosition = {
    x: Math.random() * 80 + 8, // 8~88
    y: Math.random() * 40 + 45, // 45~85
    scale: Math.random() * 0.4 + 0.85, // 0.85~1.25
    rotation: (Math.random() - 0.5) * 20, // -10~10
    zIndex: Math.floor(Math.random() * 40 + 45),
  };

  // intensity를 1~5로 정규화 (감정 강도 0-10 → 성장 단계 1-5)
  const normalizedIntensity = Math.min(5, Math.max(1, Math.ceil(intensity / 2)));
  const profile = INTENSITY_PROFILES[normalizedIntensity];
  const { bloomScale, ...growthProfile } = profile;

  // plantedAt, position, growthProfile을 포함한 gardenReward 생성
  const now = new Date().toISOString();
  const gardenReward: GardenReward = {
    ...baseInfo,
    growthStage: "seed" as GrowthStage,
    plantedAt: now,
    position,
    growthProfile,
    bloomScale,
  };

  return {
    mainEmotion: mainEmotion as EmotionAnalysis["mainEmotion"],
    subEmotions,
    intensity,
    empathyMessage,
    gardenReward,
  };
}

/**
 * 나중에 AI 연결 시 이 함수를 실제 API 호출로 교체하세요.
 * 예: OpenRouter API를 사용한 감정 분석
 */
export async function analyzeEmotion(text: string): Promise<EmotionAnalysis> {
  // 현재는 mock 함수 사용
  // 나중에는 여기에 API 호출 코드 추가
  return fakeAnalyzeEmotion(text);
}