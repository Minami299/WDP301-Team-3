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
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    discount_type: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
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
      type: Date
    },
    valid_to: {
      type: Date
    },
    usage_limit: {
      type: Number,
      default: null
    },
    used_count: {
      type: Number,
      min: 0,
      default: 0
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'DISABLED'],
      default: 'ACTIVE'
    }
  },
  {
    collection: 'promotions',
    timestamps: false
  }
);

promotionSchema.index({ status: 1, valid_from: 1, valid_to: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
