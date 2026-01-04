/**
 * Mastra インスタンス設定
 *
 * ショッピングアシスタント専用の設定
 */

import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";

// Workflows
import {
  productRecommendationWorkflow,
  stockCheckWorkflow,
} from "./workflows/shopping-workflow";

// Agents
import { shoppingAssistantAgent } from "./agents/shopping-assistant";

// Scorers
import {
  productSearchAccuracyScorer,
  priceAccuracyScorer,
  customerServiceQualityScorer,
  stockInfoAccuracyScorer,
} from "./scorers/shopping-scorer";

export const mastra = new Mastra({
  workflows: {
    productRecommendationWorkflow,
    stockCheckWorkflow,
  },
  agents: {
    shoppingAssistantAgent,
  },
  scorers: {
    productSearchAccuracyScorer,
    priceAccuracyScorer,
    customerServiceQualityScorer,
    stockInfoAccuracyScorer,
  },
  storage: new LibSQLStore({
    // メモリ内ストレージ（永続化する場合は file:../mastra.db に変更）
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: {
    // AIトレーシングを有効化
    default: { enabled: true },
  },
});
