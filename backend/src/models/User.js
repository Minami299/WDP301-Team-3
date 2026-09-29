const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema(
  {
    avatar_url: {
      type: String,
      default: ''
    },
    payment_methods: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password_hash: {
      type: String,
      required: true
    },
    full_name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true
    },
    total_loyalty_points: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned', 'pending'],
      default: 'active'
    },
    profile: {
      type: userProfileSchema,
      default: () => ({})
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

module.exports = mongoose.model('User', userSchema);
