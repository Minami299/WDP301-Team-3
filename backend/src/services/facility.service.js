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
    minPrice,
    maxPrice,
    amenities,
    stars,
    minRating,
    sortBy = "recommended",
  } = params;

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

module.exports = {
  searchFacilities,
  getFacilityById,
  getFilterOptions,
  addReview,
  replyToReview,
};
