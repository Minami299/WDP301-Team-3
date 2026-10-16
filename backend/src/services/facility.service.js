const mongoose = require("mongoose");
const { Facility, FacilityImage, FacilityAmenity, Amenity, Service, Review, User } = require("../models");

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
  const requestedRooms = Math.max(1, parseInt(rooms, 10) || 1);
  const requestedGuests = Math.max(
    1,
    parseInt(guests, 10) ||
      (parseInt(adults, 10) || 1) + (parseInt(children, 10) || 0)
  );

  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(params.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const baseMatch = buildBaseMatch({ keyword, type, city });

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
                    then: { $min: "$services.base_price" },
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

  // Filter by requested rooms (hotels must have at least requestedRooms total)
  if (requestedRooms > 1) {
    if (type && type.toUpperCase() === "HOTEL") {
      secondaryMatch.total_hotel_rooms = { $gte: requestedRooms };
    } else {
      secondaryMatch.$or = [
        { type: "ATTRACTION" },
        { total_hotel_rooms: { $gte: requestedRooms } },
      ];
    }
  }

  // Filter by requested guests (hotels must have at least requestedGuests capacity)
  if (requestedGuests > 1) {
    if (type && type.toUpperCase() === "HOTEL") {
      secondaryMatch.total_hotel_capacity = { $gte: requestedGuests };
    }
  }

  if (Object.keys(secondaryMatch).length > 0) {
    pipeline.push({ $match: secondaryMatch });
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
    facilities: data,
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
const getFacilityById = async (id) => {
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
  if (!facility) {
    const error = new Error("Không tìm thấy cơ sở dịch vụ");
    error.statusCode = 404;
    throw error;
  }

  return facility;
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

  // Determine customer_id
  let targetCustomerId = customerId;
  if (!targetCustomerId || !mongoose.isValidObjectId(targetCustomerId)) {
    // Fallback to customer user in DB if unauthenticated
    const defaultCust = await User.findOne({ role_id: new mongoose.Types.ObjectId("6abe0f65bd4471c6361fa6d2") });
    if (defaultCust) {
      targetCustomerId = defaultCust._id;
    }
  }

  if (!targetCustomerId) {
    const error = new Error("Không xác định được thông tin khách hàng");
    error.statusCode = 401;
    throw error;
  }

  const review = await Review.create({
    facility_id: new mongoose.Types.ObjectId(facilityId),
    customer_id: new mongoose.Types.ObjectId(targetCustomerId),
    rating: numericRating,
    comment: comment.trim(),
  });

  const customer = await User.findById(targetCustomerId).lean();

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
 * Vendor / Admin reply to a review
 */
const replyToReview = async (reviewId, replyText) => {
  if (!mongoose.isValidObjectId(reviewId)) {
    const error = new Error("ID nhận xét không hợp lệ");
    error.statusCode = 400;
    throw error;
  }
  if (!replyText || !replyText.trim()) {
    const error = new Error("Vui lòng nhập nội dung phản hồi");
    error.statusCode = 400;
    throw error;
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    const error = new Error("Không tìm thấy nhận xét");
    error.statusCode = 404;
    throw error;
  }

  review.vendor_reply = replyText.trim();
  await review.save();

  return review;
};

const VIETNAM_LOCATIONS = [
  // Top Popular Tourism Cities (Thành phố du lịch nổi tiếng - Phổ biến)
  { name: "Đà Lạt", province: "Lâm Đồng", fullTitle: "Đà Lạt, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Đà Nẵng", province: "Đà Nẵng", fullTitle: "Đà Nẵng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Phú Quốc", province: "Kiên Giang", fullTitle: "Phú Quốc, Kiên Giang", type: "CITY", sub: "Thành phố đảo", isPopular: true },
  { name: "Nha Trang", province: "Khánh Hòa", fullTitle: "Nha Trang, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hà Nội", province: "Hà Nội", fullTitle: "Hà Nội, Việt Nam", type: "CITY", sub: "Thủ đô", isPopular: true },
  { name: "Hồ Chí Minh", province: "Hồ Chí Minh", fullTitle: "Hồ Chí Minh, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hạ Long", province: "Quảng Ninh", fullTitle: "Hạ Long, Quảng Ninh", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hội An", province: "Quảng Nam", fullTitle: "Hội An, Quảng Nam", type: "CITY", sub: "Thành phố cổ", isPopular: true },
  { name: "Vũng Tàu", province: "Bà Rịa - Vũng Tàu", fullTitle: "Vũng Tàu, Việt Nam", type: "CITY", sub: "Thành phố biển", isPopular: true },
  { name: "Sa Pa", province: "Lào Cai", fullTitle: "Sa Pa, Lào Cai", type: "CITY", sub: "Thị xã du lịch", isPopular: true },
  { name: "Quy Nhơn", province: "Bình Định", fullTitle: "Quy Nhơn, Bình Định", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Phan Thiết", province: "Bình Thuận", fullTitle: "Phan Thiết, Bình Thuận", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Huế", province: "Thừa Thiên Huế", fullTitle: "Huế, Thừa Thiên Huế", type: "CITY", sub: "Cố đô", isPopular: true },
  { name: "Ninh Bình", province: "Ninh Bình", fullTitle: "Ninh Bình, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Côn Đảo", province: "Bà Rịa - Vũng Tàu", fullTitle: "Côn Đảo, Bà Rịa - Vũng Tàu", type: "CITY", sub: "Huyện đảo", isPopular: true },

  // Districts / Areas (Khu vực phổ biến - Agoda style)
  { name: "Quận 1", province: "Hồ Chí Minh", fullTitle: "Quận 1, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Quận 2", province: "Hồ Chí Minh", fullTitle: "Quận 2, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Quận 3", province: "Hồ Chí Minh", fullTitle: "Quận 3, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Quận 7", province: "Hồ Chí Minh", fullTitle: "Quận 7, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Hoàn Kiếm", province: "Hà Nội", fullTitle: "Hoàn Kiếm, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Tây Hồ", province: "Hà Nội", fullTitle: "Tây Hồ, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Ba Đình", province: "Hà Nội", fullTitle: "Ba Đình, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Sơn Trà", province: "Đà Nẵng", fullTitle: "Sơn Trà, Đà Nẵng", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Ngũ Hành Sơn", province: "Đà Nẵng", fullTitle: "Ngũ Hành Sơn, Đà Nẵng", type: "DISTRICT", sub: "Khu vực", isPopular: false },

  // 63 Provinces of Vietnam
  { name: "An Giang", fullTitle: "An Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bà Rịa - Vũng Tàu", fullTitle: "Bà Rịa - Vũng Tàu, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Bắc Giang", fullTitle: "Bắc Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bắc Kạn", fullTitle: "Bắc Kạn, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bạc Liêu", fullTitle: "Bạc Liêu, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bắc Ninh", fullTitle: "Bắc Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bến Tre", fullTitle: "Bến Tre, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bình Định", fullTitle: "Bình Định, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bình Dương", fullTitle: "Bình Dương, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bình Phước", fullTitle: "Bình Phước, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bình Thuận", fullTitle: "Bình Thuận, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Cà Mau", fullTitle: "Cà Mau, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Cần Thơ", fullTitle: "Cần Thơ, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Cao Bằng", fullTitle: "Cao Bằng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đắk Lắk", fullTitle: "Đắk Lắk, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đắk Nông", fullTitle: "Đắk Nông, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Điện Biên", fullTitle: "Điện Biên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đồng Nai", fullTitle: "Đồng Nai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đồng Tháp", fullTitle: "Đồng Tháp, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Gia Lai", fullTitle: "Gia Lai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hà Giang", fullTitle: "Hà Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Hà Nam", fullTitle: "Hà Nam, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hà Tĩnh", fullTitle: "Hà Tĩnh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hải Dương", fullTitle: "Hải Dương, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hải Phòng", fullTitle: "Hải Phòng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hậu Giang", fullTitle: "Hậu Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hòa Bình", fullTitle: "Hòa Bình, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hưng Yên", fullTitle: "Hưng Yên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Khánh Hòa", fullTitle: "Khánh Hòa, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Kiên Giang", fullTitle: "Kiên Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Kon Tum", fullTitle: "Kon Tum, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lai Châu", fullTitle: "Lai Châu, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lâm Đồng", fullTitle: "Lâm Đồng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Lạng Sơn", fullTitle: "Lạng Sơn, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lào Cai", fullTitle: "Lào Cai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Long An", fullTitle: "Long An, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Nam Định", fullTitle: "Nam Định, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Nghệ An", fullTitle: "Nghệ An, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Ninh Thuận", fullTitle: "Ninh Thuận, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Phú Thọ", fullTitle: "Phú Thọ, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Phú Yên", fullTitle: "Phú Yên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Bình", fullTitle: "Quảng Bình, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Nam", fullTitle: "Quảng Nam, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Ngãi", fullTitle: "Quảng Ngãi, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Quảng Ninh", fullTitle: "Quảng Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Trị", fullTitle: "Quảng Trị, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Sóc Trăng", fullTitle: "Sóc Trăng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Sơn La", fullTitle: "Sơn La, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Tây Ninh", fullTitle: "Tây Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thái Bình", fullTitle: "Thái Bình, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thái Nguyên", fullTitle: "Thái Nguyên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thanh Hóa", fullTitle: "Thanh Hóa, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thừa Thiên Huế", fullTitle: "Thừa Thiên Huế, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Tiền Giang", fullTitle: "Tiền Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Trà Vinh", fullTitle: "Trà Vinh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Tuyên Quang", fullTitle: "Tuyên Quang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Vĩnh Long", fullTitle: "Vĩnh Long, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Vĩnh Phúc", fullTitle: "Vĩnh Phúc, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Yên Bái", fullTitle: "Yên Bái, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
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

module.exports = {
  searchFacilities,
  getFacilityById,
  getFilterOptions,
  addReview,
  replyToReview,
  searchLocations,
};
