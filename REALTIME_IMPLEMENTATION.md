# Realtime 実装ガイド

Supabase Realtime（Postgres Changes）を使った、リアルタイム同期の実装が完了しました。

---

## 実装ファイル

### 1. `src/hooks/useDraftRealtime.tsx`

Realtime 購読を管理するカスタムフック。

**機能:**
- 初回 fetch（drafts + draft_actions）
- Realtime 購読（drafts UPDATE / draft_actions INSERT）
- state の自動更新（イベント受信時）

**使い方:**
```typescript
const { draftState, confirmedActions, isLoading, error } = useDraftRealtime({
  draftId: 'uuid',
  enabled: true,
})
```

### 2. `src/lib/draftActions.ts`

確定操作のヘルパー関数。

**機能:**
- `confirmPick()` - PICK を確定（draft_actions INSERT + drafts UPDATE）
- `confirmBan()` - BAN を確定
- `confirmBanSkip()` - BAN スキップを確定

**重要:** これらの関数は `setState()` を呼びません。UI 更新は Realtime イベント経由で行われます。

### 3. `src/pages/DraftPageRealtime.tsx`

Realtime 対応の DraftPage 実装例。

**特徴:**
- 確定操作は DB INSERT のみ
- setState は呼ばない
- UI 更新は Realtime 経由のみ

---

## 設計原則

### 1. state の分離

```typescript
// DB と同期される state（Realtime で更新）
const { draftState, confirmedActions } = useDraftRealtime({ draftId, enabled: true })

// ローカルの未確定操作
const [pendingPick, setPendingPick] = useState<Pokemon | null>(null)
```

### 2. 確定操作のフロー

```
端末A: ピカチュウを選択（pendingPick にセット）
  ↓
端末A: 確定ボタンをクリック
  ↓
端末A: confirmPick() を呼び出し
  ↓  ├─ draft_actions に INSERT
  ├─ drafts.state を UPDATE
  └─ setState は呼ばない
  ↓
Realtime: UPDATE イベントを全端末に配信
  ↓
端末A, B: UPDATE イベントを受信
  ↓
端末A, B: draftState が自動的に更新される
  ↓
端末A, B: UI が即座に再レンダリング
```

### 3. 重要なルール

**❌ やってはいけないこと:**
```typescript
// 確定操作時に setState を呼ぶ（古い実装）
const handleConfirmPick = () => {
  setState({ ...state, picks: [...state.picks, newPick] }) // ❌ NG
  confirmPick(...)
}
```

**✅ 正しい実装:**
```typescript
// 確定操作は DB に書き込むだけ
const handleConfirmPick = async () => {
  await confirmPick(...) // DB に INSERT + UPDATE
  // setState は呼ばない
  // Realtime イベントで自動更新される
}
```

---

## データフロー

### 初回読み込み

```
1. useDraftRealtime() が初期化される
2. drafts テーブルから state を fetch
3. draft_actions テーブルから履歴を fetch
4. draftState / confirmedActions にセット
5. Realtime 購読を開始
```

### 操作時の流れ

```
端末A: ポケモンを選択
  ↓（ローカル state のみ）
pendingPick にセット
  ↓
端末A: 確定ボタン
  ↓
confirmPick() 実行
  ├─ draft_actions に INSERT
  └─ drafts.state を UPDATE
  ↓
PostgreSQL: WAL に書き込み
  ↓
Realtime Server: WAL を検知
  ↓
Realtime Server: 全クライアントに配信
  ↓
端末A: UPDATE イベント受信 → draftState 更新
端末B: UPDATE イベント受信 → draftState 更新
  ↓
React: 自動再レンダリング
  ↓
UI が即座に更新される
```

---

## 既存コードとの統合

### オプション1: 段階的移行（推奨）

既存の `DraftPage.tsx` はそのまま残し、新しい `DraftPageRealtime.tsx` を並行運用。

```
/draft/:draftId/admin → 既存の DraftPage（旧実装）
/draft/:draftId/realtime → 新しい DraftPageRealtime（Realtime対応）
```

動作確認後、既存コードを置き換え。

### オプション2: 直接置き換え

既存の `DraftPage.tsx` を以下のように修正：

**変更点:**
1. `useDraftRealtime()` を使用
2. `setState()` を削除
3. 確定操作を `confirmPick/confirmBan` に置き換え

**修正例:**
```typescript
// 既存コード（削除）
const [state, setState] = useState<DraftState | null>(null)

// 新しいコード
const { draftState, confirmedActions, isLoading } = useDraftRealtime({
  draftId,
  enabled: true,
})

// stateの参照を draftState に変更
if (!draftState) return <div>Loading...</div>

// 確定操作を置き換え
const handleConfirmPick = async () => {
  if (!pendingPick || !draftId) return
  await confirmPick(draftId, pickingTeam, pendingPick.id, orderIndex, draftState)
  setPendingPick(null)
}
```

---

## 動作確認手順

### 1. Supabase 設定確認

```bash
# .env ファイルに以下が設定されているか確認
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. DB 確認

```sql
-- RLS が有効で anon に権限があるか確認
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename IN ('drafts', 'draft_actions');

-- Realtime Publication に含まれているか確認
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### 3. 2端末でテスト

**端末A:**
1. `/draft/:draftId/realtime` を開く
2. ポケモンを選択（仮ピック）
3. 確定ボタンをクリック

**端末B:**
1. `/draft/:draftId/realtime` を開く
2. 端末A の操作が**リロードなしで即座に反映される**ことを確認

**期待される動作:**
- 端末B の画面が自動的に更新される
- ブラウザコンソールに `[useDraftRealtime] Drafts UPDATE received` が表示される
- `confirmedActions` の数が増える

---

## トラブルシューティング

### ❌ Realtime イベントが受信されない

**原因1: RLS で拒否されている**
```sql
-- anon が SELECT できるか確認
SELECT * FROM drafts WHERE id = 'your-draft-id';
```

**原因2: Publication に含まれていない**
```sql
-- drafts / draft_actions が含まれているか確認
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

**原因3: WebSocket 接続エラー**
- ブラウザコンソールで `Subscription status` を確認
- `SUBSCRIBED` になっていれば正常

### ❌ 他端末の操作が反映されない

**原因: setState を呼んでいる**

確定操作時に `setState()` を呼んでいると、ローカル state が優先され、Realtime の更新が上書きされます。

**解決策:**
- 確定操作から `setState()` を削除
- `confirmPick/confirmBan` だけを呼ぶ

### ❌ 重複したアクションが表示される

**原因: 重複チェックが機能していない**

`useDraftRealtime.tsx` の以下の部分を確認：
```typescript
setConfirmedActions((prev) => {
  if (prev.some((a) => a.id === newAction.id)) {
    return prev // 既に存在する場合は追加しない
  }
  // ...
})
```

---

## パフォーマンス最適化

### 1. filter を使った購読

現在は `draft_id=eq.${draftId}` でフィルタリング済み。

```typescript
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'drafts',
  filter: `id=eq.${draftId}`, // ✓ 必要なイベントのみ受信
}, ...)
```

### 2. 不要な再レンダリングを防ぐ

`useMemo` / `useCallback` で最適化：

```typescript
const pickingTeam = useMemo(() => {
  return getCurrentPickingTeam(draftState)
}, [draftState])

const handleConfirmPick = useCallback(async () => {
  // ...
}, [draftId, pendingPick, draftState])
```

---

## 次のステップ

### 完了したこと
✅ Realtime フックの実装
✅ 確定操作ヘルパーの実装
✅ DraftPageRealtime の実装例

### 残りのタスク
- [ ] 既存の DraftPage.tsx を Realtime 版に置き換え
- [ ] BAN確定フローの実装
- [ ] 試合遷移の実装
- [ ] エラーハンドリングの強化
- [ ] 接続状態の UI 表示（接続中/切断）
- [ ] 再接続処理

---

## まとめ

### WebSocket 的な即時同期が実現される理由

1. **自分の操作も Realtime 経由**
   - 確定操作は DB に書き込むだけ
   - setState を呼ばない
   - 自分の操作も Realtime イベントとして返ってくる

2. **DB が真実の源泉**
   - ローカル state は常に DB と同期される
   - 他端末の操作も同じフローで反映される

3. **未確定操作はローカルに閉じる**
   - `pendingPick` はローカル state のみ
   - 他端末が確定したら、Realtime で上書きされる
   - ユーザーは「他の人が先に確定した」と即座に気づく

### 設計の核心

```
DB（drafts.state）= 唯一の真実
  ↓ Realtime (UPDATE)
全クライアントのローカル state = DB のコピー
  +
pendingPick = ローカルの仮選択（いつでも破棄される）
```

この設計により、「リロード不要・WebSocket 的な即時同期」が実現されます。
