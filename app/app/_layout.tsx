/**
 * _layout.tsx — expo-router のルートレイアウト。
 *
 * Console log naming convention: APP_00 番台
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LayoutProvider } from "../hooks/useLayout";

const HEADER_BG = "#0f1117";
const HEADER_TINT = "#e5e7eb";
const CONTENT_BG = "#0f1117";

export default function RootLayout() {
  return (
    <LayoutProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: HEADER_BG },
          headerTintColor: HEADER_TINT,
          contentStyle: { backgroundColor: CONTENT_BG },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: "KeyDeck" }} />
        <Stack.Screen name="settings" options={{ title: "設定" }} />
        <Stack.Screen name="keymap-editor" options={{ title: "Keymap エディタ" }} />
        <Stack.Screen name="layout-editor" options={{ title: "レイアウト エディタ" }} />
      </Stack>
    </LayoutProvider>
  );
}
