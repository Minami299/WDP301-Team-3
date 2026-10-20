const { Facility, Service, FacilityImage, Amenity, FacilityAmenity } = require('../models');
const { createVendorBusiness, validateBusinessDetails } = require('./vendorRegistration.service');
const { normalizeServices } = require('./vendorServiceFields');

// Called only inside approval's transaction, after the submitted snapshot has passed review.
async function publishBusiness(userId, role, business, session) {
  if (role === 'ACTIVITY_VENDOR') {
    const facility = await createVendorBusiness(userId, validateBusinessDetails(business), normalizeServices(business.services), session);
    await Facility.updateOne({ _id: facility._id, status: 'PENDING' }, { $set: { status: 'ACTIVE' } }, { session });
    return facility;
  }
  const [facility] = await Facility.create([{
    vendor_id: userId, type: 'HOTEL', name: business.facility_name,
    address: business.facility_address, city: business.facility_city,
    contact_phone: business.phone, description: business.facility_description,
    latitude: business.latitude, longitude: business.longitude, size: business.facility_size,
    promotions: business.promotions, payout_method: business.payout_method,
    check_in_policy: business.check_in_policy, status: 'ACTIVE',
  }], { session });
  for (const name of business.amenities) {
    let amenity = await Amenity.findOne({ name }).session(session);
    if (!amenity) [amenity] = await Amenity.create([{ name, type: 'HOTEL_FACILITY' }], { session });
    await FacilityAmenity.create([{ facility_id: facility._id, amenity_id: amenity._id }], { session });
  }
  for (const [index, room] of business.rooms.entries()) {
    await Service.create([{
      facility_id: facility._id, type: 'ROOM', name: room.name, base_price: room.price,
      capacity: business.service_capacity, bathrooms: business.bathrooms,
      bedrooms: [{ bedroom_name: room.name, beds: room.beds }], photos: room.photos,
      has_common_area_bed: business.has_common_area_bed, common_area_beds: business.common_area_beds,
      description: business.facility_description,
    }], { session });
    await FacilityImage.insertMany(room.photos.map((url, photoIndex) => ({
      facility_id: facility._id, image_url: url, is_primary: index === 0 && photoIndex === 0,
    })), { session });
  }
  return facility;
}

module.exports = { publishBusiness };
