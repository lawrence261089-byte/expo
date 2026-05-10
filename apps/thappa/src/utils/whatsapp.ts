/**
 * WhatsApp Cloud API sender utilities.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */

import axios from "axios";

const BASE_URL = "https://graph.facebook.com/v19.0";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function getPhoneNumberId(): string {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID env var");
  return id;
}

// ─── Send plain text message ──────────────────────────────────────────────────

export async function sendTextMessage(
  to: string,
  text: string
): Promise<void> {
  const phoneNumberId = getPhoneNumberId();
  await axios.post(
    `${BASE_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    },
    { headers: getHeaders() }
  );
}

// ─── Send image message (for UPI QR codes) ───────────────────────────────────

export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<void> {
  const phoneNumberId = getPhoneNumberId();
  await axios.post(
    `${BASE_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: { link: imageUrl, caption: caption ?? "" },
    },
    { headers: getHeaders() }
  );
}

// ─── Mark message as read ─────────────────────────────────────────────────────

export async function markAsRead(messageId: string): Promise<void> {
  const phoneNumberId = getPhoneNumberId();
  await axios.post(
    `${BASE_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    },
    { headers: getHeaders() }
  );
}

// ─── Forward message to support ──────────────────────────────────────────────

export async function forwardToSupport(
  senderPhone: string,
  message: string
): Promise<void> {
  const supportPhone = process.env.SUPPORT_WHATSAPP;
  if (!supportPhone) return;

  const forwardText =
    `📩 *Thappa Support Request*\n` +
    `From: +${senderPhone}\n` +
    `Message: ${message}\n\n` +
    `Reply directly to this number to assist the user.`;

  await sendTextMessage(supportPhone, forwardText);
}
