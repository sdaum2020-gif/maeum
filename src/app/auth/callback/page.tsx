"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        setError(error.message);
        return;
      }
      // 로그인 성공 시 정원 페이지로 이동
      router.push("/garden");
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">인증 오류: {error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-soft-green text-white rounded-lg"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-soft-green mx-auto mb-4"></div>
        <p className="text-warm-brown">로그인 처리 중...</p>
      </div>
    </div>
  );
}