const mongoose = require('mongoose');

const serviceInventorySchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    ticket_type_id: { type: mongoose.Schema.Types.ObjectId, default: undefined },
    uses_ticket_price: { type: Boolean, default: undefined },
    target_date: {
      type: Date,
      required: true
    },
    time_slot: {
      type: String,
      required: true,
      trim: true
    },
    available_qty: {
      type: Number,
      required: true,
      min: 0
    },
    total_qty: {
      type: Number,
      min: 0,
      default: undefined
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    collection: 'service_inventory',
    timestamps: false
  }
);

serviceInventorySchema.index(
  { service_id: 1, ticket_type_id: 1, target_date: 1, time_slot: 1 },
  { unique: true }
);
serviceInventorySchema.index({ target_date: 1 });

module.exports = mongoose.model('ServiceInventory', serviceInventorySchema);
