// Google Apps Script for DinoQuest + CenozoiQuest + MoonGame global leaderboards
//
// Setup:
//   1. Create a Google Sheet with tabs: "DinoQuest", "CenozoiQuest", "MoonGame"
//      (or let the script auto-create them on first write)
//   2. Extensions → Apps Script → paste this file → Save
//   3. Deploy → New Deployment → Web App
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Copy the deployment URL into js/config.local.js (all games share the same URL):
//      const CONFIG = { ..., scoresUrl: 'YOUR_DEPLOYMENT_URL' }
//
// Routing: game tag → sheet tab name. Unknown tags fall back to DinoQuest.

const SHEET_NAMES = {
  animal:   'CenozoiQuest',
  dino:     'DinoQuest',
  MoonGame: 'MoonGame',
};
const MAX_SCORES = 200;

function getSheet(game) {
  const sheetName = SHEET_NAMES[game] || SHEET_NAMES.dino;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['initials', 'score', 'date']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  const game = (e.parameter && e.parameter.game) || 'dino';
  const sheet = getSheet(game);
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
    const { initials, score, date, game } = JSON.parse(e.postData.contents);

    // Basic validation
    if (!/^[A-Z]{3}$/.test(initials)) return json({ error: 'bad initials' });
    if (typeof score !== 'number' || score < 0 || score > 999999) return json({ error: 'bad score' });

    const sheet = getSheet(game);
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
