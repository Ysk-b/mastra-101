
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { contentWorkflow, aiContentWorkflow, parallelAnalysisWorkflow, conditionalWorkflow } from './workflows/content-workflow';
import { weatherAgent } from './agents/weather-agent';
import { financialAgent } from './agents/financial-agent';
import { memoryAgent } from './agents';
import { learningAssistantAgent } from './agents/learning-assistant';
import { contentAgent } from './agents/content-agent';
import { shoppingAssistantAgent } from './agents/shopping-assistant';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, contentWorkflow, aiContentWorkflow, parallelAnalysisWorkflow, conditionalWorkflow },
  agents: { weatherAgent, financialAgent, memoryAgent, learningAssistantAgent, contentAgent, shoppingAssistantAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true },
  },
});
