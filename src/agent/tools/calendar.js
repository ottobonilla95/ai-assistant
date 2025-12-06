/**
 * Calendar Tools - Google Calendar integration (LangChain)
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = process.env.TIMEZONE || 'America/New_York';
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

// Create Calendar Event Tool
const createEventTool = new DynamicStructuredTool({
  name: 'create_calendar_event',
  description: 'Create a new event on Google Calendar. Use this when the user wants to schedule something, set up a meeting, add an appointment, or create a recurring event like a class.',
  schema: z.object({
    title: z.string().describe('The title/name of the event (e.g., "Bachata Class", "Meeting with John")'),
    date: z.string().describe('The date of the event in YYYY-MM-DD format. For recurring events, this is the first occurrence.'),
    startTime: z.string().describe('Start time in 24h format HH:MM (e.g., "19:00" for 7 PM)'),
    endTime: z.string().describe('End time in 24h format HH:MM (e.g., "21:00" for 9 PM)'),
    recurring: z.boolean().optional().describe('Whether this is a recurring event'),
    recurrenceType: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional().describe('How often the event repeats'),
  }),
  func: async ({ title, date, startTime, endTime, recurring, recurrenceType }) => {
    try {
      const calendar = getCalendarClient();
      const tz = process.env.TIMEZONE || 'America/New_York';

      // Format datetime strings directly for Google Calendar
      // This avoids timezone conversion issues with JS Date
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;
      
      console.log(`📅 Creating event: ${title} on ${date} from ${startTime} to ${endTime} (${tz})`);

      const eventData = {
        calendarId: CALENDAR_ID,
        requestBody: {
          summary: title,
          start: { dateTime: startDateTime, timeZone: tz },
          end: { dateTime: endDateTime, timeZone: tz },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 60 },
              { method: 'popup', minutes: 10 },
            ],
          },
        },
      };

      if (recurring && recurrenceType) {
        const recurrenceMap = {
          daily: 'RRULE:FREQ=DAILY',
          weekly: 'RRULE:FREQ=WEEKLY',
          biweekly: 'RRULE:FREQ=WEEKLY;INTERVAL=2',
          monthly: 'RRULE:FREQ=MONTHLY',
        };
        if (recurrenceMap[recurrenceType]) {
          eventData.requestBody.recurrence = [recurrenceMap[recurrenceType]];
        }
      }

      console.log('📅 Creating event on calendar:', CALENDAR_ID);
      const response = await calendar.events.insert(eventData);
      console.log('📅 Event created:', response.data.id);

      return JSON.stringify({
        success: true,
        eventId: response.data.id,
        title: title,
        date: date,
        time: `${startTime} - ${endTime}`,
        recurring: recurring || false,
        timezone: tz,
      });
    } catch (error) {
      console.error('📅 Calendar error:', error.message);
      console.error('📅 Full error:', JSON.stringify(error.response?.data || error, null, 2));
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

// Get Today's Events Tool
const getTodaysEventsTool = new DynamicStructuredTool({
  name: 'get_todays_events',
  description: "Get all events scheduled for today. Use when user asks about today's schedule, what's on their calendar today, or wants to know their agenda.",
  schema: z.object({}),
  func: async () => {
    try {
      const calendar = getCalendarClient();
      const now = new Date();

      const response = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: startOfDay(now).toISOString(),
        timeMax: endOfDay(now).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = (response.data.items || []).map(event => ({
        title: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        allDay: !event.start.dateTime,
      }));

      return JSON.stringify({
        date: format(now, 'EEEE, MMMM d, yyyy'),
        eventCount: events.length,
        events: events,
      });
    } catch (error) {
      console.error('Calendar error:', error);
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

// Get Upcoming Events Tool
const getUpcomingEventsTool = new DynamicStructuredTool({
  name: 'get_upcoming_events',
  description: 'Get upcoming events for the next few days. Use when user asks about their week, upcoming events, or schedule for the next few days.',
  schema: z.object({
    days: z.number().optional().default(7).describe('Number of days to look ahead (default 7)'),
  }),
  func: async ({ days = 7 }) => {
    try {
      const calendar = getCalendarClient();
      const now = new Date();

      const response = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: now.toISOString(),
        timeMax: addDays(now, days).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 20,
      });

      const events = (response.data.items || []).map(event => ({
        title: event.summary,
        date: event.start.dateTime
          ? formatInTimeZone(new Date(event.start.dateTime), TIMEZONE, 'EEE, MMM d')
          : event.start.date,
        time: event.start.dateTime
          ? formatInTimeZone(new Date(event.start.dateTime), TIMEZONE, 'h:mm a')
          : 'All day',
      }));

      return JSON.stringify({
        period: `Next ${days} days`,
        eventCount: events.length,
        events: events,
      });
    } catch (error) {
      console.error('Calendar error:', error);
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

// Export for direct use by whatsapp.js
export const calendarTool = {
  getTodaysEvents: {
    execute: async () => {
      const result = await getTodaysEventsTool.func({});
      return JSON.parse(result);
    },
  },
};

// Export all calendar tools for LangChain
export const calendarTools = [
  createEventTool,
  getTodaysEventsTool,
  getUpcomingEventsTool,
];
