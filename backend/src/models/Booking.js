const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    booking_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    guest_name: {
      type: String,
      required: true,
      trim: true
    },
    guest_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    guest_phone: {
      type: String,
      required: true,
      trim: true
    },
    promotion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
      default: null
    },
    total_amount: {
      type: Number,
      min: 0,
      default: 0
    },
    final_amount: {
      type: Number,
      min: 0,
      default: 0
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'COMPLETED'],
      default: 'PENDING'
    },
    decided_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decision_note: {
      type: String,
      default: null,
      trim: true
    },
    decided_at: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'bookings',
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

bookingSchema.index({ customer_id: 1 });
bookingSchema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
