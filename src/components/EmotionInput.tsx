"use client";

import { useState } from "react";
import { analyzeEmotion } from "@/lib/analyzeEmotion";
import { saveEntry } from "@/lib/storage";
import { DiaryEntry, EmotionAnalysis } from "@/types/emotion";

interface EmotionInputProps {
  onEntrySaved: (entry: DiaryEntry) => void;
}

export default function EmotionInput({ onEntrySaved }: EmotionInputProps) {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);

    // 감정 분석 수행
    const analysis: EmotionAnalysis = await analyzeEmotion(text);

    // 새 기록 생성
    const newEntry: DiaryEntry = {
      id: Date.now().toString(),
      content: text,
      createdAt: new Date().toISOString(),
      analysis,
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