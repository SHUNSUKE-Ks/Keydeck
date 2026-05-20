/**
 * index.tsx — メイン画面。
 *
 * Console log naming convention: APP_01 番台
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardView } from "../components/KeyboardView";
import { useKeymap } from "../hooks/useKeymap";
import { useLayout } from "../hooks/useLayout";
import { useWebSocket } from "../hooks/useWebSocket";
import type { ConnectionSettings, KeyBinding, KeyEvent } from "../types";

const DEFAULT_SETTINGS: ConnectionSettings = {
  serverHost: "192.168.1.1",
  serverPort: 8765,
  autoReconnect: true,
};

function bindingLabel(binding: KeyBinding | undefined): string {
  if (!binding) return "—";
  switch (binding.type) {
    case "paste":
      return binding.text.slice(0, 8);
    case "hotkey":
      return binding.keys.join("+");
    case "macro":
      return `[${binding.id}]`;
    case "clipboard":
      return "Paste";
    case "layer_switch":
      return `Lyr ${binding.layer}`;
    default:
      return "?";
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { state, lastError, connect, sendKeyPress } = useWebSocket();
  const { keymap, activeLayer, setActiveLayer, getBinding } = useKeymap();
  const { activeLayout } = useLayout();

  // 保存済み設定をロードして接続
  useEffect(() => {
    console.info("APP_01 HomeScreen mounted");
    AsyncStorage.multiGet(["keydeck:serverHost", "keydeck:serverPort", "keydeck:autoReconnect"])
      .then(([[, host], [, port], [, auto]]) => {
        const settings: ConnectionSettings = {
          serverHost: host ?? DEFAULT_SETTINGS.serverHost,
          serverPort: port ? parseInt(port, 10) : DEFAULT_SETTINGS.serverPort,
          autoReconnect: auto !== "false",
        };
        console.info(`APP_01 connecting to ${settings.serverHost}:${settings.serverPort}`);
        connect(settings);
      })
      .catch((err) => {
        console.warn("APP_01 failed to load settings, using defaults:", err);
        connect(DEFAULT_SETTINGS);
      });
  }, []);

  const handleKeyPress = useCallback(
    (key: string, event: KeyEvent) => {
      if (event !== "press") return;

      const binding = getBinding(key);

      // layer_switch はローカルで完結
      if (binding?.type === "layer_switch") {
        console.info(`APP_01 layer_switch → ${binding.layer}`);
        setActiveLayer(binding.layer);
        return;
      }

      sendKeyPress(key, activeLayer, event);
    },
    [getBinding, sendKeyPress, activeLayer, setActiveLayer]
  );

  const handleLongPress = useCallback(
    (key: string) => {
      if (!keymap) return;
      // layer_key が "HOLD_K6" 形式の場合、K6 長押しでレイヤー 1 へ切替
      const layerKeyName = keymap.layer_key?.startsWith("HOLD_")
        ? keymap.layer_key.slice(5)
        : null;
      if (key === layerKeyName) {
        const next = activeLayer === 0 ? 1 : 0;
        console.info(`APP_01 HOLD_${key} long press → layer ${next}`);
        setActiveLayer(next);
      }
    },
    [keymap, activeLayer, setActiveLayer]
  );

  const getLabelForKey = useCallback(
    (key: string): string => bindingLabel(getBinding(key)),
    [getBinding]
  );

  return (
    <SafeAreaView style={styles.root} edges={["bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              state === "connected" ? styles.dotGreen
              : state === "connecting" ? styles.dotYellow
              : styles.dotRed,
            ]}
          />
          <Text style={styles.statusText}>{state}</Text>
          <Text style={styles.layerBadge}>Layer {activeLayer}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={styles.settingsBtn}
          accessibilityLabel="設定を開く"
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {lastError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{lastError}</Text>
          <TouchableOpacity onPress={() => router.push("/settings")}>
            <Text style={styles.errorLink}>設定を確認</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Keyboard */}
      {activeLayout ? (
        <KeyboardView
          layout={activeLayout}
          getLabel={getLabelForKey}
          onKeyPress={handleKeyPress}
          onLongPress={handleLongPress}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" />
          <Text style={styles.placeholderText}>レイアウトを読み込み中…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0f1117",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1e2230",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: { backgroundColor: "#22c55e" },
  dotYellow: { backgroundColor: "#f59e0b" },
  dotRed: { backgroundColor: "#ef4444" },
  statusText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  layerBadge: {
    color: "#6b7280",
    fontSize: 12,
    marginLeft: 4,
  },
  settingsBtn: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
    color: "#e5e7eb",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#450a0a",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    flex: 1,
  },
  errorLink: {
    color: "#93c5fd",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  placeholderText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
