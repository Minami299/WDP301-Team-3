const mongoose = require('mongoose');

const ticketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '', maxlength: 2000 },
  conditions: { type: String, default: '', maxlength: 2000 },
  min_age: { type: Number, default: null, min: 0, max: 150 },
  max_age: { type: Number, default: null, min: 0, max: 150 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
});

const serviceSchema = new mongoose.Schema(
  {
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true
    },
    type: {
      type: String,
      enum: ['ROOM', 'TICKET'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: null,
      trim: true
    },
    photos: {
      type: [String],
      default: []
    },
    capacity: {
      type: Number,
      min: 1,
      default: 1
    },
    base_price: {
      type: Number,
      min: 0,
      required: true
    },
    ticket_types: { type: [ticketTypeSchema], default: undefined },
    booking_revision: { type: Number, default: undefined },
    ticket_audience: {
      type: String,
      enum: ['ADULT', 'CHILD', 'ALL'],
      default: undefined
    },
    service_category: { type: String, enum: ['ATTRACTION', 'TOUR', 'TICKET', 'EXPERIENCE'], default: undefined },
    location: { type: String, trim: true, maxlength: 300, default: undefined },
    pricing_unit: { type: String, enum: ['PERSON', 'TICKET', 'TOUR', 'PACKAGE'], default: undefined },
    duration_minutes: { type: Number, min: 1, default: undefined },
    bathrooms: {
      type: Number,
      min: 0,
      default: 1
    },
    total_rooms: {
      type: Number,
      min: 1,
      default: 1
    },
    bedrooms: [
      {
        bedroom_name: {
          type: String,
          default: 'Phòng ngủ'
        },
        beds: [
          {
            bed_type: {
              type: String,
              required: true
            },
            count: {
              type: Number,
              default: 1,
              min: 1
            }
          }
        ]
      }
    ],
    has_common_area_bed: {
      type: Boolean,
      default: false
    },
    common_area_beds: [
      {
        bed_type: {
          type: String,
          required: true
        },
        count: {
          type: Number,
          default: 1,
          min: 1
        }
      }
    ]
  },
  {
    collection: 'services',
    timestamps: false
  }
);

serviceSchema.index({ facility_id: 1 });
serviceSchema.index({ type: 1 });

module.exports = mongoose.model('Service', serviceSchema);
