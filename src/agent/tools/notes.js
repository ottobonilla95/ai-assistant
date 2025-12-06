/**
 * Notes Tool - Save and retrieve quick notes (LangChain)
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { format } from 'date-fns';

// In-memory store (replace with database!)
const notes = new Map();

const saveNoteTool = new DynamicStructuredTool({
  name: 'save_note',
  description: 'Save a quick note or piece of information for later. Use when user says "remember this", "note that", "save this", or wants to jot something down.',
  schema: z.object({
    content: z.string().describe('The note content to save'),
    tags: z.array(z.string()).optional().describe('Optional tags to categorize the note (e.g., ["shopping", "urgent"])'),
  }),
  func: async ({ content, tags = [] }) => {
    try {
      const noteId = `note_${Date.now()}`;

      const note = {
        id: noteId,
        content,
        tags,
        createdAt: new Date(),
      };

      notes.set(noteId, note);

      console.log(`📝 Note saved: "${content.substring(0, 50)}..."`);

      return JSON.stringify({
        success: true,
        noteId,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        tags,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

const getNotesTool = new DynamicStructuredTool({
  name: 'get_notes',
  description: 'Retrieve saved notes. Use when user asks about their notes, wants to recall something they saved, or asks "what did I note about X".',
  schema: z.object({
    tag: z.string().optional().describe('Filter notes by this tag'),
    limit: z.number().optional().default(5).describe('Maximum number of notes to return (default 5)'),
  }),
  func: async ({ tag, limit = 5 }) => {
    try {
      let allNotes = Array.from(notes.values());

      // Filter by tag if provided
      if (tag) {
        allNotes = allNotes.filter(n => n.tags.includes(tag.toLowerCase()));
      }

      // Sort by most recent and limit
      allNotes = allNotes
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);

      return JSON.stringify({
        noteCount: allNotes.length,
        notes: allNotes.map(n => ({
          content: n.content,
          tags: n.tags,
          createdAt: format(n.createdAt, 'MMM d, h:mm a'),
        })),
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

export const notesTools = [saveNoteTool, getNotesTool];
