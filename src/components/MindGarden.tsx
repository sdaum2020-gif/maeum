"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getEntriesWithGrowth,
  getGardenState,
  applyAutoGrowth,
  updateEntryPosition,
} from "@/lib/storage";
import { DiaryEntry, GardenState, FlowerPosition } from "@/types/emotion";
import { getGrowthStatusMessage, getBloomScale } from "@/lib/gardenGrowth";
import {
  getWaterDrops,
  claimDailyWater,
  useWaterDropOnGarden,
  getTodayRewardHistory,
  type RewardResult,
  type UseWaterResult,
} from "@/lib/waterRewards";

// growthStage별 표시 이모지
const STAGE_EMOJI: Record<string, string> = {
  seed: "🌱",
  sprout: "🌿",
  bloom: "", // 감정별 emoji 사용
};

function getEntryDisplayEmoji(entry: DiaryEntry): string {
  const stage = entry.analysis.gardenReward.growthStage;
  if (stage === "bloom") {
    return entry.analysis.gardenReward.emoji;
  }
  return STAGE_EMOJI[stage] || "🌱";
}

// 클릭된 꽃의 정보 카드
interface SelectedFlower {
  entry: DiaryEntry;
  x: number;
  y: number;
}

interface MindGardenProps {
  lastPlantedEntry?: DiaryEntry | null;
}

export default function MindGarden({ lastPlantedEntry }: MindGardenProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [gardenState, setGardenState] = useState<GardenState>({
    totalEntries: 0,
    seedCount: 0,
    sproutCount: 0,
    bloomCount: 0,
    consecutiveDays: 0,
    gardenLevel: "작은 화분",
    gardenEmoji: "🪴",
  });
  const [selectedFlower, setSelectedFlower] = useState<SelectedFlower | null>(null);

  // 물방울 관련 상태
  const [waterDrops, setWaterDrops] = useState(0);
  const [dailyBaseClaimed, setDailyBaseClaimed] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // 배치 모드 관련 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(() => {
    applyAutoGrowth();
    setEntries(getEntriesWithGrowth());
    setGardenState(getGardenState());
    setWaterDrops(getWaterDrops());
    setDailyBaseClaimed(getTodayRewardHistory().dailyBaseClaimed);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 새로 심은 기록이 있으면 환영 토스트 표시
  useEffect(() => {
    if (lastPlantedEntry) {
      const flowerName = lastPlantedEntry.analysis.gardenReward.name;
      const intensity = lastPlantedEntry.analysis.intensity;
      const stage = lastPlantedEntry.analysis.gardenReward.growthStage;
      const stageName = stage === "bloom" ? "꽃" : stage === "sprout" ? "새싹" : "씨앗";

      let message = `${flowerName} ${stageName}을(를) 정원에 심었어요 🌱`;
      
      if (intensity >= 4) {
        message += "\n깊은 마음일수록 천천히, 더 크게 피어날 거예요";
      }

      setToastMessage(message);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 4000);
    }
  }, [lastPlantedEntry]);

  // 30초마다 자동 성장 상태 체크
  useEffect(() => {
    const interval = setInterval(() => {
      applyAutoGrowth();
      setEntries(getEntriesWithGrowth());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 토스트 메시지 표시
  const showRewardToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // 오늘의 물방울 받기
  const handleClaimDailyWater = () => {
    const result: RewardResult = claimDailyWater();
    if (result.success) {
      setWaterDrops((prev) => prev + result.dropsAdded);
      setDailyBaseClaimed(true);
      showRewardToast(result.message);
    } else {
      showRewardToast(result.message);
    }
  };

  // 물방울 사용하기 (1개 소비하여 성장)
  const handleUseWaterDrop = () => {
    const result: UseWaterResult = useWaterDropOnGarden();
    if (result.success) {
      setWaterDrops((prev) => prev - 1);
      showRewardToast(result.message);
      setTimeout(() => {
        refreshData();
      }, 500);
    } else {
      showRewardToast(result.message);
    }
  };

  // 배치 모드 토글
  const toggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    setSelectedFlower(null);
    setDraggingEntryId(null);
    setDragPosition(null);
  };

  // 드래그 시작 (Pointer Down)
  const handlePointerDown = (entry: DiaryEntry, e: React.PointerEvent) => {
    if (!isEditMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setDraggingEntryId(entry.id);
    const pos = entry.analysis.gardenReward.position || { x: 50, y: 60, scale: 1, rotation: 0, zIndex: 60 };
    setDragPosition({ x: pos.x, y: pos.y });
    
    // 포인터 캡처
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // 드래그 중 (Pointer Move)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingEntryId || !canvasRef.current) return;
    
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // 캔버스 기준 퍼센트 계산
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // 범위 제한 (x: 5~90, y: 35~88)
    const clampedX = Math.min(90, Math.max(5, x));
    const clampedY = Math.min(88, Math.max(35, y));
    
    setDragPosition({ x: clampedX, y: clampedY });
  };

  // 드래그 종료 (Pointer Up)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingEntryId || !dragPosition) {
      setDraggingEntryId(null);
      setDragPosition(null);
      return;
    }
    
    // 포인터 캡처 해제
    if (e.target instanceof HTMLElement) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
        // 이미 해제된 경우 무시
      }
    }
    
    // 새 위치 생성 (zIndex는 y 값 기반)
    const newPosition: FlowerPosition = {
      x: dragPosition.x,
      y: dragPosition.y,
      scale: 1, // 기존 scale 유지하려면 entry에서 가져와야 함
      rotation: 0,
      zIndex: Math.floor(dragPosition.y),
    };
    
    // 기존 entry의 scale, rotation 유지
    const entry = entries.find((e) => e.id === draggingEntryId);
    if (entry) {
      const oldPos = entry.analysis.gardenReward.position;
      if (oldPos) {
        newPosition.scale = oldPos.scale;
        newPosition.rotation = oldPos.rotation;
      }
    }
    
    // localStorage에 저장
    updateEntryPosition(draggingEntryId, newPosition);
    
    // 상태 초기화
    setDraggingEntryId(null);
    setDragPosition(null);
    
    // 데이터 새로고침
    refreshData();
  };

  // 꽃 클릭 (배치 모드가 아닐 때만 정보 카드 표시)
  const handleFlowerClick = (entry: DiaryEntry, e: React.MouseEvent) => {
    if (isEditMode) return; // 배치 모드에서는 클릭 무시
    
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const canvasRect = (e.target as HTMLElement).closest('.garden-canvas')?.getBoundingClientRect();
    
    if (canvasRect) {
      setSelectedFlower({
        entry,
        x: rect.left - canvasRect.left + rect.width / 2,
        y: rect.top - canvasRect.top - 10,
      });
    } else {
      setSelectedFlower({
        entry,
        x: 50,
        y: 30,
      });
    }
  };

  const handleClosePopup = () => {
    setSelectedFlower(null);
  };

  // y값 기준으로 정렬 (아래쪽이 더 앞에)
  const sortedEntries = [...entries].sort((a, b) => {
    const aY = a.analysis.gardenReward.position?.y || 50;
    const bY = b.analysis.gardenReward.position?.y || 50;
    return aY - bY;
  });

  return (
    <div className="flex flex-col h-full animate-fade-in" onClick={handleClosePopup}>
      {/* 정원 상태 카드 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 border border-beige/30">
          <div className="flex items-center gap-3">
            <span className="text-lg">{gardenState.gardenEmoji}</span>
            <span className="text-xs text-warm-brown/70 font-medium">
              {gardenState.gardenLevel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-warm-brown/50">
            <span>💧 {waterDrops}</span>
            <span>🌱 {gardenState.seedCount}</span>
            <span>🌿 {gardenState.sproutCount}</span>
            <span>🌸 {gardenState.bloomCount}</span>
            {gardenState.consecutiveDays > 0 && (
              <span>🔥 {gardenState.consecutiveDays}일</span>
            )}
          </div>
        </div>
      </div>

      {/* 오늘의 물방울 받기 버튼 */}
      <div className="px-4 pb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClaimDailyWater();
          }}
          disabled={dailyBaseClaimed}
          className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
            dailyBaseClaimed
              ? "bg-blue-50/50 text-blue-300 border border-blue-50"
              : "bg-gradient-to-r from-blue-100/80 to-cyan-50/80 text-blue-600 border border-blue-200/80 hover:shadow-md active:scale-95"
          }`}
        >
          {dailyBaseClaimed ? (
            <>
              <span>💧</span>
              <span>오늘의 물방울을 이미 받았어요</span>
            </>
          ) : (
            <>
              <span className="animate-bounce">💧</span>
              <span>오늘의 물방울 받기</span>
            </>
          )}
        </button>
      </div>

      {/* 물방울 사용하기 버튼 */}
      <div className="px-4 pb-2 relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUseWaterDrop();
          }}
          disabled={waterDrops <= 0 || entries.length === 0}
          className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
            waterDrops <= 0
              ? "bg-cyan-50/50 text-cyan-300 border border-cyan-50"
              : "bg-gradient-to-r from-cyan-100/80 to-blue-50/80 text-cyan-700 border border-cyan-200/80 hover:shadow-md active:scale-95"
          }`}
        >
          <span>💧</span>
          <span>물방울 사용하기</span>
          <span className="text-[10px] opacity-60 ml-1">(보유: {waterDrops}개)</span>
        </button>
      </div>

      {/* 정원 꾸미기 버튼 */}
      <div className="px-4 pb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleEditMode();
          }}
          disabled={entries.length === 0}
          className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
            isEditMode
              ? "bg-amber-100/80 text-amber-700 border border-amber-300/80 hover:shadow-md active:scale-95"
              : entries.length === 0
              ? "bg-amber-50/50 text-amber-300 border border-amber-50"
              : "bg-gradient-to-r from-amber-100/80 to-yellow-50/80 text-amber-600 border border-amber-200/80 hover:shadow-md active:scale-95"
          }`}
        >
          {isEditMode ? (
            <>
              <span>✓</span>
              <span>꾸미기 완료</span>
            </>
          ) : (
            <>
              <span>🎨</span>
              <span>정원 꾸미기</span>
            </>
          )}
        </button>
      </div>

      {/* 정원 캔버스 */}
      <div className="flex-1 px-4 pb-4">
        <div
          ref={canvasRef}
          className={`garden-canvas relative w-full h-full min-h-[300px] rounded-3xl overflow-hidden bg-gradient-to-b from-sky-100/30 via-sky-50/20 to-amber-100/40 border shadow-inner ${
            isEditMode ? "border-amber-300/60 ring-2 ring-amber-200/30" : "border-amber-200/30"
          }`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* 배치 모드 안내 배지 */}
          {isEditMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
              <div className="bg-amber-100/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-amber-200/50">
                <p className="text-xs text-amber-700 font-medium">
                  ✨ 꽃을 끌어서 원하는 자리에 놓아보세요
                </p>
              </div>
            </div>
          )}
          
          {/* 하늘 배경 요소 */}
          <div className="absolute top-4 left-6 text-2xl opacity-30 animate-float pointer-events-none">☀️</div>
          <div className="absolute top-8 right-10 text-lg opacity-20 animate-float pointer-events-none" style={{ animationDelay: "1s" }}>☁️</div>
          <div className="absolute top-12 right-20 text-sm opacity-15 animate-float pointer-events-none" style={{ animationDelay: "2s" }}>🦋</div>
          
          {/* 풀밭 패턴 (하단) */}
          <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-green-200/30 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-gradient-to-t from-amber-200/20 to-transparent pointer-events-none" />

          {/* 풀잎 장식 */}
          <div className="absolute bottom-2 left-4 text-xs opacity-20 pointer-events-none">🌿</div>
          <div className="absolute bottom-3 left-12 text-xs opacity-15 pointer-events-none">🍃</div>
          <div className="absolute bottom-2 right-8 text-xs opacity-20 pointer-events-none">🌿</div>
          <div className="absolute bottom-3 right-16 text-xs opacity-15 pointer-events-none">🍃</div>
          <div className="absolute bottom-4 left-1/2 text-xs opacity-10 pointer-events-none">✨</div>

          {/* 빈 정원 */}
          {entries.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl mb-3 opacity-40 animate-float">🪴</div>
              <p className="text-warm-brown/50 text-sm font-medium">아직 심은 씨앗이 없어요</p>
              <p className="text-warm-brown/30 text-xs mt-1">감정을 기록해서 씨앗을 심어보세요</p>
            </div>
          ) : (
            <>
              {/* 꽃/씨앗/새싹 배치 */}
              {sortedEntries.map((entry, index) => {
                const pos = entry.analysis.gardenReward.position || {
                  x: 50,
                  y: 60,
                  scale: 1,
                  rotation: 0,
                  zIndex: 60,
                };
                const emoji = getEntryDisplayEmoji(entry);
                const isBloom = entry.analysis.gardenReward.growthStage === "bloom";
                const isSeed = entry.analysis.gardenReward.growthStage === "seed";
                const bloomScale = isBloom ? getBloomScale(entry) * 0.9 : 1;
                const finalScale = pos.scale * bloomScale;
                
                // 드래그 중인 꽃인지 확인
                const isDragging = draggingEntryId === entry.id;
                const displayPos = isDragging && dragPosition ? dragPosition : { x: pos.x, y: pos.y };

                return (
                  <div
                    key={entry.id}
                    className={`absolute transition-transform duration-200 ${
                      isEditMode
                        ? "cursor-grab active:cursor-grabbing"
                        : "cursor-pointer hover:scale-110"
                    } ${isDragging ? "scale-115 z-[900]" : ""}`}
                    style={{
                      left: `${displayPos.x}%`,
                      top: `${displayPos.y}%`,
                      transform: `translate(-50%, -50%) scale(${isDragging ? finalScale * 1.15 : finalScale}) rotate(${pos.rotation}deg)`,
                      zIndex: isDragging ? 900 : pos.zIndex,
                      touchAction: isEditMode ? "none" : "auto",
                    }}
                    onClick={(e) => handleFlowerClick(entry, e)}
                    onPointerDown={(e) => handlePointerDown(entry, e)}
                  >
                    {/* 배치 모드에서 꽃 주변 하이라이트 */}
                    {isEditMode && !isDragging && (
                      <div className="absolute inset-0 -m-2 rounded-full border-2 border-dashed border-amber-300/50 animate-pulse pointer-events-none" />
                    )}
                    <span
                      className={`text-2xl select-none ${
                        isBloom ? "animate-float" : isSeed ? "animate-bounce-subtle" : "animate-sway"
                      }`}
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        animationDuration: isBloom ? "3s" : isSeed ? "2s" : "2.5s",
                      }}
                    >
                      {emoji}
                    </span>
                  </div>
                );
              })}

              {/* 선택된 꽃 정보 카드 */}
              {selectedFlower && !isEditMode && (
                <div
                  className="absolute z-[999] animate-fade-in"
                  style={{
                    left: `${Math.min(Math.max(selectedFlower.x, 80), 200)}px`,
                    top: `${Math.max(selectedFlower.y - 100, 10)}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3 border border-beige/50 min-w-[180px] max-w-[220px]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl">
                        {getEntryDisplayEmoji(selectedFlower.entry)}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-warm-brown">
                          {selectedFlower.entry.analysis.gardenReward.name}
                          {selectedFlower.entry.analysis.gardenReward.growthStage === "seed" && " 씨앗"}
                          {selectedFlower.entry.analysis.gardenReward.growthStage === "sprout" && " 새싹"}
                          {selectedFlower.entry.analysis.gardenReward.growthStage === "bloom" && " 꽃"}
                        </div>
                        <div className="text-[10px] text-warm-brown/50">
                          {selectedFlower.entry.analysis.mainEmotion}
                          {" · "}
                          감정 깊이 {selectedFlower.entry.analysis.intensity ?? 3}
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-warm-brown/70 leading-relaxed">
                      {selectedFlower.entry.analysis.gardenReward.description}
                    </p>
                    <div className="mt-2 pt-2 border-t border-warm-brown/10">
                      <p className="text-[10px] text-warm-brown/50 italic">
                        {getGrowthStatusMessage(selectedFlower.entry)}
                      </p>
                    </div>
                    <button
                      onClick={handleClosePopup}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-sm border border-warm-brown/10 text-warm-brown/50 text-xs flex items-center justify-center hover:bg-warm-brown/5"
                    >
                      ×
                    </button>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white/95" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 하단 상태 메시지 */}
      <div className="px-4 pb-2">
        <div className="text-center">
          {entries.length === 0 ? (
            <p className="text-warm-brown/40 text-[11px]">🌱 첫 씨앗을 심어보세요</p>
          ) : isEditMode ? (
            <p className="text-amber-600/60 text-[11px]">🎨 정원을 내 마음대로 꾸미는 중이에요</p>
          ) : (() => {
            const growing = entries.filter(
              (e) => e.analysis.gardenReward.growthStage !== "bloom"
            );
            if (growing.length === 0) {
              return <p className="text-warm-brown/40 text-[11px]">🌺 모든 꽃이 활짝 피었어요!</p>;
            }
            const oldest = growing.sort(
              (a, b) =>
                new Date(a.analysis.gardenReward.plantedAt || a.createdAt).getTime() -
                new Date(b.analysis.gardenReward.plantedAt || b.createdAt).getTime()
            )[0];
            return <p className="text-warm-brown/40 text-[11px]">⏰ {getGrowthStatusMessage(oldest)}</p>;
          })()}
        </div>
      </div>

      {/* 감정의 깊이 안내 문구 */}
      <div className="px-4 pb-2">
        <div className="text-center">
          <p className="text-warm-brown/30 text-[10px]">
            💡 깊은 감정일수록 꽃은 천천히 피어나지만, 더 크게 자라나요
          </p>
        </div>
      </div>

      {/* 성장 안내 문구 */}
      <div className="px-4 pb-3">
        <div className="text-center">
          <p className="text-warm-brown/25 text-[10px]">
            🌱 씨앗과 새싹은 시간이 지나면 자라요. 물방울을 사용하면 조금 더 빨리 피어납니다.
          </p>
        </div>
      </div>

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-lg border border-beige/50 text-sm text-warm-brown text-center max-w-[280px] whitespace-pre-line">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}