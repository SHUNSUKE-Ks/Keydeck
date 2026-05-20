/**
 * index.tsx — メイン画面。
 *
 * 操作モード: ボタンタップ → PC へ keypress 送信
 * 編集モード: ボタンタップ → 下部パネルで binding 編集 → 保存
 *
 * Console log naming convention: APP_01 番台
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const TYPE_LABELS: { value: KeyBinding["type"]; label: string }[] = [
  { value: "paste",        label: "テキスト" },
  { value: "hotkey",       label: "ホットキー" },
  { value: "macro",        label: "マクロ" },
  { value: "clipboard",    label: "クリップボード" },
  { value: "layer_switch", label: "レイヤー切替" },
];

function bindingLabel(binding: KeyBinding | undefined): string {
  if (!binding) return "—";
  switch (binding.type) {
    case "paste":        return binding.text.slice(0, 8);
    case "hotkey":       return binding.keys.join("+");
    case "macro":        return `[${binding.id}]`;
    case "clipboard":    return "Paste";
    case "layer_switch": return `Lyr ${binding.layer}`;
    default:             return "?";
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { state, lastError, connect, sendKeyPress, sendKeymapSync } = useWebSocket();
  const { keymap, activeLayer, setActiveLayer, getBinding, updateBinding, reload } = useKeymap();
  const { activeLayout } = useLayout();

  // 操作 / 編集 モード
  const [mode, setMode]               = useState<"operate" | "edit">("operate");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // 編集フォーム state
  const [bindType, setBindType]       = useState<KeyBinding["type"]>("paste");
  const [pasteText, setPasteText]     = useState("");
  const [hotkeyStr, setHotkeyStr]     = useState(""); // "ctrl,shift,t"
  const [macroId, setMacroId]         = useState("");
  const [switchLayer, setSwitchLayer] = useState(0);

  // keymap が変化したら (updateBinding 後を含む) サーバへ同期
  useEffect(() => {
    if (state === "connected" && keymap) {
      console.info("APP_01 keymap sync");
      sendKeymapSync(keymap);
    }
  }, [state, keymap, sendKeymapSync]);

  // フォーカス時: keymap reload + 接続設定再読み込み
  useFocusEffect(
    useCallback(() => {
      console.info("APP_01 HomeScreen focused - loading settings");
      reload();
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
    }, [connect, reload])
  );

  // ---- 編集モード ----

  const openEditPanel = useCallback(
    (key: string) => {
      const binding = getBinding(key);
      console.info("APP_01 edit select key=%s", key);
      setBindType(binding?.type ?? "paste");
      if (binding?.type === "paste")        setPasteText(binding.text);
      if (binding?.type === "hotkey")       setHotkeyStr(binding.keys.join(","));
      if (binding?.type === "macro")        setMacroId(binding.id);
      if (binding?.type === "layer_switch") setSwitchLayer(binding.layer);
      if (!binding || binding.type === "clipboard") {
        setPasteText(""); setHotkeyStr(""); setMacroId(""); setSwitchLayer(0);
      }
      setSelectedKey(key);
    },
    [getBinding]
  );

  const handleSaveBinding = useCallback(async () => {
    if (!selectedKey) return;
    let binding: KeyBinding;
    switch (bindType) {
      case "paste":
        binding = { type: "paste", text: pasteText };
        break;
      case "hotkey": {
        const keys = hotkeyStr.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
        if (!keys.length) {
          Alert.alert("エラー", "キーをカンマ区切りで入力（例: ctrl,c）");
          return;
        }
        binding = { type: "hotkey", keys };
        break;
      }
      case "macro":
        if (!macroId.trim()) {
          Alert.alert("エラー", "マクロ ID を入力してください");
          return;
        }
        binding = { type: "macro", id: macroId.trim() };
        break;
      case "clipboard":
        binding = { type: "clipboard" };
        break;
      case "layer_switch":
        binding = { type: "layer_switch", layer: switchLayer };
        break;
    }
    console.info("APP_01 saving %s -> %s", selectedKey, binding.type);
    await updateBinding(activeLayer, selectedKey, binding);
    setSelectedKey(null);
    // keymap state 変化 → useEffect 経由で sendKeymapSync 自動実行
  }, [selectedKey, bindType, pasteText, hotkeyStr, macroId, switchLayer, activeLayer, updateBinding]);

  // ---- 操作モード ----

  const handleKeyPress = useCallback(
    (key: string, event: KeyEvent) => {
      if (event !== "press") return;
      if (mode === "edit") {
        openEditPanel(key);
        return;
      }
      const binding = getBinding(key);
      if (binding?.type === "layer_switch") {
        console.info(`APP_01 layer_switch -> ${binding.layer}`);
        setActiveLayer(binding.layer);
        return;
      }
      sendKeyPress(key, activeLayer, event);
    },
    [mode, getBinding, sendKeyPress, activeLayer, setActiveLayer, openEditPanel]
  );

  const handleLongPress = useCallback(
    (key: string) => {
      if (mode === "edit" || !keymap) return;
      const layerKeyName = keymap.layer_key?.startsWith("HOLD_")
        ? keymap.layer_key.slice(5)
        : null;
      if (key === layerKeyName) {
        const next = activeLayer === 0 ? 1 : 0;
        console.info(`APP_01 HOLD_${key} long press -> layer ${next}`);
        setActiveLayer(next);
      }
    },
    [mode, keymap, activeLayer, setActiveLayer]
  );

  const getLabelForKey = useCallback(
    (key: string): string => bindingLabel(getBinding(key)),
    [getBinding]
  );

  const handleModeToggle = useCallback((next: "operate" | "edit") => {
    setMode(next);
    setSelectedKey(null);
  }, []);

  // ---- render ----

  return (
    <SafeAreaView style={styles.root} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                state === "connected"  ? styles.dotGreen
                : state === "connecting" ? styles.dotYellow
                : styles.dotRed,
              ]}
            />
            <Text style={styles.statusText}>{state}</Text>
            <Text style={styles.layerBadge}>Layer {activeLayer}</Text>
          </View>

          {/* モード切替セグメント */}
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segBtn, mode === "operate" && styles.segBtnActive]}
              onPress={() => handleModeToggle("operate")}
            >
              <Text style={[styles.segText, mode === "operate" && styles.segTextActive]}>
                操作
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, mode === "edit" && styles.segBtnActive]}
              onPress={() => handleModeToggle("edit")}
            >
              <Text style={[styles.segText, mode === "edit" && styles.segTextActive]}>
                編集
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.settingsBtn}
            accessibilityLabel="設定を開く"
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Error banner */}
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

        {/* 編集モード: ヒント */}
        {mode === "edit" && !selectedKey && (
          <View style={styles.editHint}>
            <Text style={styles.hintText}>ボタンをタップして編集</Text>
          </View>
        )}

        {/* 編集パネル */}
        {mode === "edit" && selectedKey && (
          <View style={styles.editPanel}>
            <View style={styles.editPanelHeader}>
              <Text style={styles.editPanelTitle}>{selectedKey} を編集</Text>
              <TouchableOpacity onPress={() => setSelectedKey(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* type selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeRow}
              keyboardShouldPersistTaps="always"
            >
              {TYPE_LABELS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.typeBtn, bindType === value && styles.typeBtnActive]}
                  onPress={() => setBindType(value)}
                >
                  <Text style={[styles.typeBtnText, bindType === value && styles.typeBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* value inputs */}
            <View style={styles.valueArea}>
              {bindType === "paste" && (
                <TextInput
                  style={styles.textInput}
                  value={pasteText}
                  onChangeText={setPasteText}
                  placeholder="ペーストするテキスト"
                  placeholderTextColor="#4b5563"
                />
              )}
              {bindType === "hotkey" && (
                <TextInput
                  style={styles.textInput}
                  value={hotkeyStr}
                  onChangeText={setHotkeyStr}
                  placeholder="ctrl,shift,t"
                  placeholderTextColor="#4b5563"
                  autoCapitalize="none"
                />
              )}
              {bindType === "macro" && (
                <TextInput
                  style={styles.textInput}
                  value={macroId}
                  onChangeText={setMacroId}
                  placeholder="マクロ ID (例: launch_claude)"
                  placeholderTextColor="#4b5563"
                  autoCapitalize="none"
                />
              )}
              {bindType === "clipboard" && (
                <Text style={styles.hintText}>クリップボードの内容を貼り付けます</Text>
              )}
              {bindType === "layer_switch" && keymap && (
                <View style={styles.layerBtnRow}>
                  {keymap.layers.map((l) => (
                    <TouchableOpacity
                      key={l.id}
                      style={[styles.layerBtn, switchLayer === l.id && styles.layerBtnActive]}
                      onPress={() => setSwitchLayer(l.id)}
                    >
                      <Text style={[styles.layerBtnText, switchLayer === l.id && styles.layerBtnTextActive]}>
                        {l.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBinding}>
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------
// styles
// -----------------------------------------------------------------------

const C = {
  bg:     "#0f1117",
  card:   "#1e2230",
  text:   "#e5e7eb",
  sub:    "#9ca3af",
  accent: "#3b82f6",
  border: "#1e2230",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },

  // ---- header ----
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1e2230",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  dotGreen:  { backgroundColor: "#22c55e" },
  dotYellow: { backgroundColor: "#f59e0b" },
  dotRed:    { backgroundColor: "#ef4444" },
  statusText:  { color: "#9ca3af", fontSize: 11 },
  layerBadge:  { color: "#6b7280", fontSize: 11 },
  settingsBtn: { padding: 6 },
  settingsIcon:{ fontSize: 20, color: "#e5e7eb" },

  // ---- mode segment ----
  segment: {
    flexDirection: "row",
    backgroundColor: "#1e2230",
    borderRadius: 8,
    padding: 2,
  },
  segBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segBtnActive: { backgroundColor: "#3b82f6" },
  segText:      { color: "#6b7280", fontSize: 12, fontWeight: "600" },
  segTextActive:{ color: "#fff" },

  // ---- error ----
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#450a0a",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  errorText: { color: "#fca5a5", fontSize: 12, flex: 1 },
  errorLink: { color: "#93c5fd", fontSize: 12, textDecorationLine: "underline" },

  // ---- placeholder ----
  placeholderText: { color: "#6b7280", fontSize: 14 },

  // ---- edit hint ----
  editHint: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1e2230",
  },
  hintText: { color: "#6b7280", fontSize: 13 },

  // ---- edit panel ----
  editPanel: {
    backgroundColor: "#1e2230",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#374151",
    padding: 14,
    gap: 10,
  },
  editPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editPanelTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  closeBtn:       { color: "#6b7280", fontSize: 18, padding: 4 },

  // type selector
  typeRow: { flexGrow: 0 },
  typeBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#374151",
    marginRight: 7,
  },
  typeBtnActive:     { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  typeBtnText:       { color: "#9ca3af", fontSize: 12 },
  typeBtnTextActive: { color: "#fff", fontWeight: "600" },

  // value area
  valueArea: { gap: 4 },
  textInput: {
    backgroundColor: C.bg,
    color: C.text,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
  },

  // layer switch buttons
  layerBtnRow: { flexDirection: "row", gap: 8 },
  layerBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
  },
  layerBtnActive:     { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  layerBtnText:       { color: "#9ca3af", fontSize: 14 },
  layerBtnTextActive: { color: "#fff", fontWeight: "600" },

  // save button
  saveBtn:    { backgroundColor: "#3b82f6", borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  saveBtnText:{ color: "#fff", fontSize: 14, fontWeight: "700" },
});
