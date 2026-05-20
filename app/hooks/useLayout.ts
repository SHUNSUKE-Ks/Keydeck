/**
 * useLayout — ビジュアルレイアウト (layouts.json) を管理する hook。
 *
 * Console log naming convention: APP_30 番台
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import type { KeyboardLayout, LayoutsFile } from "../types";

const BUNDLED: LayoutsFile = require("../layouts/layouts.json");
const STORAGE_KEY = "keydeck:activeLayoutId";

export interface UseLayoutResult {
  layouts: KeyboardLayout[];
  activeLayoutId: string;
  activeLayout: KeyboardLayout | null;
  setActiveLayout: (id: string) => Promise<void>;
  addLayout: (layout: KeyboardLayout) => Promise<void>;
  updateLayout: (id: string, patch: Partial<KeyboardLayout>) => Promise<void>;
  deleteLayout: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useLayout(): UseLayoutResult {
  const [layouts, setLayouts] = useState<KeyboardLayout[]>(BUNDLED.layouts);
  const [activeLayoutId, setActiveLayoutIdState] = useState<string>(
    BUNDLED.active
  );

  // AsyncStorage から保存済みの active ID を復元
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          console.info("APP_30 restored activeLayoutId:", saved);
          setActiveLayoutIdState(saved);
        } else {
          console.info("APP_30 using default activeLayoutId:", BUNDLED.active);
        }
      })
      .catch((err) => console.warn("APP_30 AsyncStorage read error:", err));
  }, []);

  const activeLayout =
    layouts.find((l) => l.id === activeLayoutId) ?? null;

  const setActiveLayout = useCallback(async (id: string) => {
    setActiveLayoutIdState(id);
    await AsyncStorage.setItem(STORAGE_KEY, id);
    console.info("APP_30 setActiveLayout:", id);
  }, []);

  const addLayout = useCallback(async (layout: KeyboardLayout) => {
    setLayouts((prev) => [...prev, layout]);
    console.info("APP_30 addLayout:", layout.id);
  }, []);

  const updateLayout = useCallback(
    async (id: string, patch: Partial<KeyboardLayout>) => {
      setLayouts((prev) =>
        prev.map((l) =>
          l.id === id ? ({ ...l, ...patch } as KeyboardLayout) : l
        )
      );
      console.info("APP_30 updateLayout:", id);
    },
    []
  );

  const deleteLayout = useCallback(async (id: string) => {
    setLayouts((prev) => prev.filter((l) => l.id !== id));
    console.info("APP_30 deleteLayout:", id);
  }, []);

  const reload = useCallback(async () => {
    setLayouts(BUNDLED.layouts);
    console.info("APP_30 reload: reloaded from bundle");
  }, []);

  return {
    layouts,
    activeLayoutId,
    activeLayout,
    setActiveLayout,
    addLayout,
    updateLayout,
    deleteLayout,
    reload,
  };
}

export function parseLayoutsFile(json: string): LayoutsFile {
  const data = JSON.parse(json) as LayoutsFile;
  if (!Array.isArray(data.layouts)) {
    throw new Error("APP_31 invalid layouts.json: missing layouts array");
  }
  return data;
}
