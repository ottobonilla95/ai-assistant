# 🤖 WhatsApp AI Agent

A flexible, extensible WhatsApp AI agent powered by **LangChain** and **LangGraph**.

**Built-in Tools:**
- 📅 **Calendar** - Schedule events, check your day, recurring events
- ⏰ **Reminders** - "Remind me to call mom in 2 hours"
- 📝 **Notes** - Quick notes and retrieval
- 🔍 **Web Search** - Search the internet (optional, needs Tavily API)

**Add Your Own:**
- 🏠 Smart home control
- 🎵 Spotify integration  
- ✈️ Flight tracking
- 🍕 Order food
- RAG over your documents
- Whatever you want!

---

## 🏗️ Architecture

```
User Message (WhatsApp)
        ↓
   ┌─────────────────────────────────────┐
   │  🧠 LangGraph ReAct Agent           │
   │  (Reason + Act loop)                │
   │                                     │
   │  GPT-4o decides:                    │
   │  → Which tool to use?               │
   │  → What parameters?                 │
   │  → Need more tools?                 │
   │  → Ready to respond?                │
   └─────────────────────────────────────┘
        ↓
   ┌─────────────────────────────────────┐
   │  🔧 LangChain Tools                 │
   │  ├── Calendar (Google Calendar)     │
   │  ├── Reminders (scheduled messages) │
   │  ├── Notes (quick notes)            │
   │  ├── Web Search (Tavily)            │
   │  └── [Your custom tools...]         │
   └─────────────────────────────────────┘
        ↓
   Natural language response
        ↓
   WhatsApp (via Twilio)
```

---

## 🚀 Quick Start

### 1. Get Your API Keys

| Service | URL | Required |
|---------|-----|----------|
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) | ✅ Yes |
| Twilio | [console.twilio.com](https://console.twilio.com) | ✅ Yes |
| Google Calendar | [console.cloud.google.com](https://console.cloud.google.com) | ✅ Yes |
| Tavily (web search) | [tavily.com](https://tavily.com) | Optional |

### 2. Google Calendar Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Calendar API**
3. Create a **Service Account** (IAM & Admin → Service Accounts)
4. Download the JSON key
5. **Share your calendar** with the service account email

### 3. Deploy to Railway

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Initial commit"
gh repo create whatsapp-agent --public --push

# 2. Deploy on railway.app
# - New Project → Deploy from GitHub
# - Add environment variables (see env.example)
# - Get your URL
```

### 4. Configure Twilio Webhook

Set webhook URL in Twilio Console → Messaging → WhatsApp Sandbox:
```
https://your-app.up.railway.app/webhook/whatsapp
```

### 5. Set Up Cron Jobs

On [cron-job.org](https://cron-job.org) (free):

| Job | URL | Schedule |
|-----|-----|----------|
| Daily Summary | `/cron/daily-summary?secret=YOUR_SECRET` | 7:00 AM |
| Reminders | `/cron/reminders?secret=YOUR_SECRET` | Every 5 min |

---

## 💬 Example Conversations

**Scheduling:**
> "Set bachata class every Monday from 7 to 9pm"
> 
> ✅ Done! I've scheduled Bachata Class as a recurring event every Monday 7:00 PM - 9:00 PM.

**Checking calendar:**
> "What's on my calendar today?"
> 
> 📅 Here's your schedule for today...

**Reminders:**
> "Remind me to call the dentist in 2 hours"
>
> ⏰ Got it! I'll remind you at 3:30 PM.

**Notes:**
> "Note that Sarah's birthday is March 15"
>
> 📝 Saved! I'll remember Sarah's birthday is March 15.

**Web search:**
> "What's the weather in Miami?"
>
> 🔍 Currently 78°F and sunny in Miami...

---

## 🔧 Adding Custom Tools

The agent is designed to be extended with LangChain tools. Here's how:

### 1. Create Your Tool File

```javascript
// src/agent/tools/weather.js
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export const weatherTool = new DynamicStructuredTool({
  name: 'get_weather',
  description: 'Get current weather for a city. Use when user asks about weather, temperature, or forecast.',
  
  // Define parameters with Zod - type-safe and self-documenting!
  schema: z.object({
    city: z.string().describe('City name to get weather for'),
    units: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  
  // Your implementation
  func: async ({ city, units = 'fahrenheit' }) => {
    const response = await fetch(`https://api.weather.com/...`);
    const data = await response.json();
    
    return JSON.stringify({
      city,
      temperature: data.temp,
      conditions: data.conditions,
    });
  },
});
```

### 2. Register in tools/index.js

```javascript
import { weatherTool } from './weather.js';

export const tools = [
  // ...existing tools
  weatherTool,
];
```

That's it! The AI will automatically know when to use your new tool.

### Why LangChain?

- **Zod schemas** = type-safe parameters with great descriptions
- **LangGraph** = sophisticated agent reasoning (ReAct pattern)
- **Easy to extend** = add RAG, memory, chains later
- **Community tools** = 100+ pre-built integrations available

---

## 📁 Project Structure

```
src/
├── index.js                 # Express server & routes
├── agent/
│   ├── index.js            # LangGraph ReAct Agent
│   └── tools/
│       ├── index.js        # Tool registry (add your tools here!)
│       ├── calendar.js     # Google Calendar (DynamicStructuredTool)
│       ├── reminder.js     # Scheduled reminders
│       ├── notes.js        # Quick notes
│       ├── webSearch.js    # Tavily web search
│       └── _template.js    # Copy this to create new tools
└── services/
    └── whatsapp.js         # Twilio WhatsApp integration
```

**Key packages:**
- `@langchain/langgraph` - ReAct agent with reasoning loop
- `@langchain/openai` - GPT-4o integration
- `@langchain/core` - DynamicStructuredTool for tools
- `zod` - Schema validation for tool parameters

---

## 🌐 Deployment Options

### Railway (Recommended)
- Free tier available
- One-click deploy
- Built-in environment variables
- [railway.app](https://railway.app)

### Render
- Free tier (spins down after inactivity)
- Similar to Railway
- [render.com](https://render.com)

### DigitalOcean App Platform
- $5/month basic
- More reliable
- [digitalocean.com](https://cloud.digitalocean.com/apps)

### Fly.io
- Generous free tier
- Global edge deployment
- [fly.io](https://fly.io)

---

## 🔒 Production Considerations

1. **Database**: Replace in-memory stores with Redis/PostgreSQL
2. **Rate Limiting**: Add rate limiting for API calls
3. **Logging**: Add proper logging (Sentry, LogDNA)
4. **Multi-user**: Store user preferences/history per phone number
5. **Error Handling**: Add retry logic for API failures

---

## 💡 Tool Ideas

| Tool | What it does |
|------|-------------|
| 🏠 Smart Home | Control lights, thermostat via Home Assistant |
| 🎵 Spotify | Play music, create playlists |
| 📧 Email | Send emails via Gmail/SendGrid |
| 🛒 Shopping List | Manage grocery lists |
| 💪 Fitness | Log workouts, track progress |
| 🧘 Meditation | Start guided meditations |
| 📰 News | Get personalized news digest |
| 🚗 Uber/Lyft | Request rides |
| 🍕 Food Delivery | Order from DoorDash/UberEats |
| 💰 Expenses | Track spending |
| ✈️ Travel | Flight status, hotel bookings |

---

## 🚀 Advanced LangChain Features (Future)

Now that you're on LangChain, you can easily add:

**RAG (Retrieval-Augmented Generation)**
```javascript
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
// Query your documents, PDFs, notes via natural language
```

**Persistent Memory**
```javascript
import { BufferMemory } from 'langchain/memory';
// Remember conversations across sessions
```

**Multi-step Chains**
```javascript
// Agent can: search → analyze → summarize → email results
```

**LangSmith Tracing**
```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-key
# Debug and monitor your agent in production
```

---

## 🐛 Troubleshooting

**Messages not received?**
- Check Twilio webhook URL
- Verify sandbox connection (join code)

**Calendar not working?**
- Verify service account has calendar access
- Check credential format in env vars

**Agent not using tools?**
- Check OpenAI API key
- Look at server logs for errors

---

Made with ❤️ for people who want their own AI assistant
# ai-assistant
