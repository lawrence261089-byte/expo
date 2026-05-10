/**
 * One-time Google Sheets setup script.
 *
 * Run with: npx ts-node src/utils/setupSheets.ts
 *
 * Creates the four required tabs with correct headers if they don't exist.
 */

import "dotenv/config";
import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;

const TABS = [
  {
    name: "People",
    headers: ["ID", "Name", "PhoneLast4", "Location", "UserType", "Score", "Status", "CreatedAt"],
  },
  {
    name: "Transactions",
    headers: ["ID", "PersonID", "ReporterPhone", "Amount", "PaymentStatus", "QualityRating", "ReportedAt", "Notes"],
  },
  {
    name: "Scores",
    headers: ["PersonID", "TotalTransactions", "Paid", "Defaults", "Partial", "GoodRatings", "BadRatings", "CompositeScore", "LastUpdated"],
  },
  {
    name: "Users",
    headers: ["Phone", "ChecksUsed", "IsSubscribed", "SubscriptionExpiry", "UpdatedAt"],
  },
];

async function setup(): Promise<void> {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  // Get existing sheet metadata
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTabs = (meta.data.sheets ?? []).map(
    (s) => s.properties?.title ?? ""
  );

  const requests: object[] = [];

  for (const tab of TABS) {
    if (!existingTabs.includes(tab.name)) {
      requests.push({
        addSheet: { properties: { title: tab.name } },
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests },
    });
    console.log(`✅ Created ${requests.length} new tab(s)`);
  }

  // Write headers to each tab
  for (const tab of TABS) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tab.name}!A1:${String.fromCharCode(64 + tab.headers.length)}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [tab.headers] },
    });
    console.log(`✅ Headers set for tab: ${tab.name}`);
  }

  console.log("\n🎉 Google Sheets setup complete!");
  console.log(`   Sheet URL: https://docs.google.com/spreadsheets/d/${SHEET_ID}`);
}

setup().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
