import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 商品検索ツール
const searchProductsTool = createTool({
  id: "search-products",
  description: "商品を検索します。カテゴリー、価格範囲、キーワードで絞り込みができます",
  inputSchema: z.object({
    keyword: z.string().optional().describe("検索キーワード"),
    category: z.string().optional().describe("カテゴリー名"),
    maxPrice: z.number().optional().describe("最大価格"),
    minPrice: z.number().optional().describe("最小価格"),
  }),
  outputSchema: z.object({
    products: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        category: z.string(),
        stock: z.number(),
      })
    ),
  }),
  execute: async ({ context }) => {
    // 実際のアプリケーションでは、ここでデータベースやAPIを呼び出します
    // このデモでは、サンプルデータを返します
    const allProducts = [
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

    let filtered = allProducts;

    // キーワードフィルター
    if (context.keyword) {
      const keyword = context.keyword.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword)
      );
    }

    // カテゴリーフィルター
    if (context.category) {
      filtered = filtered.filter((p) => p.category === context.category);
    }

    // 価格フィルター
    if (context.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= context.minPrice!);
    }
    if (context.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= context.maxPrice!);
    }

    return { products: filtered };
  },
});

// 商品詳細取得ツール
const getProductDetailTool = createTool({
  id: "get-product-detail",
  description: "特定の商品の詳細情報を取得します",
  inputSchema: z.object({
    productId: z.string().describe("商品ID"),
  }),
  outputSchema: z.object({
    product: z
      .object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        category: z.string(),
        stock: z.number(),
      })
      .nullable(),
  }),
  execute: async ({ context }) => {
    const allProducts = [
      {
        id: "1",
        name: "ワイヤレスイヤホン Pro",
        description:
          "高音質ノイズキャンセリング搭載、最大30時間再生可能なプレミアムイヤホン",
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
        description:
          "オートフォーカス、広角レンズ搭載のプロフェッショナルウェブカメラ",
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

    const product = allProducts.find((p) => p.id === context.productId);
    return { product: product || null };
  },
});

export const shoppingAssistantAgent = new Agent({
  name: "Shopping Assistant",
  description: "お客様のショッピングをサポートするAIアシスタント",
  instructions: `
    あなたは親切で知識豊富なショッピングアシスタントです。

    役割:
    - お客様の質問に丁寧に答える
    - 商品の検索と推奨を行う
    - 商品の特徴や価格を説明する
    - お客様のニーズに合った商品を提案する

    ガイドライン:
    - 常に親切で丁寧な対応を心がける
    - 商品の利点と欠点を正直に伝える
    - お客様の予算を尊重する
    - 必要に応じて複数の選択肢を提示する
    - 在庫状況も考慮して提案する

    利用可能なツール:
    - search-products: 商品を検索する
    - get-product-detail: 商品の詳細情報を取得する
  `,
  model: "openai/gpt-4o-mini",
  tools: {
    searchProducts: searchProductsTool,
    getProductDetail: getProductDetailTool,
  },
});
