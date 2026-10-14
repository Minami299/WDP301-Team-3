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
    attraction_category: {
      type: String,
      enum: ['ATTRACTION', 'TOUR', 'EXPERIENCE'],
      default: undefined
    },
    business_type: {
      type: String,
      enum: ['ATTRACTION', 'TOUR', 'TICKET', 'MULTIPLE_SERVICES'],
      default: undefined
    },
    contact_phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: undefined
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    size: {
      type: Number,
      default: null
    },
    promotions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    payout_method: {
      type: String,
      default: 'bank_transfer'
    },
    check_in_policy: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
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
    },
    stars: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
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
