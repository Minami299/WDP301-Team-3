const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    table_name: {
      type: String,
      required: true,
      trim: true
    },
    record_id: {
      type: String,
      trim: true
    },
    old_data: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    new_data: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
