# थप्पा — Thappa
### WhatsApp-First Trust Scoring Platform for India's Informal Economy

> Verify payment history. Build community trust. Unlock financial opportunity.

---

## What is Thappa?

Thappa is a **WhatsApp-first trust scoring platform** designed for India's informal economy — kirana store owners, domestic workers, employers, and daily-wage earners. It requires **no app download**, works on any phone with WhatsApp, and costs under ₹500/month to operate.

Users send simple commands to Thappa's WhatsApp number. The bot queries a Google Sheets database and replies instantly with trust scores, payment history, and recommendations.

---

## Architecture

```
User (WhatsApp)
      │
      ▼
Meta WhatsApp Cloud API
      │
      ▼
Thappa Webhook Server (Express.js)
      │
      ├── CHECK command  → Google Sheets (People + Scores + Transactions)
      ├── REPORT command → Google Sheets (write + recalculate)
      └── HELP command   → Support escalation
      │
      ▼
Admin Dashboard (http://localhost:3000)
```

**Tech Stack:**
- **Backend:** Node.js + Express.js
- **Database:** Google Sheets (via Google Sheets API v4)
- **Messaging:** Meta WhatsApp Business Cloud API
- **Dashboard:** Vanilla HTML/CSS/JS (no framework needed)
- **Hosting:** Any Node.js host (Railway, Render, Vercel, VPS)

---

## Commands

### CHECK — Verify someone's trust score
```
CHECK [Name] [Last 4 digits of phone]

Example:
CHECK Rajesh Kumar 9823
CHECK Rani Devi 9876
```

**Response:**
```
━━━━━━━━━━━━━━━━━━━━━━
🔍 THAPPA CHECK RESULT
━━━━━━━━━━━━━━━━━━━━━━
👤 RAJESH KUMAR | ****9823
📍 Koramangala, Bangalore

🎯 Thappa Score: 234/1000
⚠️ RISKY

📊 8 transactions | 1 PAID ✅ | 5 NOT PAID ❌ | 2 PARTIAL ⚠️

💡 RECOMMENDATION: NO CREDIT
⚡ Risk Level: HIGH
━━━━━━━━━━━━━━━━━━━━━━
```

### REPORT — Log a transaction
```
REPORT [Name] [Last 4] [Amount] [Status] [Rating]

Status: PAID | NOT_PAID | PARTIAL
Rating: GOOD | BAD | NEUTRAL

Example:
REPORT Rajesh Kumar 9823 500 NOT_PAID BAD
REPORT Rani Devi 9876 200 PAID GOOD
```

Supports **guided multi-step flow** — just send `REPORT` and the bot asks follow-up questions.

### HELP — Get assistance
```
HELP
HELP I want to dispute a rating
```

---

## Score System

| Score Range | Label     | Recommendation | Risk Level |
|-------------|-----------|----------------|------------|
| 800 – 1000  | 🌟 EXCELLENT | TRUST       | VERY LOW   |
| 600 – 799   | ✅ GOOD      | TRUST       | LOW        |
| 300 – 599   | ⚡ MODERATE  | CAUTION     | MODERATE   |
| 0 – 299     | ⚠️ RISKY    | NO CREDIT   | HIGH       |

**Scoring Formula** (starts at 500):
```
+50  per PAID transaction
-100 per DEFAULT (NOT_PAID)
-30  per PARTIAL payment
+20  per GOOD rating
-50  per BAD rating
Capped between 0 and 1000
```

---

## Database Structure (Google Sheets)

### Tab 1: People
| ID   | Name         | Phone Last 4 | Location | User Type  | Score | Status  |
|------|--------------|--------------|----------|------------|-------|---------|
| P001 | RAJESH KUMAR | 9823         | Bangalore| Worker     | 234   | Active  |
| P002 | RANI DEVI    | 9876         | Mumbai   | Shopkeeper | 847   | Active  |

### Tab 2: Transactions
| ID   | Person ID | Reporter Phone | Amount | Status   | Rating | Date       |
|------|-----------|----------------|--------|----------|--------|------------|
| T001 | P001      | 91XXXXXXXX     | 500    | NOT_PAID | BAD    | 2024-01-15 |
| T002 | P002      | 91XXXXXXXX     | 200    | PAID     | GOOD   | 2024-01-20 |

### Tab 3: Scores
| Person ID | Total | Paid | Defaults | Partial | Good | Bad | Score |
|-----------|-------|------|----------|---------|------|-----|-------|
| P001      | 8     | 1    | 5        | 2       | 0   | 5   | 234   |

---

## Setup

### 1. Clone and install
```bash
cd apps/thappa
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Set up Google Sheets
1. Create a new Google Spreadsheet
2. Add three tabs: `People`, `Transactions`, `Scores`
3. Create a Google Cloud service account
4. Share the spreadsheet with the service account email
5. Copy the spreadsheet ID from the URL
6. Paste the service account JSON into `GOOGLE_SERVICE_ACCOUNT_JSON`

### 4. Set up WhatsApp Business API
1. Create a Meta Developer account at [developers.facebook.com](https://developers.facebook.com)
2. Create a WhatsApp Business app
3. Get your Phone Number ID and Access Token
4. Set webhook URL to: `https://yourdomain.com/webhook`
5. Set verify token to match `WHATSAPP_VERIFY_TOKEN` in `.env`

### 5. Start the server
```bash
npm start          # Production
npm run dev        # Development (with auto-reload)
```

### 6. Access admin dashboard
Open `http://localhost:3000` in your browser.

---

## API Endpoints

All API endpoints require `x-api-key` header matching `ADMIN_API_KEY`.

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/people`                     | List all people          |
| GET    | `/api/people/:id`                 | Get person with history  |
| POST   | `/api/people`                     | Add new person           |
| GET    | `/api/transactions`               | List all transactions    |
| POST   | `/api/transactions`               | Log new transaction      |
| GET    | `/api/scores`                     | List all score records   |
| POST   | `/api/scores/recalculate/:id`     | Recalculate person score |
| GET    | `/api/stats`                      | Platform statistics      |
| GET    | `/health`                         | Health check             |

---

## Revenue Model

| Tier          | Price  | Features                    |
|---------------|--------|-----------------------------|
| Free          | ₹0     | 10 checks/month             |
| Pay-per-check | ₹10    | Single check                |
| Monthly       | ₹99    | Unlimited checks            |
| Society Plan  | ₹2,000 | All flats in a society      |

**Year 2+ Revenue:**
- Anonymised data reports to banks/NBFCs: ₹2–5 lakhs per report
- Loan referral commission: 2% of disbursed amount
- Insurance product partnerships

---

## Privacy & Data Protection

- **No full phone numbers stored** — only last 4 digits
- **No Aadhaar numbers** collected
- **No residential addresses** stored
- All data encrypted in transit (HTTPS) and at rest
- Users may request data deletion at any time
- Dispute resolution: automated review → community mediation → founder escalation

---

## Running Tests

```bash
npm test
```

Tests cover:
- Scoring algorithm (all weight combinations, edge cases)
- Command parsers (CHECK and REPORT)
- Risk band classification

---

## Deployment

### Railway / Render (Recommended)
1. Connect your GitHub repository
2. Set environment variables from `.env.example`
3. Deploy — the server starts automatically

### Manual VPS
```bash
npm install --production
NODE_ENV=production npm start
```

Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start src/server.js --name thappa
pm2 save
```

---

## Technology Evolution

| Phase | Trigger          | Stack                              | Cost      |
|-------|------------------|------------------------------------|-----------|
| 1     | Launch           | WhatsApp API + Google Sheets       | ₹500/mo   |
| 2     | 5,000 checks/day | Firebase/MongoDB + React dashboard | ₹2L setup |
| 3     | 50,000/day       | Full mobile app + Account Aggregator| ₹10L setup|

---

## License

MIT — Built for India's informal economy.
