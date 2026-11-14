const mongoose = require('mongoose');

const roomHoldSchema = new mongoose.Schema({
  hold_token: { type: String, required: true, unique: true, index: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
  check_in_date: { type: Date, required: true },
  check_out_date: { type: Date, required: true },
  rooms: { type: Number, required: true, min: 1, max: 20 },
  expires_at: { type: Date, required: true, index: true },
}, { collection: 'room_holds', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

roomHoldSchema.index({ service_id: 1, check_in_date: 1, check_out_date: 1, expires_at: 1 });

module.exports = mongoose.model('RoomHold', roomHoldSchema);
