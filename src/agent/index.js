import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { tools } from './tools/index.js';

// Lazy-load agent (created on first use, after env vars are loaded)
let agent = null;

function getAgent() {
  if (!agent) {
    const model = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
    });

    agent = createReactAgent({
      llm: model,
      tools: tools,
    });
  }
  return agent;
}

function getSystemPrompt() {
  const TIMEZONE = process.env.TIMEZONE || 'America/New_York';
  return `You are a helpful personal assistant on WhatsApp. You help the user manage their life.

You have access to various tools. Use them when appropriate. You can use multiple tools in sequence if needed.

When the user asks you to do something:
1. Figure out which tool(s) you need
2. Call them with the right parameters  
3. Respond naturally based on the results

Be conversational, friendly, and helpful. Use emojis occasionally.

Current date/time: ${new Date().toISOString()}
User's timezone: ${TIMEZONE}`;
}

/**
 * Run the agent with a user message
 */
export async function runAgent(userMessage, context = {}) {
  console.log(`\n🤖 Agent processing: "${userMessage}"`);

  try {
    // Build message history
    const messages = [new SystemMessage(getSystemPrompt())];

    // Add conversation history if provided
    if (context.history && context.history.length > 0) {
      for (const msg of context.history.slice(-10)) {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      }
    }

    // Add current message
    messages.push(new HumanMessage(userMessage));

    // Invoke the agent
    const result = await getAgent().invoke({
      messages: messages,
    });

    // Extract the final response
    const finalMessage = result.messages[result.messages.length - 1];
    const response = finalMessage.content || "I've completed the task!";

    console.log(`💬 Agent response: "${response.substring(0, 100)}..."`);

    return response;
  } catch (error) {
    console.error('Agent error:', error);
    throw error;
  }
}
