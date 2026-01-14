-- ========================================
-- Unite Draft - Supabase Schema
-- ========================================
-- このSQLは何度実行しても安全です（冪等性保証）
-- ========================================

-- 1. drafts テーブルの作成
-- DraftState を JSONB で丸ごと保存
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. updated_at 自動更新関数
-- UPDATE時に updated_at を自動で現在時刻に設定
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. トリガーの作成（既存の場合は削除してから再作成）
DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;

CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. インデックスの作成
-- 最新のドラフトを高速に取得するため
CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts (updated_at DESC);

-- 5. RLS (Row Level Security) の有効化
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. Realtime 対応 RLS ポリシー
-- ========================================
-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Enable all access for development" ON drafts;
DROP POLICY IF EXISTS "Admin can insert drafts" ON drafts;
DROP POLICY IF EXISTS "Admin can update drafts" ON drafts;
DROP POLICY IF EXISTS "Admin can delete drafts" ON drafts;
DROP POLICY IF EXISTS "Everyone can view drafts" ON drafts;
DROP POLICY IF EXISTS "Allow anon all operations" ON drafts;

-- anon ロールに全操作を許可（MVP仕様）
-- admin / 観戦の区別はフロントエンド（URL）で制御
CREATE POLICY "Allow anon all operations" ON drafts
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ========================================
-- 7. Realtime Publication の設定
-- ========================================
-- Realtime で drafts テーブルの変更を配信
-- Supabase では "supabase_realtime" publication が自動作成されているため、
-- テーブルを追加するだけで OK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'drafts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
  END IF;
END $$;

-- ========================================
-- セットアップ完了
-- ========================================
-- 次の確認SQLで動作を確認してください:
-- SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 5;
-- ========================================
