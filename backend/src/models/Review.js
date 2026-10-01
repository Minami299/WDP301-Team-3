const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true
    },
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: null,
      trim: true
    },
    vendor_reply: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    collection: 'reviews',
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

reviewSchema.index({ facility_id: 1 });
reviewSchema.index({ customer_id: 1 });

module.exports = mongoose.model('Review', reviewSchema);
