/**
 * ショッピングアシスタント用ツール
 *
 * ECサイトの商品検索・詳細取得に使用するツール群
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 商品データ型定義
const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  stock: z.number(),
});

export type Product = z.infer<typeof productSchema>;

// サンプル商品データ（実際のアプリケーションではDBやAPIから取得）
export const sampleProducts: Product[] = [
  {
    id: "1",
    name: "ワイヤレスイヤホン Pro",
    description: "高音質ノイズキャンセリング搭載、最大30時間再生可能なプレミアムイヤホン",
    price: 15800,
    category: "オーディオ",
    stock: 25,
  },
  {
    id: "2",
    name: "スマートウォッチ X1",
    description: "心拍数モニター、GPS機能搭載のフィットネストラッカー",
    price: 24900,
    category: "ウェアラブル",
    stock: 18,
  },
  {
    id: "3",
    name: "ノートパソコンスタンド",
    description: "人間工学に基づいた調整可能なアルミニウム製スタンド",
    price: 4980,
    category: "アクセサリー",
    stock: 42,
  },
  {
    id: "4",
    name: "4Kウェブカメラ",
    description: "オートフォーカス、広角レンズ搭載のプロフェッショナルウェブカメラ",
    price: 8900,
    category: "PC周辺機器",
    stock: 15,
  },
  {
    id: "5",
    name: "メカニカルキーボード RGB",
    description: "タクタイルスイッチ、カスタマイズ可能なRGBバックライト",
    price: 12800,
    category: "PC周辺機器",
    stock: 30,
  },
  {
    id: "6",
    name: "ポータブル充電器 20000mAh",
    description: "急速充電対応、2ポート搭載の大容量モバイルバッテリー",
    price: 3980,
    category: "アクセサリー",
    stock: 50,
  },
  {
    id: "7",
    name: "ゲーミングマウス Pro",
    description: "16000DPI、プログラマブルボタン搭載のゲーミングマウス",
    price: 6800,
    category: "PC周辺機器",
    stock: 22,
  },
  {
    id: "8",
    name: "Bluetoothスピーカー",
    description: "360度サウンド、防水IPX7対応のポータブルスピーカー",
    price: 5900,
    category: "オーディオ",
    stock: 35,
  },
];

/**
 * 商品検索ツール
 * カテゴリー、価格範囲、キーワードで商品を絞り込み検索
 */
export const searchProductsTool = createTool({
  id: "search-products",
  description: "商品を検索します。カテゴリー、価格範囲、キーワードで絞り込みができます",
  inputSchema: z.object({
    keyword: z.string().optional().describe("検索キーワード"),
    category: z.string().optional().describe("カテゴリー名"),
    maxPrice: z.number().optional().describe("最大価格"),
    minPrice: z.number().optional().describe("最小価格"),
  }),
  outputSchema: z.object({
    products: z.array(productSchema),
    totalCount: z.number(),
  }),
  execute: async ({ context }) => {
    let filtered = [...sampleProducts];

    // キーワードフィルター
    if (context.keyword) {
      const keyword = context.keyword.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword) ||
          p.category.toLowerCase().includes(keyword)
      );
    }

    // カテゴリーフィルター
    if (context.category) {
      filtered = filtered.filter((p) =>
        p.category.toLowerCase().includes(context.category!.toLowerCase())
      );
    }

    // 価格フィルター
    if (context.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= context.minPrice!);
    }
    if (context.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= context.maxPrice!);
    }

    return {
      products: filtered,
      totalCount: filtered.length,
    };
  },
});

/**
 * 商品詳細取得ツール
 * 特定の商品IDから詳細情報を取得
 */
export const getProductDetailTool = createTool({
  id: "get-product-detail",
  description: "特定の商品の詳細情報を取得します",
  inputSchema: z.object({
    productId: z.string().describe("商品ID"),
  }),
  outputSchema: z.object({
    product: productSchema.nullable(),
    found: z.boolean(),
  }),
  execute: async ({ context }) => {
    const product = sampleProducts.find((p) => p.id === context.productId);
    return {
      product: product || null,
      found: !!product,
    };
  },
});

/**
 * カテゴリー一覧取得ツール
 * 利用可能なカテゴリーの一覧を取得
 */
export const getCategoriesList = createTool({
  id: "get-categories",
  description: "利用可能な商品カテゴリーの一覧を取得します",
  inputSchema: z.object({}),
  outputSchema: z.object({
    categories: z.array(z.object({
      name: z.string(),
      productCount: z.number(),
    })),
  }),
  execute: async () => {
    const categoryMap = new Map<string, number>();

    for (const product of sampleProducts) {
      const count = categoryMap.get(product.category) || 0;
      categoryMap.set(product.category, count + 1);
    }

    const categories = Array.from(categoryMap.entries()).map(([name, productCount]) => ({
      name,
      productCount,
    }));

    return { categories };
  },
});

/**
 * 在庫確認ツール
 * 商品の在庫状況を確認
 */
export const checkStockTool = createTool({
  id: "check-stock",
  description: "商品の在庫状況を確認します",
  inputSchema: z.object({
    productId: z.string().describe("商品ID"),
    quantity: z.number().optional().describe("必要な数量（デフォルト: 1）"),
  }),
  outputSchema: z.object({
    productId: z.string(),
    productName: z.string(),
    currentStock: z.number(),
    requestedQuantity: z.number(),
    isAvailable: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const product = sampleProducts.find((p) => p.id === context.productId);
    const requestedQuantity = context.quantity || 1;

    if (!product) {
      return {
        productId: context.productId,
        productName: "不明",
        currentStock: 0,
        requestedQuantity,
        isAvailable: false,
        message: "商品が見つかりません",
      };
    }

    const isAvailable = product.stock >= requestedQuantity;

    return {
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      requestedQuantity,
      isAvailable,
      message: isAvailable
        ? `在庫あり（${product.stock}個）`
        : `在庫不足（残り${product.stock}個、${requestedQuantity - product.stock}個不足）`,
    };
  },
});

// ツールをまとめてエクスポート
export const shoppingTools = {
  searchProducts: searchProductsTool,
  getProductDetail: getProductDetailTool,
  getCategories: getCategoriesList,
  checkStock: checkStockTool,
};
