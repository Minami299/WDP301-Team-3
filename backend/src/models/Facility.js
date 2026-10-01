const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['HOTEL', 'ATTRACTION'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: null,
      trim: true
    },
    commission_rate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE'],
      default: 'PENDING'
    }
  },
  {
    collection: 'facilities',
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

facilitySchema.index({ vendor_id: 1 });
facilitySchema.index({ city: 1 });
facilitySchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Facility', facilitySchema);
