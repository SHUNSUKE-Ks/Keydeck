# KeyDeck — CLAUDE.md

スマホをソフトウェア左手デバイスとして使う KeyDeck の開発ガイド。
このファイルは Phase 2 (Opus スキャフォールド) で生成された。Phase 3 で Sonnet
が `tickets.jsonc` 順に実装を埋めていく。

---

## プロジェクト構造

```
KeyDeck/
├── server/                  Python WebSocket サーバー (PC)
│   ├── server.py            エントリ + 接続/dispatch
│   ├── macro_engine.py      keybinding / macro 解決
│   ├── key_sender.py        pynput / pyperclip 薄ラッパー
│   ├── types.py             共有型 (TypedDict)
│   ├── macros.json          PC 環境依存マクロ (PC が源泉)
│   ├── keymap_cache.json    スマホから受信した keymap のキャッシュ
│   └── requirements.txt
├── app/                     Expo React Native (Android)
│   ├── app/                 expo-router の screens
│   │   ├── _layout.tsx
│   │   ├── index.tsx              メイン (KeyboardView)
│   │   ├── settings.tsx           接続 + レイアウト選択
│   │   ├── keymap-editor.tsx      キー機能編集
│   │   └── layout-editor.tsx      ビジュアル編集
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useKeymap.ts
│   │   └── useLayout.ts
│   ├── components/
│   │   └── KeyboardView.tsx       layout を見た目に描画
│   ├── types/
│   │   └── index.ts               server/types.py と意味的に一致
│   ├── layouts/
│   │   └── layouts.json           ビジュアルレイアウト集
│   ├── keymap.json                キー機能 (スマホが源泉)
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
└── devstudio/               プロジェクト管理 UI (ブラウザで開く)
    ├── devstudio-v2.jsx
    ├── index.html
    ├── TODO.md              人間用チェックリスト
    └── tickets.jsonc        DevStudio が読む構造化チケット
```

---

## 設計の核となる分離

KeyDeck では「キーが何をするか」と「ボタンがどう見えるか」を**完全に分離**する。

| 関心        | ファイル              | 源泉    | 編集 UI               |
| ----------- | --------------------- | ------- | --------------------- |
| キーの機能  | `app/keymap.json`     | スマホ  | `keymap-editor.tsx`   |
| 見た目      | `app/layouts/*.json`  | スマホ  | `layout-editor.tsx`   |
| PC 側マクロ | `server/macros.json`  | PC      | テキストエディタ      |

ユーザは複数の `KeyboardLayout` を作成でき、設定画面でアクティブを切り替える。
ボタンに割り当てたキー機能はレイアウトを切り替えても変わらない。

---

## Console ログ命名規則

ログは grep / フィルタしやすいよう、**プレフィックス + 連番**で書く。

### サーバー (Python)
- 形式: `SERVER_NN <message>` (NN は 01-99)
- 番号帯:
  - `01-09` ... server.py のライフサイクル / dispatch
  - `10-19` ... macro_engine.py
  - `20-29` ... key_sender.py
  - `30-39` ... watchdog / hot reload
- ロガーは `logging` モジュール経由。`print()` 禁止。

### アプリ (TypeScript)
- 形式: `APP_NN <message>` (NN は 01-99)
- 番号帯:
  - `00-09` ... ルートレイアウト / 画面遷移
  - `10-19` ... useWebSocket
  - `20-29` ... useKeymap
  - `30-39` ... useLayout
  - `40-49` ... KeyboardView 描画
- `console.info` / `console.warn` / `console.error` を使い分け。

スキャフォールドの `NotImplementedError` / `throw new Error` メッセージには
あらかじめ正しい番号が埋め込まれているので、実装時もその番号を踏襲する。

---

## ★ OPUS SCAFFOLD マーカー

ファイル冒頭または関数 docstring に `★ OPUS SCAFFOLD` というマーカーが入って
いる箇所は「Phase 2 で骨組みだけ書いた」場所。Sonnet 実装フェーズで:

1. マーカーコメントを読んで仕様を把握する
2. `NotImplementedError` / `throw new Error("APP_XX ...")` を実装で置き換える
3. マーカーは消す (実装済みであることをコミットで明示)

---

## 開発フロー

| Phase   | 担当         | 状態   |
| ------- | ------------ | ------ |
| Phase 0 | 要件ラフ     | ✅     |
| Phase 1 | 引継ぎ資料   | ✅     |
| Phase 2 | Opus 骨組み  | ✅ ← いまここ |
| Phase 3 | Sonnet 実装  | ⬜     |

進捗は `devstudio/TODO.md` と `devstudio/tickets.jsonc` を見る。ブラウザで
`devstudio/index.html` を開けばカンバン形式で確認できる。

---

## セットアップ (Phase 3 開始時)

```cmd
:: Python サーバ
cd C:\05__claude_workspace\05_app\KeyDeck\server
pip install -r requirements.txt
python -c "import websockets, pynput, pyperclip, httpx, watchdog; print('OK')"

:: Expo アプリ (まだ初期化していない場合のみ)
cd C:\05__claude_workspace\05_app\KeyDeck
:: APP-001 チケットで実行する:
::   npx create-expo-app app --template blank-typescript
:: その後、本スキャフォールドの app/ 配下を上書き or マージ
```

Phase 1 受け入れシナリオ:

1. PC で `python -m server.server` を起動
2. スマホで Expo を起動し、PC IP を設定
3. K1 を押すと PC 画面のフォーカスに「アリア」がペーストされる
