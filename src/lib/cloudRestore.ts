import { supabase } from "./supabase";
import { getEntries, saveEntry, getEntryDateKey } from "./storage";
import { invalidateDailySentenceCache, buildEntrySignature } from "./dailySentenceCache";
import { DiaryEntry } from "@/types/emotion";

/**
 * Supabase emotion_records row 타입
 */
interface EmotionRecordRow {
  id: string;
  user_id: string;
  local_id: string | null;
  content: string;
  record_date: string;
  created_at: string;
  planted_at: string | null;
  main_emotion: string | null;
  sub_emotions: string[] | null;
  intensity: number | null;
  empathy_message: string | null;
  flower_type: string | null;
  flower_name: string | null;
  flower_description: string | null;
  growth_stage: string;
  position_x: number | null;
  position_y: number | null;
  scale: number | null;
  rotation: number | null;
  z_index: number | null;
  raw_record: Record<string, unknown> | null;
}

/**
 * Supabase row를 DiaryEntry로 변환
 */
function rowToDiaryEntry(row: EmotionRecordRow): DiaryEntry {
  // raw_record가 있으면 우선 사용 (안전한 타입 변환)
  if (row.raw_record) {
    try {
      const raw = row.raw_record as unknown as DiaryEntry;
      // 필수 필드 검증
      if (raw?.id && raw?.content && raw?.createdAt && raw?.analysis) {
        return raw;
      }
    } catch {
      // raw_record 파싱 실패 시 컬럼 기반 재조립으로 fallback
    }
  }

  // 컬럼 기반으로 재조립
  const createdAt = row.created_at || new Date().toISOString();
  const recordDate = row.record_date || createdAt.split("T")[0];
  const plantedAt = row.planted_at || createdAt;

  const entry: DiaryEntry = {
    id: row.local_id || row.id,
    content: row.content,
    createdAt,
    recordDate,
    analysis: {
      mainEmotion: (row.main_emotion as any) || "복잡함",
      subEmotions: row.sub_emotions || [],
      intensity: row.intensity ?? 3,
      empathyMessage: row.empathy_message || "",
      gardenReward: {
        type: row.flower_type || "wildflower",
        name: row.flower_name || "들꽃",
        emoji: "🌸",
        description: row.flower_description || "",
        growthStage: (row.growth_stage as any) || "seed",
        plantedAt,
        position: {
          x: row.position_x ?? Math.random() * 80 + 8,
          y: row.position_y ?? Math.random() * 40 + 45,
          scale: row.scale ?? (Math.random() * 0.4 + 0.85),
          rotation: row.rotation ?? ((Math.random() - 0.5) * 20),
          zIndex: row.z_index ?? Math.floor(Math.random() * 40 + 45),
        },
      },
    },
  };

  return entry;
}

/**
 * 두 기록이 같은지 확인하는 중복 판단 함수
 */
function isDuplicateRecord(localEntry: DiaryEntry, cloudEntry: DiaryEntry): boolean {
  // 1. id가 같으면 중복
  if (localEntry.id && cloudEntry.id && localEntry.id === cloudEntry.id) {
    return true;
  }

  // 2. createdAt + content가 같으면 같은 기록으로 판단
  if (
    localEntry.createdAt === cloudEntry.createdAt &&
    localEntry.content === cloudEntry.content
  ) {
    return true;
  }

  // 3. recordDate + content가 같으면 보조적으로 같은 기록으로 판단
  const localDate = getEntryDateKey(localEntry);
  const cloudDate = getEntryDateKey(cloudEntry);
  if (localDate === cloudDate && localEntry.content === cloudEntry.content) {
    return true;
  }

  return false;
}

export interface RestoreResult {
  success: boolean;
  totalCount: number;
  addedCount: number;
  skippedCount: number;
  error?: string;
}

/**
 * Supabase에서 기록을 내려받아 localStorage에 병합
 */
export async function restoreFromSupabase(userId: string): Promise<RestoreResult> {
  console.log("[CloudRestore] 내려받기 시작, userId:", userId);

  try {
    // 1. Supabase에서 user_id에 해당하는 모든 기록 조회
    const { data: cloudRows, error: fetchError } = await supabase
      .from("emotion_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("[CloudRestore] Supabase 조회 오류:", fetchError.message);
      return {
        success: false,
        totalCount: 0,
        addedCount: 0,
        skippedCount: 0,
        error: fetchError.message,
      };
    }

    const cloudRowsList = (cloudRows || []) as EmotionRecordRow[];
    console.log("[CloudRestore] Supabase에서 가져온 기록 수:", cloudRowsList.length);

    if (cloudRowsList.length === 0) {
      return {
        success: true,
        totalCount: 0,
        addedCount: 0,
        skippedCount: 0,
      };
    }

    // 2. 기존 localStorage 기록 모두 가져오기
    const localEntries = getEntries();
    console.log("[CloudRestore] 현재 localStorage 기록 수:", localEntries.length);

    // localStorage 기록 id 집합 (빠른 lookup용)
    const localIdSet = new Set(localEntries.map((e) => e.id).filter(Boolean));
    const localContentDateSet = new Set(
      localEntries.map((e) => `${e.content}|${getEntryDateKey(e)}`)
    );
    const localContentCreatedAtSet = new Set(
      localEntries.map((e) => `${e.content}|${e.createdAt}`)
    );

    // 3. cloud 기록을 DiaryEntry로 변환
    const cloudEntries = cloudRowsList.map((row) => rowToDiaryEntry(row));

    let addedCount = 0;
    let skippedCount = 0;
    const affectedDates = new Set<string>();

    // 4. 중복 판단 및 병합
    for (const cloudEntry of cloudEntries) {
      // 중복 체크
      const isDuplicate =
        localIdSet.has(cloudEntry.id) ||
        localContentCreatedAtSet.has(`${cloudEntry.content}|${cloudEntry.createdAt}`) ||
        localContentDateSet.has(`${cloudEntry.content}|${getEntryDateKey(cloudEntry)}`) ||
        localEntries.some((local) => isDuplicateRecord(local, cloudEntry));

      if (isDuplicate) {
        console.log("[CloudRestore] 중복 킵:", cloudEntry.id);
        skippedCount++;
      } else {
        // 새로운 기록으로 localStorage에 추가
        saveEntry(cloudEntry);
        localEntries.push(cloudEntry);
        localIdSet.add(cloudEntry.id);
        affectedDates.add(getEntryDateKey(cloudEntry));
        addedCount++;
        console.log("[CloudRestore] 추가됨:", cloudEntry.id);
      }
    }

    // 5. 영향받은 날짜의 dailySentence 캐시 무효화
    for (const dateKey of affectedDates) {
      invalidateDailySentenceCache(dateKey);
      console.log("[CloudRestore] 캐시 무효화:", dateKey);
    }

    console.log(
      "[CloudRestore] 내려받기 완료: 전체",
      cloudRowsList.length,
      ", 추가",
      addedCount,
      ", 스킵",
      skippedCount
    );

    return {
      success: true,
      totalCount: cloudRowsList.length,
      addedCount,
      skippedCount,
    };
  } catch (error) {
    console.error("[CloudRestore] 내려받기 중 치명적 오류:", error);
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    return {
      success: false,
      totalCount: 0,
      addedCount: 0,
      skippedCount: 0,
      error: errorMessage,
    };
  }
}