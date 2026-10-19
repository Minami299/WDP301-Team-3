// Registers the webhook URL with PayOS (PayOS sends a test request to it first, so the backend must be running
// and reachable). Usage: node scripts/register-payos-webhook.cjs https://<public-domain>
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { confirmWebhookUrl } = require('../src/services/payment.service');

const base = (process.argv[2] || process.env.PAYOS_WEBHOOK_URL || '').replace(/\/+$/, '').replace(/\/api\/payments\/payos\/webhook$/, '');
if (!/^https:\/\//.test(base)) { console.error('Usage: node scripts/register-payos-webhook.cjs https://<public-domain> (or set PAYOS_WEBHOOK_URL)'); process.exit(1); }
const url = `${base}/api/payments/payos/webhook`;
confirmWebhookUrl(url).then(r => console.log('Registered:', url, r), e => { console.error('Failed:', e.message); process.exit(1); });
