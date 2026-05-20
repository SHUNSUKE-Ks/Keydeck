"""
KeyDeck — WebSocket server entry point.

起動: python -m server.server
接続: ws://0.0.0.0:8765

Console log naming convention: SERVER_01-09 番台
"""

from __future__ import annotations

import asyncio
import json
import logging
import platform
import sys
from pathlib import Path

import websockets
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer
from websockets.exceptions import ConnectionClosed

from .macro_engine import KeySenderProtocol, execute_binding, load_macros
from .key_sender import KeySender
from .types import ClientMessage, Keymap, MacrosFile

HOST: str = "0.0.0.0"
PORT: int = 8765
SERVER_VERSION: str = "0.1.0"

LOG: logging.Logger = logging.getLogger("keydeck.server")

_BASE = Path(__file__).parent
KEYMAP_CACHE_PATH = _BASE / "keymap_cache.json"
MACROS_PATH = _BASE / "macros.json"

# ---------------------------------------------------------------------------
# Module-level state (シングルサーバ想定)
# ---------------------------------------------------------------------------
_keymap_cache: Keymap | None = None
_macros: MacrosFile | None = None
_key_sender: KeySender | None = None


def _platform_name() -> str:
    s = platform.system()
    return {"Windows": "windows", "Darwin": "macos"}.get(s, "linux")


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

async def main() -> None:
    """サーバーのメインエントリ。logging 初期化 → データロード → 待受開始。"""
    global _keymap_cache, _macros, _key_sender

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )

    _key_sender = KeySender()
    _macros = load_macros(str(MACROS_PATH))

    # 起動時に keymap_cache.json をロード (レイヤーがあれば使える)
    if KEYMAP_CACHE_PATH.exists():
        try:
            raw = KEYMAP_CACHE_PATH.read_text(encoding="utf-8")
            data = json.loads(raw)
            if data.get("layers"):
                _keymap_cache = data
                LOG.info("SERVER_01 keymap_cache loaded: %d layers", len(_keymap_cache["layers"]))  # type: ignore[index]
            else:
                LOG.info("SERVER_01 keymap_cache has no layers -- waiting for keymap_sync")
        except Exception as exc:
            LOG.warning("SERVER_01 failed to load keymap_cache.json: %s", exc)

    LOG.info("SERVER_01 listening on ws://%s:%d", HOST, PORT)

    observer = start_watchdog()
    try:
        async with websockets.serve(handle_connection, HOST, PORT):
            LOG.info("SERVER_01 server ready -- press Ctrl+C to stop")
            try:
                await asyncio.Future()  # run until cancelled (Ctrl+C -> CancelledError)
            except (asyncio.CancelledError, KeyboardInterrupt):
                LOG.info("SERVER_01 shutdown signal received")
    finally:
        observer.stop()
        observer.join()

    LOG.info("SERVER_01 server stopped")


# ---------------------------------------------------------------------------
# Connection handler
# ---------------------------------------------------------------------------

async def handle_connection(websocket) -> None:  # type: ignore[no-untyped-def]
    """1 クライアントとの接続ライフサイクル。"""
    peer = websocket.remote_address
    LOG.info("SERVER_02 client connected: %s", peer)

    # server_hello を先行送信
    hello = await handle_hello({"type": "hello", "device_name": "unknown", "app_version": "0"})
    await websocket.send(json.dumps(hello))

    try:
        async for raw in websocket:
            try:
                message: ClientMessage = json.loads(raw)
                response = await dispatch_message(message)
                if response is not None:
                    await websocket.send(json.dumps(response))
            except json.JSONDecodeError as exc:
                LOG.warning("SERVER_02 JSON parse error: %s", exc)
            except KeyError as exc:
                LOG.warning("SERVER_02 missing key in message: %s", exc)
            except Exception as exc:
                LOG.warning("SERVER_02 dispatch error: %s", exc)
    except ConnectionClosed:
        pass

    LOG.info("SERVER_02 client disconnected: %s", peer)


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

async def dispatch_message(message: ClientMessage) -> dict | None:
    """type フィールドでメッセージを分岐し、対応ハンドラを呼ぶ。"""
    msg_type = message.get("type")  # type: ignore[attr-defined]
    if msg_type == "hello":
        return await handle_hello(message)
    elif msg_type == "keypress":
        return await handle_keypress(message)
    elif msg_type == "keymap_sync":
        return await handle_keymap_sync(message)
    else:
        LOG.warning("SERVER_03 unknown message type: %s", msg_type)
        return None


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

async def handle_hello(message) -> dict:  # type: ignore[no-untyped-def]
    """接続確立ログを出し、ServerHelloMessage を返す。"""
    device = message.get("device_name", "unknown")
    version = message.get("app_version", "?")
    LOG.info("SERVER_04 hello from device=%s app_version=%s", device, version)
    return {
        "type": "server_hello",
        "server_version": SERVER_VERSION,
        "platform": _platform_name(),
    }


async def handle_keypress(message) -> dict:  # type: ignore[no-untyped-def]
    """keymap_cache から binding を解決して実行し、AckMessage を返す。"""
    key: str = message["key"]
    layer: int = message.get("layer", 0)
    event: str = message.get("event", "press")

    LOG.info("SERVER_05 keypress key=%s layer=%d event=%s", key, layer, event)

    # release イベントはスキップ (press のみ実行)
    if event != "press":
        return {"type": "ack", "key": key, "ok": True, "error": None}

    if not _keymap_cache or not _keymap_cache.get("layers"):
        LOG.warning("SERVER_05 keymap_cache empty — send keymap_sync from app first")
        return {"type": "ack", "key": key, "ok": False, "error": "keymap not synced"}

    layer_obj = next((l for l in _keymap_cache["layers"] if l["id"] == layer), None)
    if layer_obj is None:
        LOG.warning("SERVER_05 layer %d not found in keymap_cache", layer)
        return {"type": "ack", "key": key, "ok": False, "error": f"layer {layer} not found"}

    binding = layer_obj["keys"].get(key)
    if binding is None:
        LOG.warning("SERVER_05 key %s not found in layer %d", key, layer)
        return {"type": "ack", "key": key, "ok": False, "error": f"key {key} not bound"}

    try:
        await execute_binding(binding, _macros, _key_sender)  # type: ignore[arg-type]
        return {"type": "ack", "key": key, "ok": True, "error": None}
    except Exception as exc:
        LOG.error("SERVER_05 execute_binding failed: %s", exc)
        return {"type": "ack", "key": key, "ok": False, "error": str(exc)}


async def handle_keymap_sync(message) -> None:  # type: ignore[no-untyped-def]
    """受信した keymap を keymap_cache.json に保存し、メモリを更新する。"""
    global _keymap_cache
    keymap = message.get("keymap")
    if keymap is None:
        LOG.warning("SERVER_06 keymap_sync: missing keymap field")
        return None

    _keymap_cache = keymap
    LOG.info("SERVER_06 keymap_sync received: %d layers", len(keymap.get("layers", [])))

    try:
        KEYMAP_CACHE_PATH.write_text(
            json.dumps(keymap, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        LOG.info("SERVER_06 keymap_cache.json saved")
    except Exception as exc:
        LOG.warning("SERVER_06 failed to save keymap_cache.json: %s", exc)

    return None


# ---------------------------------------------------------------------------
# Hot-reload
# ---------------------------------------------------------------------------

def _reload_macros() -> None:
    global _macros
    try:
        _macros = load_macros(str(MACROS_PATH))
        LOG.info("SERVER_07 macros hot-reloaded: %d entries", len((_macros or {}).get("macros", {})))
    except Exception as exc:
        LOG.warning("SERVER_07 macros reload failed: %s", exc)


def _reload_keymap_cache() -> None:
    global _keymap_cache
    try:
        raw = KEYMAP_CACHE_PATH.read_text(encoding="utf-8")
        data = json.loads(raw)
        if data.get("layers"):
            _keymap_cache = data
            LOG.info("SERVER_07 keymap_cache hot-reloaded: %d layers", len(data["layers"]))
    except Exception as exc:
        LOG.warning("SERVER_07 keymap_cache reload failed: %s", exc)


class _ReloadHandler(FileSystemEventHandler):
    def on_modified(self, event) -> None:  # type: ignore[no-untyped-def]
        if event.is_directory:
            return
        src = Path(event.src_path).resolve()
        if src == MACROS_PATH.resolve():
            _reload_macros()
        elif src == KEYMAP_CACHE_PATH.resolve():
            _reload_keymap_cache()


def start_watchdog(on_change=None) -> Observer:
    """macros.json / keymap_cache.json を監視し、変更時に自動リロードする。"""
    handler = _ReloadHandler()
    observer = Observer()
    observer.schedule(handler, str(_BASE), recursive=False)
    observer.start()
    LOG.info("SERVER_07 watchdog started: watching %s", _BASE)
    return observer


if __name__ == "__main__":
    asyncio.run(main())
