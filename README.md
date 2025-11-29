# RPG Maker MZ MCP Server - 使用説明書

![Tests](https://github.com/rein1225/RPGMakerMZ_MCP/actions/workflows/test.yml/badge.svg)

## 概要

このMCPサーバーは、RPGツクールMZのゲーム開発を**完全自動化**するためのツールです。AIに自然言語で指示するだけで、マップ作成、イベント配置、スイッチ管理、アセットチェックなどが自動実行されます。

**主な特徴：**
- ✅ **抽象化レイヤー**: MZ内部構造を知らなくても開発可能
- ✅ **自動ID管理**: スイッチ・マップIDを自動解決/割り当て
- ✅ **ハルシネーション防止**: MCP Resourcesで仕様を参照可能
- ✅ **品質保証**: Zod Validationとアセット整合性チェック
- ✅ **自動バックアップ**: ファイル書き込み前に自動バックアップ作成
- ✅ **Undo機能**: 直前の変更を簡単に元に戻せる
- ✅ **セキュリティ強化**: ホワイトリスト方式のコード実行、パストラバーサル対策

---

## セットアップ

### 方法1: ソースコードから直接実行（開発者向け・推奨）

npmパッケージをインストールする必要はありません。リポジトリをクローンして依存関係をインストールするだけで使用できます。

#### 1. リポジトリのクローン

```bash
git clone https://github.com/rein1225/RPGMakerMZ_MCP.git
cd RPGMakerMZ_MCP
```

#### 2. 依存関係のインストール

```bash
npm install
```

これだけで準備完了です。TypeScriptファイルを直接実行できます。

#### 3. MCP設定ファイルの設定

Antigravityの設定ファイル（`mcp_config.json`）に以下を追加：

```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "npx",
      "args": ["tsx", "C:/path/to/RPGMakerMZ_MCP/index.ts"],
      "cwd": "C:/path/to/RPGMakerMZ_MCP"
    }
  }
}
```

> ⚠️ **重要**: 
> - `C:/path/to/RPGMakerMZ_MCP` を実際のプロジェクトパスに置き換えてください
> - Windowsでは`C:/`のようにスラッシュ（`/`）を使用し、バックスラッシュ（`\`）は使用しないでください
> - `npx tsx`を使用することで、TypeScriptファイルを直接実行できます（ビルド不要）
> - **`cwd`プロパティが許可されていない場合**: トラブルシューティングのQ1を参照してください（npmパッケージの使用やバッチファイル経由の実行を推奨）

### 方法2: npmパッケージからインストール（配布用）

npmパッケージとして公開されているので、グローバルインストールも可能です：

```bash
npm install -g @rein1225/rpg-maker-mz-mcp
```

インストール後、MCP設定ファイルに以下を追加：

```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "rpg-maker-mz-mcp"
    }
  }
}
```

### 方法3: ビルドしてから実行（オプション）

TypeScriptをJavaScriptにコンパイルしてから実行することも可能です：

```bash
npm run build
```

その後、`dist/index.js`を実行：

```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "node",
      "args": ["C:/path/to/RPGMakerMZ_MCP/dist/index.js"],
      "cwd": "C:/path/to/RPGMakerMZ_MCP"
    }
  }
}
```

> 💡 **推奨**: 開発・自分で使う場合は**方法1**（ソースコードから直接実行）が最も簡単です。ビルドは不要で、コードを編集してすぐに試せます。

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
**説明:** 指定したデータファイルにJSONコンテンツを書き込みます。書き込み前に自動的にバックアップが作成されます。
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

#### 8. `check_assets_integrity` - アセット整合性チェック
**説明:** イベント内で参照されているアセット（画像、音声など）が実際にプロジェクト内に存在するかチェックします。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス

---

### Phase 3: プラグイン管理

#### 9. `write_plugin_code` - プラグイン作成
**説明:** js/pluginsディレクトリに新しいプラグインファイル(.js)を作成します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `filename` (必須): プラグインファイル名（例: 'MyPlugin.js'）
- `code` (必須): JavaScriptコード

#### 10. `get_plugins_config` - プラグイン設定取得
**説明:** js/plugins.jsから現在のプラグイン設定を読み込みます。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス

#### 11. `update_plugins_config` - プラグイン設定更新
**説明:** js/plugins.jsのプラグイン設定を更新します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `plugins` (必須): プラグイン設定オブジェクトの配列

---

### Phase 4: マップ・イベント操作（抽象化レイヤー）

#### 12. `add_dialogue` - 会話イベント追加
**説明:** メッセージウィンドウに会話を追加します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `mapId` (必須): マップID
- `eventId` (必須): イベントID
- `pageIndex` (必須): ページ番号
- `insertPosition` (必須): 挿入位置（-1で末尾）
- `text` (必須): 表示テキスト
- `face`, `faceIndex`, `background`, `position` (省略可)

#### 13. `add_choice` - 選択肢の表示
**説明:** イベントに選択肢を追加します。最大6つの選択肢を設定できます。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `mapId` (必須): マップID
- `eventId` (必須): イベントID
- `pageIndex` (必須): ページ番号
- `insertPosition` (必須): 挿入位置（-1で末尾）
- `options` (必須): 選択肢の文字列配列（最大6個）
- `cancelType` (省略可): キャンセル時の動作（-1=キャンセル不可、0-5=選択肢に分岐、デフォルト: -1）

#### 14. `add_loop` - ループ追加
**説明:** イベントコマンドのループ構造（Loop + Repeat Above）を追加します。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `insertPosition` (必須)

#### 15. `add_break_loop` - ループ中断
**説明:** ループを中断するコマンドを追加します。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `insertPosition` (必須)

#### 16. `add_conditional_branch` - 条件分岐追加
**説明:** 条件分岐（If-Else-End）を追加します。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `insertPosition` (必須)
- `condition` (必須): 条件パラメータオブジェクト
- `includeElse` (省略可): Else分岐を含めるか（デフォルト: true）

#### 17. `delete_event_command` - イベントコマンド削除
**説明:** 指定したインデックスのイベントコマンドを削除します。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `commandIndex` (必須)

#### 18. `update_event_command` - イベントコマンド更新
**説明:** 指定したインデックスのイベントコマンドを新しい内容で上書きします。
**パラメータ:**
- `projectPath`, `mapId`, `eventId`, `pageIndex`, `commandIndex`, `newCommand` (必須)

#### 19. `add_actor` - アクター追加
**説明:** データベースに新しいアクターを追加します。
**パラメータ:**
- `projectPath`, `name` (必須)
- `classId`, `initialLevel`, `maxLevel` (省略可)

#### 20. `add_item` - アイテム追加
**説明:** データベースに新しいアイテムを追加します。
**パラメータ:**
- `projectPath`, `name` (必須)
- `price`, `consumable`, `scope`, `occasion` (省略可)

#### 21. `add_skill` - スキル追加
**説明:** データベースに新しいスキルを追加します。
**パラメータ:**
- `projectPath`, `name` (必須)
- `mpCost`, `tpCost`, `scope`, `occasion` (省略可)

#### 22. `draw_map_tile` - マップタイル描画
**説明:** マップの指定座標にタイルを配置します。
**パラメータ:**
- `projectPath`, `mapId`, `x`, `y`, `layer`, `tileId` (必須)

#### 23. `create_map` - 新規マップ作成
**説明:** 新しいマップを作成します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `mapName` (必須): マップ名
- `width` (省略可): マップ幅（タイル数、デフォルト: 17）
- `height` (省略可): マップ高さ（タイル数、デフォルト: 13）
- `parentMapId` (省略可): 親マップID（デフォルト: 0）

#### 24. `show_picture` - ピクチャの表示
**説明:** イベントにピクチャ表示コマンドを追加します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `mapId` (必須): マップID
- `eventId` (必須): イベントID
- `pageIndex` (必須): ページ番号
- `insertPosition` (必須): 挿入位置（-1で末尾）
- `pictureId` (必須): ピクチャ番号
- `pictureName` (必須): 画像ファイル名
- `x`, `y` (必須): 表示座標
- `origin` (省略可): 原点位置（0=左上、1=中央、デフォルト: 0）
- `scaleX`, `scaleY` (省略可): 拡大率（%、デフォルト: 100）
- `opacity` (省略可): 不透明度（0-255、デフォルト: 255）
- `blendMode` (省略可): 合成モード（0-3、デフォルト: 0）

#### 25. `inspect_game_state` - ゲーム状態検査
**説明:** 実行中のゲーム（Puppeteer接続）から変数やスイッチの値を取得します。
**セキュリティ:** ホワイトリスト方式を採用し、許可されたパターンのみ実行可能です。入力長制限（100文字）とID範囲チェック（1-9999）も実装されています。
**許可されたパターン例:**
- `$gameVariables.value(1)` - 変数の値を取得
- `$gameSwitches.value(1)` - スイッチの値を取得
- `$gameParty.gold()` - 所持金を取得
- `$gameMap.mapId()` - 現在のマップIDを取得
- `SceneManager._scene` - 現在のシーンを取得
**パラメータ:**
- `script` (必須): 評価するJavaScriptコード（ホワイトリストに登録されたパターンのみ）
- `port` (省略可): デバッグポート（デフォルト: 9222）

---

### Phase 5: テスト・自動化

#### 26. `run_playtest` - テストプレイ実行
**説明:** Game.exeを起動し、指定時間後にスクリーンショットを撮影します。Game.exeが見つからない場合は、自動的にブラウザベースのテストプレイ（フォールバックモード）が実行されます。Puppeteer接続用のデバッグポートも指定可能です。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `duration` (省略可): 撮影までの待機時間(ms)（デフォルト: 5000）
- `autoClose` (省略可): trueの場合、撮影後にゲームを自動終了します。（デフォルト: false）
- `debugPort` (省略可): リモートデバッグ用ポート（例: 9222）。Puppeteerで接続する場合に使用します。
- `startNewGame` (省略可): trueの場合、タイトル画面をスキップしてニューゲームを開始します。（デフォルト: false）

### Phase 6: バックアップ・Undo機能

#### 27. `undo_last_change` - 直前の変更を元に戻す
**説明:** 最新のバックアップからファイルを復元します。`filename`を指定しない場合、最も最近変更されたファイルを自動的に復元します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `filename` (省略可): 復元するファイル名（例: 'Actors.json'）。省略時は最新変更ファイルを自動検出

#### 28. `list_backups` - バックアップ一覧表示
**説明:** 指定したファイル、または全ファイルのバックアップ一覧を表示します。
**パラメータ:**
- `projectPath` (必須): プロジェクトフォルダの絶対パス
- `filename` (省略可): バックアップを表示するファイル名。省略時は全ファイルのバックアップを表示

**バックアップ機能について:**
- すべてのファイル書き込み操作（`write_data_file`、`add_actor`、`add_item`、`add_skill`、`write_plugin_code`、`update_plugins_config`、マップ操作など）で自動的にバックアップが作成されます
- バックアップファイルは `.{timestamp}.bak` 形式で保存されます
- 古いバックアップは自動的にクリーンアップされます（最新5件を保持）
- エラー発生時は自動的にロールバックされます

### Puppeteerによる高度な自動テスト
`run_playtest`で`debugPort`を指定することで、Puppeteerを使用してゲームのUI操作やシナリオテストを自動化できます。
詳細なAPI仕様は `docs/API_REFERENCE.md` を参照してください。

### E2Eテストの実行方法
自動化シナリオ (`automation/test_*.js`) は本番ゲーム環境を前提とした手動実行専用のテストです。CI では実行されません。

```bash
# 代表的なシナリオをまとめて走らせる
npm run test:e2e

# もしくは個別に実行
node automation/test_full_suite.js
node automation/test_add_dialogue.js
```

> ⚠️ ブラウザ操作やGame.exe起動を伴うため、**信頼できるローカル環境のみ**で実行してください。

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

### Q1: MCP設定でエラー「invalid character '-' after array element」または「プロパティ cwd は許可されていません」
**原因:** 
- JSON構文エラー（コメント、末尾カンマなど）
- 使用しているMCPクライアントが`cwd`プロパティをサポートしていない

**解決策:**

#### ステップ1: JSON構文を確認
1. **コメントを削除**: JSONはコメント（`//`や`#`）をサポートしていません
2. **末尾カンマを削除**: 配列やオブジェクトの最後の要素の後にカンマがあってはいけません
3. **オンラインバリデーターで確認**: [JSONLint](https://jsonlint.com/) で構文を検証してください

#### ステップ2: 正しい設定例を確認

**npmパッケージを使用する場合（推奨）:**
```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "rpg-maker-mz-mcp"
    }
  }
}
```

**tsxを使用する場合（cwdが使える場合）:**
```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "npx",
      "args": ["tsx", "C:/path/to/RPGMakerMZ_MCP/index.ts"],
      "cwd": "C:/path/to/RPGMakerMZ_MCP"
    }
  }
}
```

**tsxを使用する場合（cwdプロパティが許可されていない場合）:**
`cwd`プロパティが許可されていないMCPクライアントでは、以下のいずれかの方法を使用してください：

**方法A: npmパッケージを使用（最も簡単）**
```bash
npm install -g @rein1225/rpg-maker-mz-mcp
```
```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "rpg-maker-mz-mcp"
    }
  }
}
```

**方法B: バッチファイル経由で実行**
プロジェクトルートに`run_mcp.bat`を作成：
```batch
@echo off
cd /d C:/path/to/RPGMakerMZ_MCP
npx tsx index.ts
```
設定ファイル：
```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "C:/path/to/RPGMakerMZ_MCP/run_mcp.bat"
    }
  }
}
```
> 💡 **注意**: `C:/path/to/RPGMakerMZ_MCP`を実際のプロジェクトパスに置き換えてください。

**方法C: 絶対パスでnodeを直接使用（ビルドが必要）**
```bash
cd C:/path/to/RPGMakerMZ_MCP
npm run build
```
```json
{
  "mcpServers": {
    "rpg-maker-mz": {
      "command": "node",
      "args": ["C:/path/to/RPGMakerMZ_MCP/dist/index.js"]
    }
  }
}
```
> 💡 **注意**: `C:/path/to/RPGMakerMZ_MCP`を実際のプロジェクトパスに置き換えてください。

**よくある間違い:**
- ❌ **コメントを使用**: `// これはコメント` → JSONはコメント非対応
- ❌ **末尾カンマ**: `"args": ["tsx", "index.ts",]` → 最後のカンマは不可
- ❌ **シングルクォート**: `'path'` → JSONはダブルクォートのみ
- ❌ **バックスラッシュ**: `C:\path\to\file` → スラッシュ（`/`）を使用

#### ステップ3: 設定ファイルの場所を確認
- **Antigravity**: `%APPDATA%\Antigravity\mcp_config.json` (Windows)
- **Claude Desktop**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- 設定ファイルのパスは使用しているMCPクライアントによって異なります

#### ステップ4: デバッグ方法
1. 設定ファイルをテキストエディタで開く
2. [JSONLint](https://jsonlint.com/) にコピー＆ペーストして検証
3. エラーメッセージの行番号を確認して該当箇所を修正
4. 修正後、MCPクライアントを再起動

### Q2: スイッチが見つからないエラー
**解決策:** 自動登録機能が動作します。System.jsonの書き込み権限を確認してください。

### Q3: エディタとの競合
**解決策:** MCP編集中はエディタを閉じるか、編集後にプロジェクトを開き直してください。

### Q4: Game.exeが見つからない
**解決策:** デプロイメント機能でテストプレイ用パッケージを作成するか、Game.exeを手動配置してください。
なお、v1.2.0以降ではGame.exeがない場合でもブラウザ経由でテストプレイが実行されるようになりました。

### Q5: npmパッケージが見つからない
**解決策:** 
- グローバルインストール: `npm install -g @rein1225/rpg-maker-mz-mcp`
- パスが通っているか確認: `which rpg-maker-mz-mcp`（Linux/Mac）または `where rpg-maker-mz-mcp`（Windows）
- ソースコードから直接実行する場合は、`npx tsx`を使用してください

---

## 技術仕様

### アーキテクチャ
```
[AI] ← → [MCP Server] ← → [RPG Maker MZ Project]
           ├─ Tools (28個)
           ├─ Resources (1個)
           ├─ Schemas (Zod Validation)
           └─ Backup System (自動バックアップ・ロールバック)
```

### テストカバレッジ

- **ユニットテスト**: Vitestを使用
- **カバレッジレポート**: `npm run test:coverage` で生成
- **CI/CD**: GitHub Actionsで自動テスト実行、Codecovでカバレッジ追跡

### npm公開

本パッケージはnpmで公開されています：

```bash
npm install -g @rein1225/rpg-maker-mz-mcp
```

パッケージ情報: https://www.npmjs.com/package/@rein1225/rpg-maker-mz-mcp

### ファイル構成
```
RPGツクールMZ＿MCP/
├── index.ts                    # MCPサーバー本体（TypeScript）
├── handlers/                   # ハンドラ層（TypeScript化済み）
│   ├── project.ts
│   ├── database.ts
│   ├── plugins.ts
│   ├── map.ts
│   ├── events.ts
│   └── playtest.ts
├── utils/                      # ユーティリティ層（TypeScript化済み）
│   ├── validation.ts
│   ├── mapHelpers.ts
│   └── ...
├── types/                      # 型定義ファイル
├── resources/
│   └── event_commands.json     # イベントコマンドリファレンス
├── schemas/
│   └── mz_structures.js        # Zod検証スキーマ
├── automation/                 # 自動化スクリプト
└── package.json
```

---

## セキュリティ上の注意

本MCPサーバーは、ローカル開発環境での使用を想定しています。

### 実装済みのセキュリティ対策

- **`inspect_game_state`**: ホワイトリスト方式を採用し、許可されたパターンのみ実行可能。入力長制限（100文字）とID範囲チェック（1-9999）も実装。
- **パストラバーサル対策**: `path.normalize()`と`fs.realpath()`を使用してシンボリックリンク攻撃を防止。
- **ファイル名検証**: プラグイン書き込み時は英数字・アンダースコア・ハイフンのみ許可。
- **自動バックアップ**: すべてのファイル書き込み操作で自動バックアップを作成し、エラー時に自動ロールバック。

### 推奨事項

- 外部に公開された環境では使用しないでください。
- 信頼できるローカル環境でのみ使用してください。
- 重要な変更前には手動でバックアップを取ることを推奨します。

---

## ライセンス
MIT License

## 更新履歴
### v1.5.1 (2025-01-XX)
- npm公開準備完了（@rein1225/rpg-maker-mz-mcp）
- テストカバレッジ改善（undo.ts、backup.tsのテスト追加）
- CI/CD設定更新（カバレッジレポート、E2Eテスト自動化）
- playtest.tsのリファクタリング（527行→311行、約41%削減）

### v1.5.0 (2025-12-XX)
- **TypeScript移行完了**: 全handlers層とエントリーポイントをTypeScript化
- CI/CD統合: GitHub Actionsに型チェックを追加
- 型安全性の大幅向上

### v1.4.1 (2025-01-XX)
- undo_last_changeツールの実装
- list_backupsツールの実装
- toolSchemas.tsの型定義強化（plugins配列、conditionオブジェクトの詳細スキーマ）
- 空のcatchブロックにLogger.debug追加
- robotjsをdevDependenciesに移動

### v1.4.0 (2025-11-29)
- セキュリティ強化: パストラバーサル対策、任意コード実行の警告追加
- エラーハンドリングの改善と統一
- 非同期処理の安全性向上
- マジックナンバーの排除

### v1.3.0 (2025-11-29)
- 新ツール追加: `add_choice`, `create_map`, `show_picture`, `check_assets_integrity`
- ユニットテスト導入 (Vitest)
- ロガーユーティリティ追加
- 定数の外部化
- TypeScript型定義追加

### v1.2.0 (2025-11-28)
- `run_playtest` にブラウザベースのフォールバック機能を追加（Game.exe不要）

### v1.1.0 (2025-11-28)
- 実装済みツールリストの整理 (22ツール)
- `run_playtest` に `startNewGame` パラメータを追加

### v1.0.0 (2025-11-23)
- 初期リリース（当時は全16ツール構成）
- MCP Resources実装
- Zod Validation実装

---

## 追加機能ロードマップ

以下の機能は別途仕様を策定し、順次実装予定です。詳細は `docs/feature-roadmap.md` を参照してください。

| 優先度 | 機能 | ステータス |
| --- | --- | --- |
| ~~高~~ | ~~`undo` 機能（JSONバックアップ / ロールバック）~~ | ✅ 実装済み |
| 中 | `validate_project` ツール（整合性チェック一括実行） | 📋 計画中 |
| 中 | バッチ処理（複数コマンドを単一リクエストで実行） | 📋 計画中 |
| 低 | WebSocket通知（リアルタイムログ / 状態通知） | 📋 計画中 |

## 開発・貢献

### テストの実行

```bash
# ユニットテスト
npm test

# カバレッジレポート生成
npm run test:coverage

# 型チェック
npm run typecheck

# E2Eテスト（手動実行）
npm run test:e2e
```

### ビルド

```bash
# 全ファイルをビルド（dist/に出力）
npm run build

# 公開前の確認
npm pack --dry-run
```

### コントリビューション

プルリクエストを歓迎します！以下の点にご注意ください：

- コードスタイル: TypeScriptのstrictモードに準拠
- テスト: 新機能にはテストを追加してください
- セキュリティ: ファイル操作やコード実行には適切な検証を実装してください
