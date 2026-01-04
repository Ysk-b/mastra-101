/**
 * ショッピングアシスタント用 Scorer
 *
 * ショッピングアシスタントのレスポンス品質を評価するスコアラー群
 */

import { z } from "zod";
import { createToolCallAccuracyScorerCode } from "@mastra/evals/scorers/code";
import { createScorer } from "@mastra/core/scores";

/**
 * ツール呼び出し精度スコアラー
 * 検索クエリに対して適切なツールが呼び出されたかを評価
 */
export const productSearchAccuracyScorer = createToolCallAccuracyScorerCode({
  expectedTool: "search-products",
  strictMode: false,
});

/**
 * 価格情報の正確性スコアラー
 * レスポンスに含まれる価格情報が正確かを評価
 */
export const priceAccuracyScorer = createScorer({
  name: "Price Accuracy",
  description: "商品の価格情報が正確に伝えられているかを評価",
  type: "agent",
  judge: {
    model: "openai/gpt-4o-mini",
    instructions:
      "あなたはECサイトのショッピングアシスタントの回答品質を評価する専門家です。" +
      "商品の価格情報が正確に伝えられているか、誤解を招く表現がないかを評価してください。" +
      "指定されたスキーマに従ったJSONのみを返してください。",
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || "";
    const assistantText = (run.output?.[0]?.content as string) || "";
    return { userText, assistantText };
  })
  .analyze({
    description: "価格情報の正確性と明確性を分析",
    outputSchema: z.object({
      hasPriceInfo: z.boolean().describe("価格情報が含まれているか"),
      isAccurate: z.boolean().describe("価格情報が正確か"),
      isClear: z.boolean().describe("価格表示が明確か"),
      confidence: z.number().min(0).max(1).default(1),
      issues: z.array(z.string()).default([]),
    }),
    createPrompt: ({ results }) => `
      ショッピングアシスタントの価格情報の正確性を評価してください。

      ユーザーの質問:
      """
      ${results.preprocessStepResult.userText}
      """

      アシスタントの回答:
      """
      ${results.preprocessStepResult.assistantText}
      """

      評価ポイント:
      1) 価格情報が含まれているか
      2) 価格が正確に表示されているか（税込/税抜の明示など）
      3) 価格の比較や範囲が明確か
      4) 誤解を招く表現がないか

      以下のJSON形式で回答してください:
      {
        "hasPriceInfo": boolean,
        "isAccurate": boolean,
        "isClear": boolean,
        "confidence": number,
        "issues": string[]
      }
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as Record<string, unknown>)?.analyzeStepResult as {
      hasPriceInfo?: boolean;
      isAccurate?: boolean;
      isClear?: boolean;
      confidence?: number;
    } || {};

    // 価格情報がない場合は評価対象外
    if (!r.hasPriceInfo) return 1;

    let score = 0;
    if (r.isAccurate) score += 0.5;
    if (r.isClear) score += 0.3;
    score += 0.2 * (r.confidence ?? 1);

    return Math.max(0, Math.min(1, score));
  })
  .generateReason(({ results, score }) => {
    const r = (results as Record<string, unknown>)?.analyzeStepResult as {
      hasPriceInfo?: boolean;
      isAccurate?: boolean;
      isClear?: boolean;
      issues?: string[];
    } || {};

    const issues = r.issues?.join(", ") || "なし";
    return `価格情報評価: 含有=${r.hasPriceInfo ?? false}, 正確=${r.isAccurate ?? false}, 明確=${r.isClear ?? false}. スコア=${score}. 問題点: ${issues}`;
  });

/**
 * カスタマーサービス品質スコアラー
 * 接客としての品質（丁寧さ、親切さ、適切な提案）を評価
 */
export const customerServiceQualityScorer = createScorer({
  name: "Customer Service Quality",
  description: "ショッピングアシスタントとしての接客品質を評価",
  type: "agent",
  judge: {
    model: "openai/gpt-4o-mini",
    instructions:
      "あなたはカスタマーサービスの品質評価の専門家です。" +
      "ショッピングアシスタントの回答が、親切で丁寧、かつ顧客のニーズに適切に応えているかを評価してください。" +
      "指定されたスキーマに従ったJSONのみを返してください。",
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || "";
    const assistantText = (run.output?.[0]?.content as string) || "";
    return { userText, assistantText };
  })
  .analyze({
    description: "接客品質の多角的な分析",
    outputSchema: z.object({
      politeness: z.number().min(0).max(1).describe("丁寧さ"),
      helpfulness: z.number().min(0).max(1).describe("親切さ・役立ち度"),
      relevance: z.number().min(0).max(1).describe("質問への適切性"),
      proactiveness: z.number().min(0).max(1).describe("追加提案の積極性"),
      clarity: z.number().min(0).max(1).describe("説明の明確さ"),
      overallFeedback: z.string().default(""),
    }),
    createPrompt: ({ results }) => `
      ショッピングアシスタントの接客品質を評価してください。

      ユーザーの質問:
      """
      ${results.preprocessStepResult.userText}
      """

      アシスタントの回答:
      """
      ${results.preprocessStepResult.assistantText}
      """

      以下の観点で0-1のスコアを付けてください:
      1) politeness: 丁寧さ（敬語、適切な言葉遣い）
      2) helpfulness: 親切さ・役立ち度（ユーザーの問題解決に貢献）
      3) relevance: 質問への適切性（質問に正確に答えている）
      4) proactiveness: 追加提案の積極性（関連情報や代替案の提示）
      5) clarity: 説明の明確さ（わかりやすい説明）

      JSON形式で回答:
      {
        "politeness": number,
        "helpfulness": number,
        "relevance": number,
        "proactiveness": number,
        "clarity": number,
        "overallFeedback": string
      }
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as Record<string, unknown>)?.analyzeStepResult as {
      politeness?: number;
      helpfulness?: number;
      relevance?: number;
      proactiveness?: number;
      clarity?: number;
    } || {};

    // 重み付き平均（relevanceとhelpfulnessを重視）
    const weights = {
      politeness: 0.15,
      helpfulness: 0.3,
      relevance: 0.3,
      proactiveness: 0.1,
      clarity: 0.15,
    };

    const score =
      (r.politeness ?? 0.5) * weights.politeness +
      (r.helpfulness ?? 0.5) * weights.helpfulness +
      (r.relevance ?? 0.5) * weights.relevance +
      (r.proactiveness ?? 0.5) * weights.proactiveness +
      (r.clarity ?? 0.5) * weights.clarity;

    return Math.max(0, Math.min(1, score));
  })
  .generateReason(({ results, score }) => {
    const r = (results as Record<string, unknown>)?.analyzeStepResult as {
      politeness?: number;
      helpfulness?: number;
      relevance?: number;
      proactiveness?: number;
      clarity?: number;
      overallFeedback?: string;
    } || {};

    return `接客品質: 丁寧さ=${r.politeness?.toFixed(2) ?? "N/A"}, 親切さ=${r.helpfulness?.toFixed(2) ?? "N/A"}, 適切性=${r.relevance?.toFixed(2) ?? "N/A"}, 積極性=${r.proactiveness?.toFixed(2) ?? "N/A"}, 明確さ=${r.clarity?.toFixed(2) ?? "N/A"}. 総合スコア=${score.toFixed(2)}. ${r.overallFeedback ?? ""}`;
  });

/**
 * 在庫情報の正確性スコアラー
 * 在庫に関する情報が正確に伝えられているかを評価
 */
export const stockInfoAccuracyScorer = createScorer({
  name: "Stock Info Accuracy",
  description: "在庫情報が正確に伝えられているかを評価",
  type: "agent",
  judge: {
    model: "openai/gpt-4o-mini",
    instructions:
      "在庫情報に関する回答の正確性を評価してください。" +
      "在庫の有無、数量、入荷予定などが適切に伝えられているかを確認してください。",
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || "";
    const assistantText = (run.output?.[0]?.content as string) || "";
    return { userText, assistantText };
  })
  .analyze({
    description: "在庫情報の正確性分析",
    outputSchema: z.object({
      mentionsStock: z.boolean(),
      isAccurate: z.boolean(),
      providesAlternatives: z.boolean(),
      confidence: z.number().min(0).max(1).default(1),
    }),
    createPrompt: ({ results }) => `
      在庫情報に関する回答を評価してください。

      ユーザーの質問:
      """
      ${results.preprocessStepResult.userText}
      """

      アシスタントの回答:
      """
      ${results.preprocessStepResult.assistantText}
      """

      評価ポイント:
      1) 在庫情報に言及しているか
      2) 在庫情報が正確か
      3) 在庫切れの場合、代替案を提示しているか

      JSON形式で回答:
      {
        "mentionsStock": boolean,
        "isAccurate": boolean,
        "providesAlternatives": boolean,
        "confidence": number
      }
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as Record<string, unknown>)?.analyzeStepResult as {
      mentionsStock?: boolean;
      isAccurate?: boolean;
      providesAlternatives?: boolean;
      confidence?: number;
    } || {};

    if (!r.mentionsStock) return 1; // 在庫に言及なしは評価対象外

    let score = 0;
    if (r.isAccurate) score += 0.6;
    if (r.providesAlternatives) score += 0.2;
    score += 0.2 * (r.confidence ?? 1);

    return Math.max(0, Math.min(1, score));
  })
  .generateReason(({ results, score }) => {
    const r = (results as Record<string, unknown>)?.analyzeStepResult as {
      mentionsStock?: boolean;
      isAccurate?: boolean;
      providesAlternatives?: boolean;
    } || {};

    return `在庫情報評価: 言及=${r.mentionsStock ?? false}, 正確=${r.isAccurate ?? false}, 代替提示=${r.providesAlternatives ?? false}. スコア=${score}`;
  });

// スコアラーをまとめてエクスポート
export const shoppingScorers = {
  productSearchAccuracyScorer,
  priceAccuracyScorer,
  customerServiceQualityScorer,
  stockInfoAccuracyScorer,
};
