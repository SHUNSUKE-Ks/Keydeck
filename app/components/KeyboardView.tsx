/**
 * KeyboardView — active レイアウトに従ってボタンを描画する。
 *
 * - grid:     columns × rows の格子配置
 * - freeform: position: "absolute" で x/y/w/h 直接指定
 *
 * このコンポーネントは keymap (機能) を一切知らない。
 * Console log naming convention: APP_40 番台
 */

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  FreeformLayout,
  GridLayout,
  KeyEvent,
  KeyboardLayout,
  LayoutStyle,
} from "../types";

export interface KeyboardViewProps {
  layout: KeyboardLayout;
  getLabel: (key: string) => string;
  onKeyPress: (key: string, event: KeyEvent) => void;
}

export function KeyboardView({
  layout,
  getLabel,
  onKeyPress,
}: KeyboardViewProps) {
  if (layout.kind === "grid") {
    return (
      <GridView layout={layout} getLabel={getLabel} onKeyPress={onKeyPress} />
    );
  }
  return (
    <FreeformView
      layout={layout}
      getLabel={getLabel}
      onKeyPress={onKeyPress}
    />
  );
}

// ---------------------------------------------------------------------------
// Grid layout
// ---------------------------------------------------------------------------

function GridView({
  layout,
  getLabel,
  onKeyPress,
}: {
  layout: GridLayout;
  getLabel: (key: string) => string;
  onKeyPress: (key: string, event: KeyEvent) => void;
}) {
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const { style } = layout;

  return (
    <View
      style={[
        styles.gridContainer,
        {
          backgroundColor: style.backgroundColor,
          rowGap: layout.gap,
        },
      ]}
    >
      {Array.from({ length: layout.rows }, (_, row) => (
        <View key={row} style={[styles.gridRow, { columnGap: layout.gap }]}>
          {layout.buttons
            .filter((b) => b.row === row)
            .sort((a, b) => a.col - b.col)
            .map((btn) => (
              <KeyButton
                key={btn.key}
                keyId={btn.key}
                label={getLabel(btn.key)}
                pressed={pressedKey === btn.key}
                style={style}
                flex={btn.colSpan ?? 1}
                onPressIn={() => {
                  setPressedKey(btn.key);
                  onKeyPress(btn.key, "press");
                }}
                onPressOut={() => {
                  setPressedKey(null);
                  onKeyPress(btn.key, "release");
                }}
              />
            ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Freeform layout
// ---------------------------------------------------------------------------

function FreeformView({
  layout,
  getLabel,
  onKeyPress,
}: {
  layout: FreeformLayout;
  getLabel: (key: string) => string;
  onKeyPress: (key: string, event: KeyEvent) => void;
}) {
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const { style } = layout;

  return (
    <View
      style={[styles.freeformContainer, { backgroundColor: style.backgroundColor }]}
    >
      {layout.buttons.map((btn) => (
        <Pressable
          key={btn.key}
          style={[
            styles.freeformButton,
            {
              left: btn.x,
              top: btn.y,
              width: btn.w,
              height: btn.h,
              backgroundColor:
                pressedKey === btn.key
                  ? style.buttonActiveColor
                  : style.buttonColor,
              borderRadius: style.borderRadius,
            },
          ]}
          onPressIn={() => {
            setPressedKey(btn.key);
            onKeyPress(btn.key, "press");
          }}
          onPressOut={() => {
            setPressedKey(null);
            onKeyPress(btn.key, "release");
          }}
        >
          <Text
            style={{ color: style.textColor, fontSize: style.fontSize, fontWeight: "600" }}
          >
            {getLabel(btn.key)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared button component
// ---------------------------------------------------------------------------

function KeyButton({
  keyId,
  label,
  pressed,
  style,
  flex,
  onPressIn,
  onPressOut,
}: {
  keyId: string;
  label: string;
  pressed: boolean;
  style: LayoutStyle;
  flex: number;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.gridButton,
        {
          flex,
          backgroundColor: pressed ? style.buttonActiveColor : style.buttonColor,
          borderRadius: style.borderRadius,
        },
      ]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Text style={{ color: style.textColor, fontSize: style.fontSize, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    padding: 16,
    flexDirection: "column",
  },
  gridRow: {
    flex: 1,
    flexDirection: "row",
  },
  gridButton: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 64,
  },
  freeformContainer: {
    flex: 1,
    position: "relative",
  },
  freeformButton: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});
