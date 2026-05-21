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
      title: "HomeScreen モード切替 + 編集パネル統合",
      area: "app",
      priority: "P3",
      status: "done",
      files: [
        "app/app/index.tsx",
        "app/hooks/useKeymap.ts",
        "app/app/_layout.tsx",       // Stack.Screen "keymap-editor" を削除
        "app/app/settings.tsx",      // 設定画面の「keymap エディタを開く」リンク削除
      ],
      depends_on: ["APP-004"],
      scaffold_anchors: ["APP_01 HomeScreen"],
      // 6 ボタン操作画面は残したい (ユーザー指示)。エディタは別画面ではなく
      // HomeScreen 内で mode 切替により実現する。
      design: {
        mode_state: '"operate" | "edit"',
        operate_behavior: "現状のまま (sendKeyPress でサーバ送信)",
        edit_behavior: [
          "タップでローカル state selectedKey を更新",
          "KeyboardView の下に固定パネルで type/text/keys/id/layer を編集",
          "「保存」で useKeymap().updateBinding を呼ぶ",
          "保存後は selectedKey をクリア",
        ],
        ui_layout: "ヘッダに [操作 | 編集] segment、本体は KeyboardView (両モード共通) + 編集パネル (edit時のみ表示)",
        archived: "app/app/keymap-editor.tsx → devstudio/_archive/ または app/_archive/ へ移動",
      },
      acceptance: [
        "ヘッダの segment で操作 ⇔ 編集 を切り替えられる",
        "edit モードでキーをタップすると下部パネルにそのキーの編集 UI が出る",
        "type 切替 (paste / hotkey / macro / clipboard / layer_switch) で必要なフィールドが切り替わる",
        "保存で keymap.json が更新され、接続中なら keymap_sync がサーバへ送られる",
        "operate モードに戻ると今まで通り PC へキー送信できる",
        "別画面の /keymap-editor は導線ごと削除されている",
      ],
    },
    {
      id: "SERVER-005",
      title: "http_post マクロ (Notion API 等)",
      area: "server",
      priority: "P3",
      status: "done",
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
      status: "done",
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
      status: "done",
      files: ["app/app/layout-editor.tsx", "app/components/KeyboardView.tsx"],
      depends_on: ["APP-008"],
      scaffold_anchors: ["APP_40 KeyboardView", "APP_04 LayoutEditorScreen"],
      acceptance: [
        "freeform レイアウトでボタンをドラッグできる",
        "コーナーリサイズで w/h が変更される",
        "保存で layouts.json に書き戻し",
      ],
    },

    // ============================================================
    // 追加チケット (実機検証後の発覚バグ + UI 改善)
    // ============================================================
    {
      id: "BUG-001",
      title: "レイアウト切替が画面間で反映されない (useLayout の state 分散)",
      area: "app",
      priority: "P1",
      status: "done",
      files: [
        "app/hooks/useLayout.ts",
        "app/app/_layout.tsx",
      ],
      depends_on: [],
      // 原因: useLayout が内部 useState を持つため、コンポーネントごとに
      // 独立した state インスタンスが作られる。設定画面で setActiveLayout
      // しても HomeScreen のインスタンスには伝わらず、見た目が変わらない。
      design: {
        approach: "Context 化",
        steps: [
          "useLayout.ts を分割: LayoutProvider (state 保持) + useLayout (useContext)",
          "_layout.tsx のルートで <LayoutProvider> を Stack の外側にラップ",
          "既存の index.tsx / settings.tsx / layout-editor.tsx の useLayout() 呼び出しはそのまま動く",
          "AsyncStorage の読み書きは Provider 内に集約",
        ],
      },
      acceptance: [
        "設定画面でレイアウトを変更すると HomeScreen に戻った瞬間に見た目が切り替わる",
        "レイアウトエディタで新規追加した直後に設定画面・HomeScreen の両方に出現",
        "アプリ再起動後も最後に選んだレイアウトが復元される (AsyncStorage 動作維持)",
      ],
    },
    {
      id: "APP-011",
      title: "ヘッダにレイアウト切替バー (簡易アイコン Tab)",
      area: "app",
      priority: "P2",
      status: "done",
      files: [
        "app/app/index.tsx",
        "app/components/LayoutSwitcher.tsx",   // 新規
      ],
      depends_on: ["BUG-001"],
      design: {
        ui: [
          "HomeScreen のヘッダ右側 (⚙ の左) に横スクロール可能なレイアウト切替バーを配置",
          "各レイアウトは 32×40px 程度のミニプレビューアイコン",
          "ミニプレビューは KeyboardView を縮小描画 (getLabel は () => \"\")。レイアウトの形状がそのままアイコンになる",
          "アクティブなアイコンは buttonActiveColor の枠でハイライト",
          "末尾に [+] アイコン → router.push('/layout-editor') で新規作成へ",
        ],
        component: {
          name: "LayoutSwitcher",
          props: "{ layouts, activeId, onSelect, onAddNew }",
          notes: "再利用可能な独立コンポーネントとして切り出す",
        },
        mini_preview: [
          "外枠 32×40 / borderRadius 6 / backgroundColor: layout.style.backgroundColor",
          "内側は layout.kind に応じて簡易ドット表示:",
          "  grid:     columns × rows の格子状にドット (各セル 4×4)",
          "  freeform: 各ボタンを x/y/w/h を比率縮小してミニ矩形で描画",
          "ドット色は layout.style.buttonColor",
        ],
      },
      acceptance: [
        "ヘッダの切替バーに layouts.json の全レイアウトが並ぶ",
        "アイコンをタップすると即座にメイン画面のレイアウトが切り替わる",
        "現在アクティブのアイコンは枠ハイライトで識別できる",
        "[+] でレイアウトエディタに遷移できる",
        "レイアウト数が増えても横スクロールで全て表示可能",
        "設定画面のレイアウト一覧と完全に同期する (BUG-001 の修正が前提)",
      ],
    },
  ],
};
