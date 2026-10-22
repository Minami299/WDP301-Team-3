const mongoose = require('mongoose');

const cancellationSchema = new mongoose.Schema({
  request_id: { type: String, required: true, maxlength: 120 },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  type: { type: String, enum: ['CANCEL', 'CHANGE_DATE', 'REFUND'], default: 'CANCEL' },
  new_date: { type: Date, default: null },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  requested_at: { type: Date, default: Date.now },
  processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processed_at: Date,
  decision_reason: { type: String, trim: true, maxlength: 1000 }
});

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
    request_id: { type: String, maxlength: 120, default: undefined },
    // Unpaid orders release their stock after this time.
    expires_at: { type: Date, default: undefined },
    payos_order_code: { type: Number, default: undefined },
    payment_link: { type: Object, default: undefined },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: undefined },
    cancellation_requests: { type: [cancellationSchema], default: undefined },
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
    promotion_discount_amount: {
      type: Number,
      min: 0,
      default: 0
    },
    points_redeemed: {
      type: Number,
      min: 0,
      default: 0
    },
    points_discount_amount: {
      type: Number,
      min: 0,
      default: 0
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
bookingSchema.index({ customer_id: 1, request_id: 1 }, { unique: true, partialFilterExpression: { request_id: { $type: 'string' } } });
bookingSchema.index({ status: 1, created_at: -1 });
bookingSchema.index({ status: 1, expires_at: 1 });
bookingSchema.index({ payos_order_code: 1 }, { unique: true, partialFilterExpression: { payos_order_code: { $type: 'number' } } });

module.exports = mongoose.model('Booking', bookingSchema);
