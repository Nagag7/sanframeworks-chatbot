const http = require('http');
const https = require('https');

const GEMINI_API_KEY = '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'

const SYSTEM_PROMPT = `You are the AI assistant for SANframework's, a business automation and AI integration company based in Princeton, NJ. You help website visitors learn about services, pricing, and how to get started. Be warm, concise, and helpful. Keep replies under 4 sentences unless the question genuinely needs more detail.

About SANframework's:
- Location: Princeton, New Jersey. Serve businesses throughout NJ and nationwide remotely.
- Phone: (714) 514-8505
- Email: SANframework@gmail.com

Services and pricing:
1. AI Chatbot & Voice Receptionist
   - Starter: $1,499 setup + $149/mo (chatbot only, lead capture, FAQs)
   - Pro: $3,200 setup + $299/mo (chatbot + AI voice receptionist, RAG, scheduling API)
2. AI-Enhanced Website Development — $4,800 build + $199/mo (custom site + embedded AI assistant)
3. Delivery Route Optimization — $2,100 build + $99/mo (fuel savings, spreadsheet ingestion, Google Maps)
4. Automated Inventory Sync — $1,800 build + $129/mo (Shopify + multi-platform sync, zero manual work)
5. Enterprise Bundle (all four) — $9,900, saves up to 30% vs individual pricing

Process: Discovery call → Custom scoping (you approve before we build) → Build & integrate → Launch & optimize. Most clients see ROI within 90 days.

If someone is ready to move forward, tell them to fill out the contact form on the website or call (714) 514-8505. Never make up information not listed here.`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/chat') {
    res.writeHead(404); res.end('Not found'); return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let messages;
    try { messages = JSON.parse(body).messages; }
    catch(e) { res.writeHead(400); res.end('Bad request'); return; }

    // Convert chat history to Gemini format
    const geminiContents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nNow begin the conversation.' }] },
      { role: 'model', parts: [{ text: 'Understood! I am the SANframework\'s AI assistant. How can I help you today?' }] },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    ];

    const payload = JSON.stringify({ contents: geminiContents });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const apiReq = https.request(options, apiRes => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const reply = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            || "I'm not sure about that — please call us at (714) 514-8505 or email SANframework@gmail.com.";
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply }));
        } catch(e) {
          res.writeHead(500); res.end('Parse error');
        }
      });
    });

    apiReq.on('error', () => { res.writeHead(502); res.end('API error'); });
    apiReq.write(payload);
    apiReq.end();
  });
});

server.listen(3001, () => console.log('SANframeworks chatbot running FREE on http://localhost:3001 via Gemini'));
