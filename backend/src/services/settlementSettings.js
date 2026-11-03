const { SystemConfig } = require('../models');

const COMMISSION_KEY = 'COMMISSION_RATE_DEFAULT';
const HOLD_KEY = 'SETTLEMENT_HOLD_DAYS';
const DEFAULTS = { [COMMISSION_KEY]: 10, [HOLD_KEY]: 7 };

const createError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const getSettlementSettings = async () => {
  const rows = await SystemConfig.find({ config_key: { $in: Object.keys(DEFAULTS) } }).lean();
  const read = (key) => {
    const value = Number(rows.find((row) => row.config_key === key)?.config_value);
    return Number.isFinite(value) ? value : DEFAULTS[key];
  };
  return { commission_rate: read(COMMISSION_KEY), hold_days: read(HOLD_KEY) };
};

const updateSettlementSettings = async ({ commission_rate, hold_days }) => {
  const rate = Number(commission_rate);
  const days = Number(hold_days);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw createError('Hoa hồng phải từ 0 đến 100%', 400);
  if (!Number.isInteger(days) || days < 0 || days > 60) throw createError('Số ngày chờ phải là số nguyên từ 0 đến 60', 400);
  const upsert = (key, value, description) => SystemConfig.updateOne(
    { config_key: key },
    { $set: { config_value: String(value) }, $setOnInsert: { description } },
    { upsert: true }
  );
  await upsert(COMMISSION_KEY, rate, 'Platform commission (%) applied to partner sales');
  await upsert(HOLD_KEY, days, 'Days after the service date before an order can be settled');
  return getSettlementSettings();
};

module.exports = { getSettlementSettings, updateSettlementSettings };
