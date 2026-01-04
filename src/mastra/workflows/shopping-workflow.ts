/**
 * ショッピングワークフロー
 *
 * 商品推薦から購入提案までの一連のフローを自動化
 */
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { sampleProducts, type Product } from "../tools/shopping-tools";

// 商品スキーマ
const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  stock: z.number(),
});

// ユーザーの好み分析結果スキーマ
const userPreferencesSchema = z.object({
  priceRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  preferredCategories: z.array(z.string()),
  keywords: z.array(z.string()),
  priorityFactors: z.array(z.enum(["price", "quality", "popularity", "stock"])),
});

// 推薦結果スキーマ
const recommendationResultSchema = z.object({
  recommendations: z.array(productSchema),
  reasoning: z.string(),
  totalFound: z.number(),
});

/**
 * Step 1: ユーザーの要望を分析
 */
const analyzeUserRequest = createStep({
  id: "analyze-user-request",
  description: "ユーザーの要望を分析し、検索条件を抽出",
  inputSchema: z.object({
    userMessage: z.string().describe("ユーザーからのメッセージ"),
  }),
  outputSchema: userPreferencesSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const agent = mastra?.getAgent("shoppingAssistantAgent");
    if (!agent) {
      throw new Error("Shopping assistant agent not found");
    }

    const prompt = `
      以下のユーザーメッセージを分析し、商品検索の条件をJSON形式で抽出してください。

      ユーザーメッセージ: "${inputData.userMessage}"

      以下のJSON形式で回答してください（説明不要、JSONのみ）:
      {
        "priceRange": { "min": number or null, "max": number or null },
        "preferredCategories": ["カテゴリー名", ...],
        "keywords": ["キーワード", ...],
        "priorityFactors": ["price" | "quality" | "popularity" | "stock", ...]
      }

      利用可能なカテゴリー: オーディオ, ウェアラブル, アクセサリー, PC周辺機器
    `;

    const response = await agent.generate([
      { role: "user", content: prompt },
    ]);

    const textContent = response.text || "";

    try {
      // JSONを抽出してパース
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("JSON not found in response");
      }
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        priceRange: {
          min: parsed.priceRange?.min ?? undefined,
          max: parsed.priceRange?.max ?? undefined,
        },
        preferredCategories: parsed.preferredCategories || [],
        keywords: parsed.keywords || [],
        priorityFactors: parsed.priorityFactors || ["quality"],
      };
    } catch {
      // パース失敗時はデフォルト値を返す
      return {
        priceRange: {
          min: undefined,
          max: undefined,
        },
        preferredCategories: [] as string[],
        keywords: [inputData.userMessage],
        priorityFactors: ["quality"] as ("price" | "quality" | "popularity" | "stock")[],
      };
    }
  },
});

/**
 * Step 2: 商品を検索・フィルタリング
 */
const searchAndFilter = createStep({
  id: "search-and-filter",
  description: "分析結果に基づいて商品を検索・フィルタリング",
  inputSchema: userPreferencesSchema,
  outputSchema: z.object({
    filteredProducts: z.array(productSchema),
    totalMatched: z.number(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Preferences not found");
    }

    let products: Product[] = [...sampleProducts];

    // カテゴリーフィルター
    if (inputData.preferredCategories.length > 0) {
      products = products.filter((p) =>
        inputData.preferredCategories.some((cat) =>
          p.category.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    // 価格フィルター
    if (inputData.priceRange.min !== undefined) {
      products = products.filter((p) => p.price >= inputData.priceRange.min!);
    }
    if (inputData.priceRange.max !== undefined) {
      products = products.filter((p) => p.price <= inputData.priceRange.max!);
    }

    // キーワードフィルター
    if (inputData.keywords.length > 0) {
      const keywordFiltered = products.filter((p) =>
        inputData.keywords.some(
          (kw) =>
            p.name.toLowerCase().includes(kw.toLowerCase()) ||
            p.description.toLowerCase().includes(kw.toLowerCase())
        )
      );
      // キーワードマッチがあればそれを優先、なければ全商品を維持
      if (keywordFiltered.length > 0) {
        products = keywordFiltered;
      }
    }

    // 優先度に基づいてソート
    const priorityFactor = inputData.priorityFactors[0] || "quality";
    switch (priorityFactor) {
      case "price":
        products.sort((a, b) => a.price - b.price);
        break;
      case "stock":
        products.sort((a, b) => b.stock - a.stock);
        break;
      case "popularity":
      case "quality":
      default:
        // デフォルトは価格の高い順（品質の代理指標として）
        products.sort((a, b) => b.price - a.price);
        break;
    }

    return {
      filteredProducts: products.slice(0, 5), // 上位5件を返す
      totalMatched: products.length,
    };
  },
});

/**
 * Step 3: 推薦コメントを生成
 */
const generateRecommendation = createStep({
  id: "generate-recommendation",
  description: "フィルタリング結果から推薦コメントを生成",
  inputSchema: z.object({
    filteredProducts: z.array(productSchema),
    totalMatched: z.number(),
  }),
  outputSchema: recommendationResultSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Filtered products not found");
    }

    const agent = mastra?.getAgent("shoppingAssistantAgent");
    if (!agent) {
      throw new Error("Shopping assistant agent not found");
    }

    if (inputData.filteredProducts.length === 0) {
      return {
        recommendations: [],
        reasoning:
          "申し訳ございません。ご条件に合う商品が見つかりませんでした。条件を変更してお試しください。",
        totalFound: 0,
      };
    }

    const prompt = `
      以下の商品リストから、お客様への推薦コメントを生成してください。
      各商品の特徴と、なぜおすすめなのかを簡潔に説明してください。

      商品リスト:
      ${JSON.stringify(inputData.filteredProducts, null, 2)}

      推薦コメントのみを日本語で回答してください（JSON不要）。
      形式:
      - 全体の概要（1-2文）
      - 各商品の推薦ポイント（箇条書き）
    `;

    const response = await agent.generate([
      { role: "user", content: prompt },
    ]);

    return {
      recommendations: inputData.filteredProducts,
      reasoning: response.text || "商品を選定しました。",
      totalFound: inputData.totalMatched,
    };
  },
});

/**
 * 商品推薦ワークフロー
 * ユーザーの要望から商品を推薦するまでの一連の処理
 */
const productRecommendationWorkflow = createWorkflow({
  id: "product-recommendation-workflow",
  inputSchema: z.object({
    userMessage: z.string().describe("ユーザーからの商品に関するメッセージ"),
  }),
  outputSchema: recommendationResultSchema,
})
  .then(analyzeUserRequest)
  .then(searchAndFilter)
  .then(generateRecommendation);

productRecommendationWorkflow.commit();

/**
 * 在庫確認ワークフロー
 * 商品の在庫状況を確認し、代替案を提示
 */
const checkStockStep = createStep({
  id: "check-stock",
  description: "商品の在庫状況を確認",
  inputSchema: z.object({
    productId: z.string().describe("商品ID"),
    quantity: z.number().optional().describe("必要数量"),
  }),
  outputSchema: z.object({
    productId: z.string(),
    productName: z.string(),
    currentStock: z.number(),
    isAvailable: z.boolean(),
    alternatives: z.array(productSchema),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const product = sampleProducts.find((p) => p.id === inputData.productId);
    const requestedQty = inputData.quantity || 1;

    if (!product) {
      return {
        productId: inputData.productId,
        productName: "不明",
        currentStock: 0,
        isAvailable: false,
        alternatives: [],
      };
    }

    const isAvailable = product.stock >= requestedQty;

    // 在庫が不足している場合、同カテゴリーの代替商品を提案
    let alternatives: Product[] = [];
    if (!isAvailable) {
      alternatives = sampleProducts
        .filter(
          (p) =>
            p.id !== product.id &&
            p.category === product.category &&
            p.stock >= requestedQty
        )
        .slice(0, 3);
    }

    return {
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      isAvailable,
      alternatives,
    };
  },
});

const stockCheckWorkflow = createWorkflow({
  id: "stock-check-workflow",
  inputSchema: z.object({
    productId: z.string().describe("商品ID"),
    quantity: z.number().optional().describe("必要数量"),
  }),
  outputSchema: z.object({
    productId: z.string(),
    productName: z.string(),
    currentStock: z.number(),
    isAvailable: z.boolean(),
    alternatives: z.array(productSchema),
  }),
}).then(checkStockStep);

stockCheckWorkflow.commit();

export { productRecommendationWorkflow, stockCheckWorkflow };
