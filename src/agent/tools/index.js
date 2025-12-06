/**
 * Tools Registry - LangChain Edition
 * 
 * All tools are registered here using LangChain's DynamicStructuredTool
 */

import { calendarTools } from './calendar.js';
import { reminderTool } from './reminder.js';
import { notesTools } from './notes.js';
import { webSearchTool } from './webSearch.js';

// Export all tools as an array for LangChain
export const tools = [
  ...calendarTools,
  reminderTool,
  ...notesTools,
  webSearchTool,
];

// Helper to list available tools
export function listTools() {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
  }));
}
