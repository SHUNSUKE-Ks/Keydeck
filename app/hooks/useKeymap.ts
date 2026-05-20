/**
 * useKeymap — keymap.json を読み込み、レイヤー管理と binding 解決を提供する hook。
 *
 * Console log naming convention: APP_20 番台
 */

import { useCallback, useEffect, useState } from "react";
import type { KeyBinding, Keymap } from "../types";

// Metro bundler が JSON を静的にバンドルする
const BUNDLED_KEYMAP: Keymap = require("../keymap.json");

export interface UseKeymapResult {
  keymap: Keymap | null;
  activeLayer: number;
  setActiveLayer: (layerId: number) => void;
  getBinding: (key: string) => KeyBinding | undefined;
  updateBinding: (
    layerId: number,
    key: string,
    binding: KeyBinding
  ) => Promise<void>;
  reload: () => Promise<void>;
}

export function useKeymap(): UseKeymapResult {
  const [keymap, setKeymap] = useState<Keymap>(BUNDLED_KEYMAP);
  const [activeLayer, setActiveLayer] = useState(0);

  useEffect(() => {
    console.info("APP_20 useKeymap initialized, layers:", keymap.layers.length);
  }, []);

  const getBinding = useCallback(
    (key: string): KeyBinding | undefined => {
      const layer = keymap.layers.find((l) => l.id === activeLayer);
      return layer?.keys[key];
    },
    [keymap, activeLayer]
  );

  const updateBinding = useCallback(
    async (layerId: number, key: string, binding: KeyBinding) => {
      // P3: expo-file-system で keymap.json に書き戻し + サーバ同期
      console.warn("APP_20 updateBinding: not implemented (P3)");
      setKeymap((prev) => {
        const layers = prev.layers.map((l) =>
          l.id === layerId
            ? { ...l, keys: { ...l.keys, [key]: binding } }
            : l
        );
        return { ...prev, layers };
      });
    },
    []
  );

  const reload = useCallback(async () => {
    setKeymap(BUNDLED_KEYMAP);
    console.info("APP_20 reload: reloaded from bundle");
  }, []);

  return { keymap, activeLayer, setActiveLayer, getBinding, updateBinding, reload };
}
