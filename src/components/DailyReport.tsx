"use client";

import { useEffect, useState } from "react";
import { getTodayEntries, applyAutoGrowth, getEntriesWithGrowth } from "@/lib/storage";
import { DiaryEntry, GrowthStage } from "@/types/emotion";
import { claimReportReward, getTodayRewardHistory } from "@/lib/waterRewards";

export default function DailyReport() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [reportRewardClaimed, setReportRewardClaimed] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // 자동 성장 적용 후 Today's 데이터 가져오기
    applyAutoGrowth();
    const all = getEntriesWithGrowth();
    const today = new Date().toISOString().split("T")[0];
    setEntries(all.filter((e) => e.createdAt.startsWith(today)));
    // 이미 리포트 보상을 받았는지 확인
    setReportRewardClaimed(getTodayRewardHistory().reportRewardClaimed);
  }, []);

  // 토스트 메시지 표시
  const showRewardToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // 리포트 확인 보상 받기
  const handleClaimReportReward = () => {
    const result = claimReportReward();
    setReportRewardClaimed(true);
    showRewardToast(result.message);
  };

  // 가장 많이 나온 감정 계산
  const getMainEmotion = () => {
    if (entries.length === 0) return null;
    const emotionCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      emotionCounts[entry.analysis.mainEmotion] =
        (emotionCounts[entry.analysis.mainEmotion] || 0) + 1;
    });
    return Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0][0];
  };

  // 오늘 심어진 꽃 목록
  const getFlowers = () => {
    return entries.map((entry) => entry.analysis.gardenReward);
  };

  // growthStage별 이모지 반환
  const getStageEmoji = (stage: GrowthStage, fallbackEmoji: string) => {
    if (stage === "seed") return "🌱";
    if (stage === "sprout") return "🌿";
    return fallbackEmoji; // bloom
  };

  // 오늘 심어진 씨앗/새싹/꽃 수
  const getStageCounts = () => {
    const seeds = entries.filter((e) => e.analysis.gardenReward.growthStage === "seed").length;
    const sprouts = entries.filter((e) => e.analysis.gardenReward.growthStage === "sprout").length;
    const blooms = entries.filter((e) => e.analysis.gardenReward.growthStage === "bloom").length;
    return { seeds, sprouts, blooms };
  };

  // 감정 흐름
  const getEmotionFlow = () => {
    return entries.map((entry) => entry.analysis.mainEmotion);
  };

  // 하루 요약 메시지
  const getDailyMessage = () => {
    if (entries.length === 0) return "";
    const mainEmotion = getMainEmotion();
    const messages: Record<string, string> = {
      불안: "오늘은 조금 불안한 하루였어요. 그래도 기록으로 마음을 정리했어요.",
      슬픔: "슬픔이 있는 하루였지만, 당신은 그 감정을 마주할 용기가 있었어요.",
      분노: "화가 나는 순간들이 있었지만, 당신은 그것을 표현할 방법을 알았어요.",
      기쁨: "행복으로 가득한 하루였어요! 이 기분이 내일도 계속되길 바라요.",
      지침: "지치는 하루였어요. 오늘은 푹 쉬어도 괜찮아요.",
      복잡함: "복잡한 감정의 하루였어요. 모든 감정은 당신을 만들어가는 과정이에요.",
    };
    return messages[mainEmotion || ""] || "오늘도 기록해줘서 고마워요.";
  };

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="p-6 animate-fade-in">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">📊</div>
        <h1 className="text-2xl font-bold text-warm-brown mb-1">오늘 리포트</h1>
        <p className="text-warm-brown/60 text-sm">{today}</p>
      </div>

      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4 opacity-50">🌙</div>
          <p className="text-warm-brown/60 mb-2">오늘 작성한 기록이 없어요</p>
          <p className="text-warm-brown/40 text-sm">
            오늘의 감정을 기록해보세요
          </p>
        </div>
      ) : (
        <>
          {/* 오늘의 대표 감정 */}
          <div className="card mb-4 text-center">
            <div className="text-sm text-warm-brown/60 mb-2">오늘의 대표 감정</div>
            <div className="text-4xl font-bold text-warm-brown mb-2">
              {getMainEmotion()}
            </div>
            <div className="text-sm text-warm-brown/50">
              총 {entries.length}개의 기록
            </div>
          </div>

          {/* 오늘의 감정 흐름 */}
          <div className="card mb-4">
            <div className="text-sm font-medium text-warm-brown mb-3">
              🌊 오늘의 감정 흐름
            </div>
            <div className="flex flex-wrap gap-2">
              {getEmotionFlow().map((emotion, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-soft-yellow/30 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{emotion}</span>
                  {index < getEmotionFlow().length - 1 && (
                    <span className="text-warm-brown/30">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 오늘 심어진 꽃 */}
          <div className="card mb-4">
            <div className="text-sm font-medium text-warm-brown mb-3">
              🌸 오늘 심어진 꽃
            </div>
            <div className="grid grid-cols-3 gap-3">
              {getFlowers().map((flower, index) => {
                const stage = flower.growthStage || "seed";
                const stageName =
                  stage === "seed" ? "씨앗" : stage === "sprout" ? "새싹" : "꽃";
                const displayEmoji = getStageEmoji(stage, flower.emoji);
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center p-2 bg-ivory/50 rounded-xl"
                  >
                    <span className="text-2xl mb-1">{displayEmoji}</span>
                    <span className="text-xs text-warm-brown/70">{flower.name}</span>
                    <span className="text-[10px] text-warm-brown/40">{stageName}</span>
                  </div>
                );
              })}
            </div>
            {(() => {
              const { seeds, sprouts, blooms } = getStageCounts();
              return (
                <div className="mt-3 flex justify-center gap-3 text-xs text-warm-brown/50">
                  <span>🌱 씨앗 {seeds}</span>
                  <span>🌿 새싹 {sprouts}</span>
                  <span>🌸 꽃 {blooms}</span>
                </div>
              );
            })()}
          </div>

          {/* 하루 요약 */}
          <div className="card bg-soft-yellow/20 border-soft-yellow/30 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💝</span>
              <div>
                <div className="text-sm font-medium text-warm-brown mb-1">
                  오늘의 나에게
                </div>
                <p className="text-warm-brown/80 text-sm leading-relaxed">
                  {getDailyMessage()}
                </p>
              </div>
            </div>
          </div>

          {/* 기록 시간 목록 */}
          <div className="card">
            <div className="text-sm font-medium text-warm-brown mb-3">
              📝 기록한 시간
            </div>
            <div className="space-y-2">
              {entries.map((entry) => {
                const stage = entry.analysis.gardenReward.growthStage || "seed";
                const displayEmoji = getStageEmoji(stage, entry.analysis.gardenReward.emoji);
                return (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 text-sm text-warm-brown/60"
                >
                  <span className="text-lg">{displayEmoji}</span>
                  <span className="flex-1 truncate">{entry.content}</span>
                  <span className="text-xs whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                );
              })}
            </div>
          </div>

          {/* 리포트 정리 보상 받기 */}
          <div className="mt-4">
            <button
              onClick={handleClaimReportReward}
              disabled={reportRewardClaimed}
              className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                reportRewardClaimed
                  ? "bg-blue-50/50 text-blue-300 border border-blue-50"
                  : "bg-gradient-to-r from-blue-100/80 to-cyan-50/80 text-blue-600 border border-blue-200/80 hover:shadow-md active:scale-95"
              }`}
            >
              {reportRewardClaimed ? (
                <>
                  <span>💧</span>
                  <span>오늘의 리포트 보상은 이미 받았어요</span>
                </>
              ) : (
                <>
                  <span className="animate-bounce">💧</span>
                  <span>리포트 정리 보상 받기</span>
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-beige/50 text-sm text-warm-brown whitespace-nowrap">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
