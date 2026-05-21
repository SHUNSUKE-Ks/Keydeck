/**
 * useLayout — ビジュアルレイアウト (layouts.json) を管理する hook + Context。
 *
 * BUG-001 修正: hook 内 useState から Context 化。
 * LayoutProvider をルートレイアウト (_layout.tsx) でラップすることで
 * 全画面が同一インスタンスを共有し、設定画面での変更が即座に反映される。
 *
 * Console log naming convention: APP_30 番台
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { KeyboardLayout, LayoutsFile } from "../types";

const BUNDLED: LayoutsFile = require("../layouts/layouts.json");
const STORAGE_KEY = "keydeck:activeLayoutId";

// ---------------------------------------------------------------------------
// Interface (変更なし — 既存の呼び出し元はそのまま動く)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const LayoutContext = createContext<UseLayoutResult | null>(null);

// ---------------------------------------------------------------------------
// Provider — state はここで 1 か所だけ保持する
// ---------------------------------------------------------------------------

export function LayoutProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
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

  const value: UseLayoutResult = {
    layouts,
    activeLayoutId,
    activeLayout,
    setActiveLayout,
    addLayout,
    updateLayout,
    deleteLayout,
    reload,
  };

  // React.createElement を使うことで .ts ファイルのまま JSX なしで Provider を返す
  return React.createElement(LayoutContext.Provider, { value }, children);
}

// ---------------------------------------------------------------------------
// Hook — Context を読むだけ
// ---------------------------------------------------------------------------

export function useLayout(): UseLayoutResult {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("APP_30 useLayout must be used within a LayoutProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function parseLayoutsFile(json: string): LayoutsFile {
  const data = JSON.parse(json) as LayoutsFile;
  if (!Array.isArray(data.layouts)) {
    throw new Error("APP_31 invalid layouts.json: missing layouts array");
  }
  return data;
}
