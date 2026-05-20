/**
 * keymap-editor.tsx — keymap.json のキーバインドを編集する画面。
 *
 * Console log naming convention: APP_03 番台
 * ★ P3 実装予定。現在は placeholder を表示。
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function KeymapEditorScreen() {
  return (
    <SafeAreaView style={styles.root} edges={["bottom", "left", "right"]}>
      <View style={styles.center}>
        <Text style={styles.title}>Keymap エディタ</Text>
        <Text style={styles.sub}>P3 で実装予定</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1117" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "600" },
  sub: { color: "#6b7280", fontSize: 14 },
});
