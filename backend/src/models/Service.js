const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true
    },
    type: {
      type: String,
      enum: ['ROOM', 'TICKET'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: null,
      trim: true
    },
    capacity: {
      type: Number,
      min: 1,
      default: 1
    },
    base_price: {
      type: Number,
      min: 0,
      required: true
    }
  },
  {
    collection: 'services',
    timestamps: false
  }
);

serviceSchema.index({ facility_id: 1 });
serviceSchema.index({ type: 1 });

module.exports = mongoose.model('Service', serviceSchema);
