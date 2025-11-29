# TypeScript Migration Plan

本プロジェクトを段階的にTypeScriptへ移行するための計画書。

## フェーズ0: 型チェック基盤の整備 (完了)
- `tsconfig.json` の整備 (`allowJs` + `strict`)
- `npm run typecheck` で `tsc --noEmit` を実行し、既存JSコードの型検査を可能にした

## フェーズ1: 型情報の拡充 (進行中)
- `types/index.d.ts` をメンテナンスし、主要なデータ構造の型を提供
- `JSDoc` コメントを追加し、TypeScriptによる型推論を強化
- `tsc` のエラーゼロを必須条件としてCIに `npm run typecheck` を追加予定

## フェーズ2: ユーティリティ層のTypeScript化
- 対象: `utils/` ディレクトリ
- 進め方:
  1. `.js` → `.ts` へリネーム
  2. `tsc` でビルドし `dist/` に出力
  3. ランタイムは `dist/` を参照 (`npm run build` 追加予定)
- このフェーズで `ts-node` や `tsx` を導入し、開発時は直接 `.ts` を実行

## フェーズ3: ハンドラ層/エントリーポイントのTypeScript化
- 対象: `handlers/`, `index.js`, `automation/`
- Node.js向けにESM構成 (`type: "module"`) を維持しつつ、TS→JSのビルドフローに移行
- `tsconfig.build.json` を用意し、本番ビルドと開発用型検査を分離

## フェーズ4: CI/CDへの統合
- GitHub Actionsに `npm run typecheck` を追加し、PR時に型エラーを検知
- 将来的には `npm run build` を実行し、`dist/` 成果物をパッケージング

## 補足
- 段階的移行を最優先し、常に動作する状態を担保する
- JSDoc + `tsc --checkJs true` の併用も検討

