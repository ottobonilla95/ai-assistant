import express from 'express';
import dotenv from 'dotenv';
import { handleIncomingMessage, sendDailyReminders, processPendingReminders } from './services/whatsapp.js';
import { listTools } from './agent/tools/index.js';

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health check + show available tools
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🤖 WhatsApp AI Agent is running',
    tools: listTools(),
  });
});

// Twilio WhatsApp webhook - receives incoming messages
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const { From: from } = req.body;
    
    console.log(`\n📱 Message from ${from}`);
    
    // Process async - respond immediately to Twilio
    // Pass full body to handle both text and audio
    handleIncomingMessage(from, req.body).catch(err => {
      console.error('Message handling error:', err);
    });
    
    // Twilio expects a TwiML response
    res.type('text/xml').send('<Response></Response>');
  } catch (error) {
    console.error('Webhook error:', error);
    res.type('text/xml').send('<Response></Response>');
  }
});

// Webhook verification
app.get('/webhook/whatsapp', (req, res) => {
  res.send('WhatsApp webhook is active ✓');
});

// ============================================
// CRON ENDPOINTS
// ============================================

// Middleware to check cron secret
function validateCronSecret(req, res, next) {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Daily events summary (run once in morning)
async function handleDailySummary(req, res) {
  try {
    console.log('⏰ Running daily summary...');
    await sendDailyReminders();
    res.json({ success: true, message: 'Daily summary sent' });
  } catch (error) {
    console.error('Daily summary error:', error);
    res.status(500).json({ error: error.message });
  }
}
app.get('/cron/daily-summary', validateCronSecret, handleDailySummary);
app.post('/cron/daily-summary', validateCronSecret, handleDailySummary);

// Process pending reminders (run every 5-15 minutes)
app.get('/cron/reminders', validateCronSecret, async (req, res) => {
  try {
    console.log('⏰ Processing pending reminders...');
    const count = await processPendingReminders();
    res.json({ success: true, processed: count });
  } catch (error) {
    console.error('Reminder processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🤖 WhatsApp AI Agent                     ║
╠════════════════════════════════════════════╣
║   Server:     http://localhost:${PORT}        ║
║   Webhook:    /webhook/whatsapp            ║
║   Cron:       /cron/daily-summary          ║
║              /cron/reminders               ║
╚════════════════════════════════════════════╝
  `);
  
  console.log('📦 Available tools:', listTools().map(t => t.name).join(', '));
});
