# 追加機能ロードマップ

本ドキュメントは、ユーザから要望のあった追加機能について、優先度と実装方針を整理したものです。

## 優先度: 高

### Undo / ロールバック機構
- **概要**: JSON 書き込み系ツール実行前に `data/` ディレクトリの対象ファイルをバックアップし、直前の状態へ戻せるようにする。
- **初期実装案**:
  - ハンドラ層に `withBackup(projectPath, files, action)` ヘルパーを追加し、`fs.copyFile` で `.bak` を保存。
  - CLI ツール `undo_last_change` を用意し、最新バックアップを復元。
  - 長期的にはジャーナル形式で複数ステップの巻き戻しに対応。

## 優先度: 中

### validate_project ツール
- **概要**: プロジェクト全体の整合性チェック（`validateProjectPath`, `checkAssetsIntegrity`, 主要 JSON の JSON Schema 検証）を一括で実行。
- **初期実装案**:
  - 新しいハンドラ `handlers/projectValidation.js` を追加し、個別チェックを Promise.all で並列実行。
  - 結果をカテゴリ別にレポート（ERROR / WARNING / INFO）。

### バッチ処理ツール
- **概要**: 複数の MCP ツール呼び出しをひとつのリクエストにまとめて実行。
- **初期実装案**:
  - `batch_execute` ツールを追加し、`[{ name: string, args: object }]` の配列を順番に実行。
  - 途中で失敗した場合はそれ以降を中断し、成功/失敗のレポートを返す。

## 優先度: 低

### WebSocket 通知
- **概要**: MCP サーバーからエディタ/クライアントへリアルタイムでログや進捗をストリーミング。
- **初期実装案**:
  - `ws` モジュールを使用してローカル WebSocket サーバーを立ち上げ、`Logger` と連携。
  - `playtest` や `batch_execute` など長時間処理のステータス更新を送信。

---

各機能の詳細設計・タスク分解は GitHub Issues で管理予定。優先順位に応じて順次実装を進める。

