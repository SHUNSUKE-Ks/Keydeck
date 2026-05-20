# KeyDeck — WebSocket 接続トラブルシューティング

作成: 2026-05-20

---

## 現在の症状

| 項目 | 状態 |
|---|---|
| Python サーバー起動 | ✅ `SERVER_01 server ready` まで正常 |
| Expo アプリ表示 | ✅ 6 ボタン UI が見えている |
| スマホ → PC 接続 | ❌ `WebSocket error` → すぐ切断を繰り返す |
| サーバー側の受信ログ | ❌ `SERVER_02 client connected` が出ない |
| ペースト動作 | ❌ 未確認 |

---

## 確認済みの対処

1. SDK バージョン合わせ (Expo Go SDK54 / React Native 0.81.5)
2. アプリ IP 設定を `192.168.1.1` → `192.168.0.7` に修正
3. `useFocusEffect` で設定画面から戻ると再接続するよう修正
4. Windows Firewall ルール追加 (ただし localport 指定なしで実行)

---

## 考えられる原因（優先順）

### 原因 A — Windows Firewall がポート 8765 を依然ブロック【最有力】

実行したコマンドが 2 行に分かれてしまい、`localport=8765` が抜けた状態でルールが作られた可能性がある。Python プロセスへのアクセスが process レベルでブロックされている場合も同様。

**診断コマンド（管理者 PowerShell）:**
```powershell
# 今あるルールを確認
netsh advfirewall firewall show rule name="KeyDeck WebSocket"

# 正しいルールを削除して作り直す
netsh advfirewall firewall delete rule name="KeyDeck WebSocket"
netsh advfirewall firewall add rule name="KeyDeck WebSocket" dir=in action=allow protocol=TCP localport=8765
```

**Python.exe 自体も許可:**
```powershell
# Python の実行ファイルパスを確認
where python

# そのパスを使って許可 (例)
netsh advfirewall firewall add rule name="Python KeyDeck" dir=in action=allow program="C:\Users\enjoy\AppData\Local\Programs\Python\Python312\python.exe" enable=yes
```

---

### 原因 B — PC の実際の IP が 192.168.0.7 でない

Metro が表示する IP と、Python サーバーが bind する IP が違うネットワークアダプタの場合がある（VPN・仮想アダプタ・WiFi/有線 の混在など）。

**診断コマンド:**
```powershell
ipconfig
```
→ スマホと同じ `192.168.0.x` 帯の IPv4 アドレスを確認する。  
→ 複数の IP が出る場合、スマホから `ping` で疎通確認できる IP を使う。

---

### 原因 C — サーバーが実際には 8765 でリッスンしていない

ポートが他のプロセスに使われている、または bind に失敗している可能性。

**診断コマンド:**
```powershell
netstat -ano | findstr :8765
```
→ `LISTENING` と Python のプロセスが出れば OK。

---

### 原因 D — スマホと PC が同一 WiFi ではない

スマホが LTE / 別の WiFi に接続している場合、`192.168.0.7` に到達できない。

**確認:** スマホの WiFi 設定で PC と同じ SSID に繋がっているか確認。

---

### 原因 E — ルーター/AP の AP isolation（クライアント間通信禁止）

同じ WiFi でもルーターの「AP isolation」機能が ON だとスマホ ↔ PC の直接通信がブロックされる。

**確認:** ルーターの管理画面で AP isolation / 無線クライアント間通信 の設定を確認。

---

## 疎通テストの手順

### Step 1: PC 側でポートが開いているか確認

```powershell
# サーバーを起動した状態で
Test-NetConnection -ComputerName localhost -Port 8765
```
→ `TcpTestSucceeded: True` が出れば Python は正常にリッスンしている。

### Step 2: スマホから PC への疎通確認

スマホのブラウザで以下にアクセス（WebSocket ではなく HTTP で疎通確認）:
```
http://192.168.0.7:8765
```
→ エラーメッセージが出れば到達できている（WebSocket は HTTP upgrade が必要なのでエラーは正常）。  
→ タイムアウトなら到達できていない → ファイアウォールか AP isolation が原因。

### Step 3: ファイアウォール一時無効化テスト

```powershell
# テスト用に一時的に無効化（テスト後は必ず戻す）
netsh advfirewall set allprofiles state off

# テスト後に戻す
netsh advfirewall set allprofiles state on
```

---

## 関連ファイルパス

| ファイル | 説明 |
|---|---|
| `C:\05__claude_workspace\05_app\KeyDeck\server\server.py` | WebSocket サーバー本体。HOST=0.0.0.0, PORT=8765 |
| `C:\05__claude_workspace\05_app\KeyDeck\server\key_sender.py` | pynput + pyperclip でキー入力を実行 |
| `C:\05__claude_workspace\05_app\KeyDeck\server\macro_engine.py` | binding → 実行のロジック |
| `C:\05__claude_workspace\05_app\KeyDeck\server\keymap_cache.json` | スマホから送られた keymap のキャッシュ |
| `C:\05__claude_workspace\05_app\KeyDeck\server\macros.json` | PC 側マクロ定義 |
| `C:\05__claude_workspace\05_app\KeyDeck\app\app\index.tsx` | メイン画面・接続管理 |
| `C:\05__claude_workspace\05_app\KeyDeck\app\hooks\useWebSocket.ts` | WebSocket hook |
| `C:\05__claude_workspace\05_app\KeyDeck\app\app\settings.tsx` | IP / Port 設定画面 |

---

## 起動コマンド

```cmd
# PC: サーバー起動
cd C:\05__claude_workspace\05_app\KeyDeck
python -m server.server

# PC: Expo 起動 (別ターミナル)
cd C:\05__claude_workspace\05_app\KeyDeck\app
npx expo start

# スマホ: Expo Go でQRスキャン → ⚙ → IP入力 → 保存 → K1 押下
```

---

## 次のアクション

1. **まず Step 2 のブラウザ疎通テストを実施**  
   → 到達できるかどうかでファイアウォール vs AP isolation を切り分け
2. 到達できない → Step 3 のファイアウォール一時無効化テスト
3. 到達できる → WebSocket プロトコル側の問題 → `wscat` で接続テスト
