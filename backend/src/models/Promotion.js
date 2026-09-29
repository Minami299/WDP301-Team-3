const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    discount_type: {
      type: String,
      enum: ['percentage', 'fixed_amount'],
      required: true
    },
    discount_value: {
      type: Number,
      required: true
    },
    max_discount: {
      type: Number,
      default: null
    },
    valid_from: {
      type: Date,
      required: true
    },
    valid_to: {
      type: Date,
      required: true
    },
    usage_limit: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Promotion', promotionSchema);
