# Supabase永続化の最終診断レポート

## 📊 現在の状況

**問題:** `SELECT * FROM drafts;` → 0 rows

**疑問:**
1. `saveDraftState` は呼ばれているのか？
2. Supabase INSERT は成功しているのか？
3. なぜテーブルが空なのか？

---

## 🔍 完全な実行フローと切り分け

### シナリオ1: Supabase 未設定の場合

#### 実行フロー

```
[ブラウザ] http://localhost:5174/draft にアクセス
    ↓
[DraftPage] useEffect 実行
    ↓
[DraftPage] loadDraftState() 呼び出し
    ↓
[loadDraftState] isSupabaseConfigured() = false ⚠️
    ↓
[loadDraftState] console.warn('⚠️ Supabase is not configured')
    ↓
[loadDraftState] return null
    ↓
[DraftPage] loadedState = null なので createMockDraftState()
    ↓
[DraftPage] saveDraftState(mockState) 呼び出し
    ↓
[saveDraftState] isSupabaseConfigured() = false ⚠️
    ↓
[saveDraftState] console.warn('⚠️ Supabase is not configured')
[saveDraftState] console.warn('⚠️ Current env: { VITE_SUPABASE_URL: NOT SET, ... }')
    ↓
[saveDraftState] return false
    ↓
[DraftPage] saved = false
[DraftPage] setState(mockState) ← ローカルのみで動作
    ↓
[画面] モックデータ表示
[localStorage] current_draft_id = null
[Supabase] 0 rows ← INSERT が実行されていない
```

#### コンソールログ

```
[DraftPage] === Initialization START ===
[DraftPage] Mode: default | Draft ID: none
[DraftPage] Read-only: false
[DraftPage] No draft ID in URL, using default behavior...
[loadDraftState] Starting...
[loadDraftState] ⚠️ Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
[DraftPage] No existing draft, creating mock...
[saveDraftState] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[saveDraftState] Starting save...
[saveDraftState] Payload preview: { tournamentName: "第1回サンプルトーナメント", ... }
[saveDraftState] ⚠️ Supabase is not configured. Cannot save draft state.
[saveDraftState] ⚠️ To enable persistence, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
[saveDraftState] ⚠️ Current env: { VITE_SUPABASE_URL: "NOT SET", VITE_SUPABASE_ANON_KEY: "NOT SET" }
[saveDraftState] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[DraftPage] Failed to save initial mock, using local state only
[DraftPage] === Initialization END ===
```

#### 結論

- ✅ `saveDraftState` は**呼ばれている**
- ❌ Supabase INSERT は**実行されていない**（環境変数チェックで早期return）
- ❌ localStorage に ID が**保存されていない**
- ✅ 画面は**正常に表示される**（ローカルのみ）
- ❌ リロードすると**初期状態に戻る**

---

### シナリオ2: Supabase 設定済み、テーブル未作成の場合

#### 実行フロー

```
[ブラウザ] http://localhost:5174/draft にアクセス
    ↓
[DraftPage] useEffect 実行
    ↓
[DraftPage] loadDraftState() 呼び出し
    ↓
[loadDraftState] isSupabaseConfigured() = true ✅
    ↓
[loadDraftState] supabase.from('drafts').select()
    ↓
[Supabase] ❌ relation "public.drafts" does not exist
    ↓
[loadDraftState] error.code = '42P01'
[loadDraftState] console.error('Failed to load draft:', error)
    ↓
[loadDraftState] return null
    ↓
[DraftPage] loadedState = null なので createMockDraftState()
    ↓
[DraftPage] saveDraftState(mockState) 呼び出し
    ↓
[saveDraftState] isSupabaseConfigured() = true ✅
    ↓
[saveDraftState] currentDraftId = null → INSERT mode
    ↓
[saveDraftState] supabase.from('drafts').insert({ state })
    ↓
[Supabase] ❌ relation "public.drafts" does not exist
    ↓
[saveDraftState] error.code = '42P01'
[saveDraftState] console.error('[saveDraftState] ❌ Failed to create draft')
[saveDraftState] console.error('[saveDraftState] Error code: 42P01')
[saveDraftState] console.error('[saveDraftState] Error message: relation "public.drafts" does not exist')
    ↓
[saveDraftState] return false
    ↓
[DraftPage] saved = false
[DraftPage] setState(mockState) ← ローカルのみで動作
    ↓
[画面] モックデータ表示
[localStorage] current_draft_id = null
[Supabase] 0 rows ← テーブルが存在しない
```

#### コンソールログ

```
[DraftPage] === Initialization START ===
[loadDraftState] Starting...
[loadDraftState] Failed to load draft: relation "public.drafts" does not exist
[DraftPage] No existing draft, creating mock...
[saveDraftState] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[saveDraftState] Starting save...
[saveDraftState] 📝 INSERT mode
[saveDraftState] Creating new draft...
[saveDraftState] ⏳ Executing INSERT query...
[saveDraftState] 📥 INSERT response received
[saveDraftState] Response data: null
[saveDraftState] Response error: { code: "42P01", message: "relation \"public.drafts\" does not exist", ... }
[saveDraftState] ❌ Failed to create draft
[saveDraftState] Error code: 42P01
[saveDraftState] Error message: relation "public.drafts" does not exist
[saveDraftState] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 結論

- ✅ `saveDraftState` は**呼ばれている**
- ❌ Supabase INSERT は**実行されたが失敗**（テーブルなし）
- 📋 解決策: `supabase/schema.sql` を実行

---

### シナリオ3: Supabase 設定済み、RLS 拒否の場合

#### 実行フロー

```
[saveDraftState] supabase.from('drafts').insert({ state })
    ↓
[Supabase] ❌ new row violates row-level security policy for table "drafts"
    ↓
[saveDraftState] error.code = '42501'
[saveDraftState] console.error('[saveDraftState] ❌ Failed to create draft')
[saveDraftState] console.error('[saveDraftState] Error code: 42501')
[saveDraftState] console.error('[saveDraftState] Error message: new row violates row-level security policy')
    ↓
[saveDraftState] return false
```

#### コンソールログ

```
[saveDraftState] ❌ Failed to create draft
[saveDraftState] Error code: 42501
[saveDraftState] Error message: new row violates row-level security policy for table "drafts"
[saveDraftState] Error hint: Check the table's row-level security policies
```

#### 結論

- ✅ `saveDraftState` は**呼ばれている**
- ❌ Supabase INSERT は**実行されたが RLS で拒否**
- 📋 解決策: RLS ポリシーを確認・修正

---

### シナリオ4: 完全に正常動作する場合

#### 実行フロー

```
[DraftPage] loadDraftState() 呼び出し
    ↓
[loadDraftState] isSupabaseConfigured() = true ✅
    ↓
[loadDraftState] supabase.from('drafts').select()
    ↓
[Supabase] ✅ 0 rows (初回のみ)
    ↓
[loadDraftState] return null
    ↓
[DraftPage] saveDraftState(mockState) 呼び出し
    ↓
[saveDraftState] isSupabaseConfigured() = true ✅
    ↓
[saveDraftState] currentDraftId = null → INSERT mode
    ↓
[saveDraftState] supabase.from('drafts').insert({ state })
    ↓
[Supabase] ✅ INSERT successful
    ↓
[saveDraftState] data = { id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
[saveDraftState] localStorage.setItem('current_draft_id', data.id)
    ↓
[saveDraftState] return true
    ↓
[DraftPage] saved = true
[DraftPage] setState(mockState)
    ↓
[画面] モックデータ表示
[localStorage] current_draft_id = "xxx-xxx-xxx-xxx" ✅
[Supabase] 1 row ✅
```

#### コンソールログ

```
[DraftPage] === Initialization START ===
[loadDraftState] Starting...
[loadDraftState] No existing draft found in database
[DraftPage] No existing draft, creating mock...
[saveDraftState] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[saveDraftState] Starting save...
[saveDraftState] Payload preview: { tournamentName: "第1回サンプルトーナメント", ... }
[saveDraftState] 📝 INSERT mode
[saveDraftState] Creating new draft...
[saveDraftState] Payload size: 1234 bytes
[saveDraftState] ⏳ Executing INSERT query...
[saveDraftState] 📥 INSERT response received
[saveDraftState] Response data: { id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
[saveDraftState] Response error: null
[saveDraftState] ✅ Successfully created new draft
[saveDraftState] New draft ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[saveDraftState] Saved to localStorage: current_draft_id
[saveDraftState] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[DraftPage] Mock draft saved and set as initial state
[DraftPage] === Initialization END ===
```

#### 検証

```javascript
// ブラウザコンソールで実行
localStorage.getItem('current_draft_id')
// => "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" ✅
```

```sql
-- Supabase Dashboard で実行
SELECT id, created_at FROM drafts ORDER BY created_at DESC LIMIT 5;
-- => 1 row ✅
```

---

## 🎯 診断チェックリスト

### ステップ1: ブラウザで `/draft` にアクセス

### ステップ2: コンソールログを確認

以下のどのパターンか確認:

#### パターンA: Supabase 未設定

```
[saveDraftState] ⚠️ Supabase is not configured
[saveDraftState] ⚠️ Current env: { VITE_SUPABASE_URL: "NOT SET", ... }
```

**診断結果:**
- ❌ Supabase INSERT は**実行されていない**
- 🔧 **解決策**: `.env` ファイルを作成して環境変数を設定

---

#### パターンB: テーブル未作成

```
[saveDraftState] ❌ Failed to create draft
[saveDraftState] Error code: 42P01
[saveDraftState] Error message: relation "public.drafts" does not exist
```

**診断結果:**
- ✅ `saveDraftState` は**呼ばれている**
- ❌ Supabase INSERT は**失敗**（テーブルなし）
- 🔧 **解決策**: Supabase Dashboard で `supabase/schema.sql` を実行

---

#### パターンC: RLS 拒否

```
[saveDraftState] ❌ Failed to create draft
[saveDraftState] Error code: 42501
[saveDraftState] Error message: new row violates row-level security policy
```

**診断結果:**
- ✅ `saveDraftState` は**呼ばれている**
- ❌ Supabase INSERT は**RLS で拒否**
- 🔧 **解決策**: RLS ポリシーを確認

```sql
-- Supabase Dashboard で確認
SELECT * FROM pg_policies WHERE tablename = 'drafts';

-- ポリシーがない場合は schema.sql を再実行
```

---

#### パターンD: 環境変数の値が間違い

```
[saveDraftState] ❌ Failed to create draft
[saveDraftState] Error code: PGRST301
[saveDraftState] Error message: Invalid API key
```

**診断結果:**
- ✅ `saveDraftState` は**呼ばれている**
- ❌ Supabase 認証エラー
- 🔧 **解決策**: `.env` の値を確認

---

#### パターンE: 正常動作

```
[saveDraftState] ✅ Successfully created new draft
[saveDraftState] New draft ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**診断結果:**
- ✅ `saveDraftState` は**呼ばれている**
- ✅ Supabase INSERT は**成功**
- ✅ localStorage に ID が**保存されている**
- ✅ Supabase に 1 row **存在する**

**検証:**
```javascript
localStorage.getItem('current_draft_id')
// => "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

```sql
SELECT * FROM drafts ORDER BY created_at DESC LIMIT 5;
-- => 1 row が表示される
```

---

## 📋 まとめ

### 質問1: `saveDraftState` は呼ばれているのか？

**回答:** ✅ **YES**

- `/draft` にアクセスした時点で**必ず1回呼ばれる**（経路1）
- ポケモンをピックするたびに**呼ばれる**（経路2）
- 試合を遷移するたびに**呼ばれる**（経路3）

---

### 質問2: Supabase INSERT は成功しているのか？

**回答:** **場合による**

| 条件 | INSERT 実行 | 成功/失敗 |
|------|------------|----------|
| Supabase 未設定 | ❌ されない | N/A |
| テーブル未作成 | ✅ される | ❌ 失敗 (42P01) |
| RLS 拒否 | ✅ される | ❌ 失敗 (42501) |
| 環境変数誤り | ✅ される | ❌ 失敗 (認証エラー) |
| 正常 | ✅ される | ✅ 成功 |

---

### 質問3: なぜ drafts テーブルが空 (0 rows) なのか？

**回答:** 以下のいずれか

1. ❌ Supabase 未設定（`.env` なし）
   - INSERT が**実行されていない**
   - コンソールに `⚠️ Supabase is not configured` 表示

2. ❌ テーブル未作成（`schema.sql` 未実行）
   - INSERT が**失敗**
   - コンソールに `Error code: 42P01` 表示

3. ❌ RLS 拒否（ポリシー未設定）
   - INSERT が**失敗**
   - コンソールに `Error code: 42501` 表示

4. ❌ 環境変数の値が間違い
   - INSERT が**失敗**
   - コンソールに `Invalid API key` 表示

---

## 🔧 次のアクション

**ブラウザで `/draft` にアクセスして、コンソールログを確認してください。**

以下のどれが表示されるか教えてください:

- [ ] `⚠️ Supabase is not configured`
- [ ] `Error code: 42P01` (テーブル未作成)
- [ ] `Error code: 42501` (RLS 拒否)
- [ ] `Invalid API key` (環境変数誤り)
- [ ] `✅ Successfully created new draft` (正常動作)

**この結果に基づいて、次の対処法をお伝えします！**
