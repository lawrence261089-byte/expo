/**
 * Google Sheets database layer for Thappa.
 *
 * Sheet structure:
 *   Tab 1 – "People"       : master directory
 *   Tab 2 – "Transactions" : every reported interaction
 *   Tab 3 – "Scores"       : running score calculations
 *   Tab 4 – "Users"        : WhatsApp user sessions / subscription state
 */

import { google, sheets_v4 } from "googleapis";
import type {
  Person,
  Transaction,
  ScoreRecord,
  AccountStatus,
  PaymentStatus,
  QualityRating,
  UserType,
} from "../types/index.js";

// ─── Auth ────────────────────────────────────────────────────────────────────

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars"
    );
  }

  return new google.auth.JWT(email, undefined, key, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
}

function getSheets(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SHEET_ID = () => {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEETS_ID env var");
  return id;
};

// ─── Generic helpers ─────────────────────────────────────────────────────────

async function readRange(range: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range,
  });
  return (res.data.values as string[][]) ?? [];
}

async function appendRow(range: string, values: (string | number)[]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

async function updateCell(range: string, value: string | number): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

// ─── People tab ──────────────────────────────────────────────────────────────

/**
 * Row layout: id | name | phoneLast4 | location | userType | score | status | createdAt
 */
function rowToPerson(row: string[]): Person {
  return {
    id: row[0] ?? "",
    name: row[1] ?? "",
    phoneLast4: row[2] ?? "",
    location: row[3] ?? "",
    userType: (row[4] as UserType) ?? "other",
    score: Number(row[5] ?? 500),
    status: (row[6] as AccountStatus) ?? "Active",
    createdAt: row[7] ?? new Date().toISOString(),
  };
}

export async function findPerson(
  name: string,
  phoneLast4: string
): Promise<Person | null> {
  const rows = await readRange("People!A2:H");
  const nameLower = name.toLowerCase().trim();

  for (const row of rows) {
    if (
      row[1]?.toLowerCase().trim() === nameLower &&
      row[2]?.trim() === phoneLast4.trim()
    ) {
      return rowToPerson(row);
    }
  }
  return null;
}

export async function findPersonById(id: string): Promise<Person | null> {
  const rows = await readRange("People!A2:H");
  const row = rows.find((r) => r[0] === id);
  return row ? rowToPerson(row) : null;
}

export async function createPerson(
  person: Omit<Person, "id" | "createdAt">
): Promise<Person> {
  const rows = await readRange("People!A2:A");
  const nextNum = rows.length + 1;
  const id = `P${String(nextNum).padStart(3, "0")}`;
  const createdAt = new Date().toISOString();

  await appendRow("People!A:H", [
    id,
    person.name,
    person.phoneLast4,
    person.location,
    person.userType,
    person.score,
    person.status,
    createdAt,
  ]);

  return { ...person, id, createdAt };
}

export async function updatePersonScore(
  personId: string,
  newScore: number
): Promise<void> {
  const rows = await readRange("People!A2:A");
  const rowIndex = rows.findIndex((r) => r[0] === personId);
  if (rowIndex === -1) return;

  // Row 2 is index 0, so actual sheet row = rowIndex + 2
  const sheetRow = rowIndex + 2;
  await updateCell(`People!F${sheetRow}`, newScore);
}

// ─── Transactions tab ────────────────────────────────────────────────────────

/**
 * Row layout: id | personId | reporterPhone | amount | paymentStatus | qualityRating | reportedAt | notes
 */
function rowToTransaction(row: string[]): Transaction {
  return {
    id: row[0] ?? "",
    personId: row[1] ?? "",
    reporterPhone: row[2] ?? "",
    amount: Number(row[3] ?? 0),
    paymentStatus: (row[4] as PaymentStatus) ?? "PAID",
    qualityRating: (row[5] as QualityRating) ?? "NEUTRAL",
    reportedAt: row[6] ?? new Date().toISOString(),
    notes: row[7] ?? "",
  };
}

export async function getTransactionsForPerson(
  personId: string
): Promise<Transaction[]> {
  const rows = await readRange("Transactions!A2:H");
  return rows
    .filter((r) => r[1] === personId)
    .map(rowToTransaction)
    .sort((a, b) => (a.reportedAt > b.reportedAt ? -1 : 1)); // newest first
}

export async function addTransaction(
  tx: Omit<Transaction, "id">
): Promise<Transaction> {
  const rows = await readRange("Transactions!A2:A");
  const nextNum = rows.length + 1;
  const id = `T${String(nextNum).padStart(4, "0")}`;

  await appendRow("Transactions!A:H", [
    id,
    tx.personId,
    tx.reporterPhone,
    tx.amount,
    tx.paymentStatus,
    tx.qualityRating,
    tx.reportedAt,
    tx.notes ?? "",
  ]);

  return { ...tx, id };
}

// ─── Scores tab ──────────────────────────────────────────────────────────────

/**
 * Row layout: personId | total | paid | defaults | partial | goodRatings | badRatings | compositeScore | lastUpdated
 */
function rowToScore(row: string[]): ScoreRecord {
  return {
    personId: row[0] ?? "",
    totalTransactions: Number(row[1] ?? 0),
    paid: Number(row[2] ?? 0),
    defaults: Number(row[3] ?? 0),
    partial: Number(row[4] ?? 0),
    goodRatings: Number(row[5] ?? 0),
    badRatings: Number(row[6] ?? 0),
    compositeScore: Number(row[7] ?? 500),
    lastUpdated: row[8] ?? new Date().toISOString(),
  };
}

export async function getScoreRecord(
  personId: string
): Promise<ScoreRecord | null> {
  const rows = await readRange("Scores!A2:I");
  const row = rows.find((r) => r[0] === personId);
  return row ? rowToScore(row) : null;
}

export async function upsertScoreRecord(record: ScoreRecord): Promise<void> {
  const rows = await readRange("Scores!A2:A");
  const rowIndex = rows.findIndex((r) => r[0] === record.personId);

  const values: (string | number)[] = [
    record.personId,
    record.totalTransactions,
    record.paid,
    record.defaults,
    record.partial,
    record.goodRatings,
    record.badRatings,
    record.compositeScore,
    record.lastUpdated,
  ];

  if (rowIndex === -1) {
    await appendRow("Scores!A:I", values);
  } else {
    const sheetRow = rowIndex + 2;
    const sheets = getSheets();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `Scores!A${sheetRow}:I${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
  }
}

// ─── Users tab (WhatsApp user state) ─────────────────────────────────────────

/**
 * Row layout: phone | checksUsed | isSubscribed | subscriptionExpiry | updatedAt
 */
export interface UserRecord {
  phone: string;
  checksUsed: number;
  isSubscribed: boolean;
  subscriptionExpiry: string;
  updatedAt: string;
}

function rowToUser(row: string[]): UserRecord {
  return {
    phone: row[0] ?? "",
    checksUsed: Number(row[1] ?? 0),
    isSubscribed: row[2] === "TRUE",
    subscriptionExpiry: row[3] ?? "",
    updatedAt: row[4] ?? new Date().toISOString(),
  };
}

export async function getUser(phone: string): Promise<UserRecord> {
  const rows = await readRange("Users!A2:E");
  const row = rows.find((r) => r[0] === phone);
  if (row) return rowToUser(row);

  // Auto-create on first contact
  const newUser: UserRecord = {
    phone,
    checksUsed: 0,
    isSubscribed: false,
    subscriptionExpiry: "",
    updatedAt: new Date().toISOString(),
  };
  await appendRow("Users!A:E", [
    newUser.phone,
    newUser.checksUsed,
    "FALSE",
    "",
    newUser.updatedAt,
  ]);
  return newUser;
}

export async function updateUser(user: UserRecord): Promise<void> {
  const rows = await readRange("Users!A2:A");
  const rowIndex = rows.findIndex((r) => r[0] === user.phone);
  if (rowIndex === -1) return;

  const sheetRow = rowIndex + 2;
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `Users!A${sheetRow}:E${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          user.phone,
          user.checksUsed,
          user.isSubscribed ? "TRUE" : "FALSE",
          user.subscriptionExpiry,
          new Date().toISOString(),
        ],
      ],
    },
  });
}
