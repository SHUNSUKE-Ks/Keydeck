/**
 * layout-editor.tsx — レイアウトの新規作成・編集・削除。
 *
 * grid:     列数 / 行数 / 余白 を Stepper で設定してプレビュー
 * freeform: キャンバスでボタンをドラッグ移動・コーナーリサイズ
 *
 * ルートパラメータ:
 *   id (optional) — 編集対象のレイアウト ID。未指定なら新規作成。
 *
 * Console log naming convention: APP_04 番台
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  PanResponder,
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
import type { FreeformButton, FreeformLayout, GridLayout, LayoutStyle } from "../types";

// ---------------------------------------------------------------------------
// Style presets
// ---------------------------------------------------------------------------

const PRESETS: { name: string; style: LayoutStyle }[] = [
  {
    name: "Dark",
    style: { backgroundColor: "#0f1117", buttonColor: "#1e2230", buttonActiveColor: "#3b82f6", textColor: "#e5e7eb", borderRadius: 16, fontSize: 18 },
  },
  {
    name: "Ocean",
    style: { backgroundColor: "#0c1a2e", buttonColor: "#1a3050", buttonActiveColor: "#0ea5e9", textColor: "#e0f2fe", borderRadius: 12, fontSize: 16 },
  },
  {
    name: "Forest",
    style: { backgroundColor: "#0a1f0a", buttonColor: "#1a3d1a", buttonActiveColor: "#22c55e", textColor: "#dcfce7", borderRadius: 8, fontSize: 16 },
  },
  {
    name: "Amber",
    style: { backgroundColor: "#1a1000", buttonColor: "#3d2800", buttonActiveColor: "#f59e0b", textColor: "#fef3c7", borderRadius: 20, fontSize: 18 },
  },
  {
    name: "Mono",
    style: { backgroundColor: "#111", buttonColor: "#222", buttonActiveColor: "#fff", textColor: "#fff", borderRadius: 4, fontSize: 14 },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGridButtons(cols: number, rows: number): GridLayout["buttons"] {
  const btns: GridLayout["buttons"] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      btns.push({ key: `K${r * cols + c + 1}`, row: r, col: c });
    }
  }
  return btns;
}

function nextFreeButton(existing: FreeformButton[]): FreeformButton {
  const n = existing.length + 1;
  const row = existing.length;
  return { key: `K${n}`, x: 10, y: Math.min(10 + row * 90, 310), w: 120, h: 72 };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const CANVAS_H = 400;
const RESIZE_HANDLE = 32; // px: bottom-right corner treated as resize zone

export default function LayoutEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { layouts, addLayout, updateLayout, deleteLayout } = useLayout();

  const existing = id ? layouts.find((l) => l.id === id) : undefined;

  // ---- common state ----
  const [name, setName] = useState(existing?.name ?? "新しいレイアウト");
  const [style, setStyle] = useState<LayoutStyle>(existing?.style ?? PRESETS[0].style);
  const [kind, setKind] = useState<"grid" | "freeform">(existing?.kind ?? "grid");

  // ---- grid state ----
  const [columns, setColumns] = useState(existing?.kind === "grid" ? existing.columns : 2);
  const [rows, setRows] = useState(existing?.kind === "grid" ? existing.rows : 3);
  const [gap, setGap] = useState(existing?.kind === "grid" ? existing.gap : 12);

  // ---- freeform state ----
  const [freeButtons, setFreeButtons] = useState<FreeformButton[]>(
    existing?.kind === "freeform" ? existing.buttons : []
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // refs for PanResponder (avoids stale closure)
  const freeButtonsRef = useRef(freeButtons);
  useEffect(() => { freeButtonsRef.current = freeButtons; }, [freeButtons]);

  type DragState = {
    key: string;
    mode: "move" | "resize";
    origX: number; origY: number;
    origW: number; origH: number;
  };
  const dragStateRef = useRef<DragState | null>(null);

  // Single PanResponder on the canvas — hit-tests buttons manually
  const canvasPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (e) => {
        const { locationX: lx, locationY: ly } = e.nativeEvent;
        const bts = freeButtonsRef.current;
        // iterate in reverse so visually top-most button wins
        const hit = [...bts].reverse().find(
          (b) => lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h
        );
        if (!hit) {
          setSelectedKey(null);
          dragStateRef.current = null;
          return;
        }
        setSelectedKey(hit.key);
        setScrollEnabled(false);
        const inResize =
          lx >= hit.x + hit.w - RESIZE_HANDLE &&
          ly >= hit.y + hit.h - RESIZE_HANDLE;
        dragStateRef.current = {
          key: hit.key,
          mode: inResize ? "resize" : "move",
          origX: hit.x, origY: hit.y,
          origW: hit.w, origH: hit.h,
        };
      },

      onPanResponderMove: (_, g) => {
        if (!dragStateRef.current) return;
        const { key, mode, origX, origY, origW, origH } = dragStateRef.current;
        setFreeButtons((prev) =>
          prev.map((b) => {
            if (b.key !== key) return b;
            if (mode === "move") {
              return {
                ...b,
                x: Math.max(0, Math.round(origX + g.dx)),
                y: Math.max(0, Math.round(origY + g.dy)),
              };
            }
            return {
              ...b,
              w: Math.max(60, Math.round(origW + g.dx)),
              h: Math.max(44, Math.round(origH + g.dy)),
            };
          })
        );
      },

      onPanResponderRelease: () => {
        dragStateRef.current = null;
        setScrollEnabled(true);
      },
    })
  ).current;

  // ---- drafts ----

  const gridDraft: GridLayout = {
    id: existing?.id ?? `grid_${Date.now()}`,
    name: name.trim() || "無名",
    kind: "grid",
    columns, rows, gap,
    buttons: makeGridButtons(columns, rows),
    style,
  };

  const freeformDraft: FreeformLayout = {
    id: existing?.id ?? `free_${Date.now()}`,
    name: name.trim() || "無名",
    kind: "freeform",
    buttons: freeButtons,
    style,
  };

  // ---- handlers ----

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("エラー", "レイアウト名を入力してください");
      return;
    }
    if (kind === "freeform" && freeButtons.length === 0) {
      Alert.alert("エラー", "ボタンを 1 つ以上追加してください");
      return;
    }
    const draft = kind === "grid" ? gridDraft : freeformDraft;
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

  const handleAddFreeButton = () => {
    setFreeButtons((prev) => [...prev, nextFreeButton(prev)]);
  };

  const handleRemoveFreeButton = (key: string) => {
    Alert.alert("ボタン削除", `${key} を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          setFreeButtons((prev) => prev.filter((b) => b.key !== key));
          setSelectedKey(null);
          console.info("APP_04 removeFreeButton:", key);
        },
      },
    ]);
  };

  // ---- render ----

  return (
    <SafeAreaView style={S.root} edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={S.scroll}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={S.label}>レイアウト名</Text>
        <TextInput
          style={S.input}
          value={name}
          onChangeText={setName}
          placeholder="例: 縦 2 列"
          placeholderTextColor="#4b5563"
        />

        {/* Kind selector — new layouts only */}
        {!existing && (
          <>
            <Text style={S.label}>種類</Text>
            <View style={S.kindRow}>
              <TouchableOpacity
                style={[S.kindBtn, kind === "grid" && S.kindBtnActive]}
                onPress={() => setKind("grid")}
              >
                <Text style={[S.kindText, kind === "grid" && S.kindTextActive]}>グリッド</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.kindBtn, kind === "freeform" && S.kindBtnActive]}
                onPress={() => setKind("freeform")}
              >
                <Text style={[S.kindText, kind === "freeform" && S.kindTextActive]}>フリーフォーム</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Grid dimensions */}
        {kind === "grid" && (
          <>
            <View style={S.row}>
              <View style={S.half}>
                <Text style={S.label}>列数</Text>
                <Stepper value={columns} min={1} max={6} onChange={setColumns} />
              </View>
              <View style={S.half}>
                <Text style={S.label}>行数</Text>
                <Stepper value={rows} min={1} max={6} onChange={setRows} />
              </View>
            </View>
            <Text style={S.label}>余白</Text>
            <Stepper value={gap} min={0} max={32} step={4} onChange={setGap} />
          </>
        )}

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
              <Text style={[S.presetText, { color: p.style.textColor }]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid preview */}
        {kind === "grid" && (
          <>
            <Text style={S.label}>プレビュー</Text>
            <View style={S.preview}>
              <KeyboardView
                layout={gridDraft}
                getLabel={(key) => key}
                onKeyPress={() => {}}
              />
            </View>
          </>
        )}

        {/* Freeform canvas */}
        {kind === "freeform" && (
          <>
            <Text style={S.label}>
              ボタン配置{selectedKey ? ` — ${selectedKey} 選択中` : ""}
            </Text>

            <TouchableOpacity style={S.addBtn} onPress={handleAddFreeButton}>
              <Text style={S.addBtnText}>＋ ボタン追加</Text>
            </TouchableOpacity>

            {/* Canvas */}
            <View
              style={[S.canvas, { backgroundColor: style.backgroundColor }]}
              {...canvasPan.panHandlers}
            >
              {freeButtons.length === 0 && (
                <View style={S.canvasHint}>
                  <Text style={S.canvasHintText}>「＋ ボタン追加」でボタンを配置</Text>
                </View>
              )}
              {freeButtons.map((btn) => {
                const isSelected = btn.key === selectedKey;
                return (
                  <View
                    key={btn.key}
                    style={[
                      S.freeBtn,
                      {
                        left: btn.x,
                        top: btn.y,
                        width: btn.w,
                        height: btn.h,
                        backgroundColor: style.buttonColor,
                        borderRadius: style.borderRadius,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: "#3b82f6",
                      },
                    ]}
                  >
                    <Text style={{ color: style.textColor, fontSize: style.fontSize, fontWeight: "600" }}>
                      {btn.key}
                    </Text>
                    {/* Resize handle — bottom-right corner */}
                    {isSelected && (
                      <View style={S.resizeHandle} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Selected button actions */}
            {selectedKey && (
              <TouchableOpacity
                style={S.btnDanger}
                onPress={() => handleRemoveFreeButton(selectedKey)}
              >
                <Text style={S.btnText}>{selectedKey} を削除</Text>
              </TouchableOpacity>
            )}

            <Text style={S.hint}>
              ドラッグ: 移動　右下コーナードラッグ: リサイズ
            </Text>
          </>
        )}

        {/* Save / Delete */}
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
  value, min, max, step = 1, onChange,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={S.stepper}>
      <TouchableOpacity style={S.stepBtn} onPress={() => onChange(Math.max(min, value - step))}>
        <Text style={S.stepText}>−</Text>
      </TouchableOpacity>
      <Text style={S.stepValue}>{value}</Text>
      <TouchableOpacity style={S.stepBtn} onPress={() => onChange(Math.min(max, value + step))}>
        <Text style={S.stepText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const C = {
  bg:     "#0f1117",
  card:   "#1e2230",
  text:   "#e5e7eb",
  sub:    "#9ca3af",
  accent: "#3b82f6",
  danger: "#dc2626",
  border: "#374151",
};

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 8 },
  label:  { color: C.sub, fontSize: 12, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  hint:   { color: "#4b5563", fontSize: 11, textAlign: "center", marginTop: 4 },
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

  // kind selector
  kindRow:        { flexDirection: "row", gap: 8 },
  kindBtn:        { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  kindBtnActive:  { backgroundColor: C.accent, borderColor: C.accent },
  kindText:       { color: C.sub, fontWeight: "600" },
  kindTextActive: { color: "#fff" },

  // grid
  row:  { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 8, overflow: "hidden" },
  stepBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center", backgroundColor: C.border },
  stepText:  { color: C.text, fontSize: 20, fontWeight: "300" },
  stepValue: { flex: 1, color: C.text, textAlign: "center", fontSize: 18, fontWeight: "600" },

  // style presets
  presetRow:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 2 },
  presetText: { fontWeight: "600", fontSize: 13 },

  // grid preview
  preview: { height: 240, borderRadius: 12, overflow: "hidden", marginBottom: 8 },

  // freeform
  addBtn:     { backgroundColor: C.card, borderRadius: 8, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  addBtnText: { color: C.accent, fontWeight: "600", fontSize: 14 },
  canvas: {
    height: CANVAS_H,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  canvasHint:     { flex: 1, justifyContent: "center", alignItems: "center" },
  canvasHintText: { color: "#4b5563", fontSize: 14 },
  freeBtn: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  resizeHandle: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: RESIZE_HANDLE,
    height: RESIZE_HANDLE,
    backgroundColor: "#3b82f6",
    borderTopLeftRadius: 6,
    opacity: 0.8,
  },

  // buttons
  btnSave:   { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnDelete: { backgroundColor: C.danger, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnDanger: { backgroundColor: "#450a0a", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  btnText:   { color: "#fff", fontWeight: "700", fontSize: 16 },
});
