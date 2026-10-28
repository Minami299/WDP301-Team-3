const mongoose = require('mongoose');

const voucherTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    code_prefix: {
      type: String,
      default: 'TVL',
      trim: true,
      uppercase: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'voucher_types',
    timestamps: true,
  }
);

module.exports = mongoose.model('VoucherType', voucherTypeSchema);
