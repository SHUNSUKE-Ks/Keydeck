import { useState } from "react";

const PROJECTS = [
  {
    id: "taskflow",
    name: "TaskFlow SaaS",
    stack: { name: "Next.js 14 + Supabase", lang: "TypeScript", styling: "Tailwind CSS", db: "PostgreSQL (Supabase)", auth: "Supabase Auth", deploy: "Vercel", test: "Vitest + Playwright", state: "Zustand" },
    phase: "sonnet",
    webPhase: {
      items: [
        { label: "要件定義書", done: true },
        { label: "ワイヤーフレーム (4画面)", done: true },
        { label: "技術スタック決定", done: true },
        { label: "setup.cmd 生成", done: true },
      ],
    },
    opusPhase: {
      items: [
        { label: "フォルダ構造設計", done: true },
        { label: "package.json", done: true },
        { label: "詳細仕様書 (spec.md)", done: true },
        { label: "画面別レイアウト定義", done: true },
        { label: "コメント入りスタブ生成 (12ファイル)", done: true },
        { label: "TODO.md 生成 (48件)", done: true },
      ],
    },
    files: [
      { path: "src/app/dashboard/page.tsx", total: 5, done: 5, comment: "KPIカード・タスク一覧・プロジェクト進捗を表示するメインダッシュボード" },
      { path: "src/app/projects/page.tsx", total: 4, done: 4, comment: "プロジェクト一覧。カード形式で進捗バー付き" },
      { path: "src/app/projects/[id]/page.tsx", total: 7, done: 5, comment: "カンバンボード。ドラッグ&ドロップでタスク移動" },
      { path: "src/components/KanbanBoard.tsx", total: 8, done: 4, comment: "@dnd-kit を使ったカンバンボードコンポーネント" },
      { path: "src/components/TaskCard.tsx", total: 5, done: 3, comment: "タスクカード。status・担当者・期限を表示" },
      { path: "src/hooks/useTasks.ts", total: 6, done: 2, comment: "Supabase Realtime でタスク一覧を購読するカスタムフック" },
      { path: "src/hooks/useAuth.ts", total: 4, done: 4, comment: "Supabase Auth のラッパー。セッション管理" },
      { path: "src/lib/supabase.ts", total: 3, done: 3, comment: "Supabase クライアント初期化" },
      { path: "src/app/settings/page.tsx", total: 6, done: 1, comment: "プロフィール・通知・チームメンバー管理" },
      { path: "src/middleware.ts", total: 3, done: 3, comment: "認証ルートガード" },
    ],
    reports: [
      {
        id: "r1", from: "opus", type: "設計レポート", date: "2025-05-14",
        title: "スキャフォールド設計完了レポート",
        summary: "12ファイルのスタブ生成完了。DB スキーマに潜在的な N+1 クエリリスクを検出。useTasks フックにバッチフェッチ設計を推奨。",
        body: `## 設計サマリー\n\n- フォルダ構成: App Router 準拠、feature-first 構造を採用\n- 型安全性: Supabase の自動生成型を活用\n\n## リスク検出\n\n### ⚠️ N+1 クエリ懸念\n\`useTasks\` フックが各プロジェクトに対して個別クエリを発行する可能性があります。\`select('*, tasks(*)')\` でリレーション結合を推奨します。\n\n## 推奨事項\n\n1. Zustand ストアはスライス分割で設計する\n2. Realtime サブスクリプションは画面離脱時に必ず unsubscribe\n3. middleware.ts のルートガードに role-based アクセス制御を追加予定`,
        tags: ["設計", "DB", "パフォーマンス"],
      },
      {
        id: "r2", from: "sonnet", type: "実装レポート", date: "2025-05-16",
        title: "認証・ルーティング実装完了",
        summary: "useAuth.ts, middleware.ts, supabase.ts の実装が完了。Supabase SSR セッション管理を Next.js middleware で統合。",
        body: `## 実装完了ファイル\n\n- \`src/hooks/useAuth.ts\` ✅\n- \`src/middleware.ts\` ✅\n- \`src/lib/supabase.ts\` ✅\n\n## 実装メモ\n\nNext.js App Router では \`createServerClient\` と \`createBrowserClient\` を使い分ける必要があります。Cookie のリフレッシュ処理を middleware に集約しました。\n\n## 次のステップ\n\nKanbanBoard コンポーネントの実装に進みます。@dnd-kit の設計は Opus の設計コメントを参照してください。`,
        tags: ["認証", "実装完了"],
      },
      {
        id: "r3", from: "sonnet", type: "進捗レポート", date: "2025-05-18",
        title: "カンバンボード実装 — 50% 進捗",
        summary: "ドラッグ&ドロップの基盤実装完了。タスクステータス更新の Optimistic Update はまだ未実装。",
        body: `## 進捗状況\n\n完了: DndContext 設定、SortableContext、ドロップゾーン定義\n未完了: Optimistic Update、アニメーション、モバイル対応\n\n## ブロッカー\n\n\`@dnd-kit/sortable\` の型定義が厳格で、タスクオブジェクトに \`id: UniqueIdentifier\` が必要。既存の Supabase 型との変換レイヤーが必要になりました。\n\n## 質問 (Opus へ)\n\nタスク移動時の DB 更新は楽観的更新か、確認後更新か、どちらを設計意図していますか？`,
        tags: ["WIP", "ブロッカーあり"],
      },
    ],
    schemas: [
      {
        name: "Task",
        description: "タスクエンティティ。カンバンボードの最小単位。",
        schema: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", description: "Supabase 自動生成 UUID" },
            title: { type: "string", minLength: 1, maxLength: 200 },
            status: { type: "string", enum: ["todo", "in_progress", "review", "done"] },
            assignee_id: { type: "string", format: "uuid", nullable: true },
            project_id: { type: "string", format: "uuid" },
            due_date: { type: "string", format: "date", nullable: true },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            created_at: { type: "string", format: "date-time" },
          },
          required: ["id", "title", "status", "project_id"],
        },
      },
      {
        name: "Project",
        description: "プロジェクトエンティティ。タスクとメンバーを束ねる単位。",
        schema: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", minLength: 1, maxLength: 100 },
            slug: { type: "string", pattern: "^[a-z0-9-]+$" },
            owner_id: { type: "string", format: "uuid" },
            members: { type: "array", items: { type: "string", format: "uuid" } },
            status: { type: "string", enum: ["active", "archived", "paused"] },
            created_at: { type: "string", format: "date-time" },
          },
          required: ["id", "name", "slug", "owner_id"],
        },
      },
    ],
  },
  {
    id: "ecom",
    name: "ShopCraft EC",
    stack: { name: "Nuxt 3 + Prisma", lang: "TypeScript", styling: "UnoCSS", db: "MySQL (PlanetScale)", auth: "Nuxt Auth", deploy: "Netlify", test: "Vitest", state: "Pinia" },
    phase: "opus",
    webPhase: { items: [{ label: "要件定義書", done: true }, { label: "ワイヤーフレーム (6画面)", done: true }, { label: "技術スタック決定", done: true }, { label: "setup.cmd 生成", done: false }] },
    opusPhase: { items: [{ label: "フォルダ構造設計", done: true }, { label: "package.json", done: true }, { label: "詳細仕様書", done: false }, { label: "画面別レイアウト定義", done: false }, { label: "スタブ生成", done: false }, { label: "TODO.md", done: false }] },
    files: [
      { path: "pages/index.vue", total: 4, done: 0, comment: "商品一覧。フィルタ・ソート機能" },
      { path: "composables/useCart.ts", total: 7, done: 0, comment: "カート状態管理。Pinia store 連携" },
    ],
    reports: [
      { id: "r1", from: "opus", type: "設計レポート", date: "2025-05-17", title: "フォルダ構造・package.json 設計完了", summary: "Nuxt 3 の server/ ディレクトリを活用した API Routes 設計。Prisma スキーマのドラフト作成中。", body: `## 設計方針\n\nNuxt 3 の \`server/api\` ディレクトリで REST ライクな API を構成します。\n\n## 次のステップ\n\nPrisma スキーマの設計に着手します。Product, Cart, Order の関係を定義します。`, tags: ["設計", "Prisma"] },
    ],
    schemas: [
      { name: "Product", description: "商品エンティティ", schema: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, price: { type: "number", minimum: 0 }, stock: { type: "integer", minimum: 0 }, category_id: { type: "integer" } }, required: ["id", "name", "price"] } },
    ],
  },
];

const MAIN_TABS = [
  { id: "progress", label: "進捗", icon: "ti-chart-bar" },
  { id: "reports", label: "AI レポート", icon: "ti-report" },
  { id: "techstack", label: "技術スタック", icon: "ti-stack-2" },
  { id: "schema", label: "JSON スキーマ", icon: "ti-brackets-curly" },
];

const PHASES = [
  { id: "web", label: "Web 企画", color: "#6b7280" },
  { id: "opus", label: "Opus 設計", color: "#a78bfa" },
  { id: "sonnet", label: "Sonnet 実装", color: "#38bdf8" },
];

function phaseColor(p) { return PHASES.find(x => x.id === p)?.color || "#6b7280"; }
function projectProgress(proj) {
  if (!proj.files.length) return 0;
  const t = proj.files.reduce((s, f) => s + f.total, 0);
  const d = proj.files.reduce((s, f) => s + f.done, 0);
  return t === 0 ? 0 : Math.round((d / t) * 100);
}

function Bar({ pct, color, h = 4 }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: 99, height: h, overflow: "hidden" }}>
      <div style={{ background: color, height: "100%", width: `${pct}%`, borderRadius: 99, transition: "width 0.4s" }} />
    </div>
  );
}

function PhaseChip({ phase }) {
  const c = phaseColor(phase);
  const label = PHASES.find(p => p.id === phase)?.label;
  return <span style={{ background: `${c}18`, border: `1px solid ${c}40`, borderRadius: 4, color: c, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px" }}>{label}</span>;
}

// ── Sidebar ──
function Sidebar({ projects, selected, onSelect, open, onToggle }) {
  return (
    <div style={{ ...S.sidebar, width: open ? 250 : 52, transition: "width 0.22s cubic-bezier(.4,0,.2,1)", overflow: "hidden", flexShrink: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: open ? "space-between" : "center", padding: open ? "18px 14px 14px" : "14px 0", borderBottom: "1px solid #1e293b", minHeight: 56 }}>
        {open && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22, color: "#38bdf8", lineHeight: 1 }}>⬡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>DevStudio</div>
              <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.06em" }}>Project Manager</div>
            </div>
          </div>
        )}
        <button onClick={onToggle} title={open ? "サイドバーを閉じる" : "サイドバーを開く"} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, flexShrink: 0, width: 28, height: 28 }}>
          <i className={open ? "ti ti-layout-sidebar-left-collapse" : "ti ti-layout-sidebar-left-expand"} style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Project list */}
      <div style={{ overflowY: "auto", overflowX: "hidden" }}>
        {projects.map(p => {
          const pct = projectProgress(p);
          const active = p.id === selected;
          const phColor = phaseColor(p.phase);
          return open ? (
            <button key={p.id} onClick={() => onSelect(p.id)} style={{ ...S.projBtn, ...(active ? { background: "#0f172a" } : {}) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <PhaseChip phase={p.phase} />
              </div>
              <div style={{ fontSize: 10, color: "#334155", marginBottom: 6 }}>{p.stack.name}</div>
              <Bar pct={pct} color={pct === 100 ? "#34d399" : "#38bdf8"} />
              <div style={{ fontSize: 10, color: "#475569", textAlign: "right", marginTop: 3 }}>{pct}%</div>
            </button>
          ) : (
            /* Collapsed: icon + progress dot */
            <button key={p.id} onClick={() => onSelect(p.id)} title={p.name} style={{ background: active ? "#0f172a" : "transparent", border: "none", borderBottom: "1px solid #0f172a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", width: "100%", position: "relative" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: phColor, opacity: active ? 1 : 0.45 }} />
              {/* mini progress ring via conic-gradient */}
              <div style={{ position: "absolute", bottom: 6, right: 10, width: 6, height: 6, borderRadius: "50%", background: pct === 100 ? "#34d399" : "#1e293b", border: `1.5px solid ${pct > 0 ? "#38bdf8" : "#1e293b"}` }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab Bar ──
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #1e293b", gap: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ ...S.tab, ...(active === t.id ? S.tabActive : {}) }}>
          <i className={`ti ${t.icon}`} style={{ fontSize: 14, marginRight: 6 }} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Progress Tab ──
function ProgressTab({ project }) {
  const totalTodos = project.files.reduce((s, f) => s + f.total, 0);
  const doneTodos = project.files.reduce((s, f) => s + f.done, 0);
  const pct = projectProgress(project);
  const phaseIdx = ["web", "opus", "sonnet"].indexOf(project.phase);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "全体進捗", value: `${pct}%`, color: "#38bdf8" },
          { label: "TODO 完了", value: `${doneTodos}/${totalTodos}`, color: "#a78bfa" },
          { label: "ファイル数", value: project.files.length, color: "#f472b6" },
          { label: "現フェーズ", value: PHASES[phaseIdx]?.label, color: "#34d399" },
        ].map((s, i) => (
          <div key={i} style={S.statCard}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2, letterSpacing: "0.06em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Phase timeline + checklists */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Timeline */}
          <div style={S.card}>
            {PHASES.map((ph, i) => {
              const past = i < phaseIdx; const active = i === phaseIdx;
              return (
                <div key={ph.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: active ? `${ph.color}18` : past ? "#052e16" : "#0f172a", border: `2px solid ${active ? ph.color : past ? "#34d399" : "#1e293b"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: active ? ph.color : past ? "#34d399" : "#334155", flexShrink: 0 }}>
                      {past ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? ph.color : past ? "#34d399" : "#475569" }}>{ph.label}</span>
                  </div>
                  {i < 2 && <div style={{ width: 2, height: 16, background: past ? "#34d399" : "#1e293b", margin: "3px 0 3px 12px" }} />}
                </div>
              );
            })}
          </div>
          {[
            { title: "🌐 Web 企画フェーズ", color: "#6b7280", items: project.webPhase.items },
            { title: "✦ Opus 設計フェーズ", color: "#a78bfa", items: project.opusPhase.items },
          ].map((ph, idx) => {
            const cnt = ph.items.filter(i => i.done).length;
            return (
              <div key={idx} style={{ ...S.card, borderColor: `${ph.color}30` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ph.color, letterSpacing: "0.06em" }}>{ph.title}</span>
                  <span style={{ fontSize: 11, color: "#475569" }}>{cnt}/{ph.items.length}</span>
                </div>
                <Bar pct={Math.round(cnt / ph.items.length * 100)} color={ph.color} h={3} />
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {ph.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 13, height: 13, borderRadius: 3, background: item.done ? ph.color : "transparent", border: `1.5px solid ${item.done ? ph.color : "#1e293b"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#0a0e1a", flexShrink: 0 }}>{item.done && "✓"}</div>
                      <span style={{ fontSize: 11, color: item.done ? "#94a3b8" : "#475569", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {/* File list */}
        <div style={S.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.08em", marginBottom: 14 }}>⚡ SONNET 実装進捗 — ファイル別</div>
          {project.files.length === 0 ? (
            <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Opus 設計フェーズ完了後に表示されます</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {project.files.map((f, i) => {
                const p = Math.round(f.done / f.total * 100);
                const c = p === 100 ? "#34d399" : p > 0 ? "#38bdf8" : "#334155";
                return (
                  <div key={i} style={{ background: "#0a0e1a", border: "1px solid #1e293b", borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "#7dd3fc", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path}</span>
                      <span style={{ fontSize: 11, color: c, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{f.done}/{f.total}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#334155", marginBottom: 5 }}>{f.comment}</div>
                    <Bar pct={p} color={c} h={3} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reports Tab ──
const REPORT_FROM_COLOR = { opus: "#a78bfa", sonnet: "#38bdf8" };
const REPORT_TYPE_COLOR = { "設計レポート": "#a78bfa", "実装レポート": "#34d399", "進捗レポート": "#f59e0b" };

function ReportsTab({ reports }) {
  const [selected, setSelected] = useState(reports[0]?.id || null);
  const report = reports.find(r => r.id === selected);
  if (!reports.length) return <div style={{ color: "#334155", fontSize: 12, padding: 20 }}>レポートはまだありません</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14, alignItems: "start" }}>
      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {reports.map(r => (
          <button key={r.id} onClick={() => setSelected(r.id)} style={{ ...S.reportBtn, ...(selected === r.id ? { borderColor: REPORT_FROM_COLOR[r.from], background: "#0f172a" } : {}) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: REPORT_FROM_COLOR[r.from], fontWeight: 700, letterSpacing: "0.06em" }}>{r.from.toUpperCase()}</span>
              <span style={{ fontSize: 10, color: "#334155" }}>{r.date}</span>
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600, lineHeight: 1.4, textAlign: "left" }}>{r.title}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {r.tags.map((t, i) => <span key={i} style={{ fontSize: 10, background: "#1e293b", color: "#64748b", borderRadius: 3, padding: "1px 6px" }}>{t}</span>)}
            </div>
          </button>
        ))}
      </div>
      {/* Detail */}
      {report && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #1e293b" }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: REPORT_FROM_COLOR[report.from], fontWeight: 700, letterSpacing: "0.06em" }}>{report.from.toUpperCase()} — {report.type}</span>
                <span style={{ fontSize: 10, color: "#334155" }}>{report.date}</span>
              </div>
              <div style={{ fontSize: 15, color: "#f1f5f9", fontWeight: 700 }}>{report.title}</div>
            </div>
          </div>
          <div style={{ background: "#0a0e1a", border: "1px solid #1e293b", borderRadius: 6, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{report.summary}</div>
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            {report.body.split("\n").map((line, i) => {
              if (line.startsWith("## ")) return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: "14px 0 6px", borderBottom: "1px solid #1e293b", paddingBottom: 4 }}>{line.slice(3)}</div>;
              if (line.startsWith("### ")) return <div key={i} style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", margin: "10px 0 4px" }}>{line.slice(4)}</div>;
              if (line.startsWith("- ")) return <div key={i} style={{ color: "#64748b", paddingLeft: 12, marginBottom: 3 }}>· {line.slice(2)}</div>;
              if (line.startsWith("`") && line.endsWith("`")) return <code key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 4, color: "#7dd3fc", fontSize: 11, padding: "0 6px" }}>{line.slice(1, -1)}</code>;
              if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
              return <div key={i} style={{ color: "#64748b", marginBottom: 3 }}>{line}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tech Stack Tab ──
const STACK_ICONS = { lang: "ti-brand-typescript", styling: "ti-palette", db: "ti-database", auth: "ti-lock", deploy: "ti-rocket", test: "ti-test-pipe", state: "ti-layout-sidebar" };
const STACK_LABELS = { lang: "言語", styling: "スタイリング", db: "データベース", auth: "認証", deploy: "デプロイ", test: "テスト", state: "状態管理" };

function TechStackTab({ stack }) {
  const entries = Object.entries(stack).filter(([k]) => k !== "name");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={S.card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.08em", marginBottom: 14 }}>⚙ 技術スタック — {stack.name}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {entries.map(([key, val]) => (
            <div key={key} style={{ background: "#0a0e1a", border: "1px solid #1e293b", borderRadius: 6, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0f1729", border: "1px solid #1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${STACK_ICONS[key] || "ti-code"}`} style={{ fontSize: 16, color: "#38bdf8" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.08em", marginBottom: 3 }}>{STACK_LABELS[key] || key}</div>
                <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...S.card, borderColor: "#a78bfa30" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", marginBottom: 10 }}>✦ OPUS — セットアップコマンド</div>
        <pre style={{ background: "#0a0e1a", border: "1px solid #1e293b", borderRadius: 6, color: "#7dd3fc", fontSize: 11, lineHeight: 1.8, margin: 0, padding: "12px 14px", overflowX: "auto" }}>
{`npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app
npm install @supabase/supabase-js @supabase/ssr zustand @dnd-kit/core @dnd-kit/sortable
npx supabase init
npx prisma init`}
        </pre>
      </div>
    </div>
  );
}

// ── Schema Tab ──
function SchemaValue({ value, depth = 0 }) {
  if (typeof value !== "object" || value === null) {
    const color = typeof value === "string" ? "#fbbf24" : typeof value === "number" ? "#34d399" : "#94a3b8";
    return <span style={{ color }}>{JSON.stringify(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <span>
        <span style={{ color: "#475569" }}>[</span>
        {value.map((v, i) => <span key={i}><SchemaValue value={v} depth={depth} />{i < value.length - 1 && <span style={{ color: "#334155" }}>, </span>}</span>)}
        <span style={{ color: "#475569" }}>]</span>
      </span>
    );
  }
  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <span style={{ color: "#475569" }}>{"{"}</span>
      {Object.entries(value).map(([k, v], i, arr) => (
        <div key={k} style={{ marginLeft: 16 }}>
          <span style={{ color: "#7dd3fc" }}>"{k}"</span>
          <span style={{ color: "#475569" }}>: </span>
          {k === "description" ? <span style={{ color: "#64748b", fontStyle: "italic" }}>{JSON.stringify(v)}</span> : <SchemaValue value={v} depth={depth + 1} />}
          {i < arr.length - 1 && <span style={{ color: "#334155" }}>,</span>}
        </div>
      ))}
      <span style={{ color: "#475569" }}>{"}"}</span>
    </div>
  );
}

function SchemaTab({ schemas }) {
  const [selected, setSelected] = useState(schemas[0]?.name || null);
  const schema = schemas.find(s => s.name === selected);
  if (!schemas.length) return <div style={{ color: "#334155", fontSize: 12, padding: 20 }}>スキーマはまだありません</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 14, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {schemas.map(s => (
          <button key={s.name} onClick={() => setSelected(s.name)} style={{ ...S.schemaBtn, ...(selected === s.name ? { borderColor: "#38bdf8", background: "#0f172a", color: "#38bdf8" } : {}) }}>
            <i className="ti ti-brackets-curly" style={{ fontSize: 13, marginRight: 6 }} />
            {s.name}
          </button>
        ))}
      </div>
      {schema && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #1e293b" }}>
            <span style={{ fontSize: 14, color: "#38bdf8", fontWeight: 700 }}>{schema.name}</span>
            <span style={{ fontSize: 11, color: "#334155" }}>JSON Schema</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>{schema.description}</div>
          {/* Required fields */}
          {schema.schema.required && (
            <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.06em" }}>REQUIRED</span>
              {schema.schema.required.map((r, i) => <span key={i} style={{ fontSize: 10, background: "#0c2a4a", border: "1px solid #1e3a5f", borderRadius: 3, color: "#38bdf8", padding: "1px 7px" }}>{r}</span>)}
            </div>
          )}
          <pre style={{ background: "#0a0e1a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 11, lineHeight: 1.8, margin: 0, padding: "14px 16px", overflowX: "auto" }}>
            <SchemaValue value={schema.schema} />
          </pre>
        </div>
      )}
    </div>
  );
}

// ── App ──
export default function DevStudio() {
  const [selProject, setSelProject] = useState("taskflow");
  const [tab, setTab] = useState("progress");
  const [sideOpen, setSideOpen] = useState(true);
  const project = PROJECTS.find(p => p.id === selProject);

  return (
    <div style={S.root}>
      <Sidebar projects={PROJECTS} selected={selProject} onSelect={id => { setSelProject(id); setTab("progress"); }} open={sideOpen} onToggle={() => setSideOpen(v => !v)} />
      <main style={S.main}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 4px", letterSpacing: "-0.01em" }}>{project.name}</h1>
            <span style={{ fontSize: 11, color: "#475569" }}>{project.stack.name}</span>
          </div>
          <PhaseChip phase={project.phase} />
        </div>
        <TabBar tabs={MAIN_TABS} active={tab} onChange={setTab} />
        <div style={{ marginTop: 18 }}>
          {tab === "progress" && <ProgressTab project={project} />}
          {tab === "reports" && <ReportsTab reports={project.reports} />}
          {tab === "techstack" && <TechStackTab stack={project.stack} />}
          {tab === "schema" && <SchemaTab schemas={project.schemas} />}
        </div>
      </main>
    </div>
  );
}

const S = {
  root: { display: "flex", height: "100vh", background: "#080c14", fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace", color: "#e2e8f0", overflow: "hidden" },
  sidebar: { background: "#0a0e1a", borderRight: "1px solid #1e293b", overflow: "hidden", display: "flex", flexDirection: "column" },
  projBtn: { background: "transparent", border: "none", borderBottom: "1px solid #0f172a", color: "inherit", cursor: "pointer", fontFamily: "inherit", padding: "12px 14px", textAlign: "left", width: "100%" },
  main: { flex: 1, overflow: "auto", padding: "22px 24px", display: "flex", flexDirection: "column" },
  tab: { background: "none", border: "none", borderBottom: "2px solid transparent", color: "#475569", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", padding: "8px 16px", textTransform: "uppercase", whiteSpace: "nowrap", transition: "all 0.15s" },
  tabActive: { borderBottomColor: "#38bdf8", color: "#38bdf8" },
  statCard: { background: "#0d1117", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 14px" },
  card: { background: "#0d1117", border: "1px solid #1e293b", borderRadius: 10, padding: 16 },
  reportBtn: { background: "#0a0e1a", border: "1px solid #1e293b", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", padding: "10px 12px", textAlign: "left", width: "100%", transition: "all 0.15s" },
  schemaBtn: { background: "#0a0e1a", border: "1px solid #1e293b", borderRadius: 6, color: "#64748b", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "8px 12px", textAlign: "left", transition: "all 0.15s" },
};
