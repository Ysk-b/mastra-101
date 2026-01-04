/**
 * チャットAPI Route - Mastraとの連携ポイント
 *
 * このファイルがフロントエンド（ChatWidget）とMastraエージェントを繋ぐ橋渡しをしています。
 *
 * 【全体の流れ】
 * 1. ユーザーがチャットウィジェットでメッセージ送信
 * 2. useChat が POST /api/chat にリクエスト送信
 * 3. この route.ts の POST 関数が実行される
 * 4. Mastraエージェントを取得して AI に処理を依頼
 * 5. ストリーミング形式でレスポンスを返す
 * 6. useChat が自動的に受け取ってUIを更新
 */

import { mastra } from "@/../src/mastra";
import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30; // 最大実行時間30秒

export async function POST(req: Request) {
  try {
    /**
     * 1. リクエストから会話履歴を取得
     *
     * useChatは新しいUIMessage形式でメッセージを送信します：
     * messages: [
     *   { id: "...", role: "user", parts: [{ type: "text", text: "1万円以下の商品を教えて" }] },
     *   { id: "...", role: "assistant", parts: [{ type: "text", text: "商品を検索します..." }] },
     *   ...
     * ]
     *
     * これを streamText が期待する形式に変換：
     * [
     *   { role: "user", content: "1万円以下の商品を教えて" },
     *   { role: "assistant", content: "商品を検索します..." },
     *   ...
     * ]
     */
    const { messages: uiMessages } = await req.json();

    // UIMessage形式から streamText 用の形式に変換
    const messages = uiMessages.map((msg: any) => ({
      role: msg.role,
      content: msg.parts
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("") || "",
    }));

    /**
     * 2. Mastraからショッピングアシスタントエージェントを取得
     *
     * このエージェントは /src/mastra/agents/shopping-assistant.ts で定義されており：
     * - 商品検索ツール (searchProducts)
     * - 商品詳細取得ツール (getProductDetail)
     * を持っています。
     */
    const agent = mastra.getAgent("shoppingAssistantAgent");

    if (!agent) {
      return new Response("Agent not found", { status: 404 });
    }

    /**
     * 3. AI SDK の streamText を使用してストリーミングレスポンスを生成
     *
     * 引数の説明：
     * - model: 使用するAIモデル (gpt-4o-mini)
     * - messages: 会話履歴（ユーザーとAIのやり取り）
     * - tools: Mastraエージェントが持つツール群
     *   → AIは必要に応じて自動的にこれらのツールを呼び出します
     *   → 例: 「1万円以下の商品」→ searchProducts ツールを実行
     * - system: エージェントの指示（役割や振る舞い）
     *
     * 【ツールの自動実行の仕組み】
     * AIモデルは会話の文脈から「ツールを使う必要がある」と判断すると、
     * 自動的にツールを呼び出します。例えば：
     *
     * ユーザー: "1万円以下の商品を教えて"
     * → AI: searchProducts({ maxPrice: 10000 }) を実行
     * → ツールが商品リストを返す
     * → AI: その結果をもとに自然な日本語で回答
     */
    // エージェントの指示を取得（非同期対応）
    const instructions = await agent.getInstructions();
    const systemPrompt = Array.isArray(instructions) ? instructions.join("\n") : instructions;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
      tools: agent.getTools() as any, // Mastraエージェントのツールを取得（非推奨警告対応）
      system: systemPrompt as string,  // エージェントの指示を渡す
      stopWhen: stepCountIs(5), // ツール実行後に応答を生成（最大5ステップ）
    });

    /**
     * 4. ストリーミング形式でレスポンスを返す
     *
     * toTextStreamResponse() は：
     * - AIの応答を少しずつストリーミングで送信
     * - フロントエンドで即座に表示開始できる（UX向上）
     * - 長い応答でもユーザーを待たせない
     */
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
