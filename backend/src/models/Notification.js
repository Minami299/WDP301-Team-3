const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['SYSTEM', 'BOOKING', 'PROMOTION', 'TICKET_UPDATE'],
      default: 'SYSTEM'
    },
    is_read: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: 'notifications',
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, is_read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
