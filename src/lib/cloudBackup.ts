import { supabase } from "./supabase";
import { getEntries } from "./storage";
import { DiaryEntry } from "@/types/emotion";

/**
 * localStorage 기록을 Supabase emotion_records 테이블에 매핑하는 타입
 */
interface EmotionRecordRow {
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
 * DiaryEntry를 Supabase emotion_records 행으로 변환
 */
function mapEntryToRow(entry: DiaryEntry, userId: string): EmotionRecordRow {
  const { analysis, gardenReward } = {
    analysis: entry.analysis,
    gardenReward: entry.analysis.gardenReward,
  };

  const recordDate = entry.recordDate 
    || (entry.createdAt ? entry.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]);

  const createdAt = entry.createdAt || new Date().toISOString();

  const plantedAt = gardenReward.plantedAt || createdAt;

  // raw_record를 안전하게 추출 (원본 데이터 그대로)
  let rawRecord: Record<string, unknown> | null = null;
  try {
    rawRecord = {
      id: entry.id,
      content: entry.content,
      createdAt: entry.createdAt,
      recordDate: entry.recordDate,
      analysis: {
        mainEmotion: analysis.mainEmotion,
        subEmotions: analysis.subEmotions,
        intensity: analysis.intensity,
        empathyMessage: analysis.empathyMessage,
        gardenReward: {
          type: gardenReward.type,
          name: gardenReward.name,
          description: gardenReward.description,
          growthStage: gardenReward.growthStage,
          plantedAt: gardenReward.plantedAt,
          position: gardenReward.position,
        },
      },
    };
  } catch {
    rawRecord = null;
  }

  return {
    user_id: userId,
    local_id: entry.id || null,
    content: entry.content,
    record_date: recordDate,
    created_at: createdAt,
    planted_at: plantedAt,
    main_emotion: analysis.mainEmotion || null,
    sub_emotions: analysis.subEmotions || null,
    intensity: analysis.intensity ?? 3,
    empathy_message: analysis.empathyMessage || null,
    flower_type: gardenReward.type || null,
    flower_name: gardenReward.name || null,
    flower_description: gardenReward.description || null,
    growth_stage: gardenReward.growthStage || "seed",
    position_x: gardenReward.position?.x ?? null,
    position_y: gardenReward.position?.y ?? null,
    scale: gardenReward.position?.scale ?? null,
    rotation: gardenReward.position?.rotation ?? null,
    z_index: gardenReward.position?.zIndex ?? null,
    raw_record: rawRecord,
  };
}

export interface BackupResult {
  success: boolean;
  totalCount: number;
  backedUpCount: number;
  skippedCount: number;
  error?: string;
}

/**
 * localStorage의 감정 기록을 Supabase에 백업
 * 중복 기준: user_id + local_id
 */
export async function backupEntriesToSupabase(userId: string): Promise<BackupResult> {
  console.log("[CloudBackup] 백업 시작, userId:", userId);
  
  try {
    const entries = getEntries();
    console.log("[CloudBackup] localStorage에서 가져온 기록 수:", entries.length);
    
    if (entries.length === 0) {
      return {
        success: true,
        totalCount: 0,
        backedUpCount: 0,
        skippedCount: 0,
      };
    }

    const rows = entries.map((entry) => mapEntryToRow(entry, userId));
    console.log("[CloudBackup] 변환된 행 수:", rows.length);

    let backedUpCount = 0;
    let skippedCount = 0;

    // 각 기록을 개별 처리 (중복 방지)
    for (const row of rows) {
      if (row.local_id) {
        // 이미 존재하는지 확인
        const { data: existing, error: fetchError } = await supabase
          .from("emotion_records")
          .select("id")
          .eq("user_id", row.user_id)
          .eq("local_id", row.local_id)
          .maybeSingle();

        if (fetchError) {
          console.warn("[CloudBackup] 기록 확인 중 오류:", fetchError.message);
        } else if (existing) {
          console.log("[CloudBackup] 이미 존재하는 기록 스킵:", row.local_id);
          skippedCount++;
          continue;
        }
      }

      // 새로 삽입
      console.log("[CloudBackup] 삽입 시도:", row.local_id);
      const { error: insertError } = await supabase
        .from("emotion_records")
        .insert(row);

      if (insertError) {
        console.error("[CloudBackup] 삽입 실패:", insertError.message, "로컬ID:", row.local_id);
        skippedCount++;
      } else {
        backedUpCount++;
        console.log("[CloudBackup] 삽입 성공:", row.local_id);
      }
    }

    console.log("[CloudBackup] 백업 완료:", entries.length, "중", backedUpCount, "성공,", skippedCount, "스");

    return {
      success: true,
      totalCount: entries.length,
      backedUpCount,
      skippedCount,
    };
  } catch (error) {
    console.error("[CloudBackup] 백업 중 치명적 오류:", error);
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("[CloudBackup] 에러 상세:", errorMessage);
    return {
      success: false,
      totalCount: 0,
      backedUpCount: 0,
      skippedCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Supabase에서 사용자의 백업된 기록 수를 조회
 */
export async function getBackupCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("emotion_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("[CloudBackup] 백업 수 조회 오류:", error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("[CloudBackup] 백업 수 조회 중 오류:", err);
    return 0;
  }
}