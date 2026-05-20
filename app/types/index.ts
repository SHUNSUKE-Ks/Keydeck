/**
 * KeyDeck — shared TypeScript types (Android app side).
 *
 * ★ OPUS SCAFFOLD
 * server/types.py と意味的に一致させる。乖離が出たら必ず両側を更新する。
 * このファイル単体で keymap.json / layouts.json / WebSocket メッセージの
 * 全構造が把握できるようにする。
 */

// ---------------------------------------------------------------------------
// WebSocket メッセージ
// ---------------------------------------------------------------------------

export type KeyEvent = "press" | "release";

export interface KeyPressMessage {
  type: "keypress";
  key: string;       // "K1" .. "Kn"
  layer: number;
  event: KeyEvent;
}

export interface KeymapSyncMessage {
  type: "keymap_sync";
  keymap: Keymap;
}

export interface HelloMessage {
  type: "hello";
  device_name: string;
  app_version: string;
}

export type ClientMessage =
  | KeyPressMessage
  | KeymapSyncMessage
  | HelloMessage;

export interface AckMessage {
  type: "ack";
  key: string;
  ok: boolean;
  error: string | null;
}

export interface ServerHelloMessage {
  type: "server_hello";
  server_version: string;
  platform: "windows" | "macos" | "linux";
}

export type ServerMessage = AckMessage | ServerHelloMessage;

// ---------------------------------------------------------------------------
// Keymap (キーの「機能」)
// ---------------------------------------------------------------------------

export type KeyBinding =
  | { type: "paste"; text: string }
  | { type: "hotkey"; keys: string[] }
  | { type: "macro"; id: string }
  | { type: "clipboard" }
  | { type: "layer_switch"; layer: number };

export interface Layer {
  id: number;
  name: string;
  keys: Record<string, KeyBinding>;   // "K1" → KeyBinding
}

export interface Keymap {
  version: number;
  device_name: string;
  layers: Layer[];
  layer_key: string;                  // 例 "HOLD_K6"
}

// ---------------------------------------------------------------------------
// Layout (ボタンの「見た目」)
//   keymap と完全独立。ユーザが設定画面で active を切り替える。
// ---------------------------------------------------------------------------

export interface LayoutStyle {
  backgroundColor: string;
  buttonColor: string;
  buttonActiveColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
}

export interface GridButton {
  key: string;       // "K1" .. "Kn" — keymap 側のキー ID と一致
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
}

export interface FreeformButton {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridLayout {
  id: string;
  name: string;
  kind: "grid";
  columns: number;
  rows: number;
  gap: number;
  buttons: GridButton[];
  style: LayoutStyle;
}

export interface FreeformLayout {
  id: string;
  name: string;
  kind: "freeform";
  buttons: FreeformButton[];
  style: LayoutStyle;
}

export type KeyboardLayout = GridLayout | FreeformLayout;

export interface LayoutsFile {
  version: number;
  active: string;             // KeyboardLayout.id への参照
  layouts: KeyboardLayout[];
}

// ---------------------------------------------------------------------------
// App settings (connection 等)
// ---------------------------------------------------------------------------

export interface ConnectionSettings {
  serverHost: string;         // 例 "192.168.1.10"
  serverPort: number;         // デフォルト 8765
  autoReconnect: boolean;
}

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
