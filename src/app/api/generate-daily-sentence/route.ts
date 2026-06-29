import { NextRequest, NextResponse } from "next/server";

/**
 * 그날의 한 문장 생성 API
 *
 * POST /api/generate-daily-sentence
 * Body: {
 *   date: "2026-06-29",
 *   entries: Array<{
 *     content: string,
 *     mainEmotion: string,
 *     intensity: number,
 *     empathyMessage?: string
 *   }>
 * }
 *
 * Response: { dailySentence: string }
 */

const SYSTEM_PROMPT = `너는 감정일기 앱 "마음정원"의 하루 리포트 문장 작성 도우미다.
사용자가 특정 날짜에 작성한 감정 기록들을 읽고, 그날을 정리하는 한 문장을 만든다.

반드시 지킬 것:
- 응답은 반드시 JSON만 반환한다.
- 마크다운, 코드블록, 설명문은 넣지 않는다.
- dailySentence는 1문장만 작성한다.
- 너무 길지 않게 45자~90자 정도로 작성한다.
- 사용자가 실제로 쓴 기록의 상황을 최소 1개 반영한다.
- 사용자가 쓰지 않은 사건이나 감정을 지어내지 않는다.
- 과한 위로나 상담식 조언을 하지 않는다.
- 따뜻하고 담백한 말투를 사용한다.
- 반말을 쓰지 않는다.

좋은 예시:
입력 기록:
- "점심을 새로운 맛집에 갔는데 성공해서 좋았다"
출력:
{"dailySentence": "새로운 맛집에서 느낀 작은 성공이 마음정원에 밝게 남은 하루였어요."}

입력 기록:
- "발표가 망한 것 같아서 계속 신경 쓰였다"
- "집에 와서도 긴장이 풀리지 않았다"
출력:
{"dailySentence": "발표 뒤에 남은 긴장까지 조용히 들여다본 하루였어요."}

입력 기록:
- "하루종일 피곤하고 아무것도 하기 싫었다"
출력:
{"dailySentence": "무거웠던 하루였지만, 지친 마음을 그냥 지나치지 않고 바라봐준 날이었어요."}`;

interface EntryData {
  content: string;
  mainEmotion: string;
  intensity: number;
  empathyMessage?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entries } = body as { date?: string; entries?: EntryData[] };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "entries가 비어 있습니다." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "여기에_새_OpenRouter_API_KEY_입력") {
      return NextResponse.json({ error: "API Key가 설정되지 않았습니다." }, { status: 500 });
    }

    const model = process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite";

    // entries를 사람이 읽기 쉬운 텍스트로 조립
    const entriesText = entries
      .map((entry, idx) => {
        const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
        const empathy = entry.empathyMessage ? ` ( 공감: ${entry.empathyMessage} )` : "";
        return `${idx + 1}. [${entry.mainEmotion}/깊이 ${entry.intensity}] ${entry.content}${empathy}`;
      })
      .join("\n");

    const userContent = `다음은 오늘 작성한 감정 기록입니다:\n\n${entriesText}\n\n이 기록들을 바탕으로 "그날의 한 문장"을 만들어주세요.`;

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
      console.error("OpenRouter API error (daily-sentence):", openRouterResponse.status, errorText);
      return NextResponse.json({ error: "OpenRouter API 호출 실패" }, { status: 502 });
    }

    const data = await openRouterResponse.json();
    const aiContent = data?.choices?.[0]?.message?.content;

    if (!aiContent || typeof aiContent !== "string") {
      return NextResponse.json({ error: "AI 응답이 비어 있습니다." }, { status: 502 });
    }

    // JSON만 추출
    let cleaned = aiContent.trim();
    cleaned = cleaned.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let aiData: { dailySentence?: string };
    try {
      aiData = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse 실패 (daily-sentence):", cleaned);
      return NextResponse.json({ error: "AI 응답 JSON 파싱 실패" }, { status: 502 });
    }

    const dailySentence = aiData.dailySentence?.trim();
    if (!dailySentence || dailySentence.length === 0) {
      return NextResponse.json({ error: "dailySentence가 비어 있습니다." }, { status: 502 });
    }

    return NextResponse.json({ dailySentence });
  } catch (e) {
    console.error("generate-daily-sentence error:", e);
    return NextResponse.json({ error: "내부 서버 오류" }, { status: 500 });
  }
}