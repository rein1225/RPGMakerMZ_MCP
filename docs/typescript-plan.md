# TypeScript Migration Plan

本プロジェクトを段階的にTypeScriptへ移行するための計画書。

## フェーズ0: 型チェック基盤の整備 (完了)
- `tsconfig.json` の整備 (`allowJs` + `strict`)
- `npm run typecheck` で `tsc --noEmit` を実行し、既存JSコードの型検査を可能にした

## フェーズ1: 型情報の拡充 (完了)
- `types/index.d.ts` をメンテナンスし、主要なデータ構造の型を提供
- `JSDoc` コメントを追加し、TypeScriptによる型推論を強化
- `tsc` のエラーゼロを必須条件としてCIに `npm run typecheck` を追加済み

## フェーズ2: ユーティリティ層のTypeScript化 (完了)
- 対象: `utils/` ディレクトリ
- 完了内容:
  1. `utils/validation.js` → `utils/validation.ts` に移行
  2. `utils/mapHelpers.js` → `utils/mapHelpers.ts` に移行
  3. 型定義ファイル（`.d.ts`）を追加
  4. `npm run build:utils` スクリプト追加

## フェーズ3: ハンドラ層/エントリーポイントのTypeScript化 (完了)
- 対象: `handlers/`, `index.js`, `toolSchemas.js`
- 完了内容:
  1. 全handlers（`project.ts`, `database.ts`, `plugins.ts`, `map.ts`, `events.ts`, `playtest.ts`）をTypeScript化
  2. `index.js` → `index.ts` に移行
  3. `toolSchemas.js` → `toolSchemas.ts` に移行
  4. `tsconfig.handlers.json` を用意し、handlers用ビルド設定を追加
  5. Node.js向けにESM構成 (`type: "module"`) を維持

## フェーズ4: CI/CDへの統合 (完了)
- GitHub Actionsに `npm run typecheck` を追加し、PR時に型エラーを検知
- 型チェックがCIパイプラインに統合され、自動的に実行される
- 将来的には `npm run build` を実行し、`dist/` 成果物をパッケージング（未実装）

## 補足
- 段階的移行を最優先し、常に動作する状態を担保する
- JSDoc + `tsc --checkJs true` の併用も検討

