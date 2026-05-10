# 🙏 Thappa

> **Trust for India's Informal Economy**

Thappa is a WhatsApp-first trust scoring platform that helps kirana store owners, employers, and apartment societies verify the payment history and trustworthiness of workers, vendors, and customers — with zero app downloads required.

---

## How It Works

Users send simple WhatsApp messages to Thappa's business number. The bot parses the command, queries the Google Sheets database, and replies instantly with a trust report.

```
User → WhatsApp → Thappa Bot → Google Sheets → Reply
```

---

## Commands

### 🔍 CHECK
Verify someone's trust score before extending credit or offering employment.

```
CHECK Rajesh Kumar 9823
```

**Response:**
```
━━━━━━━━━━━━━━━━━━━━━
🔍 THAPPA REPORT
━━━━━━━━━━━━━━━━━━━━━

👤 RAJESH KUMAR | 9823
📍 Koramangala, Bangalore

🏆 Thappa Score: 234/1000 ⚠️ RISKY

📊 Transaction History
Total: 8 transactions
✅ Paid: 1  ❌ Not Paid: 5  ⚠️ Partial: 2
Payment Rate: 12%

📋 Recent Activity
  ❌ ₹500 NOT PAID — 8 months ago
  ⚠️ ₹200 PARTIAL — 10 months ago
  ❌ ₹1000 NOT PAID — 1 year ago

━━━━━━━━━━━━━━━━━━━━━
🎯 RECOMMENDATION: NO CREDIT
⚡ Risk Level: HIGH
━━━━━━━━━━━━━━━━━━━━━
```

### 📝 REPORT
Log a transaction and rate someone's behaviour.

```
REPORT Rani Devi 9876 500 PAID GOOD
```

Or send just `REPORT` and the bot will guide you step by step.

**Response:**
```
✅ REPORT RECORDED

👤 RANI DEVI | 9876
💰 Amount: ₹500
✅ Status: PAID
👍 Rating: GOOD

📊 Score Updated
820 → 890/1000 (+70)

Thank you for protecting your community! 🙏
```

### 🤝 HELP
Connect to human support.

```
HELP I want to dispute a report
```

---

## Score System

| Score Range | Label     | Risk Level | Recommendation        |
|-------------|-----------|------------|-----------------------|
| 800–1000    | EXCELLENT | VERY LOW   | TRUST                 |
| 600–799     | GOOD      | LOW        | TRUST WITH CAUTION    |
| 300–599     | MODERATE  | MODERATE   | PROCEED WITH CAUTION  |
| 150–299     | RISKY     | HIGH       | NO CREDIT             |
| 0–149       | VERY RISKY| VERY HIGH  | AVOID                 |

### Scoring Formula

```
Base score: 500

+50  per PAID transaction
-100 per DEFAULT (NOT PAID)
-30  per PARTIAL payment
+20  per GOOD rating
-50  per BAD rating

Result clamped to [0, 1000]
```

---

## Pricing

| Plan         | Price    | Checks         |
|--------------|----------|----------------|
| Free         | ₹0       | 10 checks      |
| Pay-per-check| ₹10/check| Unlimited      |
| Monthly      | ₹99/month| Unlimited      |

Payments via UPI (GPay, PhonePe, Paytm) — no gateway fees.

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Messaging   | WhatsApp Business Cloud API       |
| Backend     | Node.js + TypeScript + Express    |
| Database    | Google Sheets (free tier)         |
| Payments    | UPI deep-links + QR codes         |
| Hosting     | Any Node.js host (Railway, Render)|

**Monthly cost: ~₹500** (WhatsApp API fees only)

---

## Setup

### 1. Prerequisites

- Node.js 18+
- WhatsApp Business Account + Cloud API access
- Google Cloud project with Sheets API enabled
- Google Service Account with Sheets access

### 2. Install

```bash
cd apps/thappa
npm install
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:

```env
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_ACCESS_TOKEN=your_whatsapp_cloud_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

GOOGLE_SHEETS_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

UPI_ID=yourname@upi
UPI_NAME=Thappa

SUPPORT_WHATSAPP=91XXXXXXXXXX
SUPPORT_PHONE=1800XXXXXXX
```

### 4. Set up Google Sheets

```bash
npm run dev -- --setup
# or
npx ts-node src/utils/setupSheets.ts
```

This creates the four required tabs: **People**, **Transactions**, **Scores**, **Users**.

### 5. Run

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

### 6. Configure Webhook

In Meta Developer Console:
- Webhook URL: `https://your-domain.com/webhook`
- Verify Token: (same as `WHATSAPP_VERIFY_TOKEN` in .env)
- Subscribe to: `messages`

---

## Database Structure

### People Tab
| Column     | Description                    |
|------------|--------------------------------|
| ID         | P001, P002, ...                |
| Name       | Full name (uppercase)          |
| PhoneLast4 | Last 4 digits only             |
| Location   | City/area                      |
| UserType   | shopkeeper/worker/employer/... |
| Score      | 0–1000                         |
| Status     | Active/Blocked/Under Review    |
| CreatedAt  | ISO timestamp                  |

### Transactions Tab
| Column        | Description                    |
|---------------|--------------------------------|
| ID            | T0001, T0002, ...              |
| PersonID      | FK → People.ID                 |
| ReporterPhone | Last 4 digits of reporter      |
| Amount        | ₹ amount                       |
| PaymentStatus | PAID / NOT PAID / PARTIAL      |
| QualityRating | GOOD / BAD / NEUTRAL           |
| ReportedAt    | ISO timestamp                  |
| Notes         | Optional notes                 |

### Scores Tab
Running score calculations per person.

### Users Tab
WhatsApp user state, check usage, subscription status.

---

## Privacy

- ✅ Only last 4 digits of phone numbers stored
- ✅ No Aadhaar numbers collected
- ✅ No residential addresses stored
- ✅ Data encrypted in transit (HTTPS)
- ✅ Users may request data deletion via HELP

---

## Roadmap

| Phase | Trigger          | Changes                                    |
|-------|------------------|--------------------------------------------|
| 1     | Now              | WhatsApp + Google Sheets (current)         |
| 2     | 5,000 daily checks | Migrate to Firebase/MongoDB + admin dashboard |
| 3     | 50,000 daily checks | Mobile app + Account Aggregator integration |

---

## License

MIT — Built with ❤️ for India's informal economy.
