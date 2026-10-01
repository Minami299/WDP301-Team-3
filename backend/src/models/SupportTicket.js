const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assigned_manager_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    issue_type: {
      type: String,
      enum: ['REFUND', 'FACILITY_ISSUE', 'CHECK_IN_ERROR', 'OTHER'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN'
    }
  },
  {
    collection: 'support_tickets',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

supportTicketSchema.index({ booking_id: 1 });
supportTicketSchema.index({ created_by: 1 });
supportTicketSchema.index({ assigned_manager_id: 1 });
supportTicketSchema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
