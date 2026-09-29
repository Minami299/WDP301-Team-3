const mongoose = require('mongoose');

const serviceInventorySchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    target_date: {
      type: Date,
      required: true
    },
    time_slot: {
      type: String,
      trim: true
    },
    available_qty: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ServiceInventory', serviceInventorySchema);
