// Google Apps Script for Dino Game global leaderboard
//
// Setup:
//   1. Create a Google Sheet
//   2. Extensions → Apps Script → paste this file → Save
//   3. Deploy → New Deployment → Web App
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Copy the deployment URL into js/config.local.js:
//      const CONFIG = { ..., scoresUrl: 'YOUR_DEPLOYMENT_URL' }

const SHEET_NAME = 'Scores';
const MAX_SCORES = 200;

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['initials', 'score', 'date']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues().slice(1); // skip header
  const scores = rows
    .map(r => ({ initials: r[0], score: Number(r[1]), date: r[2] }))
    .filter(s => s.initials && s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return json(scores);
}

function doPost(e) {
  try {
    const { initials, score, date } = JSON.parse(e.postData.contents);

    // Basic validation
    if (!/^[A-Z]{3}$/.test(initials)) return json({ error: 'bad initials' });
    if (typeof score !== 'number' || score < 0 || score > 999999) return json({ error: 'bad score' });

    const sheet = getSheet();
    sheet.appendRow([initials, score, date || new Date().toISOString()]);

    // Trim sheet if it gets huge
    const total = sheet.getLastRow();
    if (total > MAX_SCORES + 1) {
      sheet.deleteRows(2, total - MAX_SCORES - 1);
    }

    return json({ ok: true });
  } catch(err) {
    return json({ error: err.message });
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
