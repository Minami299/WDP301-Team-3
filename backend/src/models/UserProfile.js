const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    avatar_url: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    payment_methods: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: "user_profiles",
    timestamps: false,
  },
);

module.exports = mongoose.model("UserProfile", userProfileSchema);
