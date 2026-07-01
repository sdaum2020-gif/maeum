"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStart = () => {
    router.push("/garden");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* 상단 네비 */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-float">🌱</span>
          <span className="text-lg font-bold text-warm-brown">마음정원</span>
        </div>
        <button
          onClick={handleStart}
          className="text-sm font-medium text-warm-brown/70 hover:text-warm-brown transition-colors"
        >
          시작하기 →
        </button>
      </header>

      {/* Hero Section */}
      <section className="landing-hero relative flex min-h-screen flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* 부유하는 꽃들 배경 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src="/assets/plants/lavender.png"
            alt=""
            className="absolute left-[8%] top-[22%] w-16 opacity-70 animate-float"
            style={{ animationDelay: "0s" }}
          />
          <img
            src="/assets/plants/sunflower.png"
            alt=""
            className="absolute right-[10%] top-[18%] w-20 opacity-70 animate-float"
            style={{ animationDelay: "0.8s" }}
          />
          <img
            src="/assets/plants/forget-me-not.png"
            alt=""
            className="absolute left-[14%] bottom-[20%] w-14 opacity-60 animate-float"
            style={{ animationDelay: "1.4s" }}
          />
          <img
            src="/assets/plants/cotton-flower.png"
            alt=""
            className="absolute right-[12%] bottom-[24%] w-16 opacity-60 animate-float"
            style={{ animationDelay: "0.4s" }}
          />
          <img
            src="/assets/plants/wildflower.png"
            alt=""
            className="absolute left-[44%] top-[12%] w-12 opacity-50 animate-float"
            style={{ animationDelay: "1.8s" }}
          />
        </div>

        <div className={`relative z-10 max-w-2xl ${mounted ? "animate-fade-in" : "opacity-0"}`}>
          <div className="mb-6 text-6xl animate-float">🌷</div>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-warm-brown sm:text-5xl">
            오늘의 마음을
            <br />
            꽃으로 피워보세요
          </h1>
          <p className="mb-10 text-base leading-relaxed text-warm-brown/70 sm:text-lg">
            복잡한 감정을 적으면, 그 마음이 정원에 꽃으로 피어납니다.
            <br />
            매일 조금씩, 당신만의 마음정원을 가꿔보세요.
          </p>
          <button
            onClick={handleStart}
            className="group inline-flex items-center gap-2 rounded-full bg-soft-green/80 px-8 py-4 text-lg font-bold text-warm-brown shadow-lg transition-all duration-300 hover:scale-105 hover:bg-soft-green hover:shadow-xl"
          >
            <span>🌱 정원 시작하기</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
          <p className="mt-6 text-sm text-warm-brown/50">
            가입 없이 바로 시작할 수 있어요
          </p>
        </div>

        {/* 스크롤 유도 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-subtle">
          <span className="text-2xl text-warm-brown/40">↓</span>
        </div>
      </section>

      {/* 감정 → 꽃 매핑 섹션 */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block rounded-full bg-soft-yellow/40 px-4 py-1 text-sm font-medium text-warm-brown">
              감정이 피어나는 방식
            </span>
            <h2 className="mb-4 text-3xl font-bold text-warm-brown sm:text-4xl">
              감정마다 다른 꽃이 피어나요
            </h2>
            <p className="text-warm-brown/60 leading-relaxed">
              당신의 감정을 AI가 분석해
              <br className="sm:hidden" />
              어울리는 꽃으로 심어드려요
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <FlowerCard emoji="💜" name="라벤더" emotion="불안" desc="불안한 마음을 차분하게" img="/assets/plants/lavender.png" delay="0s" />
            <FlowerCard emoji="🌻" name="해바라기" emotion="기쁨" desc="기쁜 마음을 환하게" img="/assets/plants/sunflower.png" delay="0.15s" />
            <FlowerCard emoji="🌼" name="물망초" emotion="슬픔" desc="슬픈 마음을 조용히" img="/assets/plants/forget-me-not.png" delay="0.3s" />
            <FlowerCard emoji="🌵" name="선인장꽃" emotion="분노" desc="날카로운 마음을 식히며" img="/assets/plants/cactus-flower.png" delay="0.45s" />
            <FlowerCard emoji="🤍" name="목화꽃" emotion="지침" desc="지친 마음을 포근하게" img="/assets/plants/cotton-flower.png" delay="0.6s" />
            <FlowerCard emoji="🌸" name="들꽃" emotion="복잡함" desc="복잡한 마음 사이에" img="/assets/plants/wildflower.png" delay="0.75s" />
          </div>
        </div>
      </section>

      {/* 성장 스토리 섹션 */}
      <section className="relative px-6 py-24 sm:py-32 bg-gradient-to-b from-transparent via-soft-green/10 to-transparent">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-3 inline-block rounded-full bg-soft-green/20 px-4 py-1 text-sm font-medium text-warm-brown">
            씨앗에서 꽃까지
          </span>
          <h2 className="mb-12 text-3xl font-bold text-warm-brown sm:text-4xl">
            시간이 흐르면, 꽃이 피어나요
          </h2>

          <div className="flex flex-col items-center gap-10 sm:flex-row sm:justify-center sm:gap-16">
            <GrowthStep
              img="/assets/plants/seed.png"
              emoji="🌱"
              title="씨앗"
              desc="감정을 기록하면 씨앗이 심겨요"
            />
            <div className="hidden text-3xl text-warm-brown/30 sm:block">→</div>
            <GrowthStep
              img="/assets/plants/sprout.png"
              emoji="🌿"
              title="새싹"
              desc="조금씩 자라나며 마음이 정리돼요"
            />
            <div className="hidden text-3xl text-warm-brown/30 sm:block">→</div>
            <GrowthStep
              img="/assets/plants/sunflower.png"
              emoji="🌻"
              title="꽃"
              desc="시간이 지나면 아름답게 피어나요"
            />
          </div>

          <p className="mt-14 text-warm-brown/60 leading-relaxed">
            깊은 마음일수록 더 천천히, 더 크게 피어납니다.
            <br />
            서두르지 않아도 괜찮아요.
          </p>
        </div>
      </section>

      {/* 기능 소개 섹션 */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block rounded-full bg-soft-yellow/40 px-4 py-1 text-sm font-medium text-warm-brown">
              마음정원의 기능
            </span>
            <h2 className="mb-4 text-3xl font-bold text-warm-brown sm:text-4xl">
              당신의 마음을 돌보는 세 가지
            </h2>
          </div>

          <div className="space-y-6">
            <FeatureCard
              emoji="📝"
              title="감정 기록하기"
              desc="오늘 느끼고 있는 감정을 자유롭게 적어보세요. AI가 당신의 감정을 분석해 공감의 메시지를 전해드려요."
              color="bg-soft-yellow/20"
            />
            <FeatureCard
              emoji="🌷"
              title="마음정원 가꾸기"
              desc="기록한 감정이 꽃으로 피어나 정원을 채워요. 물방울을 모아 꽃에 물을 주고, 원하는 자리에 꽃을 배치해보세요."
              color="bg-soft-green/20"
            />
            <FeatureCard
              emoji="📊"
              title="감정 리포트"
              desc="한 달의 감정 흐름을 달력과 그래프로 만나보세요. 내 마음이 어떻게 흘러갔는지 돌아볼 수 있어요."
              color="bg-cream/40"
            />
          </div>
        </div>
      </section>

      {/* 따뜻한 후킹 섹션 */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 text-5xl animate-float">🤍</div>
          <blockquote className="mb-6 text-2xl font-bold leading-relaxed text-warm-brown sm:text-3xl">
            &ldquo;오늘 하루도 참 애썼어요.
            <br />
            그 마음, 여기 정원에
            <br />
            잠시 내려놓아도 좋아요.&rdquo;
          </blockquote>
          <p className="text-warm-brown/60 leading-relaxed">
            완벽하지 않아도 괜찮아요.
            <br />
            어떤 감정이든 정원에서 환영해요.
            <br />
            당신의 마음이 피어나는 곳, 마음정원.
          </p>
        </div>
      </section>

      {/* 최종 CTA 섹션 */}
      <section className="relative px-6 py-24 sm:py-32 bg-gradient-to-b from-transparent to-soft-green/15">
        <div className="mx-auto max-w-xl text-center">
          {/* 식물들 모음 */}
          <div className="mb-8 flex items-end justify-center gap-2">
            <img src="/assets/plants/lavender.png" alt="" className="w-12 animate-float" style={{ animationDelay: "0s" }} />
            <img src="/assets/plants/sunflower.png" alt="" className="w-16 animate-float" style={{ animationDelay: "0.5s" }} />
            <img src="/assets/plants/forget-me-not.png" alt="" className="w-12 animate-float" style={{ animationDelay: "1s" }} />
            <img src="/assets/plants/wildflower.png" alt="" className="w-14 animate-float" style={{ animationDelay: "1.5s" }} />
            <img src="/assets/plants/cotton-flower.png" alt="" className="w-12 animate-float" style={{ animationDelay: "2s" }} />
          </div>

          <h2 className="mb-4 text-3xl font-bold text-warm-brown sm:text-4xl">
            당신만의 정원을
            <br />
            지금 시작해보세요
          </h2>
          <p className="mb-10 text-warm-brown/60 leading-relaxed">
            첫 감정을 기록하면,
            <br />
            바로 씨앗이 심겨요 🌱
          </p>
          <button
            onClick={handleStart}
            className="group inline-flex items-center gap-2 rounded-full bg-soft-green/80 px-10 py-5 text-xl font-bold text-warm-brown shadow-xl transition-all duration-300 hover:scale-105 hover:bg-soft-green hover:shadow-2xl"
          >
            <span>시작하기</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="px-6 py-12 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="text-xl">🌱</span>
          <span className="font-bold text-warm-brown">마음정원</span>
        </div>
        <p className="text-sm text-warm-brown/50 leading-relaxed">
          나의 마음을 기록하고 정원처럼 가꾸는 감정일기
        </p>
        <p className="mt-2 text-xs text-warm-brown/40">
          © 2026 마음정원 · 당신의 마음이 피어나는 곳
        </p>
      </footer>
    </div>
  );
}

// 꽃 카드 컴포넌트
function FlowerCard({
  emoji,
  name,
  emotion,
  desc,
  img,
  delay,
}: {
  emoji: string;
  name: string;
  emotion: string;
  desc: string;
  img: string;
  delay: string;
}) {
  return (
    <div
      className="group flex flex-col items-center rounded-3xl border border-beige/50 bg-white/60 p-6 text-center shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-md"
      style={{ animationDelay: delay }}
    >
      <div className="mb-3 flex h-20 w-20 items-center justify-center">
        <img
          src={img}
          alt={name}
          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <span className="mb-1 text-2xl">{emoji}</span>
      <h3 className="mb-1 text-lg font-bold text-warm-brown">{name}</h3>
      <p className="mb-2 text-xs font-medium text-soft-green/80">{emotion}</p>
      <p className="text-xs leading-relaxed text-warm-brown/60">{desc}</p>
    </div>
  );
}

// 성장 단계 컴포넌트
function GrowthStep({
  img,
  emoji,
  title,
  desc,
}: {
  img: string;
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-24 w-24 items-center justify-center">
        <img src={img} alt={title} className="max-h-full max-w-full object-contain animate-float" />
      </div>
      <span className="mb-2 text-3xl">{emoji}</span>
      <h3 className="mb-2 text-xl font-bold text-warm-brown">{title}</h3>
      <p className="text-sm leading-relaxed text-warm-brown/60">{desc}</p>
    </div>
  );
}

// 기능 카드 컴포넌트
function FeatureCard({
  emoji,
  title,
  desc,
  color,
}: {
  emoji: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className={`flex items-start gap-5 rounded-3xl ${color} border border-beige/50 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md sm:p-8`}>
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/60 text-3xl shadow-sm">
        {emoji}
      </div>
      <div>
        <h3 className="mb-2 text-xl font-bold text-warm-brown">{title}</h3>
        <p className="text-sm leading-relaxed text-warm-brown/70">{desc}</p>
      </div>
    </div>
  );
}