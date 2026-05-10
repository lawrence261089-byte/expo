/**
 * In-memory mock data store
 * Used when Google Sheets credentials are not configured.
 * Provides the same interface as sheets.js so the rest of the app works seamlessly.
 */

const logger = require('../utils/logger');

// ─── In-memory tables (pre-seeded with demo data) ────────────────────────────
let people = [
  { id: 'P001', name: 'RAJESH KUMAR',   phoneLast4: '9823', location: 'Delhi',   userType: 'Worker',      score: 820, status: 'Active',       createdAt: '2026-01-10T08:00:00.000Z', updatedAt: '2026-05-01T10:00:00.000Z' },
  { id: 'P002', name: 'RANI DEVI',      phoneLast4: '9876', location: 'Mumbai',  userType: 'Shopkeeper',  score: 650, status: 'Active',       createdAt: '2026-01-15T09:00:00.000Z', updatedAt: '2026-04-20T11:00:00.000Z' },
  { id: 'P003', name: 'SURESH SHARMA',  phoneLast4: '4512', location: 'Jaipur',  userType: 'Employer',    score: 430, status: 'Active',       createdAt: '2026-02-01T07:00:00.000Z', updatedAt: '2026-04-15T09:00:00.000Z' },
  { id: 'P004', name: 'MEENA PATEL',    phoneLast4: '7731', location: 'Surat',   userType: 'Worker',      score: 210, status: 'Under Review', createdAt: '2026-02-10T10:00:00.000Z', updatedAt: '2026-05-05T08:00:00.000Z' },
  { id: 'P005', name: 'AMIT SINGH',     phoneLast4: '3390', location: 'Lucknow', userType: 'Worker',      score: 760, status: 'Active',       createdAt: '2026-03-01T08:00:00.000Z', updatedAt: '2026-05-08T12:00:00.000Z' },
];

let transactions = [
  { id: 'T001', personId: 'P001', reporterPhone: '919000000001', amount: 500,  status: 'PAID',     rating: 'GOOD',    notes: 'On time',        date: '2026-04-01T10:00:00.000Z' },
  { id: 'T002', personId: 'P001', reporterPhone: '919000000002', amount: 1200, status: 'PAID',     rating: 'GOOD',    notes: '',               date: '2026-04-15T11:00:00.000Z' },
  { id: 'T003', personId: 'P001', reporterPhone: '919000000003', amount: 300,  status: 'PAID',     rating: 'NEUTRAL', notes: '',               date: '2026-05-01T09:00:00.000Z' },
  { id: 'T004', personId: 'P002', reporterPhone: '919000000001', amount: 800,  status: 'PAID',     rating: 'GOOD',    notes: 'Reliable',       date: '2026-04-10T08:00:00.000Z' },
  { id: 'T005', personId: 'P002', reporterPhone: '919000000004', amount: 200,  status: 'PARTIAL',  rating: 'NEUTRAL', notes: 'Paid half',      date: '2026-04-25T14:00:00.000Z' },
  { id: 'T006', personId: 'P003', reporterPhone: '919000000002', amount: 600,  status: 'PAID',     rating: 'NEUTRAL', notes: '',               date: '2026-03-20T10:00:00.000Z' },
  { id: 'T007', personId: 'P003', reporterPhone: '919000000005', amount: 400,  status: 'NOT_PAID', rating: 'BAD',     notes: 'Disappeared',    date: '2026-04-05T09:00:00.000Z' },
  { id: 'T008', personId: 'P004', reporterPhone: '919000000003', amount: 1000, status: 'NOT_PAID', rating: 'BAD',     notes: 'No response',    date: '2026-03-15T11:00:00.000Z' },
  { id: 'T009', personId: 'P004', reporterPhone: '919000000006', amount: 500,  status: 'NOT_PAID', rating: 'BAD',     notes: 'Blocked calls',  date: '2026-04-01T10:00:00.000Z' },
  { id: 'T010', personId: 'P005', reporterPhone: '919000000001', amount: 700,  status: 'PAID',     rating: 'GOOD',    notes: 'Early payment',  date: '2026-04-20T08:00:00.000Z' },
  { id: 'T011', personId: 'P005', reporterPhone: '919000000002', amount: 350,  status: 'PAID',     rating: 'GOOD',    notes: '',               date: '2026-05-05T10:00:00.000Z' },
];

let scores = [
  { personId: 'P001', totalTxn: 3, paid: 3, defaults: 0, partial: 0, goodRatings: 2, badRatings: 0, compositeScore: 820, lastUpdated: '2026-05-01T10:00:00.000Z' },
  { personId: 'P002', totalTxn: 2, paid: 1, defaults: 0, partial: 1, goodRatings: 1, badRatings: 0, compositeScore: 650, lastUpdated: '2026-04-25T14:00:00.000Z' },
  { personId: 'P003', totalTxn: 2, paid: 1, defaults: 1, partial: 0, goodRatings: 0, badRatings: 1, compositeScore: 430, lastUpdated: '2026-04-05T09:00:00.000Z' },
  { personId: 'P004', totalTxn: 2, paid: 0, defaults: 2, partial: 0, goodRatings: 0, badRatings: 2, compositeScore: 210, lastUpdated: '2026-04-01T10:00:00.000Z' },
  { personId: 'P005', totalTxn: 2, paid: 2, defaults: 0, partial: 0, goodRatings: 2, badRatings: 0, compositeScore: 760, lastUpdated: '2026-05-05T10:00:00.000Z' },
];

// ─── ID generators ────────────────────────────────────────────────────────────
function nextId(prefix, list) {
  if (list.length === 0) return `${prefix}001`;
  const last = list[list.length - 1].id || `${prefix}000`;
  const num = parseInt(last.replace(prefix, ''), 10) + 1;
  return `${prefix}${String(num).padStart(3, '0')}`;
}

// ─── People ───────────────────────────────────────────────────────────────────
function findPerson(name, phoneLast4) {
  const nameLower = name.toLowerCase().trim();
  const phone = String(phoneLast4).trim();

  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const rowName = (p.name || '').toLowerCase().trim();
    const rowPhone = String(p.phoneLast4 || '').trim();
    const nameMatch = rowName.includes(nameLower) || nameLower.includes(rowName);
    if (nameMatch && rowPhone === phone) {
      return { person: { ...p }, rowIndex: i + 2 };
    }
  }
  return null;
}

function findPersonById(personId) {
  const i = people.findIndex(p => p.id === personId);
  if (i === -1) return null;
  return { person: { ...people[i] }, rowIndex: i + 2 };
}

function createPerson({ name, phoneLast4, location = '', userType = 'Worker' }) {
  const id = nextId('P', people);
  const now = new Date().toISOString();
  const person = { id, name: name.toUpperCase(), phoneLast4, location, userType, score: 500, status: 'Active', createdAt: now, updatedAt: now };
  people.push(person);
  logger.info(`[mock] Created person: ${id} - ${name}`);
  return person;
}

function updatePersonScore(personId, newScore, status = null) {
  const i = people.findIndex(p => p.id === personId);
  if (i === -1) throw new Error(`Person ${personId} not found`);
  const updatedScore = Math.max(0, Math.min(1000, newScore));
  people[i] = { ...people[i], score: updatedScore, status: status || people[i].status, updatedAt: new Date().toISOString() };
  logger.info(`[mock] Updated score for ${personId}: ${updatedScore}`);
  return { ...people[i] };
}

// ─── Transactions ─────────────────────────────────────────────────────────────
function logTransaction({ personId, reporterPhone, amount, status, rating, notes = '' }) {
  const id = nextId('T', transactions);
  const date = new Date().toISOString();
  const txn = { id, personId, reporterPhone, amount, status, rating, notes, date };
  transactions.push(txn);
  logger.info(`[mock] Logged transaction: ${id} for person ${personId}`);
  return txn;
}

function getTransactionsForPerson(personId) {
  return transactions
    .filter(t => t.personId === personId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getRecentTransactions(personId, limit = 5) {
  return getTransactionsForPerson(personId).slice(0, limit);
}

// ─── Scores ───────────────────────────────────────────────────────────────────
function getScoreRecord(personId) {
  const i = scores.findIndex(s => s.personId === personId);
  if (i === -1) return null;
  return { record: { ...scores[i] }, rowIndex: i + 2 };
}

function upsertScoreRecord(personId, scoreData) {
  const now = new Date().toISOString();
  const record = { personId, ...scoreData, lastUpdated: now };
  const i = scores.findIndex(s => s.personId === personId);
  if (i === -1) {
    scores.push(record);
  } else {
    scores[i] = record;
  }
  return scoreData;
}

// ─── Sheet reads (for API routes that read raw rows) ──────────────────────────
const SHEETS = {
  PEOPLE: 'People',
  TRANSACTIONS: 'Transactions',
  SCORES: 'Scores',
};

function readSheet(sheetName) {
  if (sheetName === SHEETS.PEOPLE) {
    const header = [['ID', 'Name', 'Phone Last 4', 'Location', 'User Type', 'Score', 'Status', 'Created At', 'Updated At']];
    const rows = people.map(p => [p.id, p.name, p.phoneLast4, p.location, p.userType, String(p.score), p.status, p.createdAt, p.updatedAt]);
    return [...header, ...rows];
  }
  if (sheetName === SHEETS.TRANSACTIONS) {
    const header = [['ID', 'Person ID', 'Reporter Phone', 'Amount', 'Status', 'Rating', 'Notes', 'Date']];
    const rows = transactions.map(t => [t.id, t.personId, t.reporterPhone, String(t.amount), t.status, t.rating, t.notes, t.date]);
    return [...header, ...rows];
  }
  if (sheetName === SHEETS.SCORES) {
    const header = [['Person ID', 'Total Transactions', 'Paid', 'Defaults', 'Partial', 'Good Ratings', 'Bad Ratings', 'Composite Score', 'Last Updated']];
    const rows = scores.map(s => [s.personId, String(s.totalTxn), String(s.paid), String(s.defaults), String(s.partial), String(s.goodRatings), String(s.badRatings), String(s.compositeScore), s.lastUpdated]);
    return [...header, ...rows];
  }
  return [[]];
}

function initializeSheets() {
  logger.info('[mock] In-memory store initialized (no Google Sheets credentials)');
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
