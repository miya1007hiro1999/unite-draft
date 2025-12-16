# 動作テストチェックリスト

開発サーバー: http://localhost:5174/

---

## ✅ テスト1: 基本動作確認（/draft）

### 手順

1. **ブラウザで http://localhost:5174/draft にアクセス**
2. **ブラウザのコンソール（F12）を開く**

### 期待される動作

#### コンソールログ
```
[DraftPage] === Initialization START ===
[DraftPage] Mode: default | Draft ID: none
[DraftPage] Read-only: false
[DraftPage] No draft ID in URL, using default behavior...
[loadDraftState] Starting...
```

**パターンA: 既存ドラフトがある場合**
```
[loadDraftState] Current draft ID from localStorage: xxx-xxx-xxx
[loadDraftState] Successfully loaded draft by ID
[DraftPage] Using existing draft from Supabase
[DraftPage] === Initialization END ===
```

**パターンB: 初回アクセスの場合**
```
[loadDraftState] No existing draft found in database
[DraftPage] No existing draft, creating mock...
[saveDraftState] Starting save...
[saveDraftState] Creating new draft...
[saveDraftState] ✅ Successfully created new draft, ID: xxx-xxx-xxx-xxx-xxx
[DraftPage] Mock draft saved and set as initial state
[DraftPage] === Initialization END ===
```

#### 画面表示
- ✅ ヘッダーに「第1回サンプルトーナメント」表示
- ✅ 「試合 1 / 3 | ターン 0」表示
- ✅ 「👁️ 観戦モード」バッジが**表示されない**
- ✅ チームアルファ vs チームベータが表示
- ✅ ポケモングリッドが表示される

#### 操作確認
- ✅ ポケモンをクリックできる
- ✅ クリック後、ポケモンがチームAの1枠目に表示される
- ✅ ターン数が 0 → 1 に増える

#### コンソールログ（ピック時）
```
[saveDraftState] Starting save...
[saveDraftState] Updating existing draft, ID: xxx-xxx-xxx
[saveDraftState] ✅ Successfully updated draft
```

---

## ✅ テスト2: Draft ID の取得

### 手順

1. テスト1で `/draft` にアクセス済みの状態で
2. **ブラウザコンソールで以下を実行**:
   ```javascript
   localStorage.getItem('current_draft_id')
   ```

### 期待される結果

```
"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
※ UUID形式の文字列が返される

**このIDを次のテストで使用します。メモしてください！**

---

## ✅ テスト3: 運営用URL（/draft/:id/admin）

### 手順

1. テスト2で取得したDraft IDを使用
2. **新しいタブで http://localhost:5174/draft/{Draft_ID}/admin にアクセス**
   - 例: `http://localhost:5174/draft/abc-123-def-456/admin`

### 期待される動作

#### コンソールログ
```
[DraftPage] === Initialization START ===
[DraftPage] Mode: admin | Draft ID: xxx-xxx-xxx
[DraftPage] Read-only: false
[DraftPage] Loading specific draft by ID...
[loadDraftStateById] Loading draft by ID: xxx-xxx-xxx
[loadDraftStateById] ✅ Successfully loaded draft
[DraftPage] ✅ Loaded draft by ID
[DraftPage] Using existing draft from Supabase
[DraftPage] === Initialization END ===
```

#### 画面表示
- ✅ ヘッダーに「第1回サンプルトーナメント」表示
- ✅ 「👁️ 観戦モード」バッジが**表示されない**
- ✅ **画面右上に以下が表示される**:
  ```
  🔗 運営URL: http://localhost:5174/draft/xxx/admin
  👁️ 観戦URL: http://localhost:5174/draft/xxx/view
  ```
- ✅ テスト1でピックしたポケモンが表示される（状態が復元される）

#### 操作確認
- ✅ ポケモンをクリックできる
- ✅ クリック後、チームBにピックされる（ターン1なのでチームB）
- ✅ ターン数が増える

#### コンソールログ（ピック時）
```
[saveDraftState] Starting save...
[saveDraftState] Updating existing draft, ID: xxx-xxx-xxx
[saveDraftState] ✅ Successfully updated draft
```

---

## ✅ テスト4: 観戦用URL（/draft/:id/view）

### 手順

1. **テスト3と同じDraft IDを使用**
2. **新しいタブで http://localhost:5174/draft/{Draft_ID}/view にアクセス**
   - 例: `http://localhost:5174/draft/abc-123-def-456/view`

### 期待される動作

#### コンソールログ
```
[DraftPage] === Initialization START ===
[DraftPage] Mode: view | Draft ID: xxx-xxx-xxx
[DraftPage] Read-only: true  ⭐ 重要！
[DraftPage] Loading specific draft by ID...
[loadDraftStateById] Loading draft by ID: xxx-xxx-xxx
[loadDraftStateById] ✅ Successfully loaded draft
[DraftPage] ✅ Loaded draft by ID
[DraftPage] Using existing draft from Supabase
[DraftPage] === Initialization END ===
```

#### 画面表示
- ✅ ヘッダーに **「👁️ 観戦モード」バッジが表示される**
- ✅ ポケモングリッドの見出しに **「読み取り専用」バッジが表示される**
- ✅ 画面右上の運営・観戦URLが**表示されない**
- ✅ テスト3でピックしたポケモンが表示される（同じ状態）

#### 操作確認（重要！）
- ✅ ポケモンをクリックしても**何も起こらない**
- ✅ ターン数が**変わらない**
- ✅ チームにポケモンが**追加されない**

#### コンソールログ（ポケモンクリック時）
```
[DraftPage] Read-only mode: Pokemon pick disabled  ⭐ この警告が出ればOK
```

**saveDraftState は呼ばれない**（保存処理が実行されない）

---

## ✅ テスト5: リアルタイム同期確認

### 手順

1. **タブA**: 運営用URL（/admin）を開く
2. **タブB**: 観戦用URL（/view）を開く
3. **タブAでポケモンをピック**
4. **タブBをリロード（F5）**

### 期待される動作

- ✅ タブBでタブAのピックが反映される
- ✅ 同じターン数が表示される
- ✅ 同じポケモンが表示される

#### コンソールログ（タブB・リロード後）
```
[loadDraftStateById] Loading draft by ID: xxx-xxx-xxx
[loadDraftStateById] ✅ Successfully loaded draft
[DraftPage] ✅ Loaded draft by ID
```

---

## ✅ テスト6: 試合終了と試合遷移

### 手順

1. **運営用URL（/admin）で10ピック完了まで進める**
   - ピック順: ABBAABBAAB
   - チームA: 5体、チームB: 5体

### 期待される動作

#### 画面表示（10ピック完了後）
- ✅ 「試合 1 終了」メッセージが表示される
- ✅ 「次の試合へ進む（試合 2）」ボタンが表示される

#### ボタンクリック後
- ✅ 試合 2 / 3 に変わる
- ✅ ターンが 0 にリセットされる
- ✅ 試合1のピックがBANされる（グレー表示）

#### コンソールログ
```
[saveDraftState] Starting save...
[saveDraftState] Updating existing draft, ID: xxx-xxx-xxx
[saveDraftState] ✅ Successfully updated draft
```

---

## ✅ テスト7: 観戦モードでの試合遷移ボタン非表示

### 手順

1. テスト6と同じ状態（試合1完了）で
2. **観戦用URL（/view）にアクセス**

### 期待される動作

- ✅ 「試合 1 終了」メッセージが**表示されない**
- ✅ 「次の試合へ進む」ボタンが**表示されない**
- ✅ 試合1の完了状態が表示される

---

## ❌ エラーケーステスト

### テスト8: 存在しないDraft IDでアクセス

#### 手順
```
http://localhost:5174/draft/00000000-0000-0000-0000-000000000000/admin
```

#### 期待される動作

##### コンソールログ
```
[DraftPage] === Initialization START ===
[DraftPage] Mode: admin | Draft ID: 00000000-0000-0000-0000-000000000000
[DraftPage] Loading specific draft by ID...
[loadDraftStateById] Loading draft by ID: 00000000-0000-0000-0000-000000000000
[loadDraftStateById] Failed to load draft: [error details]
[DraftPage] ❌ Draft not found: 00000000-0000-0000-0000-000000000000
```

##### 画面表示
- ✅ 「読み込み中...」が表示され続ける
- ✅ または空白画面

---

## 📊 総合チェックリスト

### 基本機能
- [ ] /draft で新規ドラフト作成できる
- [ ] Draft ID が localStorage に保存される
- [ ] ピックが Supabase に保存される
- [ ] リロード後も状態が復元される

### 運営用URL（/admin）
- [ ] Draft ID を指定してアクセスできる
- [ ] ポケモンをピックできる
- [ ] 試合遷移できる
- [ ] 画面右上に運営・観戦URLが表示される
- [ ] 「👁️ 観戦モード」バッジが表示されない

### 観戦用URL（/view）
- [ ] Draft ID を指定してアクセスできる
- [ ] 「👁️ 観戦モード」バッジが表示される
- [ ] 「読み取り専用」バッジが表示される
- [ ] ポケモンをクリックしても何も起こらない
- [ ] 試合遷移ボタンが表示されない
- [ ] 運営・観戦URLが表示されない

### リアルタイム同期
- [ ] 運営側のピックが観戦側に反映される（リロード後）
- [ ] 運営側の試合遷移が観戦側に反映される（リロード後）

### エラーハンドリング
- [ ] 存在しないDraft IDでエラー表示
- [ ] Supabase未設定時の警告表示

---

## 🐛 問題が発生した場合

### コンソールに何も表示されない

**原因**: Supabase環境変数が設定されていない

**対処法**:
1. `.env` ファイルを確認
2. `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` が設定されているか確認
3. サーバーを再起動: `npm run dev`

### "Draft not found" エラーが出る

**原因**: Draft ID が間違っている、またはデータが削除された

**対処法**:
1. Supabaseで確認:
   ```sql
   SELECT id, created_at FROM drafts ORDER BY created_at DESC LIMIT 10;
   ```
2. 正しいIDで再度アクセス
3. または `/draft` で新規作成

### 観戦モードでピックできてしまう

**原因**: URLの `mode` が `view` になっていない

**対処法**:
1. URLを確認: `/draft/:id/view` になっているか
2. ブラウザのアドレスバーで確認
3. コンソールで `Read-only: true` が表示されるか確認

### リロード後にピックが消える

**原因**: Supabaseへの保存が失敗している

**対処法**:
1. コンソールで `[saveDraftState] ✅ Successfully updated draft` が出ているか確認
2. 出ていない場合は Supabase接続を確認
3. テーブルが正しく作成されているか確認:
   ```sql
   SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 5;
   ```

---

## ✅ 全テスト完了後

以下が確認できれば、大会で安全に使用できる状態です:

1. ✅ 運営用URLでピック・試合遷移ができる
2. ✅ 観戦用URLで完全に読み取り専用になる
3. ✅ 両URLで同じデータが表示される
4. ✅ リロード後も状態が保持される
5. ✅ Supabaseに正しく保存されている

**テスト結果をお知らせください！**
