const mongoose = require('mongoose');

const bookingDetailSchema = new mongoose.Schema(
  {
    inventory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceInventory',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit_price: {
      type: Number,
      required: true
    },
    commission_rate: {
      type: Number,
      default: 0
    },
    commission_amount: {
      type: Number,
      default: 0
    },
    qr_code: {
      type: String,
      default: ''
    },
    check_in_status: {
      type: String,
      enum: ['pending', 'checked_in', 'no_show', 'cancelled'],
      default: 'pending'
    }
  },
  { _id: true }
);

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
      trim: true
    },
    guest_email: {
      type: String,
      trim: true,
      lowercase: true
    },
    guest_phone: {
      type: String,
      trim: true
    },
    promotion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
      default: null
    },
    total_amount: {
      type: Number,
      required: true
    },
    final_amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'paid', 'cancelled', 'completed', 'refunded'],
      default: 'pending'
    },
    decided_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decision_note: {
      type: String,
      trim: true
    },
    decided_at: {
      type: Date,
      default: null
    },
    details: {
      type: [bookingDetailSchema],
      default: []
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
