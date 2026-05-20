"""
KeyDeck — server-side type definitions.

★ OPUS SCAFFOLD: 型のみ定義する。実装やバリデーションロジックは Sonnet で追加。
これらは server.py / macro_engine.py / key_sender.py で参照される共有スキーマ。

Source of truth:
  - keymap.json  ... スマホが配信する。サーバはキャッシュのみ保持。
  - macros.json  ... PC ローカルの環境依存マクロ。サーバが唯一の所有者。
"""

from __future__ import annotations

from typing import Literal, TypedDict, Union


# ---------------------------------------------------------------------------
# WebSocket メッセージ (Android → PC)
# ---------------------------------------------------------------------------

class KeyPressMessage(TypedDict):
    """Android から PC への単一キー押下イベント。"""
    type: Literal["keypress"]
    key: str                      # "K1" .. "Kn"
    layer: int                    # 現在のレイヤー ID
    event: Literal["press", "release"]


class KeymapSyncMessage(TypedDict):
    """スマホが keymap.json 全体を PC にプッシュする際のメッセージ。"""
    type: Literal["keymap_sync"]
    keymap: "Keymap"


class HelloMessage(TypedDict):
    """接続直後のハンドシェイク。"""
    type: Literal["hello"]
    device_name: str
    app_version: str


ClientMessage = Union[KeyPressMessage, KeymapSyncMessage, HelloMessage]


# ---------------------------------------------------------------------------
# WebSocket メッセージ (PC → Android)
# ---------------------------------------------------------------------------

class AckMessage(TypedDict):
    type: Literal["ack"]
    key: str
    ok: bool
    error: str | None


class ServerHelloMessage(TypedDict):
    type: Literal["server_hello"]
    server_version: str
    platform: str                 # "windows" | "macos" | "linux"


ServerMessage = Union[AckMessage, ServerHelloMessage]


# ---------------------------------------------------------------------------
# keymap.json 構造（スマホ側スキーマ）
# ---------------------------------------------------------------------------

class PasteBinding(TypedDict):
    type: Literal["paste"]
    text: str


class HotkeyBinding(TypedDict):
    type: Literal["hotkey"]
    keys: list[str]               # e.g. ["ctrl", "shift", "t"]


class MacroBinding(TypedDict):
    type: Literal["macro"]
    id: str                       # macros.json のキー


class ClipboardBinding(TypedDict):
    type: Literal["clipboard"]


class LayerSwitchBinding(TypedDict):
    type: Literal["layer_switch"]
    layer: int


KeyBinding = Union[
    PasteBinding,
    HotkeyBinding,
    MacroBinding,
    ClipboardBinding,
    LayerSwitchBinding,
]


class Layer(TypedDict):
    id: int
    name: str
    keys: dict[str, KeyBinding]   # "K1" → KeyBinding


class Keymap(TypedDict):
    version: int
    device_name: str
    layers: list[Layer]
    layer_key: str                # 例 "HOLD_K6"


# ---------------------------------------------------------------------------
# macros.json 構造（PC 側スキーマ）
# ---------------------------------------------------------------------------

class TypeStep(TypedDict):
    action: Literal["type"]
    text: str


class HotkeyStep(TypedDict):
    action: Literal["hotkey"]
    keys: list[str]


class FocusTerminalStep(TypedDict):
    action: Literal["focus_terminal"]


class ExecStep(TypedDict):
    action: Literal["exec"]
    path: str
    args: list[str]


class HttpPostStep(TypedDict):
    action: Literal["http_post"]
    url: str
    headers: dict[str, str]
    body: dict                    # JSON-serializable


class SleepStep(TypedDict):
    action: Literal["sleep"]
    ms: int


class ClipboardReadStep(TypedDict):
    action: Literal["clipboard_read"]
    var: str


MacroStep = Union[
    TypeStep,
    HotkeyStep,
    FocusTerminalStep,
    ExecStep,
    HttpPostStep,
    SleepStep,
    ClipboardReadStep,
]


class MacroDefinition(TypedDict):
    steps: list[MacroStep]


class MacrosFile(TypedDict):
    version: int
    macros: dict[str, MacroDefinition]
