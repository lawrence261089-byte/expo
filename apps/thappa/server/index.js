'use strict';

/**
 * index.js
 * Thappa WhatsApp-first trust scoring platform — server entry point.
 *
 * Endpoints:
 *   GET  /webhook          — WhatsApp webhook verification
 *   POST /webhook          — Incoming WhatsApp messages
 *   GET  /health           — Health check
 *   POST /admin/activate   — Manually activate a user subscription (internal)
 */

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const crypto = require('crypto');

const config = require('./src/config');
const logger = require('./src/logger');

const { handleCheck } = require('./src/commands/checkCommand');
const { handleHelp } = require('./src/commands/helpCommand');
const { handleReport, hasActiveSession } = require('./src/commands/reportCommand');
const { handlePaidConfirmation, activateSubscription, sendSubscriptionReminders } = require('./src/services/paymentService');

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();

app.use(helmet());
app.use(bodyParser.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/webhook', limiter);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'thappa-server', timestamp: new Date().toISOString() });
});

// ─── WhatsApp webhook verification ───────────────────────────────────────────

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  logger.warn('Webhook verification failed', { mode, token });
  res.sendStatus(403);
});

// ─── WhatsApp message handler ─────────────────────────────────────────────────

app.post('/webhook', async (req, res) => {
  // Acknowledge immediately — WhatsApp requires a 200 within 20 s
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle status updates (delivery receipts) — ignore silently
    if (value?.statuses) return;

    const messages = value?.messages;
    if (!messages || messages.length === 0) return;

    for (const message of messages) {
      if (message.type !== 'text') continue;

      const from = message.from; // sender's phone number (E.164 without +)
      const text = (message.text?.body || '').trim();

      logger.info('Incoming message', { from, text: text.substring(0, 80) });

      await routeMessage(from, text);
    }
  } catch (err) {
    logger.error('Error processing webhook', { error: err.message, stack: err.stack });
  }
});

// ─── Message router ───────────────────────────────────────────────────────────

async function routeMessage(from, text) {
  const upper = text.toUpperCase().trim();

  // PAID <upiTxId> — payment confirmation
  if (/^PAID\s+\S+/i.test(text)) {
    const upiTxId = text.replace(/^PAID\s+/i, '').trim();
    await handlePaidConfirmation(from, upiTxId);
    return;
  }

  // CHECK <Name> <PhoneLast4>
  if (upper.startsWith('CHECK')) {
    await handleCheck(from, text);
    return;
  }

  // REPORT <...> or active report session
  if (upper.startsWith('REPORT') || hasActiveSession(from)) {
    await handleReport(from, text);
    return;
  }

  // HELP [question]
  if (upper.startsWith('HELP')) {
    await handleHelp(from, text);
    return;
  }

  // Unknown command — send help menu
  const { HELP_MENU } = require('./src/commands/helpCommand');
  const wa = require('./src/services/whatsappService');
  await wa.sendText(
    from,
    `❓ I didn't understand that.\n\n${HELP_MENU}`
  );
}

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/**
 * POST /admin/activate
 * Body: { phone: "91XXXXXXXXXX", months: 1, secret: "..." }
 *
 * Protected by a shared secret (ADMIN_SECRET env var).
 */
app.post('/admin/activate', async (req, res) => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res.status(503).json({ error: 'Admin endpoint not configured.' });
  }

  const { phone, months = 1, secret } = req.body || {};

  // Constant-time comparison to prevent timing attacks
  const provided = Buffer.from(secret || '');
  const expected = Buffer.from(adminSecret);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!phone) {
    return res.status(400).json({ error: 'phone is required.' });
  }

  try {
    await activateSubscription(phone, parseInt(months, 10) || 1);
    res.json({ success: true, phone, months });
  } catch (err) {
    logger.error('Failed to activate subscription', { phone, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Cron jobs ────────────────────────────────────────────────────────────────

// Send subscription renewal reminders every day at 09:00 IST (03:30 UTC)
cron.schedule('30 3 * * *', async () => {
  logger.info('Running subscription reminder cron');
  try {
    await sendSubscriptionReminders();
  } catch (err) {
    logger.error('Subscription reminder cron failed', { error: err.message });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`Thappa server started`, {
    port: PORT,
    env: config.server.nodeEnv,
  });
});

module.exports = app; // exported for testing
