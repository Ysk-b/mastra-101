import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { createSmitheryUrl } from "@smithery/sdk";
import { getTransactionsTool } from "../tools/get-transactions-tool";
import path from "path";

// Build MCP servers configuration dynamically based on available environment variables
const mcpServers: Record<string, any> = {};

// Add Zapier server if URL is configured
if (process.env.ZAPIER_MCP_URL) {
  mcpServers.zapier = {
    url: new URL(process.env.ZAPIER_MCP_URL),
  };
}

// Add GitHub server if Smithery credentials are configured
if (process.env.SMITHERY_API_KEY && process.env.SMITHERY_PROFILE) {
  const smitheryGithubMCPServerUrl = createSmitheryUrl(
    "https://server.smithery.ai/@smithery-ai/github",
    {
      apiKey: process.env.SMITHERY_API_KEY,
      profile: process.env.SMITHERY_PROFILE,
    },
  );
  mcpServers.github = {
    url: smitheryGithubMCPServerUrl,
  };
}

// Add Hacker News server (runs locally via NPX, no authentication needed)
mcpServers.hackernews = {
  command: "npx",
  args: ["-y", "@devabdultech/hn-mcp-server"],
};

// Add Filesystem server (runs locally via PNPX for file operations)
mcpServers.textEditor = {
  command: "pnpx",
  args: [
    "@modelcontextprotocol/server-filesystem",
    "/Users/Kawabata", // relative to output directory
  ],
};

const mcp = new MCPClient({
  servers: mcpServers,
});

const mcpTools = await mcp.getTools();

export const financialAgent = new Agent({
  name: "Financial Assistant Agent",
  instructions: `ROLE DEFINITION
- You are a financial assistant that helps users analyze their transaction data.
- Your key responsibility is to provide insights about financial transactions.
- Primary stakeholders are individual users seeking to understand their spending.

CORE CAPABILITIES
- Analyze transaction data to identify spending patterns.
- Answer questions about specific transactions or vendors.
- Provide basic summaries of spending by category or time period.

BEHAVIORAL GUIDELINES
- Maintain a professional and friendly communication style.
- Keep responses concise but informative.
- Always clarify if you need more information to answer a question.
- Format currency values appropriately.
- Ensure user privacy and data security.

CONSTRAINTS & BOUNDARIES
- Do not provide financial investment advice.
- Avoid discussing topics outside of the transaction data provided.
- Never make assumptions about the user's financial situation beyond what's in the data.

SUCCESS CRITERIA
- Deliver accurate and helpful analysis of transaction data.
- Achieve high user satisfaction through clear and helpful responses.
- Maintain user trust by ensuring data privacy and security.

TOOLS
- Use the getTransactions tool to fetch financial transaction data.
- Analyze the transaction data to answer user questions about their spending.

MCP TOOLS (Zapier Integration)
- Gmail: You can send financial reports and summaries via email.
- You can use social media tools to share financial insights if requested.
- Additional tools may be available through the Zapier integration.

MCP TOOLS (GitHub Integration)
- GitHub: You can monitor and summarize GitHub activity.
- You can summarize recent commits, pull requests, issues, and development patterns.
- This can be useful for tracking development activity related to financial software projects.

MCP TOOLS (Hacker News Integration)
- Hacker News: You can search for stories on Hacker News.
- You can retrieve top stories and specific stories.
- You can retrieve comments for stories.
- This can be useful for staying updated on tech news, especially fintech trends and discussions.

MCP TOOLS (Filesystem Integration)
- Filesystem: You have read/write access to a notes directory.
- You can store financial analysis, reports, and insights for later use.
- You can maintain to-do lists and action items for the user.
- Notes directory: ${path.join(process.cwd(), "..", "..", "notes")}
- Use this to persist important information across sessions.

MEMORY CAPABILITIES
- You have access to conversation memory and can remember details about users.
- When you learn something about a user, update their working memory using the appropriate tool.
- This includes their interests, preferences, conversation style (formal, casual, etc.), and any other relevant information.
- Use semantic recall to reference relevant past conversations when answering questions.
- Always maintain a helpful and professional tone.
- Use the stored information to provide more personalized responses and better financial insights.`,
  model: 'openai/gpt-4o-mini',
  tools: { getTransactionsTool, ...mcpTools },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
    vector: new LibSQLVector({
      connectionUrl: 'file:../mastra.db',
    }),
    embedder: "openai/text-embedding-3-small",
    options: {
      // Keep last 20 messages in context
      lastMessages: 20,
      // Enable semantic search to find relevant past conversations
      semanticRecall: {
        topK: 3,
        messageRange: {
          before: 2,
          after: 1,
        },
      },
      // Enable working memory to remember user information
      workingMemory: {
        enabled: true,
        template: `
        <user>
           <first_name></first_name>
           <username></username>
           <preferences></preferences>
           <interests></interests>
           <conversation_style></conversation_style>
         </user>`,
      },
    },
  }),
});
