/**
 * useKeymap — keymap.json を読み込み、レイヤー管理と binding 解決を提供する hook。
 *
 * Console log naming convention: APP_20 番台
 *
 * 永続化: documentDirectory/keymap.json を優先し、なければバンドル版を使う。
 * updateBinding が呼ばれるたびに disk へ書き戻す。
 */

import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useState } from "react";
import type { KeyBinding, Keymap } from "../types";

const BUNDLED_KEYMAP: Keymap = require("../keymap.json");
const KEYMAP_PATH = (FileSystem.documentDirectory ?? "") + "keymap.json";

async function loadFromDisk(): Promise<Keymap | null> {
  if (!FileSystem.documentDirectory) return null;
  try {
    const info = await FileSystem.getInfoAsync(KEYMAP_PATH);
    if (info.exists) {
      const raw = await FileSystem.readAsStringAsync(KEYMAP_PATH);
      return JSON.parse(raw) as Keymap;
    }
  } catch (e) {
    console.warn("APP_20 loadFromDisk error:", e);
  }
  return null;
}

async function saveToDisk(km: Keymap): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  await FileSystem.writeAsStringAsync(KEYMAP_PATH, JSON.stringify(km, null, 2));
}

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
    loadFromDisk().then((km) => {
      const resolved = km ?? BUNDLED_KEYMAP;
      setKeymap(resolved);
      console.info("APP_20 useKeymap initialized, layers:", resolved.layers.length);
    });
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
      setKeymap((prev) => {
        const updated: Keymap = {
          ...prev,
          layers: prev.layers.map((l) =>
            l.id === layerId
              ? { ...l, keys: { ...l.keys, [key]: binding } }
              : l
          ),
        };
        saveToDisk(updated).catch((e) =>
          console.warn("APP_20 saveToDisk error:", e)
        );
        return updated;
      });
      console.info(
        "APP_20 updateBinding layer=%d key=%s type=%s",
        layerId,
        key,
        binding.type
      );
    },
    []
  );

  const reload = useCallback(async () => {
    const km = await loadFromDisk();
    const resolved = km ?? BUNDLED_KEYMAP;
    setKeymap(resolved);
    console.info("APP_20 reload: layers=%d", resolved.layers.length);
  }, []);

  return { keymap, activeLayer, setActiveLayer, getBinding, updateBinding, reload };
}
