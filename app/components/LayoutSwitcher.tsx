/**
 * LayoutSwitcher — HomeScreen ヘッダ用レイアウト切替バー。
 *
 * 各レイアウトを 32×40px のミニプレビューアイコンで表示する。
 * - grid:     columns × rows の格子ドット
 * - freeform: x/y/w/h を比率縮小したミニ矩形群
 * アクティブなアイコンは buttonActiveColor の枠でハイライト。
 * 末尾の [+] ボタンで新規レイアウト作成へ遷移。
 *
 * Console log naming convention: APP_30 番台 (useLayout と同帯)
 */

import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { FreeformLayout, GridLayout, KeyboardLayout } from "../types";

const ICON_W = 32;
const ICON_H = 40;

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface Props {
  layouts: KeyboardLayout[];
  activeId: string;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}

export function LayoutSwitcher({ layouts, activeId, onSelect, onAddNew }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={S.bar}
      contentContainerStyle={S.barContent}
    >
      {layouts.map((layout) => {
        const isActive = layout.id === activeId;
        return (
          <TouchableOpacity
            key={layout.id}
            style={[
              S.icon,
              { backgroundColor: layout.style.backgroundColor },
              isActive && {
                borderColor: layout.style.buttonActiveColor,
                borderWidth: 2,
              },
            ]}
            onPress={() => onSelect(layout.id)}
            accessibilityLabel={layout.name}
          >
            {layout.kind === "grid" ? (
              <GridPreview layout={layout} />
            ) : (
              <FreeformPreview layout={layout} />
            )}
          </TouchableOpacity>
        );
      })}

      {/* + 新規作成 */}
      <TouchableOpacity style={S.addIcon} onPress={onAddNew}>
        <Text style={S.addIconText}>+</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Mini previews
// ---------------------------------------------------------------------------

function GridPreview({ layout }: { layout: GridLayout }) {
  const { columns, rows, style } = layout;
  const dotW = Math.max(2, Math.floor((ICON_W - 2 - (columns - 1)) / columns));
  const dotH = Math.max(2, Math.floor((ICON_H - 2 - (rows - 1)) / rows));

  return (
    <View style={S.dotGrid}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={S.dotRow}>
          {Array.from({ length: columns }, (_, c) => (
            <View
              key={c}
              style={{
                width: dotW,
                height: dotH,
                backgroundColor: style.buttonColor,
                borderRadius: 1,
                margin: 0.5,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function FreeformPreview({ layout }: { layout: FreeformLayout }) {
  const { buttons, style } = layout;

  if (buttons.length === 0) {
    return (
      <Text style={[S.emptyText, { color: style.buttonColor }]}>FF</Text>
    );
  }

  const maxX = Math.max(...buttons.map((b) => b.x + b.w), 1);
  const maxY = Math.max(...buttons.map((b) => b.y + b.h), 1);
  const scaleX = (ICON_W - 2) / maxX;
  const scaleY = (ICON_H - 2) / maxY;

  return (
    <View style={S.freeContainer}>
      {buttons.map((btn) => (
        <View
          key={btn.key}
          style={{
            position: "absolute",
            left: Math.round(btn.x * scaleX),
            top: Math.round(btn.y * scaleY),
            width: Math.max(3, Math.round(btn.w * scaleX)),
            height: Math.max(3, Math.round(btn.h * scaleY)),
            backgroundColor: style.buttonColor,
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = StyleSheet.create({
  bar:        { flexGrow: 0 },
  barContent: { paddingHorizontal: 2, gap: 5, alignItems: "center" },

  icon: {
    width: ICON_W,
    height: ICON_H,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },

  dotGrid: { flexDirection: "column", alignItems: "center", justifyContent: "center" },
  dotRow:  { flexDirection: "row" },

  freeContainer: { width: ICON_W - 2, height: ICON_H - 2, position: "relative" },

  emptyText: { fontSize: 8 },

  addIcon: {
    width: ICON_W,
    height: ICON_H,
    borderRadius: 6,
    backgroundColor: "#1e2230",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  addIconText: { color: "#6b7280", fontSize: 20, lineHeight: 24 },
});
