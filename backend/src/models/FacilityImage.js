const mongoose = require('mongoose');

const facilityImageSchema = new mongoose.Schema(
  {
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true
    },
    image_url: {
      type: String,
      required: true,
      trim: true
    },
    is_primary: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: 'facility_images',
    timestamps: false
  }
);

facilityImageSchema.index({ facility_id: 1 });
facilityImageSchema.index(
  { facility_id: 1, is_primary: 1 },
  { unique: true, partialFilterExpression: { is_primary: true } }
);

module.exports = mongoose.model('FacilityImage', facilityImageSchema);
