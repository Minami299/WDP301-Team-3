const mongoose = require('mongoose');

const payoutDetailSchema = new mongoose.Schema(
  {
    booking_detail_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  },
  { _id: true }
);

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
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected'],
      default: 'pending'
    },
    period_start: {
      type: Date,
      required: true
    },
    period_end: {
      type: Date,
      required: true
    },
    details: {
      type: [payoutDetailSchema],
      default: []
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

module.exports = mongoose.model('Payout', payoutSchema);
