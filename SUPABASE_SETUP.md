# Supabase セットアップ手順書（開発版）

> ⚠️ **注意:** このドキュメントは開発環境用のセットアップ手順です。
>
> **リアルタイム同期（Realtime）を使用する場合は `REALTIME_SETUP.md` を参照してください。**

このドキュメントでは、Unite Draft アプリで Supabase を使用するための基本セットアップ手順を説明します（認証・RLS なし）。

## 前提条件

- Supabase プロジェクトが作成済みであること
- プロジェクトの URL と anon key が取得できること

---

## ステップ1: 環境変数の設定

### 1-1. `.env` ファイルを作成

プロジェクトルートに `.env` ファイルを作成します。

```bash
touch .env
```

### 1-2. Supabase 接続情報を記入

`.env` ファイルに以下を追加します。

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**取得方法:**
1. Supabase Dashboard を開く
2. Project Settings > API を選択
3. **Project URL** を `VITE_SUPABASE_URL` にコピー
4. **Project API keys** の **anon public** を `VITE_SUPABASE_ANON_KEY` にコピー

⚠️ **注意:** `service_role` キーは使用しません！フロントエンドでは必ず `anon` キーを使用してください。

---

## ステップ2: Supabase テーブルの作成

### 方法A: Supabase Dashboard (推奨)

1. **Supabase Dashboard** にログイン
2. 左メニューから **SQL Editor** を選択
3. **New query** をクリック
4. `supabase/schema.sql` の内容を全てコピー
5. SQL Editor に貼り付け
6. **Run** ボタンをクリック

✅ 成功すると「Success. No rows returned」と表示されます。

### 方法B: Supabase CLI

Supabase CLI をインストール済みの場合:

```bash
# プロジェクトにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref your-project-id

# スキーマを適用
supabase db push
```

---

## ステップ3: テーブル作成の確認

### 3-1. drafts テーブルが存在するか確認

Supabase Dashboard > SQL Editor で以下を実行:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'drafts'
ORDER BY ordinal_position;
```

**期待される結果:**

| table_name | column_name | data_type                 |
|------------|-------------|---------------------------|
| drafts     | id          | uuid                      |
| drafts     | state       | jsonb                     |
| drafts     | created_at  | timestamp with time zone  |
| drafts     | updated_at  | timestamp with time zone  |

### 3-2. トリガーが動作するか確認

以下のSQLでテストデータを挿入・更新:

```sql
-- テストデータ挿入
INSERT INTO drafts (state)
VALUES ('{"test": "data"}'::jsonb)
RETURNING id, created_at, updated_at;

-- 更新（updated_at が自動更新されるはず）
UPDATE drafts
SET state = '{"test": "updated"}'::jsonb
WHERE state @> '{"test": "data"}'::jsonb
RETURNING id, created_at, updated_at;
```

✅ `updated_at` が `created_at` より新しい時刻になっていれば成功です。

### 3-3. テストデータの削除

```sql
DELETE FROM drafts WHERE state @> '{"test": "updated"}'::jsonb;
```

---

## ステップ4: アプリからの接続確認

### 4-1. アプリを起動

```bash
npm run dev
```

### 4-2. ブラウザでコンソールを確認（F12）

以下のログが表示されれば正常です:

```
[loadDraftState] Starting...
[loadDraftState] No existing draft found in database
[DraftPage] No existing draft, creating mock...
[saveDraftState] Starting save...
[saveDraftState] Creating new draft...
[saveDraftState] ✅ Successfully created new draft, ID: xxx-xxx-xxx
```

### 4-3. Supabase でデータを確認

Supabase Dashboard > SQL Editor で実行:

```sql
SELECT id,
       state->>'tournamentName' as tournament,
       state->>'currentMatch' as match,
       state->>'currentTurn' as turn,
       created_at,
       updated_at
FROM drafts
ORDER BY updated_at DESC
LIMIT 5;
```

✅ 作成されたドラフトデータが表示されれば成功です。

---

## ステップ5: リロード時の永続化確認

### 5-1. ポケモンをピック

アプリでポケモンを1体ピックします。

コンソールに以下が表示されるはず:

```
[saveDraftState] Starting save...
[saveDraftState] Updating existing draft, ID: xxx-xxx-xxx
[saveDraftState] ✅ Successfully updated draft
```

### 5-2. ブラウザをリロード（F5）

コンソールに以下が表示されるはず:

```
[loadDraftState] Starting...
[loadDraftState] Current draft ID from localStorage: xxx-xxx-xxx
[loadDraftState] Successfully loaded draft by ID
[DraftPage] Using existing draft from Supabase
```

✅ ピックしたポケモンが復元されていれば成功です！

---

## トラブルシューティング

### ❌ "Supabase is not configured"

**原因:** `.env` ファイルが読み込まれていない

**対処法:**
1. `.env` ファイルがプロジェクトルートに存在するか確認
2. `VITE_` プレフィックスが付いているか確認
3. アプリを再起動: `npm run dev`

### ❌ "Failed to create draft"

**原因:** テーブルが存在しない or RLS で拒否されている

**対処法:**
1. ステップ2のSQLを再実行
2. RLSポリシーが作成されているか確認:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'drafts';
   ```
3. ポリシーが存在しない場合は `supabase/schema.sql` を再実行

### ❌ "Failed to update draft"

**原因:** draft ID が無効

**対処法:**
1. ブラウザコンソールで実行:
   ```javascript
   localStorage.removeItem('current_draft_id')
   ```
2. ブラウザをリロード

### ❌ リロード後にピックが消える

**原因:** StrictMode 二重実行で複数のドラフトが作成されている可能性

**対処法:**
1. 既存の drafts を確認:
   ```sql
   SELECT id, created_at FROM drafts ORDER BY created_at DESC LIMIT 10;
   ```
2. 不要なドラフトを削除:
   ```sql
   DELETE FROM drafts WHERE created_at < NOW() - INTERVAL '1 hour';
   ```
3. localStorage をクリア:
   ```javascript
   localStorage.removeItem('current_draft_id')
   ```
4. アプリをリロード

---

## 確認用SQL集

### 全ドラフト一覧表示

```sql
SELECT
  id,
  state->>'tournamentName' as tournament,
  state->>'currentMatch' as match,
  state->>'currentTurn' as turn,
  jsonb_array_length(state->'picks'->'match1'->'A') as team_a_picks,
  jsonb_array_length(state->'picks'->'match1'->'B') as team_b_picks,
  created_at,
  updated_at
FROM drafts
ORDER BY updated_at DESC;
```

### 特定IDのドラフト詳細表示

```sql
SELECT
  id,
  jsonb_pretty(state) as draft_state,
  created_at,
  updated_at
FROM drafts
WHERE id = 'your-draft-id-here';
```

### 全ドラフト削除（リセット用）

```sql
-- ⚠️ 注意: 全てのドラフトが削除されます
DELETE FROM drafts;

-- 確認
SELECT COUNT(*) FROM drafts;
```

---

## 本番環境への移行時の注意

現在のRLSポリシーは開発用で全アクセス許可しています。
本番環境では以下を実施してください:

1. **開発用ポリシーを削除:**
   ```sql
   DROP POLICY "Enable all access for development" ON drafts;
   ```

2. **認証ベースのポリシーを追加:**
   ```sql
   -- 例: ログイン済みユーザーのみアクセス可能
   CREATE POLICY "Authenticated users can access drafts" ON drafts
     FOR ALL
     USING (auth.role() = 'authenticated')
     WITH CHECK (auth.role() = 'authenticated');
   ```

---

## まとめ

✅ 環境変数設定完了
✅ drafts テーブル作成完了
✅ トリガー・RLS設定完了
✅ アプリからの接続確認完了
✅ リロード時の永続化確認完了

これで Supabase による完全な永続化が実現されました！
