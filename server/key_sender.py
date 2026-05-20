"""
KeyDeck — pynput / pyperclip ラッパー (OS 直叩きはここに閉じ込める)。

Console log naming convention: SERVER_20 番台
"""

from __future__ import annotations

import logging
import sys

LOG = logging.getLogger("keydeck.key_sender")


# ---------------------------------------------------------------------------
# キー名 → pynput.Key の変換
# ---------------------------------------------------------------------------

def resolve_key(name: str):
    """文字列キー名を pynput.Key または単一文字に変換する。未知なら ValueError。"""
    from pynput.keyboard import Key

    _MAP: dict[str, object] = {
        "ctrl": Key.ctrl,
        "ctrl_l": Key.ctrl_l,
        "ctrl_r": Key.ctrl_r,
        "shift": Key.shift,
        "shift_l": Key.shift_l,
        "shift_r": Key.shift_r,
        "alt": Key.alt,
        "alt_l": Key.alt_l,
        "alt_r": Key.alt_r,
        "win": Key.cmd,
        "cmd": Key.cmd,
        "super": Key.cmd,
        "meta": Key.cmd,
        "esc": Key.esc,
        "escape": Key.esc,
        "tab": Key.tab,
        "enter": Key.enter,
        "return": Key.enter,
        "space": Key.space,
        "backspace": Key.backspace,
        "delete": Key.delete,
        "del": Key.delete,
        "insert": Key.insert,
        "home": Key.home,
        "end": Key.end,
        "pageup": Key.page_up,
        "page_up": Key.page_up,
        "pagedown": Key.page_down,
        "page_down": Key.page_down,
        "up": Key.up,
        "down": Key.down,
        "left": Key.left,
        "right": Key.right,
        "f1": Key.f1,  "f2": Key.f2,  "f3": Key.f3,  "f4": Key.f4,
        "f5": Key.f5,  "f6": Key.f6,  "f7": Key.f7,  "f8": Key.f8,
        "f9": Key.f9,  "f10": Key.f10, "f11": Key.f11, "f12": Key.f12,
    }

    lower = name.lower()
    if lower in _MAP:
        return _MAP[lower]
    if len(name) == 1:
        return name
    raise ValueError(f"SERVER_24 unknown key name: {name!r}")


# ---------------------------------------------------------------------------
# Public API (macro_engine.KeySenderProtocol を満たす)
# ---------------------------------------------------------------------------

class KeySender:
    """pynput / pyperclip の実装本体。"""

    def __init__(self) -> None:
        from pynput.keyboard import Controller
        self._ctrl = Controller()
        LOG.info("SERVER_20 KeySender initialized (platform=%s)", sys.platform)

    def type_text(self, text: str) -> None:
        """テキストをクリップボード経由でペースト (IME 競合を回避)。"""
        import pyperclip
        LOG.info("SERVER_21 type_text: %r", text[:30])
        pyperclip.copy(text)
        self.paste_clipboard()

    def hotkey(self, keys: list[str]) -> None:
        """keys を press → release 順で送信。修飾キーは最後まで保持する。"""
        LOG.info("SERVER_22 hotkey: %s", "+".join(keys))
        resolved = [resolve_key(k) for k in keys]

        if len(resolved) == 1:
            self._ctrl.press(resolved[0])
            self._ctrl.release(resolved[0])
            return

        # 先頭から n-1 個は修飾キー扱いでホールドし、最後のキーを叩く
        modifiers = resolved[:-1]
        main_key = resolved[-1]
        for m in modifiers:
            self._ctrl.press(m)
        try:
            self._ctrl.press(main_key)
            self._ctrl.release(main_key)
        finally:
            for m in reversed(modifiers):
                self._ctrl.release(m)

    def paste_clipboard(self) -> None:
        """Ctrl+V (macOS では Cmd+V) を送信してクリップボードをペーストする。"""
        LOG.info("SERVER_23 paste_clipboard")
        if sys.platform == "darwin":
            self.hotkey(["cmd", "v"])
        else:
            self.hotkey(["ctrl", "v"])
