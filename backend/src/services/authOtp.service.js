const crypto = require('node:crypto');
const { User } = require('../models');
const emailService = require('./email.service');

const TTL_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_ATTEMPTS = 5;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const invalidOtp = () => Object.assign(new Error('Invalid or expired verification code. Request a new code if needed.'), { statusCode: 400 });
const limited = seconds => Object.assign(new Error('Too many verification requests. Please wait before trying again.'), { statusCode: 429, retryAfterSeconds: Math.max(1, Math.ceil(seconds)) });
const fields = kind => ['hash', 'expires_at', 'attempts', 'last_sent_at', 'request_count', 'window_start']
  .map(field => `+${kind}_otp_${field}`).join(' ');

const send = async (user, kind, purpose) => {
  emailService.assertSmtpConfigured();
  const key = field => `${kind}_otp_${field}`;
  const now = Date.now();
  const lastSent = user[key('last_sent_at')]?.getTime();
  if (lastSent && now - lastSent < COOLDOWN_MS) throw limited((COOLDOWN_MS - (now - lastSent)) / 1000);
  const windowStart = user[key('window_start')]?.getTime();
  const inWindow = windowStart && now - windowStart < WINDOW_MS;
  const count = inWindow ? user[key('request_count')] || 0 : 0;
  if (count >= MAX_REQUESTS) throw limited((WINDOW_MS - (now - windowStart)) / 1000);
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const hash = digest(otp);
  // Compare the last send timestamp so concurrent resends cannot both replace a code.
  const filter = { _id: user._id, [key('last_sent_at')]: user[key('last_sent_at')] ?? null };
  if (kind === 'verification') Object.assign(filter, { is_verified: false, status: 'ACTIVE' });
  const update = { $set: {
    [key('hash')]: hash, [key('expires_at')]: new Date(now + TTL_MS),
    [key('attempts')]: 0, [key('last_sent_at')]: new Date(now),
    [key('request_count')]: count + 1, [key('window_start')]: inWindow ? user[key('window_start')] : new Date(now)
  } };
  if (kind === 'reset') update.$unset = { password_reset_token_hash: 1, password_reset_token_expires_at: 1 };
  if (!await User.findOneAndUpdate(filter, update)) throw limited(COOLDOWN_MS / 1000);
  try {
    await emailService.sendOtpEmail(user.email, otp, purpose);
  } catch {
    // A failed delivery must not leave a usable code or erase a newer request.
    await User.updateOne({ _id: user._id, [key('hash')]: hash }, { $unset: { [key('hash')]: 1, [key('expires_at')]: 1 } });
    throw Object.assign(new Error('Could not send the verification email. Please try resending the code later.'), { statusCode: 502, code: 'EMAIL_DELIVERY_FAILED' });
  }
  return { resendAfterSeconds: COOLDOWN_MS / 1000 };
};

const consume = async (email, otp, kind, filter, update) => {
  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) throw invalidOtp();
  const key = field => `${kind}_otp_${field}`;
  const hash = digest(otp);
  const eligible = { email, ...filter, [key('expires_at')]: { $gt: new Date() },
    $or: [{ [key('attempts')]: { $lt: MAX_ATTEMPTS } }, { [key('attempts')]: { $exists: false } }] };
  const user = await User.findOneAndUpdate({ ...eligible, [key('hash')]: hash }, {
    ...update, $unset: { ...update.$unset, [key('hash')]: 1, [key('expires_at')]: 1, [key('attempts')]: 1 }
  }, { new: true, runValidators: true });
  if (user) return user;
  // Count wrong guesses atomically without consuming a valid code or reviving an expired code.
  await User.updateOne({ ...eligible, [key('hash')]: { $exists: true, $ne: hash } }, { $inc: { [key('attempts')]: 1 } });
  throw invalidOtp();
};

module.exports = { send, consume, fields };
