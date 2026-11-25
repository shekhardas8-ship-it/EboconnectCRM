/**
 * OpenWA Local Service & Gateway Runner for Central CRM
 *
 * This runner provides the OpenWA REST API endpoints expected by Central CRM:
 * - POST /api/sendText
 * - POST /sendText
 * - GET  /status
 *
 * Modes:
 * 1. REAL MODE: If @open-wa/wa-automate is installed, it creates a live WhatsApp Web session with QR code.
 * 2. SIMULATION/SANDBOX MODE: If @open-wa/wa-automate is not installed, it acts as an immediate mock server,
 *    logging formatted WhatsApp messages to the console and returning 200 OK so you can test end-to-end
 *    without waiting for WhatsApp Web QR scanning.
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.OPENWA_PORT || 8085;

app.use(cors());
app.use(express.json());

let isRealClientReady = false;
let waClient = null;

// Try loading @open-wa/wa-automate dynamically if available
async function tryInitRealOpenWA() {
  try {
    const wa = await import('@open-wa/wa-automate');
    console.log('📱 Found @open-wa/wa-automate package. Initializing live WhatsApp session...');
    wa.create({
      sessionId: 'CENTRAL_CRM_SESSION',
      multiDevice: true,
      authTimeout: 60,
      blockCrashLogs: true,
      headless: true,
      qrTimeout: 0,
    })
      .then((client) => {
        waClient = client;
        isRealClientReady = true;
        console.log('✅ OpenWA Real Client is connected and authenticated!');
      })
      .catch((err) => {
        console.warn('⚠️ Real OpenWA failed to start (fallback to Sandbox Mode):', err.message);
      });
  } catch (err) {
    console.log('ℹ️ @open-wa/wa-automate not installed. Running in Sandbox / Gateway Mode.');
    console.log('👉 To enable real live WhatsApp phone scanning, run:');
    console.log('   npm install @open-wa/wa-automate');
  }
}

// ----------------------------------------------------
// HANDLER FOR SENDING TEXT
// ----------------------------------------------------
async function handleSendText(req, res) {
  const body = req.body || {};
  const chatId = body.chatId || body.to || body.args?.to || body.phone;
  const content = body.content || body.text || body.message || body.args?.content;

  if (!chatId || !content) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: chatId (or to) and content (or text)',
    });
  }

  // If real OpenWA is connected, send real WhatsApp
  if (isRealClientReady && waClient) {
    try {
      const result = await waClient.sendText(chatId, content);
      console.log(`[OpenWA REAL] Sent message to ${chatId}`);
      return res.json({ success: true, response: result });
    } catch (err) {
      console.error(`[OpenWA REAL ERROR] Failed sending to ${chatId}:`, err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Otherwise handle in Sandbox / Simulation Mode
  console.log('\n=============================================');
  console.log('💬 [OPENWA GATEWAY] INCOMING WHATSAPP DISPATCH');
  console.log(`📱 Recipient: ${chatId}`);
  console.log(`⏰ Timestamp: ${new Date().toLocaleString()}`);
  console.log('---------------------------------------------');
  console.log(content);
  console.log('=============================================\n');

  return res.json({
    success: true,
    mode: 'simulation_gateway',
    messageId: `openwa_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    chatId,
    timestamp: new Date().toISOString(),
  });
}

app.post('/api/sendText', handleSendText);
app.post('/sendText', handleSendText);
app.post('/messages/text', handleSendText);

app.get('/status', (req, res) => {
  res.json({
    success: true,
    server: 'OpenWA Gateway for Central CRM',
    port: PORT,
    realClientReady: isRealClientReady,
    mode: isRealClientReady ? 'real_client' : 'sandbox_gateway',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 OpenWA WhatsApp Server listening on http://localhost:${PORT}`);
  console.log(`📡 Ready to receive automated WhatsApp pushes from Central CRM.`);
  tryInitRealOpenWA();
});
