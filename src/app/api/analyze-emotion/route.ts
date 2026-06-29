import { NextRequest, NextResponse } from "next/server";

// 허용되는 대표 감정 목록
const ALLOWED_EMOTIONS = ["불안", "슬픔", "분노", "기쁨", "지침", "복잡함"] as const;

// 감정별 꽃 매핑
const FLOWER_MAP: Record<string, { type: string; name: string; description: string; emoji: string }> = {
  불안: {
    type: "lavender",
    name: "라벤더",
    emoji: "💜",
    description: "불안한 마음을 차분하게 감싸주는 라벤더가 피어났어요.",
  },
  슬픔: {
    type: "forget-me-not",
    name: "물망초",
    emoji: "🌼",
    description: "속상한 마음을 조용히 안아주는 물망초가 피어났어요.",
  },
  분노: {
    type: "cactus-flower",
    name: "선인장꽃",
    emoji: "🌵",
    description: "날카로웠던 마음을 천천히 식혀주는 선인장꽃이 피어났어요.",
  },
  기쁨: {
    type: "sunflower",
    name: "해바라기",
    emoji: "🌻",
    description: "기쁜 마음을 환하게 비추는 해바라기가 피어났어요.",
  },
  지침: {
    type: "cotton-flower",
    name: "목화꽃",
    emoji: "🤍",
    description: "지친 마음을 포근하게 쉬게 해주는 목화꽃이 피어났어요.",
  },
  복잡함: {
    type: "wildflower",
    name: "들꽃",
    emoji: "🌸",
    description: "복잡한 마음 사이에 작은 들꽃이 피어났어요.",
  },
};

// OpenRouter 시스템 프롬프트 (개인화된 공감 메시지 강조)
const SYSTEM_PROMPT = `너는 감정일기 앱 "마음정원"의 감정 분석 도우미다.
사용자가 쓴 글을 읽고 감정을 분석하되, 공감 메시지(empathyMessage)는 반드시 사용자가 쓴 구체적인 상황을 반영해야 한다.

가장 중요한 규칙:
- 일반적인 위로 문구("힘들었겠어요", "괜찮아요", "잘했어요" 등)만 단독으로 쓰지 마라.
- 사용자가 쓴 글에 나온 구체적인 사건, 대상, 표현, 단어 중 최소 1개를 자연스럽게 언급하라.
- 사용자가 말하지 않은 감정이나 사건을 지어내지 마라.
- 사용자의 표현을 그대로 길게 복사하지 말고 자연스럽게 바꿔 말하라.

recentContext(최근 기록 맥락)가 제공되면:
- 오늘의 감정이 어떤 흐름 위에 있는지 아주 짧게 참고한다.
- 예: "어제 불안이 길어졌던 만큼 오늘도 그 여운이 남아 있을 수 있어요."
- recentContext가 제공되지 않거나 비어 있어도 정상 작동해야 한다.

empathyMessage 작성 규칙:
- 반드시 1~2문장으로 짧게 작성한다.
- 따뜻하지만 과장하지 않는다.
- 해결책을 강요하거나 훈계하지 않는다.
- 반말을 쓰지 않는다.
- 사용자를 평가하지 않는다.

좋은 예시:
입력: "점심을 새로운 맛집에 갔는데 성공해서 좋았다"
응답: {"mainEmotion":"기쁨","subEmotions":["설렘","만족"],"intensity":3,"empathyMessage":"새로운 맛집을 시도해서 성공한 점심이 오늘의 기분을 환하게 만들어준 것 같아요. 그 작은 성공이 정원에 밝게 남았네요.","gardenReward":{"type":"sunflower","name":"해바라기","description":"기쁜 마음을 환하게 비추는 해바라기가 피어났어요."}}

입력: "발표가 망한 것 같아서 계속 신경 쓰였다"
응답: {"mainEmotion":"불안","subEmotions":["걱정"],"intensity":4,"empathyMessage":"발표가 마음에 계속 걸린 만큼, 오늘은 그 긴장이 오래 남아 있었던 것 같아요. 그래도 이 마음을 적어낸 것만으로도 조금은 정리될 수 있어요.","gardenReward":{"type":"lavender","name":"라벤더","description":"불안한 마음을 차분하게 감싸주는 라벤더가 피어났어요."}}

입력: "하루종일 피곤하고 아무것도 하기 싫었다"
응답: {"mainEmotion":"지침","subEmotions":["무기력"],"intensity":4,"empathyMessage":"하루종일 몸과 마음이 무거웠던 날이었네요. 오늘은 무언가를 해내기보다, 지친 마음을 알아차린 것만으로도 충분해요.","gardenReward":{"type":"cotton-flower","name":"목화꽃","description":"지친 마음을 포근하게 쉬게 해주는 목화꽃이 피어났어요."}}

전체 응답은 반드시 JSON만 반환한다.
마크다운, 코드블록, 긴 설명문은 절대 넣지 않는다.

분석해야 할 항목:
- mainEmotion: 대표 감정 (반드시 아래 중 하나만 선택)
- subEmotions: 하위 감정 배열 (문자열 배열)
- intensity: 감정 강도 (1~5 정수, 1=아주 가벼움, 5=아주 깊고 강함)
- empathyMessage: 위에서 설명한 개인화된 공감 메시지 (1~2문장)
- gardenReward: emotion에 해당하는 꽃 정보

mainEmotion은 반드시 아래 중 하나만 선택한다:
불안, 슬픔, 분노, 기쁨, 지침, 복잡함

gardenReward는 mainEmotion에 따라 정해진 꽃을 사용한다:
불안: type "lavender", name "라벤더"
슬픔: type "forget-me-not", name "물망초"
분노: type "cactus-flower", name "선인장꽃"
기쁨: type "sunflower", name "해바라기"
지침: type "cotton-flower", name "목화꽃"
복잡함: type "wildflower", name "들꽃"

empathyMessage는 짧고 따뜻하게 작성한다.
사용자의 감정을 단정하지 말고 부드럽게 표현한다.

응답 JSON 예시:
{"mainEmotion":"불안","subEmotions":["걱정","긴장"],"intensity":4,"empathyMessage":"오늘 마음이 많이 복잡했겠어요. 그래도 이렇게 기록한 것만으로도 마음을 정리하는 첫걸음이에요.","gardenReward":{"type":"lavender","name":"라벤더","description":"불안한 마음을 차분하게 감싸주는 라벤더가 피어났어요."}}

주의: 깊은 감정은 부정적 감정만 의미하지 않는다. 기쁨도 intensity가 높으면 깊은 감정으로 판단할 수 있다.`;

interface AIResponse {
  mainEmotion?: string;
  subEmotions?: string[];
  intensity?: number;
  empathyMessage?: string;
  gardenReward?: {
    type?: string;
    name?: string;
    description?: string;
  };
}

interface RecentContextItem {
  date?: string;
  mainEmotion?: string;
  contentPreview?: string;
}

/**
 * recentContext 배열을 AI가 참고할 수 있는 텍스트로 조립합니다.
 * 제공되지 않거나 비어있으면 빈 문자열을 반환합니다.
 */
function buildRecentContextText(items: RecentContextItem[] | undefined): string {
  if (!items || !Array.isArray(items) || items.length === 0) return "";

  const lines = items
    .map((item, idx) => {
      const date = item.date || "알 수 없음";
      const emotion = item.mainEmotion || "알 수 없음";
      const preview = item.contentPreview || "";
      return `${idx + 1}. ${date} — 대표감정: ${emotion}, 내용: ${preview}`;
    })
    .join("\n");

  return `\n\n[최근 기록 맥락]\n${lines}\n위 맥락은 참고용으로만 활용하고, 사용자가 말하지 않은 새로운 사실은 지어내지 마라.`;
}

function getValidatedResponse(aiData: AIResponse) {
  const mainEmotion =
    aiData.mainEmotion && ALLOWED_EMOTIONS.includes(aiData.mainEmotion as any)
      ? aiData.mainEmotion
      : "복잡함";

  const subEmotions = Array.isArray(aiData.subEmotions) ? aiData.subEmotions : [];

  const rawIntensity = aiData.intensity;
  const intensity =
    typeof rawIntensity === "number" && Number.isInteger(rawIntensity) && rawIntensity >= 1 && rawIntensity <= 5
      ? rawIntensity
      : 3;

  const empathyMessage =
    typeof aiData.empathyMessage === "string" && aiData.empathyMessage.trim().length > 0
      ? aiData.empathyMessage.trim()
      : "복잡한 마음 속에 작은 평화가 찾아오길 바라요.";

  const flowerInfo = FLOWER_MAP[mainEmotion];
  const gardenReward = {
    type: flowerInfo.type,
    name: flowerInfo.name,
    description:
      aiData.gardenReward && typeof aiData.gardenReward.description === "string"
        ? aiData.gardenReward.description
        : flowerInfo.description,
  };

  return { mainEmotion, subEmotions, intensity, empathyMessage, gardenReward };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, recentContext } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "content가 비어 있습니다." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "여기에_새_OpenRouter_API_KEY_입력") {
      return NextResponse.json({ error: "API Key가 설정되지 않았습니다." }, { status: 500 });
    }

    const model = process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite";

    // recentContext를 user 메시지에 추가하여 AI가 참고할 수 있게 함
    const contextText = buildRecentContextText(recentContext);
    const userContent = content.trim() + contextText;

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-OpenRouter-Title": "Mind Garden",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error("OpenRouter API error:", openRouterResponse.status, errorText);
      return NextResponse.json({ error: "OpenRouter API 호출 실패" }, { status: 502 });
    }

    const data = await openRouterResponse.json();
    const aiContent = data?.choices?.[0]?.message?.content;

    if (!aiContent || typeof aiContent !== "string") {
      return NextResponse.json({ error: "AI 응답이 비어 있습니다." }, { status: 502 });
    }

    // JSON만 추출: 코드블록 마크다운 제거
    let cleaned = aiContent.trim();
    cleaned = cleaned.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();
    // 첫 { ~ 마지막 }만 추출
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let aiData: AIResponse;
    try {
      aiData = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse 실패:", cleaned);
      return NextResponse.json({ error: "AI 응답 JSON 파싱 실패" }, { status: 502 });
    }

    const result = getValidatedResponse(aiData);

    return NextResponse.json(result);
  } catch (e) {
    console.error("analyze-emotion error:", e);
    return NextResponse.json({ error: "내부 서버 오류" }, { status: 500 });
  }
}