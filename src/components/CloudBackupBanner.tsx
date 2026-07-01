"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { backupEntriesToSupabase, getBackupCount, BackupResult } from "@/lib/cloudBackup";
import { restoreFromSupabase, RestoreResult } from "@/lib/cloudRestore";

/**
 * 클라우드 백업 안내 배너 컴포넌트
 * - 비로그인 상태: 클라우드 백업 안내 및 Google 로그인 버튼 표시
 * - 로그인 상태: 백업/내려받기 버튼 및 상태 표시
 */
export default function CloudBackupBanner() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  // 백업 관련 상태
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [backupCount, setBackupCount] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 내려받기 관련 상태
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [showRestoreResult, setShowRestoreResult] = useState(false);
  
  // 확인 모달 상태
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 로그인 시 백업된 기록 수 조회
  useEffect(() => {
    if (user) {
      getBackupCount(user.id).then((count) => {
        setBackupCount(count);
      });
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("로그인 실패:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setBackupResult(null);
    setBackupCount(null);
    setShowResult(false);
    setShowRestoreResult(false);
    router.refresh();
  };

  const handleBackup = async () => {
    if (!user) return;
    
    setIsBackingUp(true);
    setBackupResult(null);
    setShowResult(false);
    setShowRestoreResult(false);

    try {
      const result = await backupEntriesToSupabase(user.id);
      setBackupResult(result);
      setShowResult(true);
      
      // 백업 수 업데이트
      if (result.success) {
        const newCount = await getBackupCount(user.id);
        setBackupCount(newCount);
      }

      setTimeout(() => {
        setShowResult(false);
      }, 5000);
    } catch (error) {
      console.error("백업 실패:", error);
      setBackupResult({
        success: false,
        totalCount: 0,
        backedUpCount: 0,
        skippedCount: 0,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      });
      setShowResult(true);
    } finally {
      setIsBackingUp(false);
    }
  };

  const openRestoreModal = () => {
    setShowConfirmModal(true);
  };

  const handleRestore = async () => {
    if (!user) return;
    setShowConfirmModal(false);
    setIsRestoring(true);
    setRestoreResult(null);
    setShowRestoreResult(false);
    setShowResult(false);

    try {
      const result = await restoreFromSupabase(user.id);
      setRestoreResult(result);
      setShowRestoreResult(true);

      setTimeout(() => {
        setShowRestoreResult(false);
      }, 5000);
    } catch (error) {
      console.error("내려받기 실패:", error);
      setRestoreResult({
        success: false,
        totalCount: 0,
        addedCount: 0,
        skippedCount: 0,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      });
      setShowRestoreResult(true);
    } finally {
      setIsRestoring(false);
    }
  };

  const cancelRestore = () => {
    setShowConfirmModal(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // 로그인 상태: 백업/내려받기 UI 표시
  if (user) {
    return (
      <>
        <div className="mx-4 mt-2 px-4 py-3 bg-soft-green/10 border border-soft-green/30 rounded-xl">
          {/* 상단: 로그인 상태 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">☁️</span>
              <span className="text-xs font-medium text-warm-brown/80">
                Google 계정으로 로그인됨
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs px-2.5 py-1 text-warm-brown/60 hover:text-warm-brown hover:bg-warm-brown/5 rounded-lg transition-all"
            >
              로그아웃
            </button>
          </div>

          {/* 이메일 */}
          <p className="text-xs text-warm-brown/50 mb-3">
            {user.email}
          </p>

          {/* 안내 문구 */}
          <p className="text-xs text-warm-brown/60 mb-3">
            이 기기의 기록을 백업하거나, 클라우드 기록을 가져올 수 있어요.
          </p>

          {/* 백업된 기록 수 표시 */}
          {backupCount !== null && backupCount > 0 && (
            <p className="text-xs text-warm-brown/50 mb-2">
              클라우드에 {backupCount}개 기록이 저장되어 있어요.
            </p>
          )}

          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            {/* 백업 버튼 */}
            <button
              onClick={handleBackup}
              disabled={isBackingUp || isRestoring}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-soft-green text-warm-brown rounded-lg shadow-sm hover:shadow-md hover:bg-soft-green/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {isBackingUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-warm-brown/50"></div>
                  <span>백업 중...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>백업하기</span>
                </>
              )}
            </button>

            {/* 내려받기 버튼 */}
            <button
              onClick={openRestoreModal}
              disabled={isRestoring || isBackingUp}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-100 text-sky-700 border border-sky-200 rounded-lg shadow-sm hover:shadow-md hover:bg-sky-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {isRestoring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-700/50"></div>
                  <span>가져오는 중...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>내려받기</span>
                </>
              )}
            </button>
          </div>

          {/* 백업 결과 표시 */}
          {showResult && backupResult && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-xs ${
              backupResult.success 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {backupResult.success ? (
                <span>
                  ✓ 기록 백업이 완료되었어요. ({backupResult.backedUpCount}개 기록 백업 완료)
                </span>
              ) : (
                <span>
                  ✗ 백업 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.
                </span>
              )}
            </div>
          )}

          {/* 내려받기 결과 표시 */}
          {showRestoreResult && restoreResult && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-xs ${
              restoreResult.success 
                ? "bg-blue-50 text-blue-700 border border-blue-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {restoreResult.success ? (
                <span>
                  {restoreResult.addedCount > 0
                    ? `✓ 새 기록 ${restoreResult.addedCount}개를 가져왔어요.`
                    : "✓ 이미 이 기기에 모든 기록이 있어요."}
                </span>
              ) : (
                <span>
                  ✗ 기록을 가져오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.
                </span>
              )}
            </div>
          )}
        </div>

        {/* 확인 모달 - 내려받기 전 */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-xl border border-beige/50">
              <div className="mb-4 text-center">
                <div className="mb-3 text-4xl"></div>
                <h3 className="text-lg font-bold text-warm-brown">
                  클라우드에 백업된 기록을 이 기기로 가져올까요?
                </h3>
                <p className="mt-2 text-sm text-warm-brown/60">
                  현재 기기의 기록은 삭제되지 않고, 없는 기록만 추가돼요.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelRestore}
                  className="flex-1 rounded-xl border border-warm-brown/10 bg-white/80 px-4 py-3 text-sm font-bold text-warm-brown/60 transition-colors hover:bg-warm-brown/5"
                >
                  취소
                </button>
                <button
                  onClick={handleRestore}
                  className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-600"
                >
                  가져오기
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 사용자가 닫은 경우 표시하지 않음
  if (isDismissed) {
    return null;
  }

  // 비로그인 상태: 클라우드 백업 안내
  return (
    <div className="mx-4 mt-2 px-4 py-3 bg-gradient-to-r from-amber-50 to-soft-green/10 border border-amber-200/50 rounded-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm"></span>
            <span className="text-xs font-medium text-warm-brown/80">
              이 기기에만 저장 중
            </span>
          </div>
          <p className="text-xs text-warm-brown/60 leading-relaxed">
            기록을 안전하게 백업하려면 Google로 로그인해 주세요.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-warm-brown/40 hover:text-warm-brown/70 text-lg leading-none p-0.5"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
      <button
        onClick={handleGoogleLogin}
        disabled={isLoggingIn}
        className="mt-2.5 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoggingIn ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-warm-brown/50"></div>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        <span className="text-sm text-gray-700 font-medium">
          Google로 백업 시작하기
        </span>
      </button>
    </div>
  );
}