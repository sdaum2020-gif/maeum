"use client";

import { DiaryEntry } from "@/types/emotion";
import { getIntensityMessage } from "@/lib/gardenGrowth";
import { getTodayRewardHistory } from "@/lib/waterRewards";

interface AnalysisResultProps {
  entry: DiaryEntry;
  onClose: () => void;
  onGoToGarden: () => void;
}

export default function AnalysisResult({ entry, onClose, onGoToGarden }: AnalysisResultProps) {
  const { analysis, content } = entry;

  // 오늘 받은 물방울 보상 확인
  const rewardHistory = getTodayRewardHistory();
  const hasRewards = rewardHistory.firstEntryRewardClaimed || 
                     rewardHistory.secondEntryRewardClaimed || 
                     rewardHistory.deepEmotionRewardClaimed;

  return (
    <div className="p-6 animate-fade-in">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3 animate-float">🌱</div>
        <h2 className="text-xl font-bold text-warm-brown">
          오늘의 마음을 정리했어요
        </h2>
        <p className="text-warm-brown/60 text-sm mt-2">
          {analysis.gardenReward.name} {analysis.gardenReward.growthStage === "bloom" ? "꽃" : analysis.gardenReward.growthStage === "sprout" ? "새싹" : "씨앗"}이 마음정원에 심어졌어요
        </p>
      </div>

      {/* 메인 감정 카드 */}
      <div className="card mb-4 text-center">
        <div className="text-sm text-warm-brown/60 mb-2">오늘의 대표 감정</div>
        <div className="text-3xl font-bold text-warm-brown mb-3">
          {analysis.mainEmotion}
        </div>
        <div className="flex justify-center gap-2 mb-4">
          {analysis.subEmotions.map((emotion, index) => (
            <span key={index} className="emotion-tag">
              {emotion}
            </span>
          ))}
        </div>
        {/* 감정 강도 */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-warm-brown/60">감정 깊이</span>
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < analysis.intensity
                    ? "bg-soft-green"
                    : "bg-warm-brown/10"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-warm-brown/60">{analysis.intensity}/5</span>
        </div>
      </div>

      {/* 공감 메시지 */}
      <div className="card mb-4 bg-soft-yellow/20 border-soft-yellow/30">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💌</span>
          <p className="text-warm-brown leading-relaxed">
            {analysis.empathyMessage}
          </p>
        </div>
      </div>

      {/* 꽃 설명 */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">
            {analysis.gardenReward.growthStage === "bloom"
              ? analysis.gardenReward.emoji
              : analysis.gardenReward.growthStage === "sprout"
              ? "🌿"
              : "🌱"}
          </span>
          <div>
            <div className="font-bold text-warm-brown">
              {analysis.gardenReward.name}{" "}
              {analysis.gardenReward.growthStage === "bloom"
                ? "꽃"
                : analysis.gardenReward.growthStage === "sprout"
                ? "새싹"
                : "씨앗"}
            </div>
            <div className="text-sm text-warm-brown/60">
              {analysis.gardenReward.growthStage === "bloom"
                ? "마음정원에서 활짝 피었어요"
                : analysis.gardenReward.growthStage === "sprout"
                ? "마음정원에서 자라고 있어요"
                : "마음정원에 심어졌어요"}
            </div>
          </div>
        </div>
        <p className="text-warm-brown/80 text-sm leading-relaxed">
          {analysis.gardenReward.description}
        </p>
        {/* 감정의 깊이 안내 */}
        <div className="mt-3 text-center">
          <p className="text-[11px] text-warm-brown/40 italic">
            {getIntensityMessage(analysis.intensity)}
          </p>
        </div>
      </div>

      {/* 물방울 보상 메시지 */}
      {hasRewards && (
        <div className="card mb-4 bg-blue-50/50 border-blue-100/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💧</span>
            <div className="flex-1">
              <p className="text-warm-brown text-sm font-medium">물방울을 받았어요!</p>
              <p className="text-warm-brown/60 text-xs mt-1">
                {rewardHistory.firstEntryRewardClaimed && "• 첫 기록 보상 +1"}
                {rewardHistory.secondEntryRewardClaimed && " • 두 번째 기록 보상 +1"}
                {rewardHistory.deepEmotionRewardClaimed && " • 깊은 마음 보상 +1"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 btn-secondary">
          ← 다시 쓰기
        </button>
        <button onClick={onGoToGarden} className="flex-1 btn-primary">
          마음정원에서 보기 🌷
        </button>
      </div>
    </div>
  );
}