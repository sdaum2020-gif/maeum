"use client";

import { useState, useMemo } from "react";
import { analyzeEmotion } from "@/lib/analyzeEmotion";
import { saveEntry } from "@/lib/storage";
import { DiaryEntry, EmotionAnalysis } from "@/types/emotion";

interface EmotionInputProps {
  onEntrySaved: (entry: DiaryEntry) => void;
}

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// YYYY-MM-DD 형식의 날짜를 한국어 요일로 변환
function getKoreanDayOfWeek(dateString: string): string {
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const date = new Date(`${dateString}T00:00:00`);
  return days[date.getDay()];
}

// YYYY-MM-DD 형식의 날짜를 한국어로 포맷팅
function formatKoreanDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default function EmotionInput({ onEntrySaved }: EmotionInputProps) {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordDate, setRecordDate] = useState(getTodayString());

  const todayString = getTodayString();
  const isToday = recordDate === todayString;

  // 선택된 날짜의 한국어 표시
  const dateDisplay = useMemo(() => {
    const formattedDate = formatKoreanDate(recordDate);
    const dayOfWeek = getKoreanDayOfWeek(recordDate);
    return isToday ? `오늘 · ${formattedDate} ${dayOfWeek}` : `${formattedDate} ${dayOfWeek}`;
  }, [recordDate, isToday]);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);

    // 감정 분석 수행
    const analysis: EmotionAnalysis = await analyzeEmotion(text);

    // 현재 시각 (createdAt, plantedAt용)
    const now = new Date().toISOString();

    // 새 기록 생성
    const newEntry: DiaryEntry = {
      id: Date.now().toString(),
      content: text,
      createdAt: now, // 실제 작성 시각
      recordDate: recordDate, // 사용자가 선택한 기록 날짜
      analysis: {
        ...analysis,
        gardenReward: {
          ...analysis.gardenReward,
          plantedAt: now, // 실제 작성 시각을 plantedAt으로 사용
        },
      },
    };

    // localStorage에 저장
    saveEntry(newEntry);

    // 부모 컴포넌트에 알림
    onEntrySaved(newEntry);

    // 입력 초기화
    setText("");
    setIsAnalyzing(false);
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-3 animate-float">🌱</div>
        <h1 className="text-2xl font-bold text-warm-brown mb-2">
          오늘의 마음
        </h1>
        <p className="text-warm-brown/70 text-sm">
          지금 느끼고 있는 감정을 자유롭게 적어보세요
        </p>
      </div>

      {/* 날짜 선택 영역 */}
      <div className="card mb-4">
        <label className="block text-sm font-bold text-warm-brown mb-2">
          📅 기록할 날짜
        </label>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            max={todayString}
            disabled={isAnalyzing}
            className="flex-1 px-4 py-2 rounded-xl border border-beige/50 bg-white/50 text-warm-brown text-sm font-medium outline-none focus:border-soft-green/50 focus:ring-2 focus:ring-soft-green/20 transition-all disabled:opacity-50"
          />
          <span className="text-sm text-warm-brown/70 font-medium whitespace-nowrap">
            {dateDisplay}
          </span>
        </div>
        {!isToday && (
          <p className="mt-2 text-xs text-warm-brown/50">
            💡 과거 날짜의 감정을 기록할 수 있어요. 꽃은 지금 심어집니다.
          </p>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="card mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="오늘 어떤 하루였나요?&#10;느끼고 있는 감정을 자유롭게 적어보세요..."
          className="w-full h-48 p-4 bg-transparent resize-none outline-none text-warm-brown placeholder-warm-brown/40"
          disabled={isAnalyzing}
        />
        <div className="flex justify-between items-center text-sm text-warm-brown/50">
          <span>{text.length}자</span>
          <span>💧 햇빛을 머금은 씨앗이 꽃으로 피어날 거예요</span>
        </div>
      </div>

      {/* 기록 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || isAnalyzing}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">🌸</span>
            감정 분석 중...
          </span>
        ) : (
          <span>🌱 정원에 기록 심기</span>
        )}
      </button>

      {/* 안내 문구 */}
      <p className="text-center text-warm-brown/50 text-xs mt-4">
        기록은 당신의 마음정원에 Flower로 저장돼요
      </p>
    </div>
  );
}