/**
 * keymap-editor.tsx — APP-009 で HomeScreen 編集モードに統合済み。
 * このルートは残存リンク対策としてホームへリダイレクトする。
 */

import { Redirect } from "expo-router";

export default function KeymapEditorRedirect() {
  return <Redirect href="/" />;
}
