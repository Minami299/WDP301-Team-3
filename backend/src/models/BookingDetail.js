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
      required: function () { return !this.service_id; },
      default: undefined
    },
    service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: undefined },
    ticket_type_id: { type: mongoose.Schema.Types.ObjectId, default: undefined },
    ticket_name: { type: String, default: undefined },
    service_name: { type: String, default: undefined },
    facility_name: { type: String, default: undefined },
    ticket_conditions: { type: String, default: undefined },
    ticket_description: { type: String, default: undefined },
    min_age: { type: Number, default: undefined },
    max_age: { type: Number, default: undefined },
    visit_date: { type: Date, default: undefined },
    time_slot: { type: String, default: undefined },
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
      default: undefined
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
bookingDetailSchema.index({ service_id: 1, ticket_type_id: 1 });
bookingDetailSchema.index({ qr_code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('BookingDetail', bookingDetailSchema);
