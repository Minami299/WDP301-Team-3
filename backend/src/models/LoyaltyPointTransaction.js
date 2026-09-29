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
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

module.exports = mongoose.model('LoyaltyPointTransaction', loyaltyPointTransactionSchema);
