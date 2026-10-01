const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    icon_url: {
      type: String,
      default: null,
      trim: true
    },
    type: {
      type: String,
      enum: ['ROOM_FEATURE', 'HOTEL_FACILITY', 'ATTRACTION_SERVICE'],
      required: true
    }
  },
  {
    collection: 'amenities',
    timestamps: false
  }
);

module.exports = mongoose.model('Amenity', amenitySchema);
