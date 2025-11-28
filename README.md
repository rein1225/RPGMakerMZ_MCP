# RPG Maker MZ MCP Server - 使用説明書

## 概要

このMCPサーバーは、RPGツクールMZのゲーム開発を**完全自動化**するためのツールです。AIに自然言語で指示するだけで、マップ作成、イベント配置、スイッチ管理、アセットチェックなどが自動実行されます。

**主な特徴：**
- ✅ **抽象化レイヤー**: MZ内部構造を知らなくても開発可能
- ✅ **自動ID管理**: スイッチ・マップIDを自動解決/割り当て
- ✅ **ハルシネーション防止**: MCP Resourcesで仕様を参照可能
- ✅ **品質保証**: Zod Validationとアセット整合性チェック

---

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. MCPサーバーの起動

Antigravityの設定ファイル（`mcp_config.json`）に以下を追加：

```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "node",
      "args": ["c:/Users/1225s/Desktop/dev/RPGMakerMZ_MCP/index.js"],
      "cwd": "c:/Users/1225s/Desktop/dev/RPGMakerMZ_MCP"
    }
  }
}
```

---

## 利用可能なツール

### Phase 1: プロジェクト分析・データ操作

#### 1. `get_project_info` - プロジェクト基本情報取得
**説明:** System.jsonからゲームタイトル、バージョン、通貨単位などの基本情報を取得します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス

#### 2. `list_data_files` - データファイル一覧
**説明:** dataフォルダ内のJSONファイル一覧を取得します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス

#### 3. `read_data_file` - データファイル読み込み
**説明:** 指定したデータファイル（Actors.jsonなど）の内容を読み込みます。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `filename` (必須): ファイル名（例: 'Actors.json'）

#### 4. `write_data_file` - データファイル書き込み
**説明:** 指定したデータファイルにJSONコンテンツを書き込みます。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `filename` (必須): ファイル名
- `content` (必須): 書き込むJSON文字列

#### 5. `search_events` - イベント検索
**説明:** マップイベントおよびコモンイベント内のテキストやコマンドコードを検索します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `query` (必須): 検索するテキストまたは数値

#### 6. `get_event_page` - イベントページ取得
**説明:** 指定したイベントページのコマンドリストを取得します。主要なコマンド（会話、選択肢、スイッチ操作など）には可読性の高い説明が付与されます。これによりAIは既存イベントの内容を理解し、推敲や修正を行うことが可能になります。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `mapId` (必須): マップID
- `eventId` (必須): イベントID
- `pageIndex` (必須): ページ番号（0始まり）

---

### Phase 2: アセット管理

#### 7. `list_assets` - アセット一覧
**説明:** imgおよびaudioディレクトリ内のファイル一覧を取得します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `assetType` (省略可): 'img', 'audio', 'all' (デフォルト: 'all')

---

### Phase 3: プラグイン管理

#### 8. `write_plugin_code` - プラグイン作成
**説明:** js/pluginsディレクトリに新しいプラグインファイル(.js)を作成します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `filename` (必須): プラグインファイル名（例: 'MyPlugin.js'）
- `code` (必須): JavaScriptコード

#### 9. `get_plugins_config` - プラグイン設定取得
**説明:** js/plugins.jsから現在のプラグイン設定を読み込みます。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス

#### 10. `update_plugins_config` - プラグイン設定更新
**説明:** js/plugins.jsのプラグイン設定を更新します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `plugins` (必須): プラグイン設定オブジェクトの配列

---

### Phase 4: マップ・イベント操作（抽象化レイヤー）

#### 11. `add_dialogue` - 会話イベント追加
**説明:** メッセージウィンドウに会話を追加します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `mapId` (必須): マップID
- `eventId` (必須): イベントID
- `pageIndex` (必須): ページ番号
- `insertPosition` (必須): 挿入位置（-1で末尾）
- `text` (必須): 表示テキスト
- `face`, `faceIndex`, `background`, `position` (省略可)

#### 12. `add_loop` - ループ追加
**説明:** イベントコマンドのループ構造（Loop + Repeat Above）を追加します。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `insertPosition` (必須)

#### 13. `add_break_loop` - ループ中断
**説明:** ループを中断するコマンドを追加します。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `insertPosition` (必須)

#### 14. `add_conditional_branch` - 条件分岐追加
**説明:** 条件分岐（If-Else-End）を追加します。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `insertPosition` (必須)
- `condition` (必須): 条件パラメータオブジェクト
- `includeElse` (省略可): Else分岐を含めるか（デフォルト: true）

#### 15. `delete_event_command` - イベントコマンド削除
**説明:** 指定したインデックスのイベントコマンドを削除します。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `commandIndex` (必須)

#### 16. `update_event_command` - イベントコマンド更新
**説明:** 指定したインデックスのイベントコマンドを新しい内容で上書きします。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `commandIndex`, `newCommand` (必須)

#### 17. `add_actor` - アクター追加
**説明:** データベースに新しいアクターを追加します。
**パラメータ:**
- `projectPath`, `name` (必須)
- `classId`, `initialLevel`, `maxLevel` (省略可)

#### 18. `add_item` - アイテム追加
**説明:** データベースに新しいアイテムを追加します。
**パラメータ:**
- `projectPath`, `name` (必須)
- `price`, `consumable`, `scope`, `occasion` (省略可)

#### 19. `add_skill` - スキル追加
**説明:** データベースに新しいスキルを追加します。
**パラメータ:**
- `projectPath`, `name` (必須)
- `mpCost`, `tpCost`, `scope`, `occasion` (省略可)

#### 20. `draw_map_tile` - マップタイル描画
**説明:** マップの指定座標にタイルを配置します。
**パラメータ:**
- `projectPath`, `mapId`, `x`, `y`, `layer`, `tileId` (必須)

#### 21. `inspect_game_state` - ゲーム状態検査
**説明:** 実行中のゲーム（Puppeteer接続）から変数やスイッチの値を取得します。
**パラメータ:**
- `script` (必須): 評価するJavaScriptコード（例: `$gameVariables.value(1)`）
- `port` (省略可): デバッグポート（デフォルト: 9222）

---

### Phase 5: テスト・自動化

#### 22. `run_playtest` - テストプレイ実行
**説明:** Game.exeを起動し、指定時間後にスクリーンショットを撮影します。Puppeteer接続用のデバッグポートも指定可能です。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `duration` (省略可): 撮影までの待機時間(ms)（デフォルト: 5000）
- `autoClose` (省略可): trueの場合、撮影後にゲームを自動終了します。（デフォルト: false）
- `debugPort` (省略可): リモートデバッグ用ポート（例: 9222）。Puppeteerで接続する場合に使用します。
- `startNewGame` (省略可): trueの場合、タイトル画面をスキップしてニューゲームを開始します。（デフォルト: false）

### Puppeteerによる高度な自動テスト
`run_playtest`で`debugPort`を指定することで、Puppeteerを使用してゲームのUI操作やシナリオテストを自動化できます。
詳細なAPI仕様は `docs/API_REFERENCE.md` を参照してください。

---

## MCP Resources

### `mz://docs/event_commands` - イベントコマンドリファレンス
AIがMZのイベントコマンド仕様を参照するためのリソースです。

---

## 実用例

### 例1: 新規アクター作成と会話イベント追加
```javascript
// 1. アクター作成
add_actor({ projectPath, name: "新キャラ" });
// 2. 会話追加
add_dialogue({ projectPath, mapId: 1, eventId: 1, pageIndex: 0, insertPosition: -1, text: "こんにちは！\n新しい仲間です。" });
```

### 例2: イベント検索
```javascript
search_events({ projectPath: "c:/path/to/project", query: "ポーション" });
```

---

## トラブルシューティング

### Q1: スイッチが見つからないエラー
**解決策:** 自動登録機能が動作します。System.jsonの書き込み権限を確認してください。

### Q2: エディタとの競合
**解決策:** MCP編集中はエディタを閉じるか、編集後にプロジェクトを開き直してください。

### Q3: Game.exeが見つからない
**解決策:** デプロイメント機能でテストプレイ用パッケージを作成するか、Game.exeを手動配置してください。

---

## 技術仕様

### アーキテクチャ
```
[AI] ← → [MCP Server] ← → [RPG Maker MZ Project]
[AI] ← → [MCP Server] ← → [RPG Maker MZ Project]
[AI] ← → [MCP Server] ← → [RPG Maker MZ Project]
           ├─ Tools (22個)
           ├─ Resources (1個)
           └─ Schemas (Zod Validation)
```

### ファイル構成
```
RPGツクールMZ＿MCP/
├── index.js                    # MCPサーバー本体
├── resources/
│   └── event_commands.json     # イベントコマンドリファレンス
├── schemas/
│   └── mz_structures.js        # Zod検証スキーマ
├── automation/                 # 自動化スクリプト
└── package.json
```

---

## ライセンス
MIT License

## 更新履歴
### v1.1.0 (2025-11-28)
- 実装済みツールリストの整理 (22ツール)
- `run_playtest` に `startNewGame` パラメータを追加

### v1.0.0 (2025-11-23)
- 全16ツール実装完了
- MCP Resources実装
- Zod Validation実装
