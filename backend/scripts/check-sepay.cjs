// Checks SePay config + webhook locally without printing secrets. Usage: node scripts/check-sepay.cjs
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const base = `http://localhost:${process.env.PORT || 5000}`;
const key = process.env.SEPAY_API_KEY || '';
const show = (name, ok, extra = '') => console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);

(async () => {
  for (const name of ['SEPAY_API_KEY', 'SEPAY_BANK_NAME', 'SEPAY_BANK_ACCOUNT', 'SEPAY_ACCOUNT_NAME']) {
    const value = process.env[name] || '';
    show(`env ${name}`, Boolean(value), value ? (name === 'SEPAY_API_KEY' ? `${value.length} chars` : value) : 'missing');
  }
  const hook = async (headers, body) => {
    const r = await fetch(`${base}/api/payments/sepay/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return `${r.status} ${(await r.text()).slice(0, 120)}`;
  };
  try {
    console.log('webhook without key       ->', await hook({}, {}));
    console.log('webhook with wrong key    ->', await hook({ Authorization: 'Apikey wrong' }, {}));
    console.log('webhook right key, no code->', await hook({ Authorization: `Apikey ${key}` }, { id: 990000001, transferType: 'in', transferAmount: 1000, content: 'hello' }));
  } catch (e) { show('backend reachable', false, `${e.cause?.code || e.message} - start/restart the backend`); }
  const qr = `https://qr.sepay.vn/img?acc=${encodeURIComponent(process.env.SEPAY_BANK_ACCOUNT || '')}&bank=${encodeURIComponent(process.env.SEPAY_BANK_NAME || '')}&amount=10000&des=TVLTEST`;
  try { const r = await fetch(qr); show('qr.sepay.vn image', r.ok && (r.headers.get('content-type') || '').startsWith('image'), `${r.status} ${r.headers.get('content-type')}`); }
  catch (e) { show('qr.sepay.vn reachable', false, e.message); }
})();
