/**
 * Web Search Tool - Search the internet (LangChain)
 * 
 * Uses Tavily API for AI-optimized search results.
 * Get API key at: https://tavily.com
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export const webSearchTool = new DynamicStructuredTool({
  name: 'web_search',
  description: 'Search the internet for current information. Use when user asks about news, facts, current events, or anything you don\'t know from your training data. Also use for looking up businesses, restaurants, reviews, etc.',
  schema: z.object({
    query: z.string().describe('The search query'),
  }),
  func: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      console.log('⚠️ Web search disabled - no TAVILY_API_KEY');
      return JSON.stringify({
        success: false,
        error: 'Web search is not configured. Add TAVILY_API_KEY to enable.',
      });
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 5,
        }),
      });

      const data = await response.json();

      return JSON.stringify({
        success: true,
        answer: data.answer,
        results: data.results?.slice(0, 3).map(r => ({
          title: r.title,
          snippet: r.content?.substring(0, 200),
          url: r.url,
        })),
      });
    } catch (error) {
      console.error('Web search error:', error);
      return JSON.stringify({
        success: false,
        error: 'Failed to search the web',
      });
    }
  },
});
