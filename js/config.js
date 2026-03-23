// DinoGame configuration
// To receive image reports and loop-around notifications via Discord:
//   1. Open Discord → your server → a channel → Edit Channel → Integrations → Webhooks → New Webhook
//   2. Copy the webhook URL
//   3. Create js/config.local.js with: const CONFIG = { discordWebhook: 'YOUR_URL' };
//      (config.local.js is gitignored — never committed)

const CONFIG = {
  discordWebhook: '',  // set in js/config.local.js
  scoresUrl: 'https://script.google.com/macros/s/AKfycbzUDs88NQvP6YV-JuhLmQpEhJsQVSGjUgDbkb-8PgqR7emtW0pXFHULkVCG5VZw__aN/exec',
};
