/**
 * WhatsApp Business API Client
 *
 * Handles sending messages via the Meta WhatsApp Cloud API.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const axios = require('axios');
const logger = require('./logger');

const WA_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Send a text message to a WhatsApp number
 */
async function sendMessage(to, text) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    logger.warn('WhatsApp credentials not configured. Message not sent.');
    logger.info(`[MOCK WA] To: ${to}\n${text}`);
    return { mock: true };
  }

  try {
    const response = await axios.post(
      `${WA_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`Message sent to ${to}: ${response.data.messages?.[0]?.id}`);
    return response.data;
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    logger.error(`Failed to send WhatsApp message to ${to}: ${errMsg}`);
    throw new Error(`WhatsApp send failed: ${errMsg}`);
  }
}

/**
 * Send an image message (e.g., UPI QR code)
 */
async function sendImage(to, imageUrl, caption = '') {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    logger.warn('WhatsApp credentials not configured. Image not sent.');
    return { mock: true };
  }

  try {
    const response = await axios.post(
      `${WA_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: imageUrl, caption },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    logger.error(`Failed to send image to ${to}: ${err.message}`);
    throw err;
  }
}

/**
 * Mark a message as read
 */
async function markAsRead(messageId) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) return;

  try {
    await axios.post(
      `${WA_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    logger.warn(`Could not mark message ${messageId} as read: ${err.message}`);
  }
}

/**
 * Extract message data from WhatsApp webhook payload
 */
function extractMessageData(body) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return null;

    const message = messages[0];
    const contact = value?.contacts?.[0];

    return {
      messageId: message.id,
      from: message.from, // sender's phone number
      senderName: contact?.profile?.name || 'Unknown',
      type: message.type,
      text: message.type === 'text' ? message.text?.body : null,
      timestamp: message.timestamp,
    };
  } catch (err) {
    logger.error(`Error extracting message data: ${err.message}`);
    return null;
  }
}

module.exports = { sendMessage, sendImage, markAsRead, extractMessageData };
