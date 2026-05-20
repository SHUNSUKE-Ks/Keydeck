"""
KeyDeck — macro resolution + execution engine.

Console log naming convention: SERVER_10 番台
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import subprocess
import sys
from typing import Protocol

from .types import (
    KeyBinding,
    MacroDefinition,
    MacroStep,
    MacrosFile,
)

LOG = logging.getLogger("keydeck.macro_engine")


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load_macros(path: str) -> MacrosFile:
    """macros.json を読み込んで返す。"""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    LOG.info("SERVER_10 macros loaded: %d entries from %s", len(data.get("macros", {})), path)
    return data  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Resolver / Executor
# ---------------------------------------------------------------------------

class KeySenderProtocol(Protocol):
    """key_sender.py の最小契約。テストでは fake を差し込む。"""

    def type_text(self, text: str) -> None: ...
    def hotkey(self, keys: list[str]) -> None: ...
    def paste_clipboard(self) -> None: ...


async def execute_binding(
    binding: KeyBinding,
    macros: MacrosFile,
    key_sender: KeySenderProtocol,
) -> None:
    """単一の KeyBinding を実行する。"""
    t = binding["type"]
    LOG.info("SERVER_11 execute_binding type=%s", t)

    if t == "paste":
        key_sender.type_text(binding["text"])  # type: ignore[index]
    elif t == "hotkey":
        key_sender.hotkey(binding["keys"])  # type: ignore[index]
    elif t == "macro":
        macro_id = binding["id"]  # type: ignore[index]
        if macro_id not in macros["macros"]:
            LOG.error("SERVER_11 macro not found: %s", macro_id)
            return
        await execute_macro(macros["macros"][macro_id], key_sender)
    elif t == "clipboard":
        key_sender.paste_clipboard()
    elif t == "layer_switch":
        # 状態遷移のみ — server.py 側でレイヤー更新済み、ここでは何もしない
        pass
    else:
        LOG.warning("SERVER_11 unknown binding type: %s", t)


async def execute_macro(
    macro: MacroDefinition,
    key_sender: KeySenderProtocol,
) -> None:
    """macro 定義の steps を上から順に実行する。1 step が例外を投げたら中断。"""
    for step in macro["steps"]:
        try:
            await execute_step(step, key_sender)
        except Exception as exc:
            LOG.error("SERVER_12 step failed: action=%s error=%s", step.get("action"), exc)
            break


async def execute_step(
    step: MacroStep,
    key_sender: KeySenderProtocol,
) -> None:
    """step.action で分岐して実行する。"""
    action = step["action"]  # type: ignore[index]
    LOG.info("SERVER_13 execute_step action=%s", action)

    if action == "type":
        key_sender.type_text(step["text"])  # type: ignore[index]

    elif action == "hotkey":
        key_sender.hotkey(step["keys"])  # type: ignore[index]

    elif action == "focus_terminal":
        _focus_terminal()

    elif action == "exec":
        path = step["path"]  # type: ignore[index]
        args = step.get("args", [])  # type: ignore[index]
        subprocess.Popen([path] + args)

    elif action == "sleep":
        ms = step["ms"]  # type: ignore[index]
        await asyncio.sleep(ms / 1000.0)

    elif action == "http_post":
        import httpx
        url = _expand_env(step["url"])  # type: ignore[index]
        headers = {k: _expand_env(v) for k, v in step.get("headers", {}).items()}  # type: ignore[index]
        body = _expand_env_recursive(step.get("body", {}))  # type: ignore[index]
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=body)
            LOG.info("SERVER_13 http_post %s -> %d", url, resp.status_code)
            if resp.status_code >= 400:
                LOG.warning("SERVER_13 http_post error: %s", resp.text[:300])

    elif action == "clipboard_read":
        import pyperclip
        text = pyperclip.paste()
        var_name = step.get("var", "clipboard")  # type: ignore[index]
        LOG.info("SERVER_13 clipboard_read var=%s len=%d", var_name, len(text))
        # 現時点では変数ストアは未実装。将来の http_post で参照できるよう拡張予定。

    else:
        LOG.warning("SERVER_13 unknown step action: %s", action)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _focus_terminal() -> None:
    """ターミナルウィンドウにフォーカスを移す (プラットフォーム依存)。"""
    LOG.info("SERVER_13 focus_terminal (platform=%s)", sys.platform)
    if sys.platform == "win32":
        try:
            import ctypes
            # Windows Terminal (CASCADIA_HOSTING_WINDOW_CLASS) を優先、次に cmd
            for class_name in ("CASCADIA_HOSTING_WINDOW_CLASS", "ConsoleWindowClass"):
                hwnd = ctypes.windll.user32.FindWindowW(class_name, None)
                if hwnd:
                    ctypes.windll.user32.SetForegroundWindow(hwnd)
                    LOG.info("SERVER_13 focus_terminal: focused hwnd=%d class=%s", hwnd, class_name)
                    return
            LOG.warning("SERVER_13 focus_terminal: no terminal window found")
        except Exception as exc:
            LOG.warning("SERVER_13 focus_terminal failed: %s", exc)
    elif sys.platform == "darwin":
        subprocess.run(
            ["osascript", "-e", 'tell application "Terminal" to activate'],
            check=False,
        )
    else:
        subprocess.run(
            ["xdotool", "search", "--name", "terminal", "windowactivate"],
            check=False,
            capture_output=True,
        )


def _expand_env(value: str) -> str:
    """${ENV_VAR} 形式の環境変数を展開する。未定義なら元の文字列を残す。"""
    return re.sub(r"\$\{(\w+)\}", lambda m: os.environ.get(m.group(1), m.group(0)), value)


def _expand_env_recursive(obj: object) -> object:
    """dict / list / str を再帰的に走査して ${ENV_VAR} を展開する。"""
    if isinstance(obj, str):
        return _expand_env(obj)
    if isinstance(obj, dict):
        return {k: _expand_env_recursive(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_expand_env_recursive(v) for v in obj]
    return obj
