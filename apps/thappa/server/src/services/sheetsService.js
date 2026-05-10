'use strict';

/**
 * sheetsService.js
 * Handles all read/write operations against the Thappa Google Sheets database.
 *
 * Sheet structure:
 *   People       – master directory of tracked individuals
 *   Transactions – every reported interaction
 *   Scores       – running score calculations per person
 *   Users        – platform users (reporters / subscribers)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../logger');

// ─── Auth ────────────────────────────────────────────────────────────────────

let _auth = null;

async function getAuth() {
  if (_auth) return _auth;

  const keyFilePath = path.resolve(config.googleSheets.keyFile);

  if (fs.existsSync(keyFilePath)) {
    // Service-account key file present on disk
    _auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Key provided as an environment variable (JSON string)
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    _auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    throw new Error(
      'Google Sheets credentials not found. ' +
        'Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_SERVICE_ACCOUNT_JSON.'
    );
  }

  return _auth;
}

async function getSheetsClient() {
  const auth = await getAuth();
  return google.sheets({ version: 'v4', auth });
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

/**
 * Read all rows from a named sheet tab.
 * Returns an array of objects keyed by the first-row headers.
 */
async function readSheet(tabName) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range: tabName,
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });
}

/**
 * Append a single row to a named sheet tab.
 * @param {string} tabName
 * @param {Array}  values  – ordered array matching the sheet's column order
 */
async function appendRow(tabName, values) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

/**
 * Update a specific cell range.
 * @param {string} range  – e.g. "People!G5"
 * @param {Array}  values – 2-D array [[val]]
 */
async function updateRange(range, values) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Find the 1-based row index of the first row where column matches value.
 * Returns -1 if not found.
 */
async function findRowIndex(tabName, columnHeader, value) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range: tabName,
  });

  const rows = res.data.values || [];
  if (rows.length < 1) return -1;

  const headers = rows[0].map((h) => h.trim());
  const colIdx = headers.indexOf(columnHeader);
  if (colIdx === -1) return -1;

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][colIdx] || '').toString().trim().toLowerCase() === value.toString().trim().toLowerCase()) {
      return i + 1; // 1-based sheet row
    }
  }
  return -1;
}

// ─── People tab ──────────────────────────────────────────────────────────────

/**
 * People columns:
 *   PersonID | Name | PhoneLast4 | Location | UserType | ThampaScore | Status
 */

async function findPerson(name, phoneLast4) {
  const people = await readSheet(config.googleSheets.tabs.people);
  const nameLower = name.trim().toLowerCase();
  const phone = phoneLast4.trim();

  return people.find(
    (p) =>
      p.Name.toLowerCase().includes(nameLower) &&
      p.PhoneLast4.trim() === phone
  ) || null;
}

async function findPersonById(personId) {
  const people = await readSheet(config.googleSheets.tabs.people);
  return people.find((p) => p.PersonID === personId) || null;
}

async function addPerson({ personId, name, phoneLast4, location, userType }) {
  await appendRow(config.googleSheets.tabs.people, [
    personId,
    name.toUpperCase(),
    phoneLast4,
    location || '',
    userType || 'Worker',
    500, // base score
    'Active',
  ]);
}

async function updatePersonScore(personId, newScore) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range: config.googleSheets.tabs.people,
  });

  const rows = res.data.values || [];
  if (rows.length < 1) return;

  const headers = rows[0].map((h) => h.trim());
  const idCol = headers.indexOf('PersonID');
  const scoreCol = headers.indexOf('ThampaScore');

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][idCol] || '').trim() === personId) {
      const colLetter = columnToLetter(scoreCol + 1);
      await updateRange(
        `${config.googleSheets.tabs.people}!${colLetter}${i + 1}`,
        [[newScore]]
      );
      return;
    }
  }
}

async function getNextPersonId() {
  const people = await readSheet(config.googleSheets.tabs.people);
  if (people.length === 0) return 'P001';
  const ids = people
    .map((p) => parseInt((p.PersonID || 'P000').replace('P', ''), 10))
    .filter((n) => !isNaN(n));
  const max = ids.length ? Math.max(...ids) : 0;
  return `P${String(max + 1).padStart(3, '0')}`;
}

// ─── Transactions tab ────────────────────────────────────────────────────────

/**
 * Transactions columns:
 *   TransactionID | PersonID | ReporterPhone | Amount | PaymentStatus | Rating | Date
 */

async function addTransaction({ txId, personId, reporterPhone, amount, paymentStatus, rating }) {
  const date = new Date().toISOString().split('T')[0];
  await appendRow(config.googleSheets.tabs.transactions, [
    txId,
    personId,
    reporterPhone,
    amount,
    paymentStatus.toUpperCase(),
    rating.toUpperCase(),
    date,
  ]);
}

async function getTransactionsForPerson(personId) {
  const txns = await readSheet(config.googleSheets.tabs.transactions);
  return txns.filter((t) => t.PersonID === personId);
}

async function getNextTransactionId() {
  const txns = await readSheet(config.googleSheets.tabs.transactions);
  if (txns.length === 0) return 'T001';
  const ids = txns
    .map((t) => parseInt((t.TransactionID || 'T000').replace('T', ''), 10))
    .filter((n) => !isNaN(n));
  const max = ids.length ? Math.max(...ids) : 0;
  return `T${String(max + 1).padStart(3, '0')}`;
}

// ─── Scores tab ──────────────────────────────────────────────────────────────

/**
 * Scores columns:
 *   PersonID | TotalTx | Paid | Defaults | Partial | GoodRatings | BadRatings | CompositeScore
 */

async function getScoreRecord(personId) {
  const scores = await readSheet(config.googleSheets.tabs.scores);
  return scores.find((s) => s.PersonID === personId) || null;
}

async function upsertScoreRecord(personId, stats) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range: config.googleSheets.tabs.scores,
  });

  const rows = res.data.values || [];
  const headers = rows[0] ? rows[0].map((h) => h.trim()) : [];
  const idCol = headers.indexOf('PersonID');

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][idCol] || '').trim() === personId) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowData = [
    personId,
    stats.totalTx,
    stats.paid,
    stats.defaults,
    stats.partial,
    stats.goodRatings,
    stats.badRatings,
    stats.compositeScore,
  ];

  if (rowIndex === -1) {
    await appendRow(config.googleSheets.tabs.scores, rowData);
  } else {
    await updateRange(`${config.googleSheets.tabs.scores}!A${rowIndex}`, [rowData]);
  }
}

// ─── Users tab ───────────────────────────────────────────────────────────────

/**
 * Users columns:
 *   Phone | FreeChecksUsed | SubscriptionStatus | SubscriptionExpiry | JoinDate
 */

async function getUser(phone) {
  const users = await readSheet(config.googleSheets.tabs.users);
  return users.find((u) => u.Phone === phone) || null;
}

async function upsertUser(phone, updates) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range: config.googleSheets.tabs.users,
  });

  const rows = res.data.values || [];
  const headers = rows[0] ? rows[0].map((h) => h.trim()) : [];
  const phoneCol = headers.indexOf('Phone');

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][phoneCol] || '').trim() === phone) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    // New user
    const today = new Date().toISOString().split('T')[0];
    await appendRow(config.googleSheets.tabs.users, [
      phone,
      updates.freeChecksUsed || 0,
      updates.subscriptionStatus || 'Free',
      updates.subscriptionExpiry || '',
      today,
    ]);
  } else {
    // Update existing — patch only provided fields
    const existing = {};
    headers.forEach((h, i) => {
      existing[h] = rows[rowIndex - 1][i] || '';
    });

    const rowData = [
      phone,
      updates.freeChecksUsed !== undefined ? updates.freeChecksUsed : existing.FreeChecksUsed,
      updates.subscriptionStatus || existing.SubscriptionStatus,
      updates.subscriptionExpiry || existing.SubscriptionExpiry,
      existing.JoinDate,
    ];
    await updateRange(`${config.googleSheets.tabs.users}!A${rowIndex}`, [rowData]);
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function columnToLetter(col) {
  let letter = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // People
  findPerson,
  findPersonById,
  addPerson,
  updatePersonScore,
  getNextPersonId,
  // Transactions
  addTransaction,
  getTransactionsForPerson,
  getNextTransactionId,
  // Scores
  getScoreRecord,
  upsertScoreRecord,
  // Users
  getUser,
  upsertUser,
  // Generic
  readSheet,
  appendRow,
  updateRange,
};
