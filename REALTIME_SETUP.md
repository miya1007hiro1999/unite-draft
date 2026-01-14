# Supabase Realtime 設定ガイド

このドキュメントでは、ドラフトアプリでリアルタイム同期を実現するためのテーブル設計と RLS 設定について説明します。

---

## 📋 テーブル設計

### `drafts` テーブル

現在のドラフト状態を保存するメインテーブル。テーブル構造は変更なし（MVP最小構成）。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| `id` | UUID | ドラフトID（主キー、自動生成） |
| `state` | JSONB | DraftState 全体を JSON 形式で保存 |
| `created_at` | TIMESTAMPTZ | 作成日時（自動設定） |
| `updated_at` | TIMESTAMPTZ | 更新日時（自動更新） |

**特徴:**
- テーブルは増やさない（MVP 要件）
- Realtime Publication に対応
- RLS で権限制御（admin/観戦者の分離）

---

## 🔐 RLS（Row Level Security）ポリシー設計

### 権限モデル

```
┌─────────────────────────────────────────┐
│            drafts テーブル               │
├─────────────────────────────────────────┤
│  認証済みユーザー (authenticated)        │
│  → INSERT/UPDATE/DELETE/SELECT 可能      │
│  = admin（運営者）                       │
├─────────────────────────────────────────┤
│  匿名ユーザー (anon)                     │
│  → SELECT のみ可能                       │
│  = 観戦者                                │
└─────────────────────────────────────────┘
```

### 実装されたポリシー

#### 1. `Admin can insert drafts`
- **対象:** `authenticated` のみ
- **操作:** INSERT
- **説明:** admin がドラフトを新規作成できる

#### 2. `Admin can update drafts`
- **対象:** `authenticated` のみ
- **操作:** UPDATE
- **説明:** admin がドラフト状態を更新できる（ピック/バン）

#### 3. `Admin can delete drafts`
- **対象:** `authenticated` のみ
- **操作:** DELETE
- **説明:** admin がドラフトを削除できる

#### 4. `Everyone can view drafts`
- **対象:** `authenticated` + `anon`
- **操作:** SELECT
- **説明:** 全員がドラフトを閲覧できる（観戦機能）

### Realtime との連携

**重要:** Realtime 接続時も RLS が適用されます。

```
観戦者（anon）が Realtime 接続
  ↓
SELECT ポリシーで許可
  ↓
drafts テーブルの UPDATE/INSERT イベントを受信可能
  ↓
フロントで自動的に状態が同期される
```

---

## 📡 Realtime Publication 設定

### 仕組み

PostgreSQL の **論理レプリケーション** を使用して、テーブルの変更を Realtime サーバーに配信します。

```
drafts テーブルに UPDATE
  ↓
PostgreSQL WAL (Write-Ahead Log)
  ↓
supabase_realtime publication
  ↓
Realtime Server (Elixir)
  ↓
WebSocket 経由で全クライアントに配信
```

### 設定内容

`schema.sql` で以下を実行します：

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
```

これにより、`drafts` テーブルの以下のイベントが配信されます：
- INSERT
- UPDATE
- DELETE

---

## 🛠️ Supabase Dashboard 設定手順

### ステップ1: スキーマの適用

1. **Supabase Dashboard** にログイン
2. 左メニュー **SQL Editor** を選択
3. **New query** をクリック
4. `supabase/schema.sql` の全内容をコピー&ペースト
5. **Run** をクリック

✅ 成功すると「Success. No rows returned」と表示されます。

### ステップ2: Realtime 有効化の確認

1. 左メニュー **Database** → **Replication** を選択
2. **supabase_realtime** publication を確認
3. `drafts` テーブルが含まれていることを確認

**確認 SQL:**
```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

**期待される結果:**
| schemaname | tablename |
|------------|-----------|
| public     | drafts    |

### ステップ3: RLS ポリシーの確認

**確認 SQL:**
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'drafts';
```

**期待される結果:**
| policyname | cmd | roles |
|------------|-----|-------|
| Admin can insert drafts | INSERT | {authenticated} |
| Admin can update drafts | UPDATE | {authenticated} |
| Admin can delete drafts | DELETE | {authenticated} |
| Everyone can view drafts | SELECT | {authenticated, anon} |

---

## 🔑 Admin 認証の設定

### Supabase Auth の設定

#### ステップ1: メール認証の有効化

1. **Supabase Dashboard** → **Authentication** → **Providers**
2. **Email** が有効になっていることを確認

#### ステップ2: Admin アカウントの作成

**方法A: Dashboard から作成（推奨）**

1. **Authentication** → **Users** を選択
2. **Add user** → **Create new user** をクリック
3. 以下を入力：
   - Email: `admin@example.com`（任意のメールアドレス）
   - Password: 強力なパスワード
   - Auto Confirm User: **ON**（メール確認を省略）
4. **Create user** をクリック

**方法B: SQL から作成**

```sql
-- ⚠️ 本番環境では Dashboard から作成することを推奨
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('your-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

#### ステップ3: 認証トークンの確認

Admin がログインすると、`authenticated` role のトークンが発行され、RLS ポリシーで書き込み権限が付与されます。

---

## ✅ 動作確認

### 1. テーブル確認

```sql
-- drafts テーブルの存在確認
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'drafts'
ORDER BY ordinal_position;
```

### 2. RLS ポリシー確認

```sql
-- ポリシー一覧
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'drafts';
```

### 3. Realtime Publication 確認

```sql
-- drafts が publication に含まれているか
SELECT *
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'drafts';
```

### 4. Admin 権限テスト

**Admin としてログイン後:**

```sql
-- INSERT テスト（authenticated のみ可能）
INSERT INTO drafts (state)
VALUES ('{"test": "admin insert"}'::jsonb)
RETURNING id;

-- UPDATE テスト（authenticated のみ可能）
UPDATE drafts
SET state = '{"test": "admin update"}'::jsonb
WHERE id = 'your-draft-id';

-- SELECT テスト（全員可能）
SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 1;
```

### 5. 観戦者（anon）権限テスト

**認証なしで接続（anon key 使用）:**

```sql
-- SELECT は成功するはず
SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 1;

-- INSERT/UPDATE は失敗するはず（RLS で拒否）
INSERT INTO drafts (state) VALUES ('{"test": "anon"}'::jsonb);
-- → Error: new row violates row-level security policy
```

### 6. Realtime 接続テスト（後のフェーズで実施）

```javascript
// フロントエンドから（実装フェーズで使用）
const channel = supabase
  .channel('drafts-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'drafts' },
    (payload) => console.log('Change received!', payload)
  )
  .subscribe()
```

---

## 🔒 セキュリティベストプラクティス

### 1. anon key と service_role key の使い分け

| キー | 用途 | RLS 適用 | フロントで使用 |
|------|------|----------|--------------|
| **anon key** | 観戦者・未認証アクセス | ✅ 適用される | ✅ 可能 |
| **service_role key** | サーバーサイド管理 | ❌ バイパスされる | ❌ 絶対に NG |

**重要:** フロントエンドでは必ず `anon key` を使用してください。

### 2. Admin トークンの管理

- Admin のログイン情報をブラウザの localStorage に保存する場合は注意
- セッションタイムアウトを設定（Supabase Auth の設定）
- 本番環境では HTTPS 必須

### 3. RLS ポリシーの監視

```sql
-- どのポリシーが適用されているか確認
EXPLAIN (COSTS OFF)
SELECT * FROM drafts;
```

---

## 📊 Realtime 制限（参考）

| 項目 | Free | Pro | Pro (無制限) | Team | Enterprise |
|------|------|-----|-------------|------|------------|
| 同時接続数 | 200 | 500 | 10,000 | 10,000 | 10,000+ |
| メッセージ/秒 | 100 | 500 | 2,500 | 2,500 | 2,500+ |
| Payload サイズ | 256 KB | 3,000 KB | 3,000 KB | 3,000 KB | 3,000+ KB |

**ドラフトアプリの想定:**
- 運営: 1接続（admin）
- 観戦者: 数十～数百接続
- 更新頻度: ピック/バン時のみ（低頻度）

→ **Free プランで十分運用可能**（観戦者 200人まで）

---

## 🚀 次のステップ

### 完了したこと
✅ テーブル設計（`drafts` テーブル）
✅ RLS ポリシー設計（admin/観戦者の分離）
✅ Realtime Publication 設定
✅ Admin 認証の設定

### 次のフェーズ（API実装・フロント実装）
- [ ] Supabase Auth ログイン UI の実装
- [ ] Realtime サブスクリプションの実装
- [ ] 接続状態の UI 表示
- [ ] エラーハンドリング・再接続処理
- [ ] 観戦者用の読み取り専用 UI

---

## 🐛 トラブルシューティング

### ❌ "new row violates row-level security policy"

**原因:** RLS ポリシーで拒否されている

**対処法:**
1. 現在の認証状態を確認:
   ```sql
   SELECT current_user, current_setting('role');
   ```
2. Admin としてログインしているか確認
3. RLS ポリシーを再確認（上記の確認 SQL を実行）

### ❌ Realtime で変更が配信されない

**原因:** Publication に drafts が含まれていない

**対処法:**
```sql
-- Publication を確認
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- drafts がない場合は追加
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
```

### ❌ Admin でログインしても書き込みできない

**原因:** トークンが `anon` role のまま

**対処法:**
1. ログアウト → 再ログイン
2. トークンの有効期限を確認（デフォルト: 1時間）
3. Supabase Client の初期化を確認

---

## 📚 参考資料

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Row Level Security (PostgreSQL)](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Realtime Limits](https://supabase.com/docs/guides/realtime/limits)

---

**設計完了日:** 2026-01-14
**対象:** MVP（最小構成）
**次フェーズ:** API・フロント実装
