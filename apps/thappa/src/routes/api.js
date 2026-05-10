/**
 * REST API Routes
 *
 * Used by the admin dashboard and external integrations.
 */

const express = require('express');
const router = express.Router();
const db = require('../db/sheets');
const { recalculateScore, getRiskBand } = require('../scoring/algorithm');
const logger = require('../utils/logger');

// ─── Simple API key auth middleware ──────────────────────────────────────────
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!process.env.ADMIN_API_KEY || key === process.env.ADMIN_API_KEY) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

router.use(requireApiKey);

// ─── GET /api/people ──────────────────────────────────────────────────────────
router.get('/people', async (req, res, next) => {
  try {
    const rows = await db.readSheet(db.SHEETS.PEOPLE);
    const headers = rows[0] || [];
    const people = rows.slice(1).map(row => ({
      id: row[0], name: row[1], phoneLast4: row[2],
      location: row[3], userType: row[4],
      score: parseInt(row[5] || '500', 10),
      status: row[6], createdAt: row[7], updatedAt: row[8],
    }));
    res.json({ count: people.length, people });
  } catch (err) { next(err); }
});

// ─── GET /api/people/:id ──────────────────────────────────────────────────────
router.get('/people/:id', async (req, res, next) => {
  try {
    const result = await db.findPersonById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Person not found' });

    const [scoreResult, transactions] = await Promise.all([
      db.getScoreRecord(req.params.id),
      db.getTransactionsForPerson(req.params.id),
    ]);

    const band = getRiskBand(result.person.score);

    res.json({
      person: result.person,
      scoreData: scoreResult?.record || null,
      band,
      transactions,
    });
  } catch (err) { next(err); }
});

// ─── POST /api/people ─────────────────────────────────────────────────────────
router.post('/people', async (req, res, next) => {
  try {
    const { name, phoneLast4, location, userType } = req.body;
    if (!name || !phoneLast4) {
      return res.status(400).json({ error: 'name and phoneLast4 are required' });
    }
    const person = await db.createPerson({ name, phoneLast4, location, userType });
    res.status(201).json({ person });
  } catch (err) { next(err); }
});

// ─── GET /api/transactions ────────────────────────────────────────────────────
router.get('/transactions', async (req, res, next) => {
  try {
    const rows = await db.readSheet(db.SHEETS.TRANSACTIONS);
    const transactions = rows.slice(1).map(row => ({
      id: row[0], personId: row[1], reporterPhone: row[2],
      amount: parseFloat(row[3] || '0'), status: row[4],
      rating: row[5], notes: row[6], date: row[7],
    }));
    res.json({ count: transactions.length, transactions });
  } catch (err) { next(err); }
});

// ─── POST /api/transactions ───────────────────────────────────────────────────
router.post('/transactions', async (req, res, next) => {
  try {
    const { personId, reporterPhone, amount, status, rating, notes } = req.body;
    if (!personId || !amount || !status || !rating) {
      return res.status(400).json({ error: 'personId, amount, status, rating are required' });
    }

    const txn = await db.logTransaction({ personId, reporterPhone, amount, status, rating, notes });
    const scoreResult = await recalculateScore(personId);

    res.status(201).json({ transaction: txn, scoreUpdate: scoreResult });
  } catch (err) { next(err); }
});

// ─── GET /api/scores ──────────────────────────────────────────────────────────
router.get('/scores', async (req, res, next) => {
  try {
    const rows = await db.readSheet(db.SHEETS.SCORES);
    const scores = rows.slice(1).map(row => ({
      personId: row[0], totalTxn: parseInt(row[1] || '0', 10),
      paid: parseInt(row[2] || '0', 10), defaults: parseInt(row[3] || '0', 10),
      partial: parseInt(row[4] || '0', 10), goodRatings: parseInt(row[5] || '0', 10),
      badRatings: parseInt(row[6] || '0', 10),
      compositeScore: parseInt(row[7] || '500', 10),
      lastUpdated: row[8],
    }));
    res.json({ count: scores.length, scores });
  } catch (err) { next(err); }
});

// ─── POST /api/scores/recalculate/:personId ───────────────────────────────────
router.post('/scores/recalculate/:personId', async (req, res, next) => {
  try {
    const personResult = await db.findPersonById(req.params.personId);
    if (!personResult) return res.status(404).json({ error: 'Person not found' });
    const result = await recalculateScore(req.params.personId);
    res.json(result);
  } catch (err) { next(err); }
});

// ─── GET /api/stats ───────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [peopleRows, txnRows, scoreRows] = await Promise.all([
      db.readSheet(db.SHEETS.PEOPLE),
      db.readSheet(db.SHEETS.TRANSACTIONS),
      db.readSheet(db.SHEETS.SCORES),
    ]);

    const people = peopleRows.slice(1);
    const txns = txnRows.slice(1);
    const scores = scoreRows.slice(1);

    const totalPeople = people.length;
    const totalTxns = txns.length;
    const paidTxns = txns.filter(r => r[4] === 'PAID').length;
    const defaultTxns = txns.filter(r => r[4] === 'NOT_PAID').length;

    const scoreValues = scores.map(r => parseInt(r[7] || '500', 10));
    const avgScore = scoreValues.length
      ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      : 500;

    const excellent = people.filter(r => parseInt(r[5] || '0', 10) >= 800).length;
    const good = people.filter(r => { const s = parseInt(r[5] || '0', 10); return s >= 600 && s < 800; }).length;
    const moderate = people.filter(r => { const s = parseInt(r[5] || '0', 10); return s >= 300 && s < 600; }).length;
    const risky = people.filter(r => parseInt(r[5] || '0', 10) < 300).length;

    res.json({
      totalPeople,
      totalTransactions: totalTxns,
      paidTransactions: paidTxns,
      defaultTransactions: defaultTxns,
      paymentRate: totalTxns > 0 ? Math.round((paidTxns / totalTxns) * 100) : 0,
      averageScore: avgScore,
      distribution: { excellent, good, moderate, risky },
    });
  } catch (err) { next(err); }
});

module.exports = router;
