/**
 * UPI payment link generator for Thappa.
 * Uses the standard UPI deep-link format supported by all Indian UPI apps.
 */

export interface UpiPaymentLink {
  deepLink: string;
  qrCodeUrl: string;
  displayText: string;
}

/**
 * Generates a UPI payment deep-link and a QR code URL.
 * The QR code is generated via the free api.qrserver.com service.
 */
export function generateUpiPayment(
  amountInr: number,
  transactionNote: string,
  referenceId: string
): UpiPaymentLink {
  const upiId = process.env.UPI_ID ?? "thappa@upi";
  const upiName = encodeURIComponent(process.env.UPI_NAME ?? "Thappa");
  const note = encodeURIComponent(transactionNote);
  const ref = encodeURIComponent(referenceId);

  const deepLink =
    `upi://pay?pa=${upiId}&pn=${upiName}` +
    `&am=${amountInr}&cu=INR&tn=${note}&tr=${ref}`;

  // Free QR code API — no key required
  const qrCodeUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=` +
    encodeURIComponent(deepLink);

  const displayText =
    `💳 *Pay ₹${amountInr} via UPI*\n\n` +
    `UPI ID: *${upiId}*\n` +
    `Amount: *₹${amountInr}*\n` +
    `Note: ${transactionNote}\n\n` +
    `Open any UPI app (GPay, PhonePe, Paytm) and scan the QR code, ` +
    `or pay to UPI ID above.\n\n` +
    `After payment, reply *PAID ${referenceId}* to activate your access.`;

  return { deepLink, qrCodeUrl, displayText };
}

export function generateCheckPayment(referenceId: string): UpiPaymentLink {
  const price = Number(process.env.CHECK_PRICE_INR ?? 10);
  return generateUpiPayment(price, "Thappa Check", referenceId);
}

export function generateSubscriptionPayment(referenceId: string): UpiPaymentLink {
  const price = Number(process.env.SUBSCRIPTION_PRICE_INR ?? 99);
  return generateUpiPayment(price, "Thappa Monthly Subscription", referenceId);
}

/**
 * Generates a unique payment reference ID.
 * Format: THPyyyyMMddHHmmss-XXXX
 */
export function generatePaymentRef(prefix = "CHK"): string {
  const now = new Date();
  const ts = now
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `THP-${prefix}-${ts}-${rand}`;
}
