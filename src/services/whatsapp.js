import twilio from 'twilio';
import { runAgent } from '../agent/index.js';
import { calendarTool } from '../agent/tools/calendar.js';
import { getPendingReminders, markReminderSent } from '../agent/tools/reminder.js';
import { transcribeAudio, isAudioMessage, getAudioUrl } from './audio.js';

// Lazy-load Twilio client (created on first use, after env vars are loaded)
let client = null;

function getClient() {
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return client;
}

// Simple conversation history (use Redis/DB in production)
const conversationHistory = new Map();

/**
 * Send a WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage(to, message) {
  try {
    // WhatsApp has a 1600 char limit per message
    const chunks = splitMessage(message, 1500);
    
    for (const chunk of chunks) {
      await getClient().messages.create({
        body: chunk,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: to,
      });
    }
    
    console.log(`📤 Message sent to ${to}`);
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    throw error;
  }
}

/**
 * Handle incoming WhatsApp messages (text or audio)
 */
export async function handleIncomingMessage(from, twilioBody) {
  try {
    let messageText;
    
    // Check if it's an audio message
    if (isAudioMessage(twilioBody)) {
      console.log('🎤 Received audio message, transcribing...');
      const audioUrl = getAudioUrl(twilioBody);
      
      try {
        messageText = await transcribeAudio(audioUrl);
        console.log('🎤 Transcribed:', messageText);
      } catch (error) {
        console.error('Transcription failed:', error);
        await sendWhatsAppMessage(from, "😅 Sorry, I couldn't understand that audio. Could you try again or type your message?");
        return;
      }
    } else {
      // Regular text message
      messageText = twilioBody.Body || '';
    }
    
    if (!messageText.trim()) {
      await sendWhatsAppMessage(from, "I didn't catch that. Could you try again?");
      return;
    }
    
    console.log(`📝 Processing: "${messageText}"`);
    
    // Get conversation history for this user
    const history = conversationHistory.get(from) || [];
    
    // Run the agent
    const response = await runAgent(messageText, { history, userPhone: from });
    
    // Update conversation history
    history.push(
      { role: 'user', content: messageText },
      { role: 'assistant', content: response }
    );
    
    // Keep last 20 messages
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    conversationHistory.set(from, history);
    
    // Send response
    await sendWhatsAppMessage(from, response);
    
  } catch (error) {
    console.error('Error handling message:', error);
    await sendWhatsAppMessage(
      from,
      "😅 Oops! Something went wrong. Please try again in a moment."
    );
  }
}

/**
 * Send daily reminders about today's events
 */
export async function sendDailyReminders() {
  try {
    // Get today's events
    const result = await calendarTool.getTodaysEvents.execute();
    
    let message = `🌅 *Good morning!*\n\n`;
    
    if (result.events.length === 0) {
      message += `📅 No events scheduled for today. Enjoy your free day! 🎉`;
    } else {
      message += `📅 *Today's Schedule (${result.date}):*\n\n`;
      
      result.events.forEach((event, index) => {
        if (event.allDay) {
          message += `${index + 1}. 🌅 *${event.title}* (All day)\n`;
        } else {
          const startTime = new Date(event.start).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          message += `${index + 1}. ⏰ *${event.title}* at ${startTime}\n`;
        }
      });
      
      message += `\nHave a productive day! 💪`;
    }
    
    await sendWhatsAppMessage(process.env.YOUR_WHATSAPP_NUMBER, message);
    console.log('✅ Daily reminders sent');
    
  } catch (error) {
    console.error('Error sending daily reminders:', error);
    throw error;
  }
}

/**
 * Process and send pending reminders (call from cron)
 */
export async function processPendingReminders() {
  const pending = getPendingReminders();
  
  for (const reminder of pending) {
    try {
      await sendWhatsAppMessage(
        process.env.YOUR_WHATSAPP_NUMBER,
        `⏰ *Reminder:*\n\n${reminder.message}`
      );
      markReminderSent(reminder.id);
      console.log(`✅ Sent reminder: ${reminder.id}`);
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
    }
  }
  
  return pending.length;
}

/**
 * Split long messages for WhatsApp
 */
function splitMessage(message, maxLength) {
  if (message.length <= maxLength) return [message];
  
  const chunks = [];
  let remaining = message;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    
    // Find a good break point
    let breakPoint = remaining.lastIndexOf('\n', maxLength);
    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      breakPoint = remaining.lastIndexOf(' ', maxLength);
    }
    if (breakPoint === -1) {
      breakPoint = maxLength;
    }
    
    chunks.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint).trim();
  }
  
  return chunks;
}
