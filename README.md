# unite-draft

React + TypeScript + Vite + Supabase で構築されたドラフトアプリケーション。

## 技術スタック

- **React** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - 高速ビルドツール
- **Supabase** - バックエンド・データベース
- **React Router** - ページルーティング

## ディレクトリ構成

```
src/
├── components/          # 再利用可能なUIコンポーネント
│   ├── setup/          # Setup画面専用コンポーネント
│   └── draft/          # Draft画面専用コンポーネント
├── pages/              # 画面コンポーネント（SetupPage, DraftPage）
├── hooks/              # カスタムReactフック（ロジックの再利用）
├── lib/                # 外部ライブラリ設定（Supabase接続など）
├── types/              # TypeScript型定義
└── utils/              # ユーティリティ関数
```

### 各ディレクトリの役割

- **components/** - ボタン、入力フォーム、カードなど再利用可能なUIパーツ
- **pages/** - Setup画面とDraft画面のメインコンポーネント
- **hooks/** - カスタムフック（状態管理、API呼び出しロジックなど）
- **lib/** - Supabaseクライアントなど外部サービスの初期化
- **types/** - 共通で使用する型定義（Draft型、Pokemon型など）
- **utils/** - 汎用的なヘルパー関数

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env.local` にコピーして、Supabaseの認証情報を設定：

```bash
cp .env.example .env.local
```

`.env.local` に以下を記入：

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## ビルド

```bash
npm run build
```

## プレビュー

```bash
npm run preview
```
