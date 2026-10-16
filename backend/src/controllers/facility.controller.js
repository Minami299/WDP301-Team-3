const facilityService = require("../services/facility.service");

/**
 * Controller: Search and filter facilities
 * GET /api/facilities
 */
const search = async (req, res, next) => {
  try {
    let {
      keyword,
      type,
      city,
      checkIn,
      checkOut,
      guests,
      rooms,
      adults,
      children,
      minPrice,
      maxPrice,
      amenities,
      stars,
      minRating,
      page,
      limit,
      sortBy,
    } = req.query;

    const normalizedKeyword = (keyword || req.query.destination || req.query.location || req.query.q || req.query.dest || "").trim();
    const facilityType = (type || "").toUpperCase();

    let parsedRooms = parseInt(rooms, 10);
    let parsedAdults = parseInt(adults, 10);
    let parsedChildren = parseInt(children, 10);
    let parsedGuests = parseInt(guests, 10);

    // Business rule validations per facility type
    if (facilityType === "HOTEL") {
      parsedRooms = isNaN(parsedRooms) || parsedRooms < 1 ? 1 : Math.min(20, parsedRooms);
      parsedAdults = isNaN(parsedAdults) || parsedAdults < 1 ? Math.max(1, parsedRooms) : parsedAdults;
      // Rule: Every hotel room must have at least 1 adult
      if (parsedAdults < parsedRooms) {
        parsedAdults = parsedRooms;
      }
      parsedChildren = isNaN(parsedChildren) || parsedChildren < 0 ? 0 : parsedChildren;
      parsedGuests = Math.max(parsedGuests || (parsedAdults + parsedChildren), parsedRooms);
    } else if (facilityType === "ATTRACTION") {
      parsedRooms = 1;
      checkOut = "";
      parsedAdults = isNaN(parsedAdults) || parsedAdults < 1 ? 1 : parsedAdults;
      parsedChildren = isNaN(parsedChildren) || parsedChildren < 0 ? 0 : parsedChildren;
      parsedGuests = Math.max(1, parsedGuests || (parsedAdults + parsedChildren));
    }

    const result = await facilityService.searchFacilities({
      keyword: normalizedKeyword,
      type: facilityType,
      city,
      checkIn,
      checkOut,
      guests: parsedGuests,
      rooms: parsedRooms,
      adults: parsedAdults,
      children: parsedChildren,
      minPrice,
      maxPrice,
      amenities,
      stars,
      minRating,
      page,
      limit,
      sortBy,
    });

    res.status(200).json({
      success: true,
      data: result.facilities,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get facility details by ID
 * GET /api/facilities/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const facility = await facilityService.getFacilityById(id);

    res.status(200).json({
      success: true,
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get filter options (cities, amenities, price bounds)
 * GET /api/facilities/filters/options
 */
const getFilterOptions = async (req, res, next) => {
  try {
    const options = await facilityService.getFilterOptions(req.query);

    res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Search locations & destinations for autocomplete
 * GET /api/facilities/locations
 */
const searchLocations = async (req, res, next) => {
  try {
    const keyword = req.query.keyword || req.query.q || "";
    const locations = await facilityService.searchLocations(keyword);

    res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Add a customer review for a facility
 * POST /api/facilities/:id/reviews
 */
const createReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const customerId = req.user?.id || req.user?._id;

    const review = await facilityService.addReview(id, {
      customerId,
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      data: review,
      message: "Gửi nhận xét thành công!",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Admin / Vendor reply to a customer review
 * POST /api/facilities/:id/reviews/:reviewId/reply
 */
const replyReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { reply, vendor_reply } = req.body;
    const replyText = reply || vendor_reply;

    const updated = await facilityService.replyToReview(reviewId, replyText);

    res.status(200).json({
      success: true,
      data: updated,
      message: "Phản hồi nhận xét thành công!",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  search,
  getById,
  getFilterOptions,
  searchLocations,
  createReview,
  replyReview,
  ticketAvailability: async (req, res, next) => {
    try { res.json({ success: true, data: await require('../services/attraction.service').publicAvailability(req.params.id, req.query) }); }
    catch (error) { next(error); }
  },
};
