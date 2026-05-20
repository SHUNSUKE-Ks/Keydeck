# KeyDeck — Phase 1 TODO

> Opus スキャフォールドから Sonnet 実装フェーズへ渡す進捗チェックリスト。
> チケット詳細は `tickets.js` を参照。DevStudio (index.html) で同期表示できる。

## P1 — Phase 1 成功基準 (スマホ 6 ボタン → PC ペースト)

- [x] **SERVER-001** Python WebSocket サーバー起動 (ws://0.0.0.0:8765)
- [x] **SERVER-002** keypress 受信 → pynput でテキスト送信 (paste/hotkey)
- [x] **SERVER-003** keymap_cache.json の読み書き
- [x] **APP-001** Expo プロジェクト初期化 (package.json + npm install 済)
- [x] **APP-002** 6 ボタン UI 表示 (デフォルト grid_2x3 レイアウト)
- [x] **APP-003** WebSocket 接続 + keypress 送信
- [x] **APP-004** keymap.json をバンドルから読み込みボタンラベルに反映

## P2 — 拡張

- [x] **APP-005** 接続設定画面 (IP/Port 入力・接続テスト) — settings.tsx に基本実装済
- [ ] **SERVER-004** macro 実行エンジン (type/hotkey/focus_terminal)
- [ ] **APP-006** レイヤー切替 (HOLD_K6 / layer_switch binding)
- [ ] **APP-007** レイアウト選択 UI (設定画面の「レイアウト」セクション) — 設定画面に実装済
- [ ] **APP-008** レイアウトエディタ (新規作成・編集・削除・保存)

## P3 — 仕上げ

- [ ] **APP-009** keymap エディタ UI (type/text/keys/id 編集)
- [ ] **SERVER-005** http_post マクロ (Notion API 等)
- [ ] **SERVER-006** watchdog による macros.json / keymap_cache.json 自動リロード
- [ ] **APP-010** フリーフォームレイアウト編集 (絶対座標 ドラッグ&リサイズ)

## 完了の定義 (Definition of Done)

各チケットは以下を満たすこと:

1. 当該ファイルから `★ OPUS SCAFFOLD` コメントと `NotImplementedError` / `throw new Error` が除去されている
2. Console ログが `SERVER_NN` / `APP_NN` 命名規則に従っている
3. Phase 1 受け入れシナリオ (スマホ K1 押下 → PC に「アリア」がペースト) を破壊しない

## Phase 1 受け入れシナリオ (起動手順)

```cmd
# 1. PC でサーバー起動
cd C:\05__claude_workspace\05_app\KeyDeck
python -m server.server

# 2. スマホで Expo 起動
cd C:\05__claude_workspace\05_app\KeyDeck\app
npx expo start --android

# 3. 設定画面で PC の IP を入力して保存
# 4. K1 を押すと PC 画面に「アリア」がペーストされる
```
