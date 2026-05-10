'use strict';

/**
 * whatsappService.js
 * Wraps the WhatsApp Business Cloud API for sending messages.
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../logger');

// ─── Send a plain text message ────────────────────────────────────────────────

async function sendText(to, text) {
  try {
    const res = await axios.post(
      config.whatsapp.apiUrl,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    logger.info('WhatsApp message sent', { to, messageId: res.data?.messages?.[0]?.id });
    return res.data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('Failed to send WhatsApp message', { to, error: detail });
    throw err;
  }
}

// ─── Send an image with optional caption ─────────────────────────────────────

async function sendImage(to, imageUrl, caption = '') {
  try {
    const res = await axios.post(
      config.whatsapp.apiUrl,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: imageUrl, caption },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    logger.info('WhatsApp image sent', { to });
    return res.data;
  } catch (err) {
    logger.error('Failed to send WhatsApp image', { to, error: err.message });
    throw err;
  }
}

// ─── Mark a message as read ───────────────────────────────────────────────────

async function markRead(messageId) {
  try {
    await axios.post(
      `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (_) {
    // Non-critical — ignore errors
  }
}

module.exports = { sendText, sendImage, markRead };
