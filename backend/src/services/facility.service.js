const mongoose = require("mongoose");
const { publicFacility } = require('../utils/publicFacility');
const { Facility, FacilityAmenity, Amenity, Service, ServiceInventory, Review, User, Booking, BookingDetail, RoomHold } = require("../models");
const { availabilityForRange } = require('../utils/roomAvailability');

/**
 * Create accent-tolerant regex for Vietnamese keywords
 * Allows "Ba Na" to match "Bà Nà" and "Phu Quoc" to match "Phú Quốc"
 */
const makeVietnameseRegex = (str) => {
  if (!str || !str.trim()) return null;
  const clean = str.trim();
  const map = {
    a: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    à: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    á: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ả: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ã: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ạ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ă: "[aàáảãạăằắẳẵặâầấẩẫậ]",  
    ằ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ắ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ẳ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ẵ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ặ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    â: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ầ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ấ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ẩ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ẫ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    ậ: "[aàáảãạăằắẳẵặâầấẩẫậ]",
    d: "[dđ]",
    đ: "[dđ]",
    e: "[eèéẻẽẹêềếểễệ]",
    è: "[eèéẻẽẹêềếểễệ]",
    é: "[eèéẻẽẹêềếểễệ]",
    ẻ: "[eèéẻẽẹêềếểễệ]",
    ẽ: "[eèéẻẽẹêềếểễệ]",
    ẹ: "[eèéẻẽẹêềếểễệ]",
    ê: "[eèéẻẽẹêềếểễệ]",
    ề: "[eèéẻẽẹêềếểễệ]",
    ế: "[eèéẻẽẹêềếểễệ]",
    ể: "[eèéẻẽẹêềếểễệ]",
    ễ: "[eèéẻẽẹêềếểễệ]",
    ệ: "[eèéẻẽẹêềếểễệ]",
    i: "[iìíỉĩị]",
    ì: "[iìíỉĩị]",
    í: "[iìíỉĩị]",
    ỉ: "[iìíỉĩị]",
    ĩ: "[iìíỉĩị]",
    ị: "[iìíỉĩị]",
    o: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ò: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ó: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ỏ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    õ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ọ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ô: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ồ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ố: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ổ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ỗ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ộ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ơ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ờ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ớ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ở: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ỡ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    ợ: "[oòóỏõọôồốổỗộơờớởỡợ]",
    u: "[uùúủũụưừứửữự]",
    ù: "[uùúủũụưừứửữự]",
    ú: "[uùúủũụưừứửữự]",
    ủ: "[uùúủũụưừứửữự]",
    ũ: "[uùúủũụưừứửữự]",
    ụ: "[uùúủũụưừứửữự]",
    ư: "[uùúủũụưừứửữự]",
    ừ: "[uùúủũụưừứửữự]",
    ứ: "[uùúủũụưừứửữự]",
    ử: "[uùúủũụưừứửữự]",
    ữ: "[uùúủũụưừứửữự]",
    ự: "[uùúủũụưừứửữự]",
    y: "[yỳýỷỹỵ]",
    ỳ: "[yỳýỷỹỵ]",
    ý: "[yỳýỷỹỵ]",
    ỷ: "[yỳýỷỹỵ]",
    ỹ: "[yỳýỷỹỵ]",
    ỵ: "[yỳýỷỹỵ]",
  };

  const pattern = clean
    .split("")
    .map((c) => {
      const lower = c.toLowerCase();
      if (map[lower]) return map[lower];
      if (/[.*+?^${}()|[\]\\]/.test(c)) return `\\${c}`;
      return c;
    })
    .join("");

  return new RegExp(pattern, "i");
};

const releaseExpiredRoomReservations = async () => {
  const now = new Date();
  await Promise.all([
    RoomHold.deleteMany({ expires_at: { $lte: now } }),
    Booking.updateMany(
      { status: 'PENDING', $or: [{ expires_at: { $lte: now } }, { expires_at: { $exists: false } }] },
      { $set: { status: 'CANCELLED', decided_at: now, decision_note: 'Hết thời gian giữ phòng do chưa thanh toán' } },
    ),
  ]);
};

/**
 * Build match condition for top-level Facility fields
 */
const buildBaseMatch = ({ keyword, type, city }) => {
  const match = {
    status: { $in: ["ACTIVE", "APPROVED"] },
  };

  if (type && type !== "all" && type !== "ALL") {
    match.type = type.toUpperCase();
  }

  if (city && city.trim()) {
    const cityRegex = makeVietnameseRegex(city.trim());
    if (cityRegex) {
      match.city = { $regex: cityRegex };
    }
  }

  if (keyword && keyword.trim()) {
    const kwRegex = makeVietnameseRegex(keyword.trim());
    if (kwRegex) {
      match.$or = [
        { name: kwRegex },
        { address: kwRegex },
        { city: kwRegex },
        { description: kwRegex },
      ];
    }
  }

  return match;
};

/**
 * Search and filter facilities with joined images, amenities, services, and reviews
 */
const searchFacilities = async (params = {}) => {
  const {
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
    sortBy = "recommended",
  } = params;
  const baseMatch = buildBaseMatch({ keyword, type, city });

  let nights = 1;
  if (checkIn && checkOut) {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = outDate.getTime() - inDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    if (diffDays > 0) {
      nights = diffDays;
    }
  }
  const parsedRequestedRooms = Number(rooms);
  const requestedRooms = Number.isSafeInteger(parsedRequestedRooms) && parsedRequestedRooms >= 1 ? parsedRequestedRooms : 1;
  const requestedAdultsValue = Number.parseInt(adults, 10);
  const requestedAdults = Number.isSafeInteger(requestedAdultsValue) ? requestedAdultsValue : requestedRooms;
  const hasEnoughAdults = requestedAdults >= requestedRooms;
  const parsedRequestedGuests = Number(guests) || (Number(adults) || 1) + (Number(children) || 0);
  const requestedGuests = Number.isSafeInteger(parsedRequestedGuests) && parsedRequestedGuests >= 1 ? parsedRequestedGuests : 1;
  const minRoomCapacity = Math.ceil(requestedGuests / requestedRooms);
  let eligibleRoomServiceIds = null;
  if (checkIn && checkOut && new Date(checkOut) > new Date(checkIn)) {
    const matchingHotels = await Facility.find({ ...baseMatch, type: 'HOTEL' }).select('_id').lean();
    const roomServices = matchingHotels.length
      ? await Service.find({ type: 'ROOM', informational_only: { $ne: true }, facility_id: { $in: matchingHotels.map(hotel => hotel._id) } }).select('_id facility_id total_rooms capacity').lean()
      : [];
    const serviceIds = roomServices.map(service => service._id);
    const [bookingDetails, activeHolds] = serviceIds.length ? await Promise.all([
      BookingDetail.find({ service_id: { $in: serviceIds }, check_in_date: { $lt: new Date(checkOut) }, check_out_date: { $gt: new Date(checkIn) } })
        .populate('booking_id', 'status expires_at').lean(),
      RoomHold.find({ service_id: { $in: serviceIds }, check_in_date: { $lt: new Date(checkOut) }, check_out_date: { $gt: new Date(checkIn) }, expires_at: { $gt: new Date() } }).lean(),
    ]) : [[], []];
    const now = new Date();
    const bookingsByService = new Map();
    for (const detail of bookingDetails) {
      const id = String(detail.service_id);
      if (!bookingsByService.has(id)) bookingsByService.set(id, []);
      bookingsByService.get(id).push(detail);
    }
    const holdsByService = new Map();
    for (const hold of activeHolds) {
      const id = String(hold.service_id);
      if (!holdsByService.has(id)) holdsByService.set(id, []);
      holdsByService.get(id).push(hold);
    }
    eligibleRoomServiceIds = roomServices.filter(service => {
      if ((Number(service.capacity) || 2) < minRoomCapacity) return false;
      const inventory = availabilityForRange({
        totalRooms: service.total_rooms ?? 1,
        checkIn,
        checkOut,
        bookings: bookingsByService.get(String(service._id)) || [],
        holds: holdsByService.get(String(service._id)) || [],
        now,
      });
      return inventory.available_rooms >= requestedRooms;
    }).map(service => service._id);
  }

  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(params.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: baseMatch },
    // Lookup images
    {
      $lookup: {
        from: "facility_images",
        localField: "_id",
        foreignField: "facility_id",
        as: "images",
      },
    },
    // Lookup facility amenities
    {
      $lookup: {
        from: "facility_amenities",
        localField: "_id",
        foreignField: "facility_id",
        as: "facility_amenities",
      },
    },
    // Lookup amenities details
    {
      $lookup: {
        from: "amenities",
        localField: "facility_amenities.amenity_id",
        foreignField: "_id",
        as: "amenities",
      },
    },
    // Lookup services to compute price
    {
      $lookup: {
        from: "services",
        localField: "_id",
        foreignField: "facility_id",
        as: "services",
      },
    },
    {
      $addFields: {
        eligible_room_services: {
          $filter: {
            input: "$services",
            as: "svc",
            cond: {
              $and: [
                { $eq: ["$$svc.type", "ROOM"] },
                { $ne: ["$$svc.informational_only", true] },
                { $and: [{ $gte: [requestedGuests, requestedRooms] }, { $literal: hasEnoughAdults }] },
                { $gte: [{ $ifNull: ["$$svc.total_rooms", 1] }, requestedRooms] },
                { $gte: [{ $ifNull: ["$$svc.capacity", 2] }, minRoomCapacity] },
                ...(eligibleRoomServiceIds ? [{ $in: ["$$svc._id", eligibleRoomServiceIds] }] : []),
              ],
            },
          },
        },
      },
    },
    // Lookup reviews to compute rating
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "facility_id",
        as: "reviews",
      },
    },
    // Computed fields
    {
      $addFields: {
        min_price: {
          $cond: {
            if: { $gt: [{ $size: "$services" }, 0] },
            then: { $cond: [{ $eq: ["$type", "HOTEL"] }, { $min: "$eligible_room_services.base_price" }, { $min: "$services.base_price" }] },
            else: 0,
          },
        },
        max_price: {
          $cond: {
            if: { $gt: [{ $size: "$services" }, 0] },
            then: { $cond: [{ $eq: ["$type", "HOTEL"] }, { $max: "$eligible_room_services.base_price" }, { $max: "$services.base_price" }] },
            else: 0,
          },
        },
        total_hotel_rooms: {
          $sum: {
            $map: {
              input: "$services",
              as: "svc",
              in: {
                $cond: {
                  if: { $eq: ["$$svc.type", "ROOM"] },
                  then: { $ifNull: ["$$svc.total_rooms", 1] },
                  else: 0,
                },
              },
            },
          },
        },
        total_hotel_capacity: {
          $sum: {
            $map: {
              input: "$services",
              as: "svc",
              in: {
                $cond: {
                  if: { $eq: ["$$svc.type", "ROOM"] },
                  then: {
                    $multiply: [
                      { $ifNull: ["$$svc.capacity", 2] },
                      { $ifNull: ["$$svc.total_rooms", 1] },
                    ],
                  },
                  else: 0,
                },
              },
            },
          },
        },
        max_room_capacity: {
          $max: {
            $map: {
              input: "$services",
              as: "svc",
              in: {
                $cond: {
                  if: { $eq: ["$$svc.type", "ROOM"] },
                  then: { $ifNull: ["$$svc.capacity", 2] },
                  else: 0,
                },
              },
            },
          },
        },
        nights: { $literal: nights },
        requested_rooms: { $literal: requestedRooms },
        requested_guests: { $literal: requestedGuests },
        estimated_total_price: {
          $cond: {
            if: { $eq: ["$type", "HOTEL"] },
            then: {
              $multiply: [
                {
                  $cond: {
                    if: { $gt: [{ $size: "$services" }, 0] },
                    then: { $min: "$eligible_room_services.base_price" },
                    else: 0,
                  },
                },
                nights,
                requestedRooms,
              ],
            },
            else: {
              $multiply: [
                {
                  $cond: {
                    if: { $gt: [{ $size: "$services" }, 0] },
                    then: { $min: "$services.base_price" },
                    else: 0,
                  },
                },
                requestedGuests,
              ],
            },
          },
        },
        rating: {
          $cond: {
            if: { $gt: [{ $size: "$reviews" }, 0] },
            then: { $round: [{ $avg: "$reviews.rating" }, 1] },
            else: 0,
          },
        },
        review_count: { $size: "$reviews" },
        stars: {
          $ifNull: [
            "$stars",
            {
              $cond: {
                if: {
                  $regexMatch: {
                    input: { $ifNull: ["$description", ""] },
                    regex: "5 sao|5-star",
                    options: "i",
                  },
                },
                then: 5,
                else: {
                  $cond: {
                    if: {
                      $regexMatch: {
                        input: { $ifNull: ["$description", ""] },
                        regex: "4 sao|4-star",
                        options: "i",
                      },
                    },
                    then: 4,
                    else: {
                      $cond: {
                        if: {
                          $regexMatch: {
                            input: { $ifNull: ["$description", ""] },
                            regex: "3 sao|3-star",
                            options: "i",
                          },
                        },
                        then: 3,
                        else: {
                          $cond: {
                            if: {
                              $regexMatch: {
                                input: { $ifNull: ["$description", ""] },
                                regex: "2 sao|2-star",
                                options: "i",
                              },
                            },
                            then: 2,
                            else: 5,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        primary_image: {
          $let: {
            vars: {
              primaries: {
                $filter: {
                  input: "$images",
                  as: "img",
                  cond: { $eq: ["$$img.is_primary", true] },
                },
              },
            },
            in: {
              $cond: {
                if: { $gt: [{ $size: "$$primaries" }, 0] },
                then: { $arrayElemAt: ["$$primaries.image_url", 0] },
                else: {
                  $cond: {
                    if: { $gt: [{ $size: "$images" }, 0] },
                    then: { $arrayElemAt: ["$images.image_url", 0] },
                    else: null,
                  },
                },
              },
            },
          },
        },
      },
    },
  ];

  // Secondary match for computed fields (price, amenities, rating)
  pipeline.push({ $set: {
    min_price: { $cond: [{ $eq: ['$listing_mode', 'INFORMATIONAL'] }, null, '$min_price'] },
    max_price: { $cond: [{ $eq: ['$listing_mode', 'INFORMATIONAL'] }, null, '$max_price'] },
    estimated_total_price: { $cond: [{ $eq: ['$listing_mode', 'INFORMATIONAL'] }, null, '$estimated_total_price'] },
  } });
  const secondaryMatch = {};

  if (minPrice !== undefined && minPrice !== null && minPrice !== "") {
    const numMin = parseFloat(minPrice);
    if (!isNaN(numMin)) {
      secondaryMatch.min_price = { ...(secondaryMatch.min_price || {}), $gte: numMin };
    }
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== "") {
    const numMax = parseFloat(maxPrice);
    if (!isNaN(numMax)) {
      secondaryMatch.min_price = { ...(secondaryMatch.min_price || {}), $lte: numMax };
    }
  }

  if (minRating !== undefined && minRating !== null && minRating !== "") {
    const numRating = parseFloat(minRating);
    if (!isNaN(numRating)) {
      secondaryMatch.rating = { ...(secondaryMatch.rating || {}), $gte: numRating };
    }
  }

  if (stars !== undefined && stars !== null && stars !== "") {
    const numStars = parseInt(stars, 10);
    if (!isNaN(numStars)) {
      secondaryMatch.stars = numStars;
    }
  }

  // Filter by amenities (name array or comma-separated)
  if (amenities) {
    const amenityList = Array.isArray(amenities)
      ? amenities
      : amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);

    if (amenityList.length > 0) {
      secondaryMatch["amenities.name"] = { $in: amenityList };
    }
  }

  if (Object.keys(secondaryMatch).length > 0) {
    pipeline.push({ $match: secondaryMatch });
  }
  if (!type || ['HOTEL', 'ALL'].includes(String(type).toUpperCase())) {
    pipeline.push({ $match: { $expr: { $or: [
      { $ne: ['$type', 'HOTEL'] },
      { $gt: [{ $size: '$eligible_room_services' }, 0] },
    ] } } });
  }

  // Sorting
  const sortStage = {};
  switch (sortBy) {
    case "price_asc":
    case "price-low":
      sortStage.min_price = 1;
      break;
    case "price_desc":
    case "price-high":
      sortStage.min_price = -1;
      break;
    case "rating":
    case "rating_desc":
      sortStage.rating = -1;
      sortStage.review_count = -1;
      break;
    case "newest":
      sortStage.created_at = -1;
      break;
    case "recommended":
    default:
      sortStage.rating = -1;
      sortStage.review_count = -1;
      sortStage.created_at = -1;
      break;
  }
  pipeline.push({ $sort: sortStage });

  // Facet for pagination & count
  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      data: [
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            vendor_id: 1,
            type: 1,
            name: 1,
            address: 1,
            city: 1,
            description: 1,
            commission_rate: 1,
            status: 1,
            created_at: 1,
            stars: 1,
            min_price: 1,
            max_price: 1,
            nights: 1,
            requested_rooms: 1,
            requested_guests: 1,
            estimated_total_price: 1,
            total_hotel_rooms: 1,
            total_hotel_capacity: 1,
            rating: 1,
            review_count: 1,
            primary_image: 1,
            listing_mode: 1,
            official_website: 1,
            source_urls: 1,
            source_checked_at: 1,
            image_credit: 1,
            catalog_key: 1,
            images: {
              $map: {
                input: "$images",
                as: "img",
                in: {
                  _id: "$$img._id",
                  image_url: "$$img.image_url",
                  is_primary: "$$img.is_primary",
                },
              },
            },
            amenities: {
              $map: {
                input: "$amenities",
                as: "amen",
                in: {
                  _id: "$$amen._id",
                  name: "$$amen.name",
                  icon_url: "$$amen.icon_url",
                  type: "$$amen.type",
                },
              },
            },
            services: {
              $map: {
                input: "$services",
                as: "svc",
                in: {
                  _id: "$$svc._id",
                  type: "$$svc.type",
                  name: "$$svc.name",
                  description: "$$svc.description",
                  photos: "$$svc.photos",
                  informational_only: "$$svc.informational_only",
                  ticket_types: "$$svc.ticket_types",
                  capacity: "$$svc.capacity",
                  base_price: "$$svc.base_price",
                },
              },
            },
          },
        },
      ],
    },
  });

  const [result] = await Facility.aggregate(pipeline);
  const total = result?.metadata?.[0]?.total || 0;
  const data = result?.data || [];

  return {
    facilities: data.map(publicFacility),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get facility detail by ID with images, amenities, and services
 */
const getFacilityById = async (id, currentUserId = null) => {
  let targetId = id;
  if (!mongoose.isValidObjectId(id)) {
    const fallbackFacility = await Facility.findOne({
      status: { $in: ["ACTIVE", "APPROVED"] },
    }).select("_id");
    if (!fallbackFacility) {
      const error = new Error("Không tìm thấy cơ sở dịch vụ");
      error.statusCode = 404;
      throw error;
    }
    targetId = fallbackFacility._id;
  }

  const facilityObjectId = new mongoose.Types.ObjectId(targetId);
  const pipeline = [
    { $match: { _id: facilityObjectId } },
    {
      $lookup: {
        from: "facility_images",
        localField: "_id",
        foreignField: "facility_id",
        as: "images",
      },
    },
    {
      $lookup: {
        from: "facility_amenities",
        localField: "_id",
        foreignField: "facility_id",
        as: "facility_amenities",
      },
    },
    {
      $lookup: {
        from: "amenities",
        localField: "facility_amenities.amenity_id",
        foreignField: "_id",
        as: "amenities",
      },
    },
    {
      $lookup: {
        from: "services",
        localField: "_id",
        foreignField: "facility_id",
        as: "services",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "vendor_id",
        foreignField: "_id",
        as: "vendor_info",
      },
    },
    {
      $lookup: {
        from: "reviews",
        let: { facilityId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$facility_id", "$$facilityId"] } } },
          { $sort: { created_at: -1 } },
          {
            $lookup: {
              from: "users",
              localField: "customer_id",
              foreignField: "_id",
              as: "customer",
            },
          },
          {
            $addFields: {
              customer: { $arrayElemAt: ["$customer", 0] },
            },
          },
          {
            $project: {
              _id: 1,
              rating: 1,
              comment: 1,
              vendor_reply: 1,
              vendor_reply_by: 1,
              vendor_replied_at: 1,
              created_at: 1,
              customer_name: {
                $ifNull: [
                  "$customer.full_name",
                  { $ifNull: ["$customer.name", "Khách hàng Travelio"] },
                ],
              },
              customer_avatar: {
                $ifNull: [
                  "$customer.avatar_url",
                  { $ifNull: ["$customer.avatar", ""] },
                ],
              },
            },
          },
        ],
        as: "reviews",
      },
    },
    {
      $addFields: {
        vendor: {
          $let: {
            vars: { v: { $arrayElemAt: ["$vendor_info", 0] } },
            in: {
              name: "$$v.full_name",
              email: "$$v.email",
              phone: "$$v.phone_number",
            },
          },
        },
        min_price: {
          $cond: {
            if: { $gt: [{ $size: "$services" }, 0] },
            then: { $min: "$services.base_price" },
            else: 0,
          },
        },
        max_price: {
          $cond: {
            if: { $gt: [{ $size: "$services" }, 0] },
            then: { $max: "$services.base_price" },
            else: 0,
          },
        },
        rating: {
          $cond: {
            if: { $gt: [{ $size: "$reviews" }, 0] },
            then: { $round: [{ $avg: "$reviews.rating" }, 1] },
            else: 0,
          },
        },
        review_count: { $size: "$reviews" },
        stars: {
          $ifNull: [
            "$stars",
            {
              $cond: {
                if: {
                  $regexMatch: {
                    input: { $ifNull: ["$description", ""] },
                    regex: "5 sao|5-star",
                    options: "i",
                  },
                },
                then: 5,
                else: {
                  $cond: {
                    if: {
                      $regexMatch: {
                        input: { $ifNull: ["$description", ""] },
                        regex: "4 sao|4-star",
                        options: "i",
                      },
                    },
                    then: 4,
                    else: {
                      $cond: {
                        if: {
                          $regexMatch: {
                            input: { $ifNull: ["$description", ""] },
                            regex: "3 sao|3-star",
                            options: "i",
                          },
                        },
                        then: 3,
                        else: {
                          $cond: {
                            if: {
                              $regexMatch: {
                                input: { $ifNull: ["$description", ""] },
                                regex: "2 sao|2-star",
                                options: "i",
                              },
                            },
                            then: 2,
                            else: 5,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        primary_image: {
          $let: {
            vars: {
              primaries: {
                $filter: {
                  input: "$images",
                  as: "img",
                  cond: { $eq: ["$$img.is_primary", true] },
                },
              },
            },
            in: {
              $cond: {
                if: { $gt: [{ $size: "$$primaries" }, 0] },
                then: { $arrayElemAt: ["$$primaries.image_url", 0] },
                else: {
                  $cond: {
                    if: { $gt: [{ $size: "$images" }, 0] },
                    then: { $arrayElemAt: ["$images.image_url", 0] },
                    else: null,
                  },
                },
              },
            },
          },
        },
      },
    },
  ];

  const [facility] = await Facility.aggregate(pipeline);
  if (!facility || !['ACTIVE', 'APPROVED'].includes(facility.status)) {
    const error = new Error("Không tìm thấy cơ sở dịch vụ");
    error.statusCode = 404;
    throw error;
  }

  let canReview = false;
  let hasPurchased = false;
  let customerReview = null;

  if (currentUserId && mongoose.isValidObjectId(currentUserId)) {
    const custObjectId = new mongoose.Types.ObjectId(currentUserId);
    const servicesOfFacility = await Service.find({ facility_id: facilityObjectId }).select('_id').lean();
    const serviceIds = servicesOfFacility.map(s => s._id);
    const inventoriesOfFacility = await ServiceInventory.find({ service_id: { $in: serviceIds } }).select('_id').lean();
    const inventoryIds = inventoriesOfFacility.map(i => i._id);

    const customerBookings = await Booking.find({
      customer_id: custObjectId,
      status: { $in: ['CONFIRMED', 'COMPLETED'] }
    }).select('_id').lean();

    if (customerBookings.length > 0) {
      const bookingIds = customerBookings.map(b => b._id);
      const matched = await BookingDetail.exists({
        booking_id: { $in: bookingIds },
        $or: [
          { facility_id: facilityObjectId },
          { service_id: { $in: serviceIds } },
          { inventory_id: { $in: inventoryIds } }
        ]
      });
      if (matched) {
        hasPurchased = true;
      }
    }

    const existingReview = await Review.findOne({
      facility_id: facilityObjectId,
      customer_id: custObjectId
    }).lean();

    if (existingReview) {
      customerReview = {
        _id: existingReview._id,
        rating: existingReview.rating,
        comment: existingReview.comment,
        vendor_reply: existingReview.vendor_reply,
        created_at: existingReview.created_at
      };
    }

    canReview = hasPurchased;
  }

  facility.can_review = canReview;
  facility.has_purchased = hasPurchased;
  facility.customer_review = customerReview;

  return publicFacility(facility);
};

/**
 * Get distinct filter options (cities, amenities, price bounds)
 * Strictly pulls only what is actually in use by active facilities in DB,
 * tailored to facility type (HOTEL, ATTRACTION) if specified
 */
const getFilterOptions = async (query = {}) => {
  const facilityFilter = {
    status: { $in: ["ACTIVE", "APPROVED"] },
  };

  if (query.type && query.type !== "all" && query.type !== "ALL") {
    facilityFilter.type = query.type.toUpperCase();
  }

  const activeFacilityIds = await Facility.distinct("_id", facilityFilter);

  const [cities, usedAmenityIds, priceStats] = await Promise.all([
    Facility.distinct("city", facilityFilter),
    FacilityAmenity.distinct("amenity_id", { facility_id: { $in: activeFacilityIds } }),
    Service.aggregate([
      {
        $match: { facility_id: { $in: activeFacilityIds } },
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$base_price" },
          maxPrice: { $max: "$base_price" },
        },
      },
    ]),
  ]);

  const amenities = await Amenity.find(
    { _id: { $in: usedAmenityIds } },
    "_id name icon_url type"
  ).sort({ name: 1 });

  return {
    cities: cities.filter(Boolean),
    amenities,
    priceRange: {
      min: priceStats[0]?.minPrice || 0,
      max: priceStats[0]?.maxPrice || 10000000,
    },
  };
};

/**
 * Add review for a facility
 */
const addReview = async (facilityId, { customerId, rating, comment }) => {
  if (!mongoose.isValidObjectId(facilityId)) {
    const error = new Error("ID cơ sở không hợp lệ");
    error.statusCode = 400;
    throw error;
  }
  const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));
  if (!comment || !comment.trim()) {
    const error = new Error("Vui lòng nhập nội dung nhận xét");
    error.statusCode = 400;
    throw error;
  }

  if (!customerId || !mongoose.isValidObjectId(customerId)) {
    const error = new Error("Vui lòng đăng nhập để gửi nhận xét & đánh giá.");
    error.statusCode = 401;
    throw error;
  }

  const facilityObjectId = new mongoose.Types.ObjectId(facilityId);
  const custObjectId = new mongoose.Types.ObjectId(customerId);

  const facilityExists = await Facility.exists({ _id: facilityObjectId });
  if (!facilityExists) {
    const error = new Error("Cơ sở dịch vụ không tồn tại");
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra chỉ những khách hàng đã từng đặt phòng hoặc mua vé thành công mới được đánh giá
  const servicesOfFacility = await Service.find({ facility_id: facilityObjectId }).select('_id').lean();
  const serviceIds = servicesOfFacility.map(s => s._id);
  const inventoriesOfFacility = await ServiceInventory.find({ service_id: { $in: serviceIds } }).select('_id').lean();
  const inventoryIds = inventoriesOfFacility.map(i => i._id);

  const customerBookings = await Booking.find({
    customer_id: custObjectId,
    status: { $in: ['CONFIRMED', 'COMPLETED'] }
  }).select('_id').lean();

  if (customerBookings.length === 0) {
    const error = new Error("Chỉ những khách hàng đã từng đặt phòng hoặc mua vé thành công tại cơ sở này mới có thể viết đánh giá.");
    error.statusCode = 403;
    throw error;
  }

  const bookingIds = customerBookings.map(b => b._id);
  const matchingDetail = await BookingDetail.findOne({
    booking_id: { $in: bookingIds },
    $or: [
      { facility_id: facilityObjectId },
      { service_id: { $in: serviceIds } },
      { inventory_id: { $in: inventoryIds } }
    ]
  }).select('_id booking_id').lean();

  if (!matchingDetail) {
    const error = new Error("Chỉ những khách hàng đã từng đặt phòng hoặc mua vé thành công tại cơ sở này mới có thể viết đánh giá.");
    error.statusCode = 403;
    throw error;
  }

  // Tạo mới hoặc cập nhật nhận xét của khách hàng cho cơ sở này
  let review = await Review.findOne({
    facility_id: facilityObjectId,
    customer_id: custObjectId
  });

  if (review) {
    review.rating = numericRating;
    review.comment = comment.trim();
    review.is_read_by_vendor = false;
    if (matchingDetail.booking_id) review.booking_id = matchingDetail.booking_id;
    await review.save();
  } else {
    review = await Review.create({
      facility_id: facilityObjectId,
      customer_id: custObjectId,
      booking_id: matchingDetail.booking_id || null,
      rating: numericRating,
      comment: comment.trim(),
      is_read_by_vendor: false,
    });
  }

  const customer = await User.findById(custObjectId).lean();

  return {
    _id: review._id,
    rating: review.rating,
    comment: review.comment,
    vendor_reply: review.vendor_reply,
    created_at: review.created_at,
    customer_name: customer?.full_name || customer?.name || "Khách hàng",
    customer_avatar: customer?.avatar_url || customer?.avatar || "",
  };
};

/**
 * Review response state is derived from vendor_reply; no moderation state exists.
 * Legacy replies without an author can be claimed by the current facility owner.
 */
const reviewError = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const reviewFacilityType = (user) => {
  if (!user?.id) throw reviewError('Vui lòng đăng nhập', 401);
  if (!['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(user.role)) throw reviewError('Chỉ đối tác phụ trách được phản hồi đánh giá', 403);
  return user.role === 'HOTEL_OWNER' ? 'HOTEL' : 'ATTRACTION';
};

const getManagedReviews = async (user, query = {}) => {
  const type = reviewFacilityType(user);
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isSafeInteger(page) || page < 1) throw reviewError('Trang không hợp lệ', 400);
  const limit = 10;
  const facilities = await Facility.find({ vendor_id: user.id, type }).select('_id').lean();
  const facilityIds = facilities.map(f => f._id);
  const filter = { facility_id: { $in: facilityIds } };
  const [reviews, total, unreadCount] = await Promise.all([
    Review.find(filter)
      .select('facility_id customer_id rating comment created_at vendor_reply vendor_reply_by vendor_replied_at is_read_by_vendor')
      .populate('facility_id', 'name type')
      .populate('customer_id', 'full_name')
      .sort({ created_at: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    Review.countDocuments({
      facility_id: { $in: facilityIds },
      is_read_by_vendor: { $ne: true },
    }),
  ]);
  return {
    reviews,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const replyToReview = async (user, facilityId, reviewId, replyText) => {
  const type = reviewFacilityType(user);
  if (!mongoose.isValidObjectId(facilityId) || !mongoose.isValidObjectId(reviewId)) {
    const error = new Error("ID nhận xét không hợp lệ");
    error.statusCode = 400;
    throw error;
  }
  if (typeof replyText !== 'string' || !replyText.trim() || replyText.trim().length > 5000) {
    const error = new Error("Phản hồi phải có từ 1 đến 5000 ký tự");
    error.statusCode = 400;
    throw error;
  }

  const facility = await Facility.findOne({ _id: facilityId, vendor_id: user.id, type }).select('_id').lean();
  if (!facility) throw reviewError('Không tìm thấy cơ sở hoặc bạn không có quyền quản lý', 404);

  const review = await Review.findOne({ _id: reviewId, facility_id: facilityId }).lean();
  if (!review) {
    const error = new Error("Không tìm thấy nhận xét");
    error.statusCode = 404;
    throw error;
  }

  if (review.vendor_reply_by && String(review.vendor_reply_by) !== String(user.id)) {
    throw reviewError('Không được chỉnh sửa phản hồi của đối tác khác', 403);
  }
  // The conditional update also prevents concurrent requests from overwriting another author's reply.
  const updated = await Review.findOneAndUpdate({
    _id: reviewId, facility_id: facilityId,
    $or: [{ vendor_reply_by: null }, { vendor_reply_by: user.id }]
  }, {
    $set: {
      vendor_reply: replyText.trim(),
      vendor_reply_by: user.id,
      vendor_replied_at: new Date(),
      is_read_by_vendor: true,
    }
  }, { new: true, runValidators: true });
  if (!updated) throw reviewError('Phản hồi đã thay đổi, vui lòng tải lại', 409);
  return updated;
};

const markReviewAsRead = async (user, reviewId) => {
  const type = reviewFacilityType(user);
  if (!mongoose.isValidObjectId(reviewId)) {
    throw reviewError('ID nhận xét không hợp lệ', 400);
  }
  const facilities = await Facility.find({ vendor_id: user.id, type }).select('_id').lean();
  const facilityIds = facilities.map((f) => f._id);
  const updated = await Review.findOneAndUpdate(
    { _id: reviewId, facility_id: { $in: facilityIds } },
    { $set: { is_read_by_vendor: true } },
    { new: true }
  );
  if (!updated) {
    throw reviewError('Không tìm thấy nhận xét hoặc bạn không có quyền quản lý', 404);
  }
  const unreadCount = await Review.countDocuments({
    facility_id: { $in: facilityIds },
    is_read_by_vendor: { $ne: true },
  });
  return { review: updated, unreadCount };
};

const markAllReviewsAsRead = async (user) => {
  const type = reviewFacilityType(user);
  const facilities = await Facility.find({ vendor_id: user.id, type }).select('_id').lean();
  const facilityIds = facilities.map((f) => f._id);
  await Review.updateMany(
    { facility_id: { $in: facilityIds }, is_read_by_vendor: { $ne: true } },
    { $set: { is_read_by_vendor: true } }
  );
  return { success: true, unreadCount: 0 };
};

const VIETNAM_LOCATIONS = [
  // Top Popular Tourism Cities / Hotspots (after 34-province merger)
  { name: "Đà Lạt", province: "Lâm Đồng", fullTitle: "Đà Lạt, Lâm Đồng", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Đà Nẵng", province: "Đà Nẵng", fullTitle: "Đà Nẵng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Phú Quốc", province: "An Giang", fullTitle: "Phú Quốc, An Giang", type: "CITY", sub: "Đặc khu đảo", isPopular: true },
  { name: "Nha Trang", province: "Khánh Hòa", fullTitle: "Nha Trang, Khánh Hòa", type: "CITY", sub: "Khu vực du lịch", isPopular: true },
  { name: "Hà Nội", province: "Hà Nội", fullTitle: "Hà Nội, Việt Nam", type: "CITY", sub: "Thủ đô", isPopular: true },
  { name: "Hồ Chí Minh", province: "Hồ Chí Minh", fullTitle: "Hồ Chí Minh, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hạ Long", province: "Quảng Ninh", fullTitle: "Hạ Long, Quảng Ninh", type: "CITY", sub: "Khu vực du lịch", isPopular: true },
  { name: "Hội An", province: "Đà Nẵng", fullTitle: "Hội An, Đà Nẵng", type: "CITY", sub: "Phố cổ", isPopular: true },
  { name: "Vũng Tàu", province: "Hồ Chí Minh", fullTitle: "Vũng Tàu, Hồ Chí Minh", type: "CITY", sub: "Thành phố biển", isPopular: true },
  { name: "Sa Pa", province: "Lào Cai", fullTitle: "Sa Pa, Lào Cai", type: "CITY", sub: "Khu du lịch", isPopular: true },
  { name: "Quy Nhơn", province: "Gia Lai", fullTitle: "Quy Nhơn, Gia Lai", type: "CITY", sub: "Khu vực du lịch", isPopular: true },
  { name: "Phan Thiết", province: "Lâm Đồng", fullTitle: "Phan Thiết, Lâm Đồng", type: "CITY", sub: "Khu vực du lịch", isPopular: true },
  { name: "Huế", province: "Huế", fullTitle: "Huế, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Ninh Bình", province: "Ninh Bình", fullTitle: "Ninh Bình, Việt Nam", type: "CITY", sub: "Tỉnh thành", isPopular: true },
  { name: "Côn Đảo", province: "Hồ Chí Minh", fullTitle: "Côn Đảo, Hồ Chí Minh", type: "CITY", sub: "Đặc khu đảo", isPopular: true },

  // Popular Wards / Areas
  { name: "Phường Sài Gòn", province: "Hồ Chí Minh", fullTitle: "Phường Sài Gòn, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Phường Bến Thành", province: "Hồ Chí Minh", fullTitle: "Phường Bến Thành, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Phường Hoàn Kiếm", province: "Hà Nội", fullTitle: "Phường Hoàn Kiếm, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Phường Tây Hồ", province: "Hà Nội", fullTitle: "Phường Tây Hồ, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Phường Ba Đình", province: "Hà Nội", fullTitle: "Phường Ba Đình, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Phường Sơn Trà", province: "Đà Nẵng", fullTitle: "Phường Sơn Trà, Đà Nẵng", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Phường Ngũ Hành Sơn", province: "Đà Nẵng", fullTitle: "Phường Ngũ Hành Sơn, Đà Nẵng", type: "DISTRICT", sub: "Khu vực", isPopular: false },

  // 34 Provinces & Centrally-Governed Cities of Vietnam (post-merger)
  { name: "An Giang", fullTitle: "An Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Bắc Ninh", fullTitle: "Bắc Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Cà Mau", fullTitle: "Cà Mau, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Cần Thơ", fullTitle: "Cần Thơ, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Cao Bằng", fullTitle: "Cao Bằng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đà Nẵng", fullTitle: "Đà Nẵng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Đắk Lắk", fullTitle: "Đắk Lắk, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Điện Biên", fullTitle: "Điện Biên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đồng Nai", fullTitle: "Đồng Nai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đồng Tháp", fullTitle: "Đồng Tháp, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Gia Lai", fullTitle: "Gia Lai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hà Nội", fullTitle: "Hà Nội, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hà Tĩnh", fullTitle: "Hà Tĩnh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hải Phòng", fullTitle: "Hải Phòng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hồ Chí Minh", fullTitle: "Hồ Chí Minh, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Huế", fullTitle: "Huế, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hưng Yên", fullTitle: "Hưng Yên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Khánh Hòa", fullTitle: "Khánh Hòa, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Lai Châu", fullTitle: "Lai Châu, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lâm Đồng", fullTitle: "Lâm Đồng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Lạng Sơn", fullTitle: "Lạng Sơn, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lào Cai", fullTitle: "Lào Cai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Nghệ An", fullTitle: "Nghệ An, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Ninh Bình", fullTitle: "Ninh Bình, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Phú Thọ", fullTitle: "Phú Thọ, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Quảng Ngãi", fullTitle: "Quảng Ngãi, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Quảng Ninh", fullTitle: "Quảng Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Trị", fullTitle: "Quảng Trị, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Sơn La", fullTitle: "Sơn La, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Tây Ninh", fullTitle: "Tây Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thái Nguyên", fullTitle: "Thái Nguyên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thanh Hóa", fullTitle: "Thanh Hóa, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Tuyên Quang", fullTitle: "Tuyên Quang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Vĩnh Long", fullTitle: "Vĩnh Long, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
];

/**
 * Search locations and destinations with accent-insensitive matching and facility lookup
 */
const searchLocations = async (keyword = "") => {
  const normKw = (keyword || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

  // If empty keyword, return top popular destinations
  if (!normKw) {
    const populars = VIETNAM_LOCATIONS.filter((l) => l.isPopular).slice(0, 8);
    return populars.map((loc) => ({
      id: `loc-${loc.name}`,
      name: loc.name,
      fullTitle: loc.fullTitle,
      type: loc.type,
      sub: loc.sub,
      isPopular: loc.isPopular,
    }));
  }

  // Filter locations matching keyword
  const matchedLocations = VIETNAM_LOCATIONS.filter((loc) => {
    const normName = loc.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
    const normTitle = loc.fullTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
    return normName.includes(normKw) || normTitle.includes(normKw);
  });

  // Sort matched: popular first, startsWith first
  matchedLocations.sort((a, b) => {
    const aNorm = a.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
    const bNorm = b.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
    const aStarts = aNorm.startsWith(normKw) ? 1 : 0;
    const bStarts = bNorm.startsWith(normKw) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;
    if (a.isPopular && !b.isPopular) return -1;
    if (!a.isPopular && b.isPopular) return 1;
    return a.name.localeCompare(b.name);
  });

  // Also search matching facilities from database (max 4)
  let matchedFacilities = [];
  try {
    const kwRegex = makeVietnameseRegex(keyword.trim());
    if (kwRegex) {
      const dbFacilities = await Facility.find(
        {
          status: { $in: ["ACTIVE", "APPROVED"] },
          $or: [{ name: kwRegex }, { city: kwRegex }, { address: kwRegex }],
        },
        "_id name type city address"
      )
        .limit(4)
        .lean();

      matchedFacilities = dbFacilities.map((fac) => ({
        id: `fac-${fac._id}`,
        facilityId: fac._id,
        name: fac.name,
        fullTitle: `${fac.name}, ${fac.city}`,
        type: fac.type, // 'HOTEL' or 'ATTRACTION'
        sub: fac.type === "HOTEL" ? `Khách sạn • ${fac.city}` : `Khu vui chơi • ${fac.city}`,
        isPopular: false,
      }));
    }
  } catch (err) {
    console.warn("Lỗi khi tìm cơ sở trong searchLocations:", err);
  }

  // Combine results: locations first (up to 8), then facilities (up to 4)
  return [
    ...matchedLocations.slice(0, 8).map((loc) => ({
      id: `loc-${loc.name}`,
      name: loc.name,
      fullTitle: loc.fullTitle,
      type: loc.type,
      sub: loc.sub,
      isPopular: loc.isPopular,
    })),
    ...matchedFacilities,
  ];
};

/**
 * Get room availability for a hotel facility within a date range
 */
const getRoomAvailability = async (facilityId, query = {}) => {
  if (!mongoose.isValidObjectId(facilityId)) {
    return [];
  }
  const { check_in, check_out } = query;
  if (!check_in || !check_out) {
    return [];
  }

  const checkIn = new Date(check_in);
  const checkOut = new Date(check_out);
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return [];
  }

  const facility = await Facility.findOne({ _id: facilityId, type: "HOTEL" }).lean();
  if (!facility) return [];
  await releaseExpiredRoomReservations();

  const services = await Service.find({
    facility_id: facilityId,
    type: "ROOM",
  }).lean();

  if (!services || services.length === 0) return [];

  const serviceIds = services.map((s) => s._id);

  const overlapping = await BookingDetail.find({
    service_id: { $in: serviceIds },
    check_in_date: { $lt: checkOut },
    check_out_date: { $gt: checkIn },
  })
    .populate("booking_id", "status expires_at")
    .lean();
  const activeHolds = await RoomHold.find({
    service_id: { $in: serviceIds },
    check_in_date: { $lt: checkOut },
    check_out_date: { $gt: checkIn },
    expires_at: { $gt: new Date() },
  }).lean();

  return services.map((svc) => {
    const totalRooms = Number(svc.total_rooms) >= 1 ? Number(svc.total_rooms) : 1;
    const serviceBookings = overlapping.filter(detail => String(detail.service_id) === String(svc._id));
    const serviceHolds = activeHolds.filter(hold => String(hold.service_id) === String(svc._id));
    const rangeAvailability = availabilityForRange({ totalRooms, checkIn, checkOut, bookings: serviceBookings, holds: serviceHolds });
    const taken = rangeAvailability.taken_rooms;
    const available = rangeAvailability.available_rooms;
    return {
      service_id: svc._id,
      name: svc.name,
      total_rooms: totalRooms,
      taken_rooms: taken,
      booked_rooms: rangeAvailability.booked_rooms,
      held_rooms: rangeAvailability.held_rooms,
      available_rooms: available,
      is_sold_out: available <= 0,
      price: svc.base_price,
    };
  });
};

/**
 * Get room availability for every night in a calendar range.
 * This powers the date picker so customers can see booked/sold-out dates
 * before selecting a check-in and check-out range.
 */
const getRoomCalendarAvailability = async (facilityId, query = {}) => {
  if (!mongoose.isValidObjectId(facilityId)) {
    return { dates: [] };
  }

  const { from, to } = query;
  if (!from || !to) return { dates: [] };

  const parseDateOnly = (value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) ? date : null;
  };
  const rangeStart = parseDateOnly(from);
  const rangeEnd = parseDateOnly(to);
  if (!rangeStart || !rangeEnd || rangeEnd <= rangeStart) return { dates: [] };

  const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
  if (rangeEnd.getTime() - rangeStart.getTime() > maxRangeMs) return { dates: [] };

  const facility = await Facility.findOne({ _id: facilityId, type: "HOTEL" }).lean();
  if (!facility) return { dates: [] };
  await releaseExpiredRoomReservations();

  const services = await Service.find({ facility_id: facilityId, type: "ROOM" }).lean();
  if (!services.length) return { dates: [] };

  const serviceIds = services.map((service) => service._id);
  const overlapping = await BookingDetail.find({
    service_id: { $in: serviceIds },
    check_in_date: { $lt: rangeEnd },
    check_out_date: { $gt: rangeStart },
  })
    .populate("booking_id", "status expires_at")
    .lean();
  const activeHolds = await RoomHold.find({
    service_id: { $in: serviceIds },
    check_in_date: { $lt: rangeEnd },
    check_out_date: { $gt: rangeStart },
    expires_at: { $gt: new Date() },
  }).lean();

  const activeBookings = overlapping.filter((detail) =>
    detail.booking_id?.status === "CONFIRMED" || (detail.booking_id?.status === "PENDING" && detail.booking_id?.expires_at && detail.booking_id.expires_at > new Date()),
  );
  const dateRows = [];
  for (let cursor = new Date(rangeStart); cursor < rangeEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const date = dayStart.toISOString().slice(0, 10);
    const takenByService = {};
    const bookedByService = {};
    const heldByService = {};

    activeBookings.forEach((detail) => {
      const checkIn = new Date(detail.check_in_date);
      const checkOut = new Date(detail.check_out_date);
      if (checkIn < dayEnd && checkOut > dayStart) {
        const serviceId = String(detail.service_id);
        takenByService[serviceId] = (takenByService[serviceId] || 0) + (Number(detail.quantity) || 1);
        bookedByService[serviceId] = (bookedByService[serviceId] || 0) + (Number(detail.quantity) || 1);
      }
    });
    activeHolds.forEach((hold) => {
      const checkIn = new Date(hold.check_in_date);
      const checkOut = new Date(hold.check_out_date);
      if (checkIn < dayEnd && checkOut > dayStart) {
        const serviceId = String(hold.service_id);
        takenByService[serviceId] = (takenByService[serviceId] || 0) + (Number(hold.rooms) || 1);
        heldByService[serviceId] = (heldByService[serviceId] || 0) + (Number(hold.rooms) || 1);
      }
    });

    dateRows.push({
      date,
      availability: services.map((service) => {
        const totalRooms = Number(service.total_rooms) >= 1 ? Number(service.total_rooms) : 1;
        const taken = takenByService[String(service._id)] || 0;
        const available = Math.max(0, totalRooms - taken);
        return {
          service_id: service._id,
          total_rooms: totalRooms,
          taken_rooms: taken,
          booked_rooms: bookedByService[String(service._id)] || 0,
          held_rooms: heldByService[String(service._id)] || 0,
          available_rooms: available,
          is_sold_out: available <= 0,
        };
      }),
    });
  }

  return { dates: dateRows };
};

const getTrendingTop = async () => {
  let facility = null;

  try {
    const topDetails = await BookingDetail.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking_id',
          foreignField: '_id',
          as: 'booking',
        },
      },
      { $unwind: '$booking' },
      {
        $match: {
          'booking.status': { $in: ['CONFIRMED', 'COMPLETED'] },
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$facility_id', '$facility_name'] },
          facility_id: { $first: '$facility_id' },
          facility_name: { $first: '$facility_name' },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 },
    ]);

    const top = topDetails[0];
    if (top?.facility_id) {
      try {
        facility = await getFacilityById(top.facility_id);
      } catch {
        facility = null;
      }
    }

    if (!facility && top?.facility_name) {
      const fDoc = await Facility.findOne({
        name: top.facility_name,
        status: { $in: ['ACTIVE', 'APPROVED'] },
      }).select('_id');
      if (fDoc) {
        try {
          facility = await getFacilityById(fDoc._id);
        } catch {
          facility = null;
        }
      }
    }
  } catch (err) {
    console.error('Error finding top booked facility:', err);
  }

  if (!facility) {
    try {
      const list = await searchFacilities({ limit: 1, sortBy: 'recommended' });
      facility = list.facilities?.[0] || null;
    } catch {
      facility = null;
    }
  }

  if (!facility) {
    return {
      facility_id: null,
      name: 'Sun World Ba Na Hills Đà Nẵng',
      subtitle: 'Vé tham quan & trải nghiệm từ 850.000 ₫',
      image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=500&auto=format&fit=crop&q=80',
      city: 'Đà Nẵng',
    };
  }

  const primaryImg = facility.primary_image || (facility.images && facility.images[0]?.image_url);
  const minPrice = facility.min_price || facility.rooms?.[0]?.base_price || facility.services?.[0]?.base_price || 850000;
  const priceFormatted = Number(minPrice).toLocaleString('vi-VN') + ' ₫';
  const typeText = facility.type === 'HOTEL' ? 'Khách sạn & nghỉ dưỡng' : 'Vé tham quan & trải nghiệm';

  return {
    facility_id: facility._id,
    name: facility.name,
    subtitle: `${typeText} từ ${priceFormatted}`,
    image_url: primaryImg || 'https://images.unsplash.com/photo-1528127269322-539801943592?w=500&auto=format&fit=crop&q=80',
    city: facility.city || facility.province || '',
  };
};

module.exports = {
  searchFacilities,
  getFacilityById,
  getFilterOptions,
  getRoomAvailability,
  getRoomCalendarAvailability,
  addReview,
  replyToReview,
  getManagedReviews,
  markReviewAsRead,
  markAllReviewsAsRead,
  searchLocations,
  getTrendingTop,
};
