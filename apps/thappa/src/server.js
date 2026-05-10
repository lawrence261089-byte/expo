/**
 * Thappa - WhatsApp Trust Scoring Platform
 * Main server entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const logger = require('./utils/logger');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (Admin Dashboard) ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/webhook', rateLimiter({ windowMs: 60_000, max: 200 }));
app.use('/api', rateLimiter({ windowMs: 60_000, max: 100 }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// ─── Health Check (both /health and /api/health) ──────────────────────────────
function healthResponse(req, res) {
  const usingMock = !process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.GOOGLE_SPREADSHEET_ID;
  res.json({
    status: 'ok',
    service: 'Thappa Trust Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    dataStore: usingMock ? 'in-memory (mock)' : 'Google Sheets',
  });
}
app.get('/health', healthResponse);
app.get('/api/health', healthResponse);

// ─── Root → Admin Dashboard ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 Thappa server running on port ${PORT}`);
  logger.info(`📊 Admin dashboard: http://localhost:${PORT}`);
  logger.info(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
});

module.exports = app;
