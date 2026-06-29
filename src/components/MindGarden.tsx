"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getEntriesWithGrowth,
  getGardenState,
  applyAutoGrowth,
  updateEntryPosition,
} from "@/lib/storage";
import { DiaryEntry, GardenState, FlowerPosition } from "@/types/emotion";
import { getGrowthStatusMessage } from "@/lib/gardenGrowth";
import {
  getWaterDrops,
  claimDailyWater,
  useWaterDropOnGarden,
  getTodayRewardHistory,
  type RewardResult,
  type UseWaterResult,
} from "@/lib/waterRewards";

// 마음정원 화면에 표시할 최대 식물 개수
const MAX_VISIBLE_PLANTS = 15;

// growthStage별 표시 이모지
const STAGE_EMOJI: Record<string, string> = {
  seed: "🌱",
  sprout: "🌿",
  bloom: "", // 감정별 emoji 사용
};

const PLANT_IMAGE_BY_TYPE: Record<string, string> = {
  lavender: "/assets/plants/lavender.png",
  sunflower: "/assets/plants/sunflower.png",
  "forget-me-not": "/assets/plants/forget-me-not.png",
  "cactus-flower": "/assets/plants/cactus-flower.png",
  "cotton-flower": "/assets/plants/cotton-flower.png",
  wildflower: "/assets/plants/wildflower.png",
};

const BLOOM_SCALE_BY_INTENSITY: Record<number, number> = {
  1: 0.75,
  2: 0.9,
  3: 1.05,
  4: 1.25,
  5: 1.45,
};

function getEntryDisplayEmoji(entry: DiaryEntry): string {
  const stage = entry.analysis.gardenReward.growthStage;
  if (stage === "bloom") {
    return entry.analysis.gardenReward.emoji;
  }
  return STAGE_EMOJI[stage] || "🌱";
}

function normalizeRenderIntensity(value: unknown): number {
  const intensity = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 3;
  if (intensity <= 1) return 1;
  if (intensity >= 5) return 5;
  return intensity;
}

function getRenderIntensity(entry: DiaryEntry): number {
  const reward = entry.analysis.gardenReward as typeof entry.analysis.gardenReward & {
    intensity?: number;
  };

  return normalizeRenderIntensity(
    entry.analysis.intensity ??
      reward.growthProfile?.intensity ??
      reward.intensity ??
      3
  );
}

function getRenderBloomScale(entry: DiaryEntry): number {
  return BLOOM_SCALE_BY_INTENSITY[getRenderIntensity(entry)] || BLOOM_SCALE_BY_INTENSITY[3];
}

/**
 * 기록의 날짜/시간을 말풍선용으로 포맷합니다.
 * 형식: MM.DD HH:mm (24시간제, 연도 생략)
 * 예: 06.29 14:04
 */
function formatRecordTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month}.${day} ${hours}:${minutes}`;
}

/**
 * 공감 메시지를 가져옵니다.
 * 우선순위: analysis.empathyMessage → gardenReward.empathyMessage → gardenReward.description → 기본 문구
 */
function getEmpathyMessage(entry: DiaryEntry): string {
  const analysisEmpathy = (entry.analysis as DiaryEntry["analysis"] & { empathyMessage?: string })
    .empathyMessage;
  const rewardEmpathy = (
    entry.analysis.gardenReward as typeof entry.analysis.gardenReward & { empathyMessage?: string }
  ).empathyMessage;
  const description = entry.analysis.gardenReward.description;

  if (analysisEmpathy && analysisEmpathy.trim().length > 0) return analysisEmpathy;
  if (rewardEmpathy && rewardEmpathy.trim().length > 0) return rewardEmpathy;
  if (description && description.trim().length > 0) return description;
  return "이 마음이 정원에 조용히 남아 있어요.";
}

function getPlantImageSrc(entry: DiaryEntry): string | null {
  const reward = entry.analysis.gardenReward;
  const stage = reward.growthStage || "seed";
  if (stage === "seed") return "/assets/plants/seed.png";
  if (stage === "sprout") return "/assets/plants/sprout.png";
  return PLANT_IMAGE_BY_TYPE[reward.type] || null;
}

function PlantObject({ entry, index }: { entry: DiaryEntry; index: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const stage = entry.analysis.gardenReward.growthStage || "seed";
  const imageSrc = getPlantImageSrc(entry);
  const emoji = getEntryDisplayEmoji(entry);
  const isBloom = stage === "bloom";
  const isSeed = stage === "seed";

  if (!imageSrc || imageFailed) {
    return (
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
    );
  }

  return (
    <img
      src={imageSrc}
      alt={entry.analysis.gardenReward.name}
      draggable={false}
      onError={() => setImageFailed(true)}
      className={`plant-object-image select-none ${
        isBloom ? "animate-float" : isSeed ? "animate-bounce-subtle" : "animate-sway"
      }`}
      style={{
        animationDelay: `${index * 0.1}s`,
        animationDuration: isBloom ? "3s" : isSeed ? "2s" : "2.5s",
      }}
    />
  );
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
  const [showEditHint, setShowEditHint] = useState(false);
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

  useEffect(() => {
    if (!isEditMode) {
      setShowEditHint(false);
      return;
    }

    setShowEditHint(true);
    const timeout = setTimeout(() => {
      setShowEditHint(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isEditMode]);

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

  // 최신 기록 기준 MAX_VISIBLE_PLANTS개만 정원에 표시
  const visibleEntries = [...entries]
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime; // 최신순
    })
    .slice(0, MAX_VISIBLE_PLANTS);

  // y값 기준으로 정렬 (아래쪽이 더 앞에)
  const sortedEntries = [...visibleEntries].sort((a, b) => {
    const aY = a.analysis.gardenReward.position?.y || 50;
    const bY = b.analysis.gardenReward.position?.y || 50;
    return aY - bY;
  });

  return (
    <div className="h-[calc(100vh-5rem)] min-h-[620px] animate-fade-in md:min-h-[720px]" onClick={handleClosePopup}>
      <div className="h-full p-3 sm:p-4">
        <div
          ref={canvasRef}
          className={`garden-canvas mind-garden-home relative h-full w-full overflow-hidden rounded-[28px] border shadow-inner ${
            isEditMode ? "border-amber-300/70 ring-2 ring-amber-200/50" : "border-white/70"
          }`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="absolute left-4 top-4 z-50 flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-sm font-bold text-blue-600 shadow-sm backdrop-blur-sm sm:left-6 sm:top-6">
            <span aria-hidden="true">💧</span>
            <span>{waterDrops.toLocaleString()}</span>
          </div>

          <div className="absolute right-4 top-4 z-50 flex w-[148px] flex-col gap-2 sm:right-6 sm:top-6 sm:w-[172px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClaimDailyWater();
              }}
              disabled={dailyBaseClaimed}
              className={`garden-action-button ${
                dailyBaseClaimed
                  ? "border-blue-100/80 bg-blue-50/80 text-blue-300"
                  : "border-blue-100 bg-blue-50/90 text-blue-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              }`}
            >
              <span aria-hidden="true">💧</span>
              <span>물방울 받기</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUseWaterDrop();
              }}
              disabled={waterDrops <= 0 || entries.length === 0}
              className={`garden-action-button ${
                waterDrops <= 0 || entries.length === 0
                  ? "border-emerald-100/80 bg-emerald-50/80 text-emerald-300"
                  : "border-emerald-100 bg-emerald-50/90 text-emerald-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              }`}
            >
              <span aria-hidden="true">💧</span>
              <span>물방울 사용하기</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleEditMode();
              }}
              disabled={entries.length === 0}
              className={`garden-action-button ${
                isEditMode
                  ? "border-amber-200 bg-amber-100/90 text-amber-700 shadow-md"
                  : entries.length === 0
                  ? "border-rose-100/80 bg-rose-50/80 text-rose-300"
                  : "border-rose-100 bg-rose-50/90 text-rose-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              }`}
            >
              <span aria-hidden="true">{isEditMode ? "✓" : "🎨"}</span>
              <span>정원 꾸미기</span>
            </button>
          </div>

          {/* 배치 모드 안내 배지 */}
          {isEditMode && showEditHint && (
            <div className="absolute left-1/2 top-28 z-50 -translate-x-1/2 animate-fade-in">
              <div className="bg-amber-100/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-amber-200/50">
                <p className="text-xs text-amber-700 font-medium">
                  ✨ 꽃을 끌어서 원하는 자리에 놓아보세요
                </p>
              </div>
            </div>
          )}

          <div className="garden-title pointer-events-none">마음 정원</div>
          <div className="garden-cloud garden-cloud-left" />
          <div className="garden-cloud garden-cloud-right" />
          <div className="garden-fence" />
          <div className="garden-shrub garden-shrub-left" />
          <div className="garden-shrub garden-shrub-right" />
          <div className="garden-grass-texture" />

          {/* 빈 정원 */}
          {entries.length === 0 ? (
            <div className="absolute inset-x-0 bottom-[42%] z-20 flex flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 text-5xl opacity-60 animate-float">🪴</div>
              <p className="rounded-full bg-white/45 px-4 py-2 text-sm font-medium text-warm-brown/55 backdrop-blur-sm">
                아직 심은 씨앗이 없어요
              </p>
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
                const isBloom = entry.analysis.gardenReward.growthStage === "bloom";
                const bloomScale = isBloom ? getRenderBloomScale(entry) : 1;
                
                // 드래그 중인 꽃인지 확인
                const isDragging = draggingEntryId === entry.id;
                const displayPos = isDragging && dragPosition ? dragPosition : { x: pos.x, y: pos.y };
                const dragScale = isDragging ? 1.12 : 1;
                const finalScale = pos.scale * bloomScale * dragScale;

                return (
                  <div
                    key={entry.id}
                    className={`plant-object-wrapper absolute transition-transform duration-200 ${
                      isEditMode
                        ? "cursor-grab active:cursor-grabbing"
                        : "cursor-pointer hover:scale-110"
                    } ${isDragging ? "scale-115 z-[900]" : ""}`}
                    style={{
                      left: `${displayPos.x}%`,
                      top: `${displayPos.y}%`,
                      transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${finalScale})`,
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
                    <PlantObject entry={entry} index={index} />
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
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <span>{selectedFlower.entry.analysis.mainEmotion}</span>
                            <span>·</span>
                            <span>깊이 {selectedFlower.entry.analysis.intensity ?? 3}</span>
                            {(() => {
                              const timeStr = formatRecordTime(
                                selectedFlower.entry.createdAt ||
                                  selectedFlower.entry.analysis.gardenReward.plantedAt
                              );
                              return timeStr ? (
                                <>
                                  <span>·</span>
                                  <span className="text-[9px]">{timeStr}</span>
                                </>
                              ) : null;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-warm-brown/70 leading-relaxed break-words">
                      {getEmpathyMessage(selectedFlower.entry)}
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
