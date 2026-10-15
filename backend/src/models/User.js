const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      maxlength: 30,
    },
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    total_loyalty_points: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "LOCKED", "PENDING"],
      default: "ACTIVE",
    },
    // Missing/null means a legacy account; login keeps its existing ACTIVE rule.
    approvalStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: null },
    approvalReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvalReviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, maxlength: 1000, default: null },
    is_verified: {
      type: Boolean,
      default: true,
    },
    verification_otp_hash: { type: String, select: false },
    verification_otp_expires_at: { type: Date, select: false },
    verification_otp_attempts: { type: Number, select: false },
    verification_otp_last_sent_at: { type: Date, select: false },
    verification_otp_request_count: { type: Number, select: false },
    verification_otp_window_start: { type: Date, select: false },
    reset_otp_hash: { type: String, select: false },
    reset_otp_expires_at: { type: Date, select: false },
    reset_otp_attempts: { type: Number, select: false },
    reset_otp_last_sent_at: { type: Date, select: false },
    reset_otp_request_count: { type: Number, select: false },
    reset_otp_window_start: { type: Date, select: false },
    password_reset_token_hash: { type: String, select: false },
    password_reset_token_expires_at: { type: Date, select: false },
    pending_email: { type: String, trim: true, lowercase: true, select: false },
    email_change_otp_hash: { type: String, select: false },
    email_change_otp_expires_at: { type: Date, select: false },
    email_change_request_count: { type: Number, default: 0, select: false },
    email_change_request_window_start: { type: Date, select: false },
    email_change_last_sent_at: { type: Date, select: false },
    email_change_verification_attempts: {
      type: Number,
      default: 0,
      select: false,
    },
    email_change_blocked_until: { type: Date, select: false },
  },
  {
    collection: "users",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

userSchema.index({ role_id: 1 });

module.exports = mongoose.model("User", userSchema);
