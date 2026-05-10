/**
 * Thappa — WhatsApp-first trust scoring platform for India's informal economy.
 *
 * Entry point: Express server handling WhatsApp Cloud API webhooks.
 *
 * Endpoints:
 *   GET  /webhook  — verification challenge (Meta requirement)
 *   POST /webhook  — incoming messages
 *   GET  /health   — health check
 *   GET  /         — landing info
 */

import "dotenv/config";
import express, { Application, Request, Response, NextFunction } from "express";

import { parseCommand } from "./utils/parser.js";
import { handleCheck } from "./commands/check.js";
import { handleReport, handleReportStep } from "./commands/report.js";
import { handleHelp, sendWelcomeMessage, sendUnknownCommandResponse } from "./commands/help.js";
import { getSession } from "./utils/session.js";
import { markAsRead } from "./utils/whatsapp.js";
import type { WhatsAppWebhookBody, WhatsAppMessage } from "./types/index.js";

const app: Application = express();
const PORT = Number(process.env.PORT ?? 3000);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health & landing ─────────────────────────────────────────────────────────

app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Thappa",
    description: "WhatsApp-first trust scoring platform for India's informal economy",
    version: "1.0.0",
    status: "running",
    commands: ["CHECK <Name> <Phone Last 4>", "REPORT <Name> <Phone Last 4> <Amount> <Status> <Rating>", "HELP <message>"],
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── WhatsApp webhook verification (GET) ─────────────────────────────────────

app.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[Thappa] Webhook verified ✅");
    res.status(200).send(challenge);
  } else {
    console.warn("[Thappa] Webhook verification failed ❌");
    res.sendStatus(403);
  }
});

// ─── WhatsApp webhook (POST) ──────────────────────────────────────────────────

app.post("/webhook", async (req: Request, res: Response) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  const body = req.body as WhatsAppWebhookBody;

  if (body.object !== "whatsapp_business_account") return;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;

      for (const message of value.messages) {
        await processMessage(message).catch((err) => {
          console.error("[Thappa] Error processing message:", err);
        });
      }
    }
  }
});

// ─── Core message processor ───────────────────────────────────────────────────

async function processMessage(message: WhatsAppMessage): Promise<void> {
  if (message.type !== "text" || !message.text?.body) return;

  const senderPhone = message.from;
  const text = message.text.body.trim();

  // Mark as read
  await markAsRead(message.id).catch(() => {/* non-critical */});

  console.log(`[Thappa] Message from ${senderPhone}: "${text}"`);

  const session = getSession(senderPhone);

  // ── If user is mid-REPORT flow, route to step handler ────────────────────
  if (
    session.step !== "idle" &&
    session.step !== "awaiting_payment" &&
    !text.toUpperCase().startsWith("REPORT") &&
    !text.toUpperCase().startsWith("CHECK") &&
    !text.toUpperCase().startsWith("HELP") &&
    !text.toUpperCase().startsWith("CANCEL")
  ) {
    await handleReportStep(senderPhone, text);
    return;
  }

  // ── CANCEL mid-flow ───────────────────────────────────────────────────────
  if (text.toUpperCase() === "CANCEL") {
    const { clearSession } = await import("./utils/session.js");
    clearSession(senderPhone);
    await (await import("./utils/whatsapp.js")).sendTextMessage(
      senderPhone,
      `✅ Cancelled. How can I help you?\n\nSend *HELP* to see available commands.`
    );
    return;
  }

  // ── Parse and route command ───────────────────────────────────────────────
  const cmd = parseCommand(text);

  switch (cmd.type) {
    case "CHECK":
      await handleCheck(senderPhone, cmd);
      break;

    case "REPORT":
      await handleReport(senderPhone, cmd);
      break;

    case "HELP":
      await handleHelp(senderPhone, cmd);
      break;

    case "UNKNOWN": {
      // First-time users get a welcome message
      const isFirstMessage = session.checksUsed === 0 && session.step === "idle";
      if (isFirstMessage && text.length < 10) {
        await sendWelcomeMessage(senderPhone);
      } else {
        await sendUnknownCommandResponse(senderPhone, cmd.raw);
      }
      break;
    }
  }
}

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Thappa] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Thappa server running on port ${PORT}`);
  console.log(`   Webhook: POST /webhook`);
  console.log(`   Health:  GET  /health`);
  console.log(`   Env:     ${process.env.NODE_ENV ?? "development"}\n`);
});

export default app;
