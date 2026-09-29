const mongoose = require('mongoose');

const facilityImageSchema = new mongoose.Schema(
  {
    image_url: {
      type: String,
      required: true,
      trim: true
    },
    is_primary: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const facilitySchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      required: true,
      trim: true
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
      trim: true
    },
    commission_rate: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending'
    },
    images: {
      type: [facilityImageSchema],
      default: []
    },
    amenities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Amenity'
      }
    ]
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

module.exports = mongoose.model('Facility', facilitySchema);
