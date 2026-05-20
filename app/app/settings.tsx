/**
 * settings.tsx — 接続設定 + レイアウト選択画面。
 *
 * Console log naming convention: APP_02 番台
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLayout } from "../hooks/useLayout";
import { useWebSocket } from "../hooks/useWebSocket";

export default function SettingsScreen() {
  const router = useRouter();
  const [host, setHost] = useState("192.168.1.1");
  const [port, setPort] = useState("8765");
  const { layouts, activeLayoutId, setActiveLayout } = useLayout();
  const { state, connect, disconnect } = useWebSocket();

  // 保存済み設定を復元
  useEffect(() => {
    console.info("APP_02 SettingsScreen mounted");
    AsyncStorage.multiGet(["keydeck:serverHost", "keydeck:serverPort"]).then(
      ([[, h], [, p]]) => {
        if (h) setHost(h);
        if (p) setPort(p);
      }
    );
  }, []);

  const handleSave = async () => {
    await AsyncStorage.multiSet([
      ["keydeck:serverHost", host],
      ["keydeck:serverPort", port],
    ]);
    console.info("APP_02 settings saved host=%s port=%s", host, port);
    Alert.alert("保存しました", "メイン画面に戻ると接続が更新されます。");
  };

  const handleTestConnection = () => {
    console.info("APP_02 test connection to %s:%s", host, port);
    connect({ serverHost: host, serverPort: parseInt(port, 10), autoReconnect: false });
  };

  return (
    <SafeAreaView style={styles.root} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* --- 接続設定 --- */}
        <Text style={styles.sectionHeader}>接続設定</Text>

        <View style={styles.card}>
          <Text style={styles.label}>サーバー IP</Text>
          <TextInput
            style={styles.input}
            value={host}
            onChangeText={setHost}
            placeholder="192.168.1.10"
            placeholderTextColor="#4b5563"
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>ポート</Text>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="8765"
            placeholderTextColor="#4b5563"
            keyboardType="number-pad"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
              <Text style={styles.btnText}>保存</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleTestConnection}>
              <Text style={styles.btnText}>接続テスト</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.connectionState}>状態: {state}</Text>
        </View>

        {/* --- レイアウト選択 --- */}
        <Text style={styles.sectionHeader}>レイアウト</Text>

        <View style={styles.card}>
          {layouts.map((layout) => (
            <TouchableOpacity
              key={layout.id}
              style={styles.layoutRow}
              onPress={() => {
                setActiveLayout(layout.id);
                console.info("APP_02 layout selected:", layout.id);
              }}
            >
              <View
                style={[
                  styles.radio,
                  layout.id === activeLayoutId && styles.radioSelected,
                ]}
              />
              <Text style={styles.layoutName}>{layout.name}</Text>
            </TouchableOpacity>
          ))}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.btnSecondary, { flex: 1 }]}
              onPress={() => router.push("/layout-editor")}
            >
              <Text style={styles.btnText}>＋ 新規作成</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, { flex: 1 }]}
              onPress={() =>
                router.push({
                  pathname: "/layout-editor",
                  params: { id: activeLayoutId },
                })
              }
            >
              <Text style={styles.btnText}>✎ 現在を編集</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const C = {
  bg: "#0f1117",
  card: "#1e2230",
  text: "#e5e7eb",
  sub: "#9ca3af",
  accent: "#3b82f6",
  border: "#374151",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 8 },
  sectionHeader: {
    color: C.sub,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  label: { color: C.sub, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#0f1117",
    color: C.text,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: "#374151",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnText: { color: C.text, fontWeight: "600", fontSize: 14 },
  connectionState: { color: C.sub, fontSize: 12, marginTop: 6, textAlign: "center" },
  layoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.sub,
  },
  radioSelected: {
    borderColor: C.accent,
    backgroundColor: C.accent,
  },
  layoutName: { color: C.text, fontSize: 15 },
});
