const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    config_key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    config_value: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    collection: 'system_configs',
    timestamps: { createdAt: false, updatedAt: 'updated_at' }
  }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
