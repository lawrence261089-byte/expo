/**
 * WhatsApp Webhook Routes
 *
 * GET  /webhook  → Verification challenge (Meta requires this)
 * POST /webhook  → Incoming messages
 */

const express = require('express');
const router = express.Router();
const { extractMessageData, sendMessage, markAsRead } = require('../utils/whatsapp');
const { dispatch } = require('../utils/messageDispatcher');
const logger = require('../utils/logger');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'thappa_verify_token';

// ─── Webhook Verification (GET) ───────────────────────────────────────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn(`Webhook verification failed. Token: ${token}`);
  res.status(403).json({ error: 'Verification failed' });
});

// ─── Incoming Messages (POST) ─────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Always respond 200 immediately to prevent WhatsApp retries
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;

    // Validate it's a WhatsApp message event
    if (body.object !== 'whatsapp_business_account') return;

    const messageData = extractMessageData(body);
    if (!messageData) return;

    logger.info(`Incoming message from ${messageData.from}: ${messageData.text}`);

    // Mark as read
    await markAsRead(messageData.messageId).catch(() => {});

    // Dispatch to command handler
    const reply = await dispatch(messageData);

    // Send reply
    if (reply) {
      await sendMessage(messageData.from, reply);
    }
  } catch (err) {
    logger.error(`Webhook processing error: ${err.message}`, { stack: err.stack });
  }
});

module.exports = router;
