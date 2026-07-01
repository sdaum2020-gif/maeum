"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { applyAutoGrowth, getEntriesWithGrowth, deleteEntry, getEntryDateKey } from "@/lib/storage";
import { DiaryEntry, GardenReward, GrowthStage } from "@/types/emotion";
import { claimReportReward, getTodayRewardHistory } from "@/lib/waterRewards";
import {
  buildEntrySignature,
  getCachedDailySentence,
  saveDailySentenceToCache,
  invalidateDailySentenceCache,
} from "@/lib/dailySentenceCache";
import CloudBackupBanner from "@/components/CloudBackupBanner";

type ReportView = "calendar" | "stats" | "list" | "detail";

const EMOTION_FLOWER: Record<string, { name: string; type: string; emoji: string }> = {
  불안: { name: "라벤더", type: "lavender", emoji: "💜" },
  슬픔: { name: "물망초", type: "forget-me-not", emoji: "🌼" },
  분노: { name: "선인장꽃", type: "cactus-flower", emoji: "🌵" },
  기쁨: { name: "해바라기", type: "sunflower", emoji: "🌻" },
  지침: { name: "목화꽃", type: "cotton-flower", emoji: "🤍" },
  복잡함: { name: "들꽃", type: "wildflower", emoji: "🌸" },
};

const FLOWER_IMAGE_BY_TYPE: Record<string, string> = {
  lavender: "/assets/plants/lavender.png",
  sunflower: "/assets/plants/sunflower.png",
  "forget-me-not": "/assets/plants/forget-me-not.png",
  "cactus-flower": "/assets/plants/cactus-flower.png",
  "cotton-flower": "/assets/plants/cotton-flower.png",
  wildflower: "/assets/plants/wildflower.png",
};

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// getEntryDateKey는 storage.ts에서 import하여 사용

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function getKoreanDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
}

function getStageEmoji(stage: GrowthStage, fallbackEmoji: string) {
  if (stage === "seed") return "🌱";
  if (stage === "sprout") return "🌿";
  return fallbackEmoji;
}

function getRepresentativeEmotion(entries: DiaryEntry[]) {
  if (entries.length === 0) return null;
  
  // intensity(감정 깊이)를 가중치로 반영
  // 각 감정의 intensity 합계를 계산하여 가장 깊은 감정을 대표감정으로 선택
  const intensitySum: Record<string, number> = {};
  entries.forEach((entry) => {
    const emotion = entry.analysis.mainEmotion;
    const intensity = entry.analysis.intensity ?? 3; // 기본값 3
    intensitySum[emotion] = (intensitySum[emotion] || 0) + intensity;
  });
  
  return Object.entries(intensitySum).sort((a, b) => b[1] - a[1])[0][0];
}

function getRepresentativeReward(entries: DiaryEntry[]): GardenReward | null {
  const emotion = getRepresentativeEmotion(entries);
  if (!emotion) return null;
  return entries.find((entry) => entry.analysis.mainEmotion === emotion)?.analysis.gardenReward || null;
}

function getFlowerImage(type?: string) {
  if (!type) return null;
  return FLOWER_IMAGE_BY_TYPE[type] || null;
}

function getDailyMessage(entries: DiaryEntry[]) {
  if (entries.length === 0) return "이 날은 아직 심어진 마음 씨앗이 없어요.";
  const mainEmotion = getRepresentativeEmotion(entries);
  const messages: Record<string, string> = {
    불안: "불안이 찾아왔지만, 마음을 그냥 지나치지 않고 바라봐준 하루였어요.",
    슬픔: "슬픈 마음도 조용히 정원에 내려놓은 하루였어요.",
    분노: "날카로운 마음을 기록으로 다독여준 하루였어요.",
    기쁨: "밝은 마음이 정원에 햇살처럼 남은 하루였어요.",
    지침: "지친 마음에게 쉬어갈 자리를 만들어준 하루였어요.",
    복잡함: "여러 마음이 섞여도, 하나씩 바라봐준 하루였어요.",
  };
  return messages[mainEmotion || ""] || "오늘도 마음을 그냥 지나치지 않고 바라봐준 하루였어요.";
}


function FlowerMark({ reward, emotion, size = "sm" }: { reward?: GardenReward | null; emotion?: string | null; size?: "sm" | "md" | "lg" }) {
  const fallback = emotion ? EMOTION_FLOWER[emotion] : null;
  const imageSrc = getFlowerImage(reward?.type || fallback?.type);
  const label = reward?.name || fallback?.name || "마음꽃";
  const emoji = reward
    ? getStageEmoji(reward.growthStage || "seed", reward.emoji)
    : fallback?.emoji || "🌱";

  const sizeClass =
    size === "lg" ? "h-24 w-24" : size === "md" ? "h-14 w-14" : "h-8 w-8";
  const imageClass =
    size === "lg" ? "h-20 w-20" : size === "md" ? "h-12 w-12" : "h-7 w-7";

  return (
    <span className={`report-flower-mark ${sizeClass}`} title={label}>
      {imageSrc ? (
        <img src={imageSrc} alt={label} className={`object-contain ${imageClass}`} draggable={false} />
      ) : (
        <span>{emoji}</span>
      )}
    </span>
  );
}

const FALLBACK_SENTENCES = [
  "오늘도 마음을 그냥 지나치지 않고 바라봐준 하루였어요.",
  "기록한 만큼 마음정원은 조금씩 자라고 있어요.",
  "지나간 하루의 마음이 조용히 정원에 내려앉았네요.",
  "그날의 감정이 마음정원에 잔잔한 흔적을 남겼어요.",
];

function pickFallbackSentence(entries: DiaryEntry[]): string {
  if (entries.length === 0) return FALLBACK_SENTENCES[0];
  const idx =
    new Date(entries[0].createdAt).getDate() % FALLBACK_SENTENCES.length;
  return FALLBACK_SENTENCES[idx];
}

export default function DailyReport() {
  const [allEntries, setAllEntries] = useState<DiaryEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [view, setView] = useState<ReportView>("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reportRewardClaimed, setReportRewardClaimed] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // 그날의 한 문장 AI 생성 관련 상태
  const [dailySentence, setDailySentence] = useState<string | null>(null);
  const [isSentenceLoading, setIsSentenceLoading] = useState(false);
  const inFlightRef = useRef<string | null>(null); // 중복 호출 방지

  // 월간 기록 목록용 dailySentence 상태
  const [monthlySentences, setMonthlySentences] = useState<Record<string, string>>({});
  const [monthlyInFlightDates, setMonthlyInFlightDates] = useState<Set<string>>(new Set());
  const monthlyInFlightRef = useRef<Set<string>>(new Set());

  // 삭제 관련 상태
  const [deleteTargetEntry, setDeleteTargetEntry] = useState<DiaryEntry | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    applyAutoGrowth();
    setAllEntries(getEntriesWithGrowth());
    setReportRewardClaimed(getTodayRewardHistory().reportRewardClaimed);
  }, []);

  const todayKey = getDateKey(new Date());
  const monthKey = getMonthKey(currentMonth);

  const monthEntries = useMemo(
    () => allEntries.filter((entry) => getEntryDateKey(entry).startsWith(monthKey)),
    [allEntries, monthKey]
  );

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, DiaryEntry[]> = {};
    monthEntries.forEach((entry) => {
      const key = getEntryDateKey(entry);
      grouped[key] = grouped[key] || [];
      grouped[key].push(entry);
    });
    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
    return grouped;
  }, [monthEntries]);

  const selectedEntries = selectedDate ? entriesByDate[selectedDate] || [] : [];

  // 선택된 날짜가 바뀌면 그날의 한 문장 상태 초기화
  useEffect(() => {
    setDailySentence(null);
    setIsSentenceLoading(false);
    inFlightRef.current = null;
  }, [selectedDate]);

  // 그날의 한 문장을 AI로 생성 (캐시 우선)
  useEffect(() => {
    if (!selectedDate) return;
    if (selectedEntries.length === 0) return; // 빈 상태면 호출하지 않음

    const signature = buildEntrySignature(selectedEntries.map((e) => e.id));

    // 캐시 확인
    const cached = getCachedDailySentence(selectedDate, signature);
    if (cached) {
      setDailySentence(cached);
      return;
    }

    // 이미 동일한 날짜에 대한 호출이 진행 중이면 중복 방지
    if (inFlightRef.current === selectedDate) return;
    inFlightRef.current = selectedDate;

    let cancelled = false;
    setIsSentenceLoading(true);

    const payload = {
      date: selectedDate,
      entries: selectedEntries.map((entry) => ({
        content: entry.content,
        mainEmotion: entry.analysis.mainEmotion,
        intensity: entry.analysis.intensity ?? 3,
        empathyMessage: (
          entry.analysis as typeof entry.analysis & { empathyMessage?: string }
        ).empathyMessage,
      })),
    };

    fetch("/api/generate-daily-sentence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`AI 호출 실패: ${res.status}`);
        const data = await res.json();
        const sentence = data.dailySentence;
        if (typeof sentence !== "string" || sentence.trim().length === 0) {
          throw new Error("dailySentence가 비어 있습니다.");
        }
        if (!cancelled) {
          setDailySentence(sentence.trim());
          saveDailySentenceToCache(selectedDate, signature, sentence.trim());
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // 실패 시 fallback 문구 사용
          setDailySentence(pickFallbackSentence(selectedEntries));
          console.warn("daily-sentence 실패, fallback 사용:", (err as Error).message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSentenceLoading(false);
          if (inFlightRef.current === selectedDate) inFlightRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedEntries]);

  // 그날의 한 문장 카드 표시용 값
  const sentenceToDisplay = useMemo(() => {
    if (selectedEntries.length === 0) return "";
    if (dailySentence) return dailySentence;
    // 로딩 중이거나 아직 캐시/AI 결과 없음 → fallback 사용
    if (isSentenceLoading) return ""; // 표시는 로딩 문구로 대체
    return pickFallbackSentence(selectedEntries);
  }, [selectedEntries, dailySentence, isSentenceLoading]);

  const emotionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    monthEntries.forEach((entry) => {
      const emotion = entry.analysis.mainEmotion;
      counts[emotion] = (counts[emotion] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count);
  }, [monthEntries]);

  const monthlyCards = useMemo(() => {
    return Object.entries(entriesByDate)
      .map(([dateKey, entries]) => ({
        dateKey,
        entries,
        mainEmotion: getRepresentativeEmotion(entries),
        reward: getRepresentativeReward(entries),
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [entriesByDate]);

  // 월간 기록 목록용 dailySentence 비동기 관리
  // monthlyCards의 각 날짜에 대해 캐시를 우선 확인하고 없으면 생성 요청
  useEffect(() => {
    if (monthlyCards.length === 0) return;

    // 이미 처리가 진행 중이면 중복 방지
    const needed = monthlyCards
      .filter((card) => {
        if (card.entries.length === 0) return false;
        const signature = buildEntrySignature(card.entries.map((e) => e.id));
        const cached = getCachedDailySentence(card.dateKey, signature);
        if (cached) {
          // 캐시가 있어 monthlySentences에 아직 없으면 state에 반영
          if (!monthlySentences[card.dateKey] || monthlySentences[card.dateKey] !== cached) {
            setMonthlySentences((prev) => ({ ...prev, [card.dateKey]: cached }));
          }
          return false;
        }
        // 이미 in-flight면 스킵
        if (monthlyInFlightRef.current.has(card.dateKey)) return false;
        return true;
      })
      .map((card) => card.dateKey);

    needed.forEach((dateKey) => {
      const card = monthlyCards.find((c) => c.dateKey === dateKey);
      if (!card) return;

      monthlyInFlightRef.current.add(dateKey);
      setMonthlyInFlightDates((prev) => new Set(prev).add(dateKey));
      const signature = buildEntrySignature(card.entries.map((e) => e.id));

      const payload = {
        date: dateKey,
        entries: card.entries.map((entry) => ({
          content: entry.content,
          mainEmotion: entry.analysis.mainEmotion,
          intensity: entry.analysis.intensity ?? 3,
          empathyMessage: (
            entry.analysis as typeof entry.analysis & { empathyMessage?: string }
          ).empathyMessage,
        })),
      };

      fetch("/api/generate-daily-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`AI 호출 실패: ${res.status}`);
          const data = await res.json();
          const sentence = data.dailySentence;
          if (typeof sentence !== "string" || sentence.trim().length === 0) {
            throw new Error("dailySentence가 비어 있습니다.");
          }
          if (!monthlyInFlightRef.current.has(dateKey)) return; // unmount 시 무시
          const trimmed = sentence.trim();
          setMonthlySentences((prev) => ({ ...prev, [dateKey]: trimmed }));
          saveDailySentenceToCache(dateKey, signature, trimmed);
        })
        .catch((err) => {
          // 실패 시에는 monthlySentences에는 넣지 않고 fallback 사용 (render에서 처리)
          console.warn(`월간 목록 daily-sentence 실패(${dateKey}):`, (err as Error).message);
        })
        .finally(() => {
          monthlyInFlightRef.current.delete(dateKey);
          setMonthlyInFlightDates((prev) => {
            const next = new Set(prev);
            next.delete(dateKey);
            return next;
          });
        });
    });
  }, [monthlyCards]);

  const showRewardToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleClaimReportReward = () => {
    const result = claimReportReward();
    setReportRewardClaimed(true);
    showRewardToast(result.message);
  };

  const moveMonth = (amount: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
    setSelectedDate(null);
    setView("calendar");
  };

  const openDetail = (dateKey: string) => {
    setSelectedDate(dateKey);
    setView("detail");
  };

  const goCalendar = () => {
    setSelectedDate(null);
    setView("calendar");
  };

  // 데이터 새로고침 (삭제 후 사용)
  const refreshData = () => {
    applyAutoGrowth();
    setAllEntries(getEntriesWithGrowth());
  };

  // 삭제 요청 (확인 모달 표시)
  const requestDeleteEntry = (entry: DiaryEntry) => {
    setDeleteTargetEntry(entry);
    setShowDeleteModal(true);
  };

  // 삭제 실행
  const handleDeleteEntry = () => {
    if (!deleteTargetEntry) return;

    const entryId = deleteTargetEntry.id;
    const dateKey = getEntryDateKey(deleteTargetEntry);

    // 1. 기록 삭제
    const success = deleteEntry(entryId);
    if (!success) {
      showRewardToast("삭제에 실패했어요.");
      setShowDeleteModal(false);
      setDeleteTargetEntry(null);
      return;
    }

    // 2. 해당 날짜의 dailySentence 캐시 무효화
    invalidateDailySentenceCache(dateKey);

    // 3. 데이터 새로고침
    refreshData();

    // 4. 모달 닫기 및 토스트 표시
    setShowDeleteModal(false);
    setDeleteTargetEntry(null);
    showRewardToast("기록이 삭제되었어요.");
  };

  const renderTopBar = () => (
    <div className="report-topbar mx-auto max-w-md">
      <div className="flex items-center justify-between gap-3">
        {view === "detail" ? (
          <button className="report-icon-button" onClick={goCalendar} aria-label="달력으로 돌아가기">
            ‹
          </button>
        ) : (
          <button className="report-icon-button" onClick={() => moveMonth(-1)} aria-label="이전 달">
            ‹
          </button>
        )}

        <div className="text-center">
          <p className="text-xs font-semibold text-warm-brown/45">
            {view === "detail" && selectedDate ? "마음 기록" : "월간 리포트"}
          </p>
          <h1 className="text-2xl font-black text-warm-brown">
            {view === "detail" && selectedDate ? getKoreanDateLabel(selectedDate) : getMonthLabel(currentMonth)}
          </h1>
        </div>

        {view === "detail" ? (
          <button className="report-icon-button" onClick={goCalendar} aria-label="달력 보기">
            📅
          </button>
        ) : (
          <button className="report-icon-button" onClick={() => moveMonth(1)} aria-label="다음 달">
            ›
          </button>
        )}
      </div>

      {view !== "detail" && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-full bg-white/55 p-1 shadow-sm">
          <button
            onClick={() => setView("calendar")}
            className={`report-view-button ${view === "calendar" ? "is-active" : ""}`}
          >
            📅
          </button>
          <button
            onClick={() => setView("stats")}
            className={`report-view-button ${view === "stats" ? "is-active" : ""}`}
          >
            📊
          </button>
          <button
            onClick={() => setView("list")}
            className={`report-view-button ${view === "list" ? "is-active" : ""}`}
          >
            ☰
          </button>
        </div>
      )}
    </div>
  );

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: 42 }, (_, index) => {
      const day = index - firstDay + 1;
      if (day < 1 || day > daysInMonth) return null;
      return day;
    });

    return (
      <section className="report-card mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-warm-brown">마음정원 달력</h2>
            <p className="mt-1 text-xs text-warm-brown/45">날짜를 누르면 그날의 기록을 볼 수 있어요.</p>
          </div>
          <span className="rounded-full bg-soft-green/20 px-3 py-1 text-xs font-bold text-plant">
            {monthEntries.length}개 기록
          </span>
        </div>
        <div className="report-calendar-grid mb-2 text-xs font-bold text-warm-brown/35">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <div key={day} className="text-center">{day}</div>
          ))}
        </div>
        <div className="report-calendar-grid">
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="report-calendar-empty" />;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEntries = entriesByDate[dateKey] || [];
            const reward = getRepresentativeReward(dayEntries);
            const emotion = getRepresentativeEmotion(dayEntries);
            const hasEntries = dayEntries.length > 0;
            return (
              <button
                key={dateKey}
                className={`report-calendar-day ${dateKey === todayKey ? "is-today" : ""} ${hasEntries ? "has-entry" : ""}`}
                style={hasEntries ? { background: 'transparent !important', boxShadow: 'none !important', border: 'none !important', backgroundColor: 'transparent !important' } : undefined}
                onClick={() => openDetail(dateKey)}
              >
                {!hasEntries && <span className="report-day-number">{day}</span>}
                {hasEntries && <FlowerMark reward={reward} emotion={emotion} />}
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  const renderStats = () => {
    const maxCount = Math.max(1, ...emotionStats.map((item) => item.count));
    return (
      <section className="report-card mx-auto max-w-md">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-black text-warm-brown">{getMonthLabel(currentMonth)} 감정 통계</h2>
          <p className="mt-2 text-sm text-warm-brown/50">이번 달 마음꽃이 남긴 흐름이에요.</p>
        </div>
        {emotionStats.length === 0 ? (
          <EmptyReportState message="이 달은 아직 기록된 마음 씨앗이 없어요." />
        ) : (
          <div className="space-y-4">
            {emotionStats.map((item) => {
              const flower = EMOTION_FLOWER[item.emotion];
              const width = `${Math.max(12, (item.count / maxCount) * 100)}%`;
              return (
                <div key={item.emotion} className="report-stat-row">
                  <FlowerMark emotion={item.emotion} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-warm-brown">{item.emotion} · {flower?.name}</span>
                      <span className="font-black text-warm-brown/70">{item.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/65">
                      <div className="h-full rounded-full bg-soft-green/80" style={{ width }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderList = () => (
    <section className="mx-auto max-w-md space-y-3">
      {monthlyCards.length === 0 ? (
        <div className="report-card">
          <EmptyReportState message="이 달에 작성한 기록이 아직 없어요." />
        </div>
      ) : (
        monthlyCards.map((card) => {
          const cachedSentence = monthlySentences[card.dateKey];
          const isInFlight = !cachedSentence && monthlyInFlightDates.has(card.dateKey);
          let sentenceText = "";
          if (cachedSentence) {
            sentenceText = cachedSentence;
          } else if (isInFlight) {
            sentenceText = ""; // 로딩 문구로 표시
          } else {
            sentenceText = pickFallbackSentence(card.entries);
          }

          return (
            <button key={card.dateKey} className="report-list-card" onClick={() => openDetail(card.dateKey)}>
              <FlowerMark reward={card.reward} emotion={card.mainEmotion} size="md" />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-semibold text-warm-brown/45">{getKoreanDateLabel(card.dateKey)}</p>
                <h2 className="mt-1 text-lg font-black text-warm-brown">{card.mainEmotion || "마음 기록"}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-warm-brown/60">
                  {!cachedSentence && isInFlight ? (
                    <span className="inline-flex items-center gap-1.5 text-warm-brown/45">
                      <span className="animate-pulse">✿</span>
                      <span>그날의 마음을 정리하는 중이에요...</span>
                    </span>
                  ) : (
                    sentenceText
                  )}
                </p>
              </div>
            </button>
          );
        })
      )}
    </section>
  );

  const renderDetail = () => {
    const representativeEmotion = getRepresentativeEmotion(selectedEntries);
    const representativeReward = getRepresentativeReward(selectedEntries);
    const isToday = selectedDate === todayKey;

    return (
      <div className="mx-auto max-w-md space-y-4">
        {selectedEntries.length === 0 ? (
          <section className="report-card py-12">
            <EmptyReportState message="이 날은 아직 심어진 마음 씨앗이 없어요." />
          </section>
        ) : (
          <>
            <section className="report-card representative-card">
              <div className="flex items-center gap-4">
                <FlowerMark reward={representativeReward} emotion={representativeEmotion} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-warm-brown/45">그날의 대표 감정</p>
                  <h2 className="mt-1 text-4xl font-black text-warm-brown">{representativeEmotion}</h2>
                  <p className="mt-2 text-sm font-bold text-warm-brown/65">
                    {representativeReward?.name || EMOTION_FLOWER[representativeEmotion || ""]?.name || "마음꽃"}
                  </p>
                </div>
              </div>
            </section>

            <section className="report-card">
              <h2 className="mb-3 text-lg font-bold text-plant">그날의 기록</h2>
              <div className="space-y-3">
                {selectedEntries.map((entry) => (
                  <article key={entry.id} className="relative rounded-2xl bg-white/55 p-4">
                    <button
                      onClick={() => requestDeleteEntry(entry)}
                      className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-warm-brown/30 transition-colors hover:bg-red-50 hover:text-red-400"
                      aria-label="기록 삭제"
                      title="삭제"
                    >
                      🗑️
                    </button>
                    <div className="mb-2 flex items-center justify-between text-xs text-warm-brown/45">
                      <span>{entry.analysis.mainEmotion}</span>
                      <span>
                        {new Date(entry.createdAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-warm-brown/75 pr-6">{entry.content}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="report-card">
              <h2 className="mb-3 text-lg font-bold text-plant">그날 심은 꽃</h2>
              <div className="flex flex-wrap gap-2">
                {selectedEntries.map((entry) => {
                  const flower = entry.analysis.gardenReward;
                  const stage = flower.growthStage || "seed";
                  const stageName = stage === "seed" ? "씨앗" : stage === "sprout" ? "새싹" : "꽃";
                  return (
                    <span key={entry.id} className="report-flower-chip">
                      <span>{getStageEmoji(stage, flower.emoji)}</span>
                      <span>{flower.name}</span>
                      {stage !== "bloom" && <span className="text-warm-brown/40">{stageName}</span>}
                    </span>
                  );
                })}
              </div>
            </section>

            <section className="report-card sentence-card">
              <h2 className="mb-3 text-lg font-bold text-plant">그날의 한 문장</h2>
              <p className="rounded-2xl border border-amber-100/80 bg-white/50 px-4 py-4 text-center text-sm leading-relaxed text-warm-brown/75">
                {isSentenceLoading ? (
                  <span className="inline-flex items-center gap-2 text-warm-brown/50">
                    <span className="animate-pulse">✿</span>
                    <span>오늘의 마음을 정리하는 중이에요...</span>
                  </span>
                ) : sentenceToDisplay || getDailyMessage(selectedEntries)}
              </p>
            </section>

            {isToday && (
              <section className="report-card reward-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-4xl shadow-inner">
                    💧
                  </div>
                  <div>
                    <h2 className="font-bold text-warm-brown">리포트 보상</h2>
                    <p className="mt-1 text-xs text-warm-brown/50">오늘 마음을 정리한 물방울이에요.</p>
                  </div>
                </div>
                <button
                  onClick={handleClaimReportReward}
                  disabled={reportRewardClaimed}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                    reportRewardClaimed
                      ? "border border-blue-100 bg-blue-50/70 text-blue-300"
                      : "bg-soft-green text-warm-brown shadow-md hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                  }`}
                >
                  {reportRewardClaimed ? "💧 오늘의 리포트 보상을 받았어요" : "💧 리포트 정리 보상 받기"}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="daily-report-page min-h-screen px-5 py-6 pb-24 animate-fade-in">
      {renderTopBar()}
      <div className="mt-5">
        {view === "calendar" && renderCalendar()}
        {view === "stats" && renderStats()}
        {view === "list" && renderList()}
        {view === "detail" && renderDetail()}
      </div>

      {/* 클라우드 백업 안내 배너 (하단 고정, 로그인 안 한 경우만 표시) */}
      <div className="mx-auto max-w-md mt-8 mb-4">
        <CloudBackupBanner />
      </div>

      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-beige/50 text-sm text-warm-brown whitespace-nowrap">
            {toastMessage}
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && deleteTargetEntry && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-xl border border-beige/50">
            <div className="mb-4 text-center">
              <div className="mb-3 text-4xl">🗑️</div>
              <h3 className="text-lg font-bold text-warm-brown">이 기록을 삭제할까요?</h3>
              <p className="mt-2 text-sm text-warm-brown/60">
                정원에 심어진 꽃도 함께 사라져요.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTargetEntry(null);
                }}
                className="flex-1 rounded-xl border border-warm-brown/10 bg-white/80 px-4 py-3 text-sm font-bold text-warm-brown/60 transition-colors hover:bg-warm-brown/5"
              >
                취소
              </button>
              <button
                onClick={handleDeleteEntry}
                className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-100"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyReportState({ message }: { message: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-soft-green/20 text-4xl">
        🌱
      </div>
      <p className="mx-auto max-w-[260px] text-sm leading-relaxed text-warm-brown/55">{message}</p>
    </div>
  );
}
