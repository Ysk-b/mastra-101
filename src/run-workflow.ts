/**
 * ワークフロー実行スクリプト
 *
 * ショッピングワークフローをプログラムから実行するサンプル
 */
import { mastra } from "./mastra";

async function runProductRecommendationWorkflow() {
  console.log("🛒 商品推薦ワークフローを実行中...\n");

  try {
    // ワークフローインスタンスを取得
    const workflow = mastra.getWorkflow("productRecommendationWorkflow");

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // 実行インスタンスを作成
    const run = await workflow.createRunAsync();

    // テストデータで実行
    const result = await run.start({
      inputData: {
        userMessage: "1万円以下でPC周辺機器を探しています",
      },
    });

    if (result.status === "success") {
      console.log("✅ 成功！\n");
      console.log("📦 見つかった商品数:", result.result.totalFound);
      console.log("\n🎯 推薦商品:");
      for (const product of result.result.recommendations) {
        console.log(`  - ${product.name}: ¥${product.price.toLocaleString()}`);
      }
      console.log("\n💬 推薦コメント:");
      console.log(result.result.reasoning);
    } else {
      console.log("❌ 失敗:", result.status);
    }
  } catch (error) {
    console.error("❌ エラー:", (error as Error).message);
  }
}

async function runStockCheckWorkflow() {
  console.log("\n📦 在庫確認ワークフローを実行中...\n");

  try {
    const workflow = mastra.getWorkflow("stockCheckWorkflow");

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const run = await workflow.createRunAsync();

    const result = await run.start({
      inputData: {
        productId: "4", // 4Kウェブカメラ
        quantity: 10,
      },
    });

    if (result.status === "success") {
      console.log("✅ 成功！\n");
      console.log("📦 商品名:", result.result.productName);
      console.log("📊 現在の在庫:", result.result.currentStock);
      console.log("✅ 在庫あり:", result.result.isAvailable ? "はい" : "いいえ");

      if (result.result.alternatives.length > 0) {
        console.log("\n🔄 代替商品:");
        for (const alt of result.result.alternatives) {
          console.log(`  - ${alt.name}: ¥${alt.price.toLocaleString()} (在庫: ${alt.stock})`);
        }
      }
    }
  } catch (error) {
    console.error("❌ エラー:", (error as Error).message);
  }
}

// ワークフローを実行
async function main() {
  await runProductRecommendationWorkflow();
  await runStockCheckWorkflow();
}

main();
