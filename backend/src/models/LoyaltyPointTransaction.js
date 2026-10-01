const mongoose = require('mongoose');

const loyaltyPointTransactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    points: {
      type: Number,
      required: true,
      validate: {
        validator: function(v) {
          return v !== 0;
        },
        message: 'Points cannot be zero'
      }
    },
    reason: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    collection: 'loyalty_point_transactions',
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

loyaltyPointTransactionSchema.index({ user_id: 1, created_at: -1 });
loyaltyPointTransactionSchema.index({ booking_id: 1 });

module.exports = mongoose.model('LoyaltyPointTransaction', loyaltyPointTransactionSchema);
