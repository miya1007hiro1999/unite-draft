# saveDraftState 実行経路の完全分析

## 🔴 重要な発見

**2つの異なる `saveDraftState` 関数が存在します！**

### 1. `src/lib/draftApi.ts` （旧実装）
```typescript
export async function saveDraftState(
  draftId: string,  // ← 引数が2つ
  state: DraftState
): Promise<void>
```

### 2. `src/lib/draftStorage.ts` （新実装）
```typescript
export async function saveDraftState(
  state: DraftState  // ← 引数が1つ
): Promise<boolean>
```

---

## 📍 各ファイルが使用している実装

### DraftPage.tsx → `draftStorage.ts` (新実装)
```typescript
import {
  saveDraftState,  // ← draftStorage.ts から
} from '../lib/draftStorage'
```

### SetupPage.tsx → `draftApi.ts` (旧実装)
```typescript
import {
  saveDraftState,  // ← draftApi.ts から
} from '../lib/draftApi'
```

---

## 🔍 saveDraftState（新実装）の呼び出し経路

### 経路1: 初期化時（モック作成時）

**ファイル:** `src/pages/DraftPage.tsx`
**行:** 82
**条件:** URLにdraftIdがなく、Supabaseに既存ドラフトがない場合

```typescript
// DraftPage.tsx - useEffect内
if (!draftId) {
  loadedState = await loadDraftState()

  if (!loadedState) {  // ← 既存データなし
    const mockState = createMockDraftState()
    const saved = await saveDraftState(mockState)  // ← 呼び出し①
  }
}
```

**実行タイミング:**
- ✅ `/draft` に初回アクセス時
- ✅ localStorage に current_draft_id がない
- ✅ Supabase に drafts レコードが0件

**実行回数:** 1回のみ（isInitialized.current ガードあり）

---

### 経路2: ピック時

**ファイル:** `src/pages/DraftPage.tsx`
**行:** 152
**条件:** 運営モード（admin または IDなし）でポケモンをクリック

```typescript
const handlePokemonPick = (pokemonId: string) => {
  if (isReadOnly) return  // 観戦モードでは early return

  setState((prevState) => {
    // ... state 更新 ...
    const newState = { ... }

    saveDraftState(newState).catch((error) => {  // ← 呼び出し②
      console.error('Failed to save draft state after pick:', error)
    })

    return newState
  })
}
```

**実行タイミング:**
- ✅ 運営用URL（/admin）でポケモンクリック
- ✅ /draft でポケモンクリック
- ❌ 観戦用URL（/view）では呼ばれない

**実行回数:** ピックごとに1回（最大30回 = 3試合 × 10ピック）

---

### 経路3: 試合遷移時

**ファイル:** `src/pages/DraftPage.tsx`
**行:** 185
**条件:** 運営モードで「次の試合へ進む」ボタンクリック

```typescript
const handleGoToNextMatch = () => {
  if (isReadOnly) return  // 観戦モードでは early return

  setState((prevState) => {
    // ... state 更新 ...
    const newState = { ... }

    saveDraftState(newState).catch((error) => {  // ← 呼び出し③
      console.error('Failed to save draft state after match transition:', error)
    })

    return newState
  })
}
```

**実行タイミング:**
- ✅ 運営用URL（/admin）で試合遷移ボタンクリック
- ✅ /draft で試合遷移ボタンクリック
- ❌ 観戦用URL（/view）では呼ばれない（ボタン非表示）

**実行回数:** 最大2回（試合1→2、試合2→3）

---

## ⚙️ saveDraftState の内部処理フロー

### ステップ1: Supabase設定チェック

```typescript
if (!isSupabaseConfigured()) {
  console.warn('[saveDraftState] ⚠️ Supabase is not configured')
  return false  // ← ここで終了（保存されない）
}
```

**この時点で false を返す条件:**
- `.env` ファイルがない
- `VITE_SUPABASE_URL` が未設定
- `VITE_SUPABASE_ANON_KEY` が未設定

---

### ステップ2: localStorage から current_draft_id を取得

```typescript
const currentDraftId = localStorage.getItem(CURRENT_DRAFT_ID_KEY)
```

---

### ステップ3A: 既存ドラフトの更新

**条件:** `currentDraftId` が存在する場合

```typescript
if (currentDraftId) {
  const { error } = await supabase
    .from('drafts')
    .update({ state })  // ← UPDATE 実行
    .eq('id', currentDraftId)

  if (error) {
    console.error('[saveDraftState] Failed to update draft:', error)
    return false
  }

  console.log('[saveDraftState] ✅ Successfully updated draft')
  return true
}
```

---

### ステップ3B: 新規ドラフトの作成

**条件:** `currentDraftId` が null の場合

```typescript
else {
  const { data, error } = await supabase
    .from('drafts')
    .insert({ state })  // ← INSERT 実行
    .select('id')
    .single()

  if (error) {
    console.error('[saveDraftState] Failed to create draft:', error)
    return false
  }

  localStorage.setItem(CURRENT_DRAFT_ID_KEY, data.id)  // ← ID保存
  console.log('[saveDraftState] ✅ Successfully created new draft, ID:', data.id)
  return true
}
```

---

## 🎯 必ず1回は呼ばれる設計か？

### 結論: **YES（条件付き）**

#### 条件1: `/draft` にアクセスした場合
- ✅ 初期化時に必ず1回呼ばれる（経路1）
- ✅ Supabaseが設定されていれば INSERT が実行される

#### 条件2: `/draft/:id/admin` にアクセスした場合
- ❌ 初期化時には呼ばれない（既存ドラフトをロード）
- ✅ ポケモンをピックした時点で呼ばれる（経路2）

#### 条件3: `/draft/:id/view` にアクセスした場合
- ❌ 一切呼ばれない（読み取り専用）

---

## 🔍 drafts テーブルが 0 件になる条件

### パターン1: Supabase が未設定

```
[DraftPage] === Initialization START ===
[loadDraftState] ⚠️ Supabase is not configured  ← ここで return null
[DraftPage] No existing draft, creating mock...
[saveDraftState] ⚠️ Supabase is not configured  ← ここで return false
[DraftPage] Failed to save initial mock, using local state only
```

**結果:**
- localStorage: `current_draft_id` = null
- Supabase: 0 rows
- 画面: モックデータが表示される（ローカルのみ）

---

### パターン2: Supabase設定済みだが、テーブルが存在しない

```
[DraftPage] === Initialization START ===
[loadDraftState] Starting...
[loadDraftState] Failed to load draft: relation "public.drafts" does not exist
[DraftPage] No existing draft, creating mock...
[saveDraftState] Starting save...
[saveDraftState] Creating new draft...
[saveDraftState] Failed to create draft: relation "public.drafts" does not exist
```

**結果:**
- localStorage: `current_draft_id` = null
- Supabase: テーブル自体がない
- 画面: モックデータが表示される（ローカルのみ）

---

### パターン3: RLS ポリシーで拒否されている

```
[DraftPage] === Initialization START ===
[loadDraftState] Starting...
[loadDraftState] Failed to load draft: new row violates row-level security policy
[DraftPage] No existing draft, creating mock...
[saveDraftState] Starting save...
[saveDraftState] Creating new draft...
[saveDraftState] Failed to create draft: new row violates row-level security policy
```

**結果:**
- localStorage: `current_draft_id` = null
- Supabase: 0 rows（RLSで拒否）
- 画面: モックデータが表示される（ローカルのみ）

---

### パターン4: 環境変数が間違っている

```
[DraftPage] === Initialization START ===
[loadDraftState] Starting...
[loadDraftState] Failed to load draft: Invalid API key
[DraftPage] No existing draft, creating mock...
[saveDraftState] Starting save...
[saveDraftState] Creating new draft...
[saveDraftState] Failed to create draft: Invalid API key
```

**結果:**
- localStorage: `current_draft_id` = null
- Supabase: 0 rows（認証エラー）
- 画面: モックデータが表示される（ローカルのみ）

---

## 🔧 現在の問題の切り分け

### 確認項目1: Supabase設定

**コンソールログを確認:**
```
[loadDraftState] ⚠️ Supabase is not configured
```

↑ これが出ている場合、`.env` が未設定

---

### 確認項目2: テーブル存在

**コンソールログを確認:**
```
[saveDraftState] Failed to create draft: relation "public.drafts" does not exist
```

↑ これが出ている場合、`supabase/schema.sql` 未実行

---

### 確認項目3: RLS

**コンソールログを確認:**
```
[saveDraftState] Failed to create draft: new row violates row-level security policy
```

↑ これが出ている場合、RLSポリシーの問題

---

### 確認項目4: 環境変数の値

**コンソールログを確認:**
```
[saveDraftState] Failed to create draft: Invalid API key
```

↑ これが出ている場合、`.env` の値が間違っている

---

## 📊 まとめ

### saveDraftState が呼ばれる条件

| URL | 初期化時 | ピック時 | 試合遷移時 |
|-----|---------|---------|-----------|
| `/draft` | ✅ (1回) | ✅ | ✅ |
| `/draft/:id/admin` | ❌ | ✅ | ✅ |
| `/draft/:id/view` | ❌ | ❌ | ❌ |

### drafts テーブルが 0 件になる原因

1. ❌ Supabase未設定（`.env` なし）
2. ❌ テーブル未作成（`schema.sql` 未実行）
3. ❌ RLS拒否（ポリシー未設定）
4. ❌ 環境変数の値が間違っている

### 次のステップ

**ブラウザコンソールで以下を確認:**

1. `/draft` にアクセス
2. コンソールログで以下のどれが出ているか確認:
   - `⚠️ Supabase is not configured` → 環境変数未設定
   - `Failed to create draft: relation "public.drafts" does not exist` → テーブル未作成
   - `Failed to create draft: new row violates row-level security policy` → RLS問題
   - `Failed to create draft: Invalid API key` → 環境変数の値が間違い
   - `✅ Successfully created new draft, ID: xxx` → **正常動作！**

**この結果を教えてください！**
