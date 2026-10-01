const mongoose = require('mongoose');

const bookingDetailSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    inventory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceInventory',
      required: true
    },
    quantity: {
      type: Number,
      min: 1
    },
    unit_price: {
      type: Number,
      min: 0
    },
    commission_rate: {
      type: Number,
      min: 0,
      max: 100
    },
    commission_amount: {
      type: Number,
      min: 0
    },
    qr_code: {
      type: String,
      default: null
    },
    check_in_status: {
      type: String,
      enum: ['PENDING', 'CHECKED_IN', 'NO_SHOW'],
      default: 'PENDING'
    }
  },
  {
    collection: 'booking_details',
    timestamps: false
  }
);

bookingDetailSchema.index({ booking_id: 1 });
bookingDetailSchema.index({ inventory_id: 1 });
bookingDetailSchema.index({ qr_code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('BookingDetail', bookingDetailSchema);
