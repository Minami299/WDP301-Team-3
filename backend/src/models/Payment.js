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
      enum: ['VNPAY', 'MOMO', 'STRIPE', 'PAYPAL', 'SEPAY', 'PAYOS'],
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
    note: { type: String, default: null, maxlength: 500 },
    reference_code: { type: String, default: null, maxlength: 100 },
    content: { type: String, default: null, maxlength: 500 },
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
paymentSchema.index({ status: 1, payment_date: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
