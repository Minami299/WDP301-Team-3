const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    manager_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    amount: {
      type: Number,
      min: 0,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED'],
      default: 'PENDING'
    },
    period_start: {
      type: Date,
      required: true
    },
    period_end: {
      type: Date,
      required: true
    },
    bank_account: {
      bank_name: { type: String, trim: true, maxlength: 100 },
      account_number: { type: String, trim: true, maxlength: 20 },
      account_name: { type: String, trim: true, maxlength: 100 }
    },
    note: { type: String, trim: true, maxlength: 500, default: null },
    gross_amount: { type: Number, min: 0, default: 0 },
    commission_amount: { type: Number, min: 0, default: 0 },
    line_count: { type: Number, min: 0, default: 0 },
    decision_reason: { type: String, trim: true, maxlength: 1000, default: null },
    decided_at: { type: Date, default: null },
    paid_reference: { type: String, trim: true, maxlength: 100, default: null },
    paid_at: { type: Date, default: null }
  },
  {
    collection: 'payouts',
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

payoutSchema.index({ vendor_id: 1, period_start: 1, period_end: 1 });
payoutSchema.index({ status: 1 });

module.exports = mongoose.model('Payout', payoutSchema);
