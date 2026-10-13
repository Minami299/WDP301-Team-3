const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    role_name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: null,
      trim: true
    },
    // undefined means: use the defaults in configs/permissions.js
    permissions: {
      type: [String],
      default: undefined
    }
  },
  {
    collection: 'roles',
    timestamps: false
  }
);

module.exports = mongoose.model('Role', roleSchema);
