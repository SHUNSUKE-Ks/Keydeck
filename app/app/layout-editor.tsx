/**
 * layout-editor.tsx — レイアウトの新規作成・編集・削除。
 *
 * ルートパラメータ:
 *   id (optional) — 編集対象のレイアウト ID。未指定なら新規作成。
 *
 * Console log naming convention: APP_04 番台
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
import { KeyboardView } from "../components/KeyboardView";
import { useLayout } from "../hooks/useLayout";
import type { GridLayout, LayoutStyle } from "../types";

// ---------------------------------------------------------------------------
// Style presets
// ---------------------------------------------------------------------------

const PRESETS: { name: string; style: LayoutStyle }[] = [
  {
    name: "Dark",
    style: {
      backgroundColor: "#0f1117",
      buttonColor: "#1e2230",
      buttonActiveColor: "#3b82f6",
      textColor: "#e5e7eb",
      borderRadius: 16,
      fontSize: 18,
    },
  },
  {
    name: "Ocean",
    style: {
      backgroundColor: "#0c1a2e",
      buttonColor: "#1a3050",
      buttonActiveColor: "#0ea5e9",
      textColor: "#e0f2fe",
      borderRadius: 12,
      fontSize: 16,
    },
  },
  {
    name: "Forest",
    style: {
      backgroundColor: "#0a1f0a",
      buttonColor: "#1a3d1a",
      buttonActiveColor: "#22c55e",
      textColor: "#dcfce7",
      borderRadius: 8,
      fontSize: 16,
    },
  },
  {
    name: "Amber",
    style: {
      backgroundColor: "#1a1000",
      buttonColor: "#3d2800",
      buttonActiveColor: "#f59e0b",
      textColor: "#fef3c7",
      borderRadius: 20,
      fontSize: 18,
    },
  },
  {
    name: "Mono",
    style: {
      backgroundColor: "#111",
      buttonColor: "#222",
      buttonActiveColor: "#fff",
      textColor: "#fff",
      borderRadius: 4,
      fontSize: 14,
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeButtons(cols: number, rows: number): GridLayout["buttons"] {
  const btns: GridLayout["buttons"] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      btns.push({ key: `K${r * cols + c + 1}`, row: r, col: c });
    }
  }
  return btns;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LayoutEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { layouts, addLayout, updateLayout, deleteLayout } = useLayout();

  const existing = id ? (layouts.find((l) => l.id === id) as GridLayout | undefined) : undefined;

  const [name, setName] = useState(existing?.name ?? "新しいレイアウト");
  const [columns, setColumns] = useState(
    existing?.kind === "grid" ? existing.columns : 2
  );
  const [rows, setRows] = useState(
    existing?.kind === "grid" ? existing.rows : 3
  );
  const [gap, setGap] = useState(existing?.kind === "grid" ? existing.gap : 12);
  const [style, setStyle] = useState<LayoutStyle>(
    existing?.style ?? PRESETS[0].style
  );

  const draft: GridLayout = {
    id: existing?.id ?? `grid_${Date.now()}`,
    name: name.trim() || "無名",
    kind: "grid",
    columns,
    rows,
    gap,
    buttons: makeButtons(columns, rows),
    style,
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("エラー", "レイアウト名を入力してください");
      return;
    }
    if (existing) {
      await updateLayout(existing.id, draft);
      console.info("APP_04 updateLayout:", existing.id);
    } else {
      await addLayout(draft);
      console.info("APP_04 addLayout:", draft.id);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert("削除確認", `「${existing.name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await deleteLayout(existing.id);
          console.info("APP_04 deleteLayout:", existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={S.root} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={S.scroll}>

        {/* Name */}
        <Text style={S.label}>レイアウト名</Text>
        <TextInput
          style={S.input}
          value={name}
          onChangeText={setName}
          placeholder="例: 縦 2 列"
          placeholderTextColor="#4b5563"
        />

        {/* Grid dimensions */}
        <View style={S.row}>
          <View style={S.half}>
            <Text style={S.label}>列数</Text>
            <Stepper
              value={columns}
              min={1}
              max={6}
              onChange={setColumns}
            />
          </View>
          <View style={S.half}>
            <Text style={S.label}>行数</Text>
            <Stepper value={rows} min={1} max={6} onChange={setRows} />
          </View>
        </View>

        <Text style={S.label}>余白</Text>
        <Stepper value={gap} min={0} max={32} step={4} onChange={setGap} />

        {/* Style presets */}
        <Text style={S.label}>スタイル</Text>
        <View style={S.presetRow}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p.name}
              style={[
                S.presetChip,
                {
                  backgroundColor: p.style.buttonColor,
                  borderColor:
                    style.backgroundColor === p.style.backgroundColor
                      ? p.style.buttonActiveColor
                      : "transparent",
                },
              ]}
              onPress={() => setStyle(p.style)}
            >
              <Text style={[S.presetText, { color: p.style.textColor }]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <Text style={S.label}>プレビュー</Text>
        <View style={S.preview}>
          <KeyboardView
            layout={draft}
            getLabel={(key) => key}
            onKeyPress={() => {}}
          />
        </View>

        {/* Actions */}
        <TouchableOpacity style={S.btnSave} onPress={handleSave}>
          <Text style={S.btnText}>{existing ? "更新" : "追加"}</Text>
        </TouchableOpacity>

        {existing && (
          <TouchableOpacity style={S.btnDelete} onPress={handleDelete}>
            <Text style={S.btnText}>削除</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Stepper component
// ---------------------------------------------------------------------------

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={S.stepper}>
      <TouchableOpacity
        style={S.stepBtn}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <Text style={S.stepText}>−</Text>
      </TouchableOpacity>
      <Text style={S.stepValue}>{value}</Text>
      <TouchableOpacity
        style={S.stepBtn}
        onPress={() => onChange(Math.min(max, value + step))}
      >
        <Text style={S.stepText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const C = {
  bg: "#0f1117",
  card: "#1e2230",
  text: "#e5e7eb",
  sub: "#9ca3af",
  accent: "#3b82f6",
  danger: "#dc2626",
  border: "#374151",
};

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 8 },
  label: { color: C.sub, fontSize: 12, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 8,
    overflow: "hidden",
  },
  stepBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.border,
  },
  stepText: { color: C.text, fontSize: 20, fontWeight: "300" },
  stepValue: { flex: 1, color: C.text, textAlign: "center", fontSize: 18, fontWeight: "600" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  presetText: { fontWeight: "600", fontSize: 13 },
  preview: {
    height: 240,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  btnSave: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDelete: {
    backgroundColor: C.danger,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
