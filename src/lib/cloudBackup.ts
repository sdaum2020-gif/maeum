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
  deletedCount: number;
  error?: string;
}

/**
 * localStorage의 감정 기록을 Supabase에 백업
 * 전략: 기존 user_id의 데이터를 모두 삭제한 후, localStorage의 전체 기록을 새로 삽입
 * 이를 통해 로컬에서 삭제된 기록이 Supabase에도 남지 않게 함
 */
export async function backupEntriesToSupabase(userId: string): Promise<BackupResult> {
  console.log("[CloudBackup] 백업 시작, userId:", userId);
  
  try {
    const entries = getEntries();
    console.log("[CloudBackup] localStorage에서 가져온 기록 수:", entries.length);

    // 1단계: 해당 user_id의 기존 emotion_records를 모두 삭제
    console.log("[CloudBackup] 기존 백업 데이터 삭제 시작, userId:", userId);
    const { count: deletedCount, error: deleteError } = await supabase
      .from("emotion_records")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("[CloudBackup] 기존 데이터 삭제 실패:", deleteError.message);
      return {
        success: false,
        totalCount: entries.length,
        backedUpCount: 0,
        deletedCount: 0,
        error: `기존 데이터 삭제 실패: ${deleteError.message}`,
      };
    }

    console.log("[CloudBackup] 기존 데이터 삭제 완료:", deletedCount, "개");

    // 2단계: localStorage의 전체 기록을 새로 삽입
    if (entries.length === 0) {
      console.log("[CloudBackup] localStorage에 기록이 없음. 백업 완료.");
      return {
        success: true,
        totalCount: 0,
        backedUpCount: 0,
        deletedCount: deletedCount || 0,
      };
    }

    const rows = entries.map((entry) => mapEntryToRow(entry, userId));
    console.log("[CloudBackup] 변환된 행 수:", rows.length);

    // bulk insert로 한 번에 삽입
    const { error: insertError } = await supabase
      .from("emotion_records")
      .insert(rows);

    if (insertError) {
      console.error("[CloudBackup] 삽입 실패:", insertError.message);
      return {
        success: false,
        totalCount: entries.length,
        backedUpCount: 0,
        deletedCount: deletedCount || 0,
        error: `기록 삽입 실패: ${insertError.message}`,
      };
    }

    const backedUpCount = rows.length;
    console.log("[CloudBackup] 백업 완료:", backedUpCount, "개 기록 삽입 성공");

    return {
      success: true,
      totalCount: entries.length,
      backedUpCount,
      deletedCount: deletedCount || 0,
    };
  } catch (error) {
    console.error("[CloudBackup] 백업 중 치명적 오류:", error);
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("[CloudBackup] 에러 상세:", errorMessage);
    return {
      success: false,
      totalCount: 0,
      backedUpCount: 0,
      deletedCount: 0,
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