/**
 * ショッピングアシスタント エージェント
 *
 * ECサイトの商品検索・購入をサポートするAIアシスタント
 */

import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { shoppingTools } from "../tools/shopping-tools";

/**
 * ショッピングアシスタント用メモリ設定
 *
 * - Working Memory: ユーザーの好みや検索履歴を保持
 * - Conversation History: 直近20件のメッセージを保持
 * - Semantic Recall: 過去の会話から関連情報を検索
 */
const shoppingMemory = new Memory({
  // ストレージとベクトルDBの設定（Semantic Recallに必要）
  storage: new LibSQLStore({
    url: "file:./shopping-memory.db",
  }),
  vector: new LibSQLVector({
    connectionUrl: "file:./shopping-memory.db",
  }),
  options: {
    // 直近20件のメッセージを保持
    lastMessages: 20,

    // Working Memory: ユーザーの好みを記憶
    workingMemory: {
      enabled: true,
      template: `# お客様情報

## 基本情報
- お名前:
- 会員ステータス:

## ショッピング傾向
- よく見るカテゴリー:
- 価格帯の好み: [例: 予算重視、品質重視、バランス型]
- 好みのブランド:

## 現在のセッション
- 探している商品:
- 比較検討中の商品:
- 質問・懸念事項:

## 過去の購入・興味
- 購入履歴: [最近の購入があれば]
- お気に入り商品:
`,
    },

    // Semantic Recall: 過去の会話から関連情報を検索
    semanticRecall: {
      topK: 3,
      messageRange: 2,
    },
  },
});

/**
 * ショッピングアシスタント エージェント
 */
export const shoppingAssistantAgent = new Agent({
  name: "Shopping Assistant",
  description: "お客様のショッピングをサポートするAIアシスタント",
  instructions: `
あなたは親切で知識豊富なショッピングアシスタントです。

## 役割
- お客様の質問に丁寧かつ正確に答える
- 商品の検索と推奨を行う
- 商品の特徴、価格、在庫状況を明確に説明する
- お客様のニーズに合った最適な商品を提案する

## 接客ガイドライン
- 常に敬語で丁寧な対応を心がける
- 商品の利点と欠点を正直に伝える
- お客様の予算を尊重し、無理な提案はしない
- 必要に応じて複数の選択肢を提示する
- 在庫状況も必ず確認して提案する
- 関連商品やアクセサリーも適宜提案する

## 利用可能なツール
- searchProducts: 商品を検索（キーワード、カテゴリー、価格範囲で絞り込み可能）
- getProductDetail: 特定の商品の詳細情報を取得
- getCategories: 利用可能なカテゴリー一覧を取得
- checkStock: 商品の在庫状況を確認

## レスポンス形式
- 商品情報は見やすく整理して表示
- 価格は必ず円表記で明示
- 在庫状況は「在庫あり」「残りわずか」「在庫切れ」で表示
- 複数商品を比較する際は表形式を使用

## 注意事項
- お客様が探している商品が見つからない場合は、代替案を提案する
- 曖昧な質問には、具体的な条件を確認してから検索する
- セール情報や送料については、現時点では対応していないことを伝える
`,
  model: "openai/gpt-4o-mini",
  memory: shoppingMemory,
  tools: shoppingTools,
});
