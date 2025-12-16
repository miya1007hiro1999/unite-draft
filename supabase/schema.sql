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

-- 6. 開発用ポリシー: 全アクセス許可
-- ⚠️ 本番環境では認証機能追加後に削除・修正すること
DROP POLICY IF EXISTS "Enable all access for development" ON drafts;

CREATE POLICY "Enable all access for development" ON drafts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- セットアップ完了
-- ========================================
-- 次の確認SQLで動作を確認してください:
-- SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 5;
-- ========================================
