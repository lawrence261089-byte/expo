// ─── Person (People tab) ────────────────────────────────────────────────────

export type UserType = "shopkeeper" | "employer" | "worker" | "domestic" | "other";
export type AccountStatus = "Active" | "Blocked" | "Under Review";

export interface Person {
  id: string;           // P001, P002 …
  name: string;
  phoneLast4: string;   // last 4 digits only — no full numbers stored
  location: string;
  userType: UserType;
  score: number;        // 0–1000
  status: AccountStatus;
  createdAt: string;    // ISO date string
}

// ─── Transaction (Transactions tab) ─────────────────────────────────────────

export type PaymentStatus = "PAID" | "NOT PAID" | "PARTIAL";
export type QualityRating = "GOOD" | "BAD" | "NEUTRAL";

export interface Transaction {
  id: string;           // T001, T002 …
  personId: string;     // FK → Person.id
  reporterPhone: string; // last 4 digits of reporter
  amount: number;
  paymentStatus: PaymentStatus;
  qualityRating: QualityRating;
  reportedAt: string;   // ISO date string
  notes?: string;
}

// ─── Score record (Scores tab) ───────────────────────────────────────────────

export interface ScoreRecord {
  personId: string;
  totalTransactions: number;
  paid: number;
  defaults: number;
  partial: number;
  goodRatings: number;
  badRatings: number;
  compositeScore: number;
  lastUpdated: string;
}

// ─── User session (in-memory, for multi-step REPORT flow) ───────────────────

export type SessionStep =
  | "idle"
  | "report_name"
  | "report_phone"
  | "report_amount"
  | "report_status"
  | "report_rating"
  | "awaiting_payment";

export interface UserSession {
  senderPhone: string;
  step: SessionStep;
  data: Partial<{
    name: string;
    phoneLast4: string;
    amount: number;
    paymentStatus: PaymentStatus;
    qualityRating: QualityRating;
  }>;
  checksUsed: number;
  isSubscribed: boolean;
  subscriptionExpiry?: string;
  updatedAt: number; // Date.now()
}

// ─── WhatsApp Cloud API payloads ─────────────────────────────────────────────

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "document" | "interactive";
  text?: { body: string };
}

export interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppMessage[];
        statuses?: unknown[];
      };
      field: string;
    }>;
  }>;
}

// ─── Command parse results ───────────────────────────────────────────────────

export interface CheckCommand {
  type: "CHECK";
  name: string;
  phoneLast4: string;
}

export interface ReportCommand {
  type: "REPORT";
  name?: string;
  phoneLast4?: string;
  amount?: number;
  paymentStatus?: PaymentStatus;
  qualityRating?: QualityRating;
}

export interface HelpCommand {
  type: "HELP";
  message: string;
}

export interface UnknownCommand {
  type: "UNKNOWN";
  raw: string;
}

export type ParsedCommand = CheckCommand | ReportCommand | HelpCommand | UnknownCommand;
