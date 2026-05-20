// KeyDeck — TaskTicket 定義 (scaffold-spec.md 準拠)
//
// 各チケットは Sonnet 実装フェーズで 1 PR 単位として扱う。
// index.html が <script src="tickets.js"> でこの window.TICKETS を読み込む。
//
// status:   "todo" | "in_progress" | "review" | "done"
// priority: "P1" | "P2" | "P3"
// area:     "server" | "app" | "shared"
//
// 進捗を更新するときはこのファイルを直接編集する。
// status と (必要なら) note を書き換えればダッシュボードに反映される。

window.TICKETS = {
  project: "KeyDeck",
  phase: 1,
  generated_by: "opus-scaffold",
  generated_at: "2026-05-20",

  tickets: [
    // ============================================================
    // P1 — Phase 1 成功基準 (スマホ 6 ボタン → PC ペースト)
    // ============================================================
    {
      id: "SERVER-001",
      title: "WebSocket サーバー起動",
      area: "server",
      priority: "P1",
      status: "done",
      files: ["server/server.py"],
      depends_on: [],
      scaffold_anchors: ["SERVER_01 main", "SERVER_02 handle_connection"],
      acceptance: [
        "python -m server.server で起動し ws://0.0.0.0:8765 を listen",
        "wscat で接続できる",
        "SIGINT で graceful shutdown",
      ],
    },
    {
      id: "SERVER-002",
      title: "keypress 受信 → pynput で paste/hotkey 実行",
      area: "server",
      priority: "P1",
      status: "done",
      files: [
        "server/server.py",
        "server/macro_engine.py",
        "server/key_sender.py",
      ],
      depends_on: ["SERVER-001"],
      scaffold_anchors: [
        "SERVER_05 handle_keypress",
        "SERVER_11 execute_binding",
        "SERVER_21 type_text",
        "SERVER_22 hotkey",
      ],
      acceptance: [
        "{type:'keypress', key:'K1', layer:0} を送ると PC に「アリア」がタイプされる",
        "{type:'keypress', key:'K6', layer:0} で Ctrl+Shift+T が送信される",
        "AckMessage が返る",
      ],
    },
    {
      id: "SERVER-003",
      title: "keymap_cache.json のロードと keymap_sync ハンドリング",
      area: "server",
      priority: "P1",
      status: "done",
      files: ["server/server.py"],
      depends_on: ["SERVER-001"],
      scaffold_anchors: ["SERVER_06 handle_keymap_sync"],
      acceptance: [
        "起動時に keymap_cache.json を読み込み解決に使える",
        "keymap_sync メッセージで上書き保存される",
      ],
    },
    {
      id: "APP-001",
      title: "Expo プロジェクト初期化",
      area: "app",
      priority: "P1",
      status: "done",
      files: ["app/"],
      depends_on: [],
      scaffold_anchors: [],
      acceptance: [
        "npx create-expo-app app --template blank-typescript 完了",
        "expo-router / expo-file-system / async-storage を追加",
        "npx expo start で空画面が起動する",
      ],
    },
    {
      id: "APP-002",
      title: "6 ボタン UI (KeyboardView + grid_2x3)",
      area: "app",
      priority: "P1",
      status: "done",
      files: [
        "app/components/KeyboardView.tsx",
        "app/app/index.tsx",
        "app/hooks/useLayout.ts",
      ],
      depends_on: ["APP-001"],
      scaffold_anchors: ["APP_40 KeyboardView", "APP_30 useLayout"],
      acceptance: [
        "デフォルトレイアウト grid_2x3 で 6 ボタン表示",
        "押下で onKeyPress が発火する",
      ],
    },
    {
      id: "APP-003",
      title: "WebSocket 接続 + keypress 送信",
      area: "app",
      priority: "P1",
      status: "done",
      files: ["app/hooks/useWebSocket.ts", "app/app/index.tsx"],
      depends_on: ["APP-002", "SERVER-001"],
      scaffold_anchors: ["APP_10 useWebSocket", "APP_11 dispatchServerMessage"],
      acceptance: [
        "PC IP を指定すると ws://{ip}:8765 に接続",
        "K1 押下で {type:'keypress', key:'K1', layer:0} が送信される",
      ],
    },
    {
      id: "APP-004",
      title: "keymap.json をロードしラベル反映",
      area: "app",
      priority: "P1",
      status: "done",
      files: ["app/hooks/useKeymap.ts", "app/app/index.tsx"],
      depends_on: ["APP-002"],
      scaffold_anchors: ["APP_20 useKeymap"],
      acceptance: [
        "keymap.json から各ボタンのラベルを動的に表示",
        "paste は text、macro は id、hotkey は keys を要約表示",
      ],
    },

    // ============================================================
    // P2 — 拡張
    // ============================================================
    {
      id: "APP-005",
      title: "接続設定画面 (IP / Port / 接続テスト)",
      area: "app",
      priority: "P2",
      status: "todo",
      files: ["app/app/settings.tsx"],
      depends_on: ["APP-003"],
      scaffold_anchors: ["APP_02 SettingsScreen"],
      acceptance: [
        "サーバ IP / ポートを編集して AsyncStorage に保存",
        "「接続テスト」で server_hello を受信できる",
      ],
    },
    {
      id: "SERVER-004",
      title: "macro 実行エンジン (type / hotkey / focus_terminal)",
      area: "server",
      priority: "P2",
      status: "done",
      files: ["server/macro_engine.py"],
      depends_on: ["SERVER-002"],
      scaffold_anchors: ["SERVER_12 execute_macro", "SERVER_13 execute_step"],
      acceptance: [
        "macros.json の launch_claude が動作 (Terminal フォーカス + 'claude\\n')",
        "git_status が同様に動作",
      ],
    },
    {
      id: "APP-006",
      title: "レイヤー切替 (HOLD_K6 / layer_switch)",
      area: "app",
      priority: "P2",
      status: "done",
      files: ["app/hooks/useKeymap.ts", "app/app/index.tsx"],
      depends_on: ["APP-004"],
      scaffold_anchors: [],
      acceptance: [
        "K6 長押しで Layer-1 に切替",
        "layer_switch binding でも切り替わる",
      ],
    },
    {
      id: "APP-007",
      title: "レイアウト選択 UI (設定画面)",
      area: "app",
      priority: "P2",
      status: "done",
      files: ["app/app/settings.tsx", "app/hooks/useLayout.ts"],
      depends_on: ["APP-002"],
      scaffold_anchors: ["APP_30 useLayout"],
      acceptance: [
        "設定画面に layouts.json の一覧が並ぶ",
        "選択するとメイン画面の見た目が即座に切り替わる",
        "選択は AsyncStorage で永続化",
      ],
    },
    {
      id: "APP-008",
      title: "レイアウトエディタ (新規 / 編集 / 削除 / プレビュー)",
      area: "app",
      priority: "P2",
      status: "done",
      files: ["app/app/layout-editor.tsx", "app/hooks/useLayout.ts"],
      depends_on: ["APP-007"],
      scaffold_anchors: ["APP_04 LayoutEditorScreen"],
      acceptance: [
        "新規 grid レイアウトを作成して保存できる",
        "プレビューが <KeyboardView /> でリアルタイム反映",
        "削除確認ダイアログ付き",
      ],
    },

    // ============================================================
    // P3 — 仕上げ
    // ============================================================
    {
      id: "APP-009",
      title: "keymap エディタ UI",
      area: "app",
      priority: "P3",
      status: "todo",
      files: ["app/app/keymap-editor.tsx", "app/hooks/useKeymap.ts"],
      depends_on: ["APP-004"],
      scaffold_anchors: ["APP_03 KeymapEditorScreen"],
      acceptance: [
        "各キーの type と値をフォームで編集",
        "保存で keymap.json 書き換え + サーバ同期",
      ],
    },
    {
      id: "SERVER-005",
      title: "http_post マクロ (Notion API 等)",
      area: "server",
      priority: "P3",
      status: "todo",
      files: ["server/macro_engine.py"],
      depends_on: ["SERVER-004"],
      scaffold_anchors: ["SERVER_13 execute_step"],
      acceptance: [
        "httpx で非同期 POST が成功する",
        "${ENV_VAR} 形式の置換が効く",
      ],
    },
    {
      id: "SERVER-006",
      title: "watchdog による自動リロード",
      area: "server",
      priority: "P3",
      status: "todo",
      files: ["server/server.py"],
      depends_on: ["SERVER-003", "SERVER-004"],
      scaffold_anchors: ["SERVER_07 start_watchdog"],
      acceptance: [
        "macros.json を編集すると再起動なしに反映",
        "keymap_cache.json も同様",
      ],
    },
    {
      id: "APP-010",
      title: "フリーフォームレイアウト編集 (ドラッグ & リサイズ)",
      area: "app",
      priority: "P3",
      status: "todo",
      files: ["app/app/layout-editor.tsx", "app/components/KeyboardView.tsx"],
      depends_on: ["APP-008"],
      scaffold_anchors: ["APP_40 KeyboardView", "APP_04 LayoutEditorScreen"],
      acceptance: [
        "freeform レイアウトでボタンをドラッグできる",
        "コーナーリサイズで w/h が変更される",
        "保存で layouts.json に書き戻し",
      ],
    },
  ],
};
