/**
 * Tool Template - LangChain Edition
 * 
 * Copy this to create new tools!
 * 
 * Steps:
 * 1. Copy this file and rename it (e.g., weather.js)
 * 2. Define your schema with Zod
 * 3. Implement the func
 * 4. Import and add to tools/index.js
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Example: Weather Tool
 */
export const weatherTool = new DynamicStructuredTool({
  // Unique name - used by the AI to call this tool
  name: 'get_weather',

  // Description - VERY IMPORTANT! The AI reads this to decide when to use your tool
  // Be specific about WHEN to use it
  description: `Get current weather for a city. 
    Use when user asks about weather, temperature, forecast, or "is it going to rain".
    Also use when user is planning outdoor activities and might need weather info.`,

  // Schema - defines the parameters using Zod
  // The AI will extract these from the user's message
  schema: z.object({
    city: z.string().describe('The city name to get weather for'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('fahrenheit')
      .describe('Temperature units'),
  }),

  // The actual implementation
  func: async ({ city, units }) => {
    try {
      // Your logic here - call an API, query a database, etc.
      console.log(`🌤️ Getting weather for ${city}`);

      // Example API call:
      // const response = await fetch(`https://api.weather.com/v1/current?city=${city}&key=${process.env.WEATHER_API_KEY}`);
      // const data = await response.json();

      // For demo, return mock data
      const mockData = {
        city,
        temperature: units === 'celsius' ? 22 : 72,
        units,
        conditions: 'Sunny',
        humidity: 45,
      };

      // IMPORTANT: Always return JSON.stringify()
      // The AI will parse this to formulate a response
      return JSON.stringify({
        success: true,
        ...mockData,
      });
    } catch (error) {
      // Handle errors gracefully
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  },
});

/**
 * After creating your tool:
 * 
 * 1. Open tools/index.js
 * 
 * 2. Import your tool:
 *    import { weatherTool } from './weather.js';
 * 
 * 3. Add to the tools array:
 *    export const tools = [
 *      ...existingTools,
 *      weatherTool,
 *    ];
 * 
 * That's it! The AI will now use your tool when appropriate.
 */

/**
 * Pro Tips:
 * 
 * 1. DESCRIPTION IS KEY
 *    The AI decides which tool to use based on the description.
 *    Be specific about scenarios when it should be used.
 * 
 * 2. ZOD DESCRIPTIONS
 *    Each parameter's .describe() helps the AI understand what to extract
 *    from the user's message.
 * 
 * 3. ALWAYS RETURN JSON
 *    Use JSON.stringify() for your return value.
 *    The AI parses this to formulate a natural response.
 * 
 * 4. HANDLE ERRORS
 *    Return { success: false, error: "message" } instead of throwing.
 *    The AI will tell the user something went wrong.
 * 
 * 5. LOG FOR DEBUGGING
 *    console.log() with emojis makes logs easy to scan.
 */
