-- ============================================================
-- emotion_records 테이블 생성 마이그레이션
-- 실행 날짜: 2026.06.29
-- ============================================================

-- ============================================================
-- emotion_records 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emotion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  local_id TEXT,
  content TEXT NOT NULL,
  record_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  planted_at TIMESTAMPTZ,
  main_emotion TEXT,
  sub_emotions JSONB,
  intensity INTEGER,
  empathy_message TEXT,
  flower_type TEXT,
  flower_name TEXT,
  flower_description TEXT,
  growth_stage TEXT DEFAULT 'seed',
  position_x NUMERIC,
  position_y NUMERIC,
  scale NUMERIC,
  rotation NUMERIC,
  z_index INTEGER,
  raw_record JSONB,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 인덱스 생성
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_emotion_records_user_id ON public.emotion_records(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_records_record_date ON public.emotion_records(record_date);
CREATE INDEX IF NOT EXISTS idx_emotion_records_local_id ON public.emotion_records(local_id);

-- ============================================================
-- Unique Constraint (user_id + local_id)
-- local_id가 null이 아닌 경우에만 중복 방지
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_emotion_records_user_local 
  ON public.emotion_records(user_id, local_id) 
  WHERE local_id IS NOT NULL;

-- ============================================================
-- RLS 활성화
-- ============================================================
ALTER TABLE public.emotion_records ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS 정책
-- ============================================================

-- SELECT: 본인 기록만 조회 가능
DROP POLICY IF EXISTS "Users can view own emotion records" ON public.emotion_records;
CREATE POLICY "Users can view own emotion records" 
  ON public.emotion_records 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: 본인 user_id로만 삽입 가능
DROP POLICY IF EXISTS "Users can insert own emotion records" ON public.emotion_records;
CREATE POLICY "Users can insert own emotion records" 
  ON public.emotion_records 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인 기록만 수정 가능
DROP POLICY IF EXISTS "Users can update own emotion records" ON public.emotion_records;
CREATE POLICY "Users can update own emotion records" 
  ON public.emotion_records 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: 본인 기록만 삭제 가능
DROP POLICY IF EXISTS "Users can delete own emotion records" ON public.emotion_records;
CREATE POLICY "Users can delete own emotion records" 
  ON public.emotion_records 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);