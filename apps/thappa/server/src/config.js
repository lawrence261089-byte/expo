'use strict';

require('dotenv').config();

const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'thappa_verify_token',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
    get apiUrl() {
      return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    },
  },

  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './google-service-account-key.json',
    tabs: {
      people: 'People',
      transactions: 'Transactions',
      scores: 'Scores',
      users: 'Users',
    },
  },

  support: {
    whatsappNumber: process.env.SUPPORT_WHATSAPP_NUMBER || '91XXXXXXXXXX',
    replyHours: parseInt(process.env.SUPPORT_REPLY_HOURS || '2', 10),
  },

  payment: {
    upiId: process.env.UPI_ID || 'thappa@upi',
    upiName: process.env.UPI_NAME || 'Thappa',
    checkPriceInr: parseInt(process.env.CHECK_PRICE_INR || '10', 10),
    subscriptionPriceInr: parseInt(process.env.SUBSCRIPTION_PRICE_INR || '99', 10),
    freeChecksPerUser: parseInt(process.env.FREE_CHECKS_PER_USER || '10', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  scoring: {
    baseScore: 500,
    paidBonus: 50,
    defaultPenalty: -100,
    partialPenalty: -30,
    goodRatingBonus: 20,
    badRatingPenalty: -50,
    minScore: 0,
    maxScore: 1000,
    thresholds: {
      highRisk: 300,
      moderate: 600,
      good: 800,
    },
  },
};

module.exports = config;
