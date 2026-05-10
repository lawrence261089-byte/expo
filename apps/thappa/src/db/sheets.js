/**
 * Google Sheets Database Layer
 * Handles all read/write operations to the three core sheets:
 *   - People   (master directory)
 *   - Transactions (interaction log)
 *   - Scores   (running calculations)
 */

const { google } = require('googleapis');
const logger = require('../utils/logger');

// ─── Auth ─────────────────────────────────────────────────────────────────────
function getAuth() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : null;

  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// ─── Sheet Names ──────────────────────────────────────────────────────────────
const SHEETS = {
  PEOPLE: 'People',
  TRANSACTIONS: 'Transactions',
  SCORES: 'Scores',
};

// ─── Column Indices (0-based) ─────────────────────────────────────────────────
const PEOPLE_COLS = {
  ID: 0,           // P001, P002 ...
  NAME: 1,         // Full name
  PHONE_LAST4: 2,  // Last 4 digits only
  LOCATION: 3,     // City/Area
  USER_TYPE: 4,    // Worker | Shopkeeper | Employer
  SCORE: 5,        // 0–1000
  STATUS: 6,       // Active | Blocked | Under Review
  CREATED_AT: 7,
  UPDATED_AT: 8,
};

const TXN_COLS = {
  ID: 0,           // T001, T002 ...
  PERSON_ID: 1,    // FK → People.ID
  REPORTER_PHONE: 2,
  AMOUNT: 3,
  STATUS: 4,       // PAID | NOT_PAID | PARTIAL
  RATING: 5,       // GOOD | BAD | NEUTRAL
  NOTES: 6,
  DATE: 7,
};

const SCORE_COLS = {
  PERSON_ID: 0,
  TOTAL_TXN: 1,
  PAID: 2,
  DEFAULTS: 3,
  PARTIAL: 4,
  GOOD_RATINGS: 5,
  BAD_RATINGS: 6,
  COMPOSITE_SCORE: 7,
  LAST_UPDATED: 8,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function readSheet(sheetName, range = '') {
  const sheets = getSheetsClient();
  const fullRange = range ? `${sheetName}!${range}` : `${sheetName}`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: fullRange,
  });
  return response.data.values || [];
}

async function appendRow(sheetName, values) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

async function updateRow(sheetName, rowIndex, values) {
  // rowIndex is 1-based (Google Sheets row number)
  const sheets = getSheetsClient();
  const colLetter = String.fromCharCode(64 + values.length); // A=1, B=2 ...
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}:${colLetter}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

async function getNextId(sheetName, prefix) {
  const rows = await readSheet(sheetName);
  const dataRows = rows.slice(1); // skip header
  if (dataRows.length === 0) return `${prefix}001`;
  const lastId = dataRows[dataRows.length - 1][0] || `${prefix}000`;
  const num = parseInt(lastId.replace(prefix, ''), 10) + 1;
  return `${prefix}${String(num).padStart(3, '0')}`;
}

// ─── People Operations ────────────────────────────────────────────────────────

/**
 * Find a person by name + last 4 digits of phone
 * Returns { person, rowIndex } or null
 */
async function findPerson(name, phoneLast4) {
  const rows = await readSheet(SHEETS.PEOPLE);
  const header = rows[0];
  const dataRows = rows.slice(1);

  const nameLower = name.toLowerCase().trim();
  const phone = String(phoneLast4).trim();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowName = (row[PEOPLE_COLS.NAME] || '').toLowerCase().trim();
    const rowPhone = String(row[PEOPLE_COLS.PHONE_LAST4] || '').trim();

    // Fuzzy name match: check if query name is contained in stored name or vice versa
    const nameMatch = rowName.includes(nameLower) || nameLower.includes(rowName);
    const phoneMatch = rowPhone === phone;

    if (nameMatch && phoneMatch) {
      return {
        person: {
          id: row[PEOPLE_COLS.ID],
          name: row[PEOPLE_COLS.NAME],
          phoneLast4: row[PEOPLE_COLS.PHONE_LAST4],
          location: row[PEOPLE_COLS.LOCATION],
          userType: row[PEOPLE_COLS.USER_TYPE],
          score: parseInt(row[PEOPLE_COLS.SCORE] || '500', 10),
          status: row[PEOPLE_COLS.STATUS] || 'Active',
          createdAt: row[PEOPLE_COLS.CREATED_AT],
          updatedAt: row[PEOPLE_COLS.UPDATED_AT],
        },
        rowIndex: i + 2, // +1 for header, +1 for 1-based
      };
    }
  }
  return null;
}

/**
 * Find person by ID
 */
async function findPersonById(personId) {
  const rows = await readSheet(SHEETS.PEOPLE);
  const dataRows = rows.slice(1);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row[PEOPLE_COLS.ID] === personId) {
      return {
        person: {
          id: row[PEOPLE_COLS.ID],
          name: row[PEOPLE_COLS.NAME],
          phoneLast4: row[PEOPLE_COLS.PHONE_LAST4],
          location: row[PEOPLE_COLS.LOCATION],
          userType: row[PEOPLE_COLS.USER_TYPE],
          score: parseInt(row[PEOPLE_COLS.SCORE] || '500', 10),
          status: row[PEOPLE_COLS.STATUS] || 'Active',
        },
        rowIndex: i + 2,
      };
    }
  }
  return null;
}

/**
 * Create a new person record
 */
async function createPerson({ name, phoneLast4, location = '', userType = 'Worker' }) {
  const id = await getNextId(SHEETS.PEOPLE, 'P');
  const now = new Date().toISOString();
  const row = [id, name.toUpperCase(), phoneLast4, location, userType, 500, 'Active', now, now];
  await appendRow(SHEETS.PEOPLE, row);
  logger.info(`Created person: ${id} - ${name}`);
  return { id, name: name.toUpperCase(), phoneLast4, location, userType, score: 500, status: 'Active' };
}

/**
 * Update person's score and status
 */
async function updatePersonScore(personId, newScore, status = null) {
  const result = await findPersonById(personId);
  if (!result) throw new Error(`Person ${personId} not found`);

  const { person, rowIndex } = result;
  const updatedScore = Math.max(0, Math.min(1000, newScore));
  const updatedStatus = status || person.status;
  const now = new Date().toISOString();

  const updatedRow = [
    person.id,
    person.name,
    person.phoneLast4,
    person.location,
    person.userType,
    updatedScore,
    updatedStatus,
    person.createdAt,
    now,
  ];

  await updateRow(SHEETS.PEOPLE, rowIndex, updatedRow);
  logger.info(`Updated score for ${personId}: ${person.score} → ${updatedScore}`);
  return { ...person, score: updatedScore, status: updatedStatus };
}

// ─── Transaction Operations ───────────────────────────────────────────────────

/**
 * Log a new transaction
 */
async function logTransaction({ personId, reporterPhone, amount, status, rating, notes = '' }) {
  const id = await getNextId(SHEETS.TRANSACTIONS, 'T');
  const date = new Date().toISOString();
  const row = [id, personId, reporterPhone, amount, status, rating, notes, date];
  await appendRow(SHEETS.TRANSACTIONS, row);
  logger.info(`Logged transaction: ${id} for person ${personId}`);
  return { id, personId, reporterPhone, amount, status, rating, notes, date };
}

/**
 * Get all transactions for a person
 */
async function getTransactionsForPerson(personId) {
  const rows = await readSheet(SHEETS.TRANSACTIONS);
  const dataRows = rows.slice(1);

  return dataRows
    .filter(row => row[TXN_COLS.PERSON_ID] === personId)
    .map(row => ({
      id: row[TXN_COLS.ID],
      personId: row[TXN_COLS.PERSON_ID],
      reporterPhone: row[TXN_COLS.REPORTER_PHONE],
      amount: parseFloat(row[TXN_COLS.AMOUNT] || '0'),
      status: row[TXN_COLS.STATUS],
      rating: row[TXN_COLS.RATING],
      notes: row[TXN_COLS.NOTES],
      date: row[TXN_COLS.DATE],
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first
}

/**
 * Get recent transactions (last N)
 */
async function getRecentTransactions(personId, limit = 5) {
  const all = await getTransactionsForPerson(personId);
  return all.slice(0, limit);
}

// ─── Score Operations ─────────────────────────────────────────────────────────

/**
 * Get score record for a person
 */
async function getScoreRecord(personId) {
  const rows = await readSheet(SHEETS.SCORES);
  const dataRows = rows.slice(1);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row[SCORE_COLS.PERSON_ID] === personId) {
      return {
        record: {
          personId: row[SCORE_COLS.PERSON_ID],
          totalTxn: parseInt(row[SCORE_COLS.TOTAL_TXN] || '0', 10),
          paid: parseInt(row[SCORE_COLS.PAID] || '0', 10),
          defaults: parseInt(row[SCORE_COLS.DEFAULTS] || '0', 10),
          partial: parseInt(row[SCORE_COLS.PARTIAL] || '0', 10),
          goodRatings: parseInt(row[SCORE_COLS.GOOD_RATINGS] || '0', 10),
          badRatings: parseInt(row[SCORE_COLS.BAD_RATINGS] || '0', 10),
          compositeScore: parseInt(row[SCORE_COLS.COMPOSITE_SCORE] || '500', 10),
          lastUpdated: row[SCORE_COLS.LAST_UPDATED],
        },
        rowIndex: i + 2,
      };
    }
  }
  return null;
}

/**
 * Upsert score record
 */
async function upsertScoreRecord(personId, scoreData) {
  const existing = await getScoreRecord(personId);
  const now = new Date().toISOString();
  const row = [
    personId,
    scoreData.totalTxn,
    scoreData.paid,
    scoreData.defaults,
    scoreData.partial,
    scoreData.goodRatings,
    scoreData.badRatings,
    scoreData.compositeScore,
    now,
  ];

  if (existing) {
    await updateRow(SHEETS.SCORES, existing.rowIndex, row);
  } else {
    await appendRow(SHEETS.SCORES, row);
  }
  return scoreData;
}

// ─── Sheet Initialization ─────────────────────────────────────────────────────

/**
 * Initialize sheets with headers if they don't exist
 */
async function initializeSheets() {
  const sheets = getSheetsClient();

  const headers = {
    [SHEETS.PEOPLE]: [
      ['ID', 'Name', 'Phone Last 4', 'Location', 'User Type', 'Score', 'Status', 'Created At', 'Updated At'],
    ],
    [SHEETS.TRANSACTIONS]: [
      ['ID', 'Person ID', 'Reporter Phone', 'Amount', 'Status', 'Rating', 'Notes', 'Date'],
    ],
    [SHEETS.SCORES]: [
      ['Person ID', 'Total Transactions', 'Paid', 'Defaults', 'Partial', 'Good Ratings', 'Bad Ratings', 'Composite Score', 'Last Updated'],
    ],
  };

  for (const [sheetName, headerRows] of Object.entries(headers)) {
    try {
      const existing = await readSheet(sheetName, 'A1:I1');
      if (!existing || existing.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: headerRows },
        });
        logger.info(`Initialized headers for sheet: ${sheetName}`);
      }
    } catch (err) {
      logger.warn(`Could not initialize sheet ${sheetName}: ${err.message}`);
    }
  }
}

module.exports = {
  findPerson,
  findPersonById,
  createPerson,
  updatePersonScore,
  logTransaction,
  getTransactionsForPerson,
  getRecentTransactions,
  getScoreRecord,
  upsertScoreRecord,
  initializeSheets,
  readSheet,
  SHEETS,
};
