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
    }
  },
  {
    collection: 'payouts',
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

payoutSchema.index({ vendor_id: 1, period_start: 1, period_end: 1 });
payoutSchema.index({ status: 1 });

module.exports = mongoose.model('Payout', payoutSchema);
