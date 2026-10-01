const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    payment_gateway: {
      type: String,
      enum: ['VNPAY', 'MOMO', 'STRIPE', 'PAYPAL'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
    },
    payment_date: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'payments',
    timestamps: false
  }
);

paymentSchema.index({ booking_id: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
