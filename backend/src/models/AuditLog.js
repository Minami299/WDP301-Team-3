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
      type: mongoose.Schema.Types.ObjectId,
      required: true
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
    collection: 'audit_logs',
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

auditLogSchema.index({ user_id: 1, created_at: -1 });
auditLogSchema.index({ table_name: 1, record_id: 1 });
auditLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
