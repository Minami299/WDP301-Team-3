const mongoose = require('mongoose');

const facilityAmenitySchema = new mongoose.Schema(
  {
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true
    },
    amenity_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Amenity',
      required: true
    }
  },
  {
    collection: 'facility_amenities',
    timestamps: false
  }
);

facilityAmenitySchema.index({ facility_id: 1, amenity_id: 1 }, { unique: true });
facilityAmenitySchema.index({ amenity_id: 1 });

module.exports = mongoose.model('FacilityAmenity', facilityAmenitySchema);
