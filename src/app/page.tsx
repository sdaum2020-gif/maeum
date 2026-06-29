"use client";

import { useState, useEffect } from "react";
import EmotionInput from "@/components/EmotionInput";
import AnalysisResult from "@/components/AnalysisResult";
import MindGarden from "@/components/MindGarden";
import DailyReport from "@/components/DailyReport";
import { DiaryEntry } from "@/types/emotion";
import { getTodayEntries } from "@/lib/storage";
import { grantEntryReward, grantDeepEmotionReward } from "@/lib/waterRewards";

type ViewType = "input" | "result" | "garden" | "report";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>("garden");
  const [lastEntry, setLastEntry] = useState<DiaryEntry | null>(null);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleEntrySaved = (entry: DiaryEntry) => {
    setLastEntry(entry);

    // 물방울 보상 지급
    const todayEntries = getTodayEntries();
    const todayCount = todayEntries.length - 1; // 방금 저장한 기록 제외

    // 감정기록 보상 (첫 기록, 두 번째 기록)
    grantEntryReward(todayCount);

    // 깊은 마음 기록 보상 (intensity >= 4)
    grantDeepEmotionReward(entry.analysis.intensity);

    // 감정 정리 결과 화면으로 이동
    setCurrentView("result");
  };

  const handleBackToInput = () => {
    setCurrentView("input");
    setLastEntry(null);
  };

  const handleGoToGarden = () => {
    setCurrentView("garden");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 메인 컨텐츠 */}
      <main className="flex-1 pb-20">
        {currentView === "input" && (
          <EmotionInput onEntrySaved={handleEntrySaved} />
        )}
        {currentView === "result" && lastEntry && (
          <AnalysisResult entry={lastEntry} onClose={handleBackToInput} onGoToGarden={handleGoToGarden} />
        )}
        {currentView === "garden" && <MindGarden lastPlantedEntry={lastEntry} />}
        {currentView === "report" && <DailyReport />}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-beige/50">
        <div className="max-w-md mx-auto flex justify-around items-center py-2">
          <NavButton
            icon="🌱"
            label="기록하기"
            isActive={currentView === "input"}
            onClick={() => setCurrentView("input")}
          />
          <NavButton
            icon="🌷"
            label="정원"
            isActive={currentView === "garden"}
            onClick={() => setCurrentView("garden")}
          />
          <NavButton
            icon="📝"
            label="기록보기"
            isActive={currentView === "report"}
            onClick={() => setCurrentView("report")}
          />
        </div>
      </nav>
    </div>
  );
}

interface NavButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, isActive, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
        isActive
          ? "bg-soft-green/20 text-warm-brown"
          : "text-warm-brown/50 hover:text-warm-brown"
      }`}
    >
      <span className={`text-xl ${isActive ? "scale-110" : ""} transition-transform`}>
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
