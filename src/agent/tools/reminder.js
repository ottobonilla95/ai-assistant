/**
 * Reminder Tool - Schedule future WhatsApp messages (LangChain)
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { addMinutes, addHours, addDays, format } from 'date-fns';

// In-memory store (replace with database in production!)
const reminders = new Map();

export const reminderTool = new DynamicStructuredTool({
  name: 'set_reminder',
  description: 'Set a reminder to send a WhatsApp message at a future time. Use when user says "remind me", "don\'t let me forget", or wants a notification about something later.',
  schema: z.object({
    message: z.string().describe('The reminder message to send'),
    delayMinutes: z.number().optional().describe('Minutes from now to send the reminder'),
    delayHours: z.number().optional().describe('Hours from now to send the reminder'),
    delayDays: z.number().optional().describe('Days from now to send the reminder'),
    specificTime: z.string().optional().describe('Specific date/time in ISO format (alternative to delay)'),
  }),
  func: async ({ message, delayMinutes, delayHours, delayDays, specificTime }) => {
    try {
      let triggerAt;

      if (specificTime) {
        triggerAt = new Date(specificTime);
      } else {
        triggerAt = new Date();
        if (delayMinutes) triggerAt = addMinutes(triggerAt, delayMinutes);
        if (delayHours) triggerAt = addHours(triggerAt, delayHours);
        if (delayDays) triggerAt = addDays(triggerAt, delayDays);
      }

      const reminderId = `rem_${Date.now()}`;

      reminders.set(reminderId, {
        id: reminderId,
        message,
        triggerAt,
        createdAt: new Date(),
        sent: false,
      });

      console.log(`⏰ Reminder set: "${message}" for ${triggerAt}`);

      return JSON.stringify({
        success: true,
        reminderId,
        message,
        scheduledFor: format(triggerAt, 'EEEE, MMMM d, yyyy h:mm a'),
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

// Get pending reminders (called by cron job)
export function getPendingReminders() {
  const now = new Date();
  const pending = [];

  for (const [id, reminder] of reminders) {
    if (!reminder.sent && reminder.triggerAt <= now) {
      pending.push(reminder);
    }
  }

  return pending;
}

// Mark reminder as sent
export function markReminderSent(reminderId) {
  const reminder = reminders.get(reminderId);
  if (reminder) {
    reminder.sent = true;
  }
}
