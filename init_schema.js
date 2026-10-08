// Dữ liệu database schema được thiết lập cho cơ sở dữ liệu travel_booking[cite: 1].
db = db.getSiblingDB("travelio_db"); //[cite: 1]

// 1. Collection: roles[cite: 1]
db.createCollection("roles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["role_name"], //[cite: 1]
      properties: {
        role_name: { bsonType: "string" }, //[cite: 1]
        description: { bsonType: ["string", "null"] } //[cite: 1]
      }
    }
  }
});
db.roles.createIndex({ role_name: 1 }, { unique: true }); //[cite: 1]

// 2. Collection: users[cite: 1]
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password_hash", "full_name", "role_id"], //[cite: 1]
      properties: {
        email: { bsonType: "string" }, //[cite: 1]
        password_hash: { bsonType: "string" }, //[cite: 1]
        full_name: { bsonType: "string" }, //[cite: 1]
        phone: { bsonType: ["string", "null"] }, //[cite: 1]
        role_id: { bsonType: "objectId" }, //[cite: 1]
        total_loyalty_points: { bsonType: ["int", "long"] }, //[cite: 1]
        status: { enum: ["ACTIVE", "INACTIVE", "LOCKED"] }, //[cite: 1]
        created_at: { bsonType: "date" }, //[cite: 1]
        updated_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.users.createIndex({ email: 1 }, { unique: true }); //[cite: 1]
db.users.createIndex({ role_id: 1 }); //[cite: 1]

// 3. Collection: user_profiles[cite: 1]
db.createCollection("user_profiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        user_id: { bsonType: "objectId" }, //[cite: 1]
        avatar_url: { bsonType: ["string", "null"] }, //[cite: 1]
        payment_methods: { bsonType: ["object", "array", "null"] }, //[cite: 1]
        preferences: { bsonType: ["object", "array", "null"] } //[cite: 1]
      }
    }
  }
});
db.user_profiles.createIndex({ user_id: 1 }, { unique: true }); //[cite: 1]

// 4. Collection: facilities[cite: 1]
db.createCollection("facilities", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["vendor_id", "name", "address", "city"], //[cite: 1]
      properties: {
        vendor_id: { bsonType: "objectId" }, //[cite: 1]
        type: { enum: ["HOTEL", "ATTRACTION"] }, //[cite: 1]
        name: { bsonType: "string" }, //[cite: 1]
        address: { bsonType: "string" }, //[cite: 1]
        city: { bsonType: "string" }, //[cite: 1]
        description: { bsonType: ["string", "null"] }, //[cite: 1]
        commission_rate: { bsonType: ["double", "decimal", "int", "long"], minimum: 0, maximum: 100 }, //[cite: 1]
        status: { enum: ["PENDING", "APPROVED", "REJECTED", "ACTIVE", "INACTIVE"] }, //[cite: 1]
        created_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.facilities.createIndex({ vendor_id: 1 }); //[cite: 1]
db.facilities.createIndex({ city: 1 }); //[cite: 1]
db.facilities.createIndex({ type: 1, status: 1 }); //[cite: 1]

// 5. Collection: facility_images[cite: 1]
db.createCollection("facility_images", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["image_url"], //[cite: 1]
      properties: {
        facility_id: { bsonType: "objectId" }, //[cite: 1]
        image_url: { bsonType: "string" }, //[cite: 1]
        is_primary: { bsonType: "bool" } //[cite: 1]
      }
    }
  }
});
db.facility_images.createIndex({ facility_id: 1 }); //[cite: 1]
db.facility_images.createIndex(
  { facility_id: 1, is_primary: 1 }, 
  { unique: true, partialFilterExpression: { is_primary: true } } //[cite: 1]
);

// 6. Collection: amenities[cite: 1]
db.createCollection("amenities", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name"], //[cite: 1]
      properties: {
        name: { bsonType: "string" }, //[cite: 1]
        icon_url: { bsonType: ["string", "null"] }, //[cite: 1]
        type: { enum: ["ROOM_FEATURE", "HOTEL_FACILITY", "ATTRACTION_SERVICE"] } //[cite: 1]
      }
    }
  }
});
db.amenities.createIndex({ name: 1 }, { unique: true }); //[cite: 1]

// 7. Collection: facility_amenities[cite: 1]
db.createCollection("facility_amenities", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        facility_id: { bsonType: "objectId" }, //[cite: 1]
        amenity_id: { bsonType: "objectId" } //[cite: 1]
      }
    }
  }
});
db.facility_amenities.createIndex({ facility_id: 1, amenity_id: 1 }, { unique: true }); //[cite: 1]
db.facility_amenities.createIndex({ amenity_id: 1 }); //[cite: 1]

// 8. Collection: services[cite: 1]
db.createCollection("services", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["facility_id", "name", "base_price"], //[cite: 1]
      properties: {
        facility_id: { bsonType: "objectId" }, //[cite: 1]
        type: { enum: ["ROOM", "TICKET"] }, //[cite: 1]
        name: { bsonType: "string" }, //[cite: 1]
        description: { bsonType: ["string", "null"] }, //[cite: 1]
        capacity: { bsonType: ["int", "long"], minimum: 1 }, //[cite: 1]
        base_price: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 } //[cite: 1]
      }
    }
  }
});
db.services.createIndex({ facility_id: 1 }); //[cite: 1]
db.services.createIndex({ type: 1 }); //[cite: 1]

// 9. Collection: service_inventory[cite: 1]
db.createCollection("service_inventory", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["service_id", "target_date", "time_slot", "available_qty", "price"], //[cite: 1]
      properties: {
        service_id: { bsonType: "objectId" }, //[cite: 1]
        target_date: { bsonType: "date" }, //[cite: 1]
        time_slot: { bsonType: "string" }, //[cite: 1]
        available_qty: { bsonType: ["int", "long"], minimum: 0 }, //[cite: 1]
        price: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 } //[cite: 1]
      }
    }
  }
});
db.service_inventory.createIndex({ service_id: 1, target_date: 1, time_slot: 1 }, { unique: true }); //[cite: 1]
db.service_inventory.createIndex({ target_date: 1 }); //[cite: 1]

// 10. Collection: promotions[cite: 1]
db.createCollection("promotions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["code"], //[cite: 1]
      properties: {
        code: { bsonType: "string" }, //[cite: 1]
        user_id: { bsonType: ["objectId", "null"] },
        discount_type: { enum: ["PERCENTAGE", "FIXED"] }, //[cite: 1]
        discount_value: { bsonType: ["double", "decimal", "int", "long"], exclusiveMinimum: 0 }, //[cite: 1]
        max_discount: { bsonType: ["double", "decimal", "int", "long", "null"] }, //[cite: 1]
        valid_from: { bsonType: "date" }, //[cite: 1]
        valid_to: { bsonType: "date" }, //[cite: 1]
        usage_limit: { bsonType: ["int", "long", "null"] }, //[cite: 1]
        used_count: { bsonType: ["int", "long"], minimum: 0 },
        status: { enum: ["ACTIVE", "EXPIRED", "DISABLED"] } //[cite: 1]
      }
    }
  }
});
db.promotions.createIndex({ code: 1 }, { unique: true }); //[cite: 1]
db.promotions.createIndex({ status: 1, valid_from: 1, valid_to: 1 }); //[cite: 1]

// 11. Collection: bookings[cite: 1]
db.createCollection("bookings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["booking_code", "guest_name", "guest_email", "guest_phone"], //[cite: 1]
      properties: {
        booking_code: { bsonType: "string" }, //[cite: 1]
        customer_id: { bsonType: ["objectId", "null"] }, //[cite: 1]
        guest_name: { bsonType: "string" }, //[cite: 1]
        guest_email: { bsonType: "string" }, //[cite: 1]
        guest_phone: { bsonType: "string" }, //[cite: 1]
        promotion_id: { bsonType: ["objectId", "null"] }, //[cite: 1]
        promotion_discount_amount: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 },
        points_redeemed: { bsonType: ["int", "long"], minimum: 0 },
        points_discount_amount: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 },
        total_amount: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 }, //[cite: 1]
        final_amount: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 }, //[cite: 1]
        status: { enum: ["PENDING", "CONFIRMED", "CANCELLED", "REFUNDED", "COMPLETED"] }, //[cite: 1]
        decided_by: { bsonType: ["objectId", "null"] }, //[cite: 1]
        decision_note: { bsonType: ["string", "null"] }, //[cite: 1]
        decided_at: { bsonType: ["date", "null"] }, //[cite: 1]
        created_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.bookings.createIndex({ booking_code: 1 }, { unique: true }); //[cite: 1]
db.bookings.createIndex({ customer_id: 1 }); //[cite: 1]
db.bookings.createIndex({ status: 1, created_at: -1 }); //[cite: 1]

// 12. Collection: booking_details[cite: 1]
db.createCollection("booking_details", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        booking_id: { bsonType: "objectId" }, //[cite: 1]
        inventory_id: { bsonType: "objectId" }, //[cite: 1]
        quantity: { bsonType: ["int", "long"], exclusiveMinimum: 0 }, //[cite: 1]
        unit_price: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 }, //[cite: 1]
        commission_rate: { bsonType: ["double", "decimal", "int", "long"], minimum: 0, maximum: 100 }, //[cite: 1]
        commission_amount: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 }, //[cite: 1]
        qr_code: { bsonType: ["string", "null"] }, //[cite: 1]
        check_in_status: { enum: ["PENDING", "CHECKED_IN", "NO_SHOW"] } //[cite: 1]
      }
    }
  }
});
db.booking_details.createIndex({ booking_id: 1 }); //[cite: 1]
db.booking_details.createIndex({ inventory_id: 1 }); //[cite: 1]
db.booking_details.createIndex({ qr_code: 1 }, { unique: true, sparse: true }); //[cite: 1]

// 13. Collection: payments[cite: 1]
db.createCollection("payments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        booking_id: { bsonType: "objectId" }, //[cite: 1]
        transaction_id: { bsonType: "string" }, //[cite: 1]
        payment_gateway: { enum: ["VNPAY", "MOMO", "STRIPE", "PAYPAL"] }, //[cite: 1]
        amount: { bsonType: ["double", "decimal", "int", "long"], exclusiveMinimum: 0 }, //[cite: 1]
        status: { enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] }, //[cite: 1]
        payment_date: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.payments.createIndex({ transaction_id: 1 }, { unique: true }); //[cite: 1]
db.payments.createIndex({ booking_id: 1 }); //[cite: 1]

// 14. Collection: reviews[cite: 1]
db.createCollection("reviews", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        booking_id: { bsonType: "objectId" }, //[cite: 1]
        facility_id: { bsonType: "objectId" }, //[cite: 1]
        customer_id: { bsonType: "objectId" }, //[cite: 1]
        rating: { bsonType: ["int", "long"], minimum: 1, maximum: 5 }, //[cite: 1]
        comment: { bsonType: ["string", "null"] }, //[cite: 1]
        vendor_reply: { bsonType: ["string", "null"] }, //[cite: 1]
        created_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.reviews.createIndex({ booking_id: 1 }, { unique: true }); //[cite: 1]
db.reviews.createIndex({ facility_id: 1 }); //[cite: 1]
db.reviews.createIndex({ customer_id: 1 }); //[cite: 1]

// 15. Collection: loyalty_point_transactions[cite: 1]
db.createCollection("loyalty_point_transactions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["reason"], //[cite: 1]
      properties: {
        user_id: { bsonType: "objectId" }, //[cite: 1]
        booking_id: { bsonType: ["objectId", "null"] }, //[cite: 1]
        points: { bsonType: ["int", "long"], not: { enum: [0, 0.0] } }, //[cite: 1]
        reason: { bsonType: "string" }, //[cite: 1]
        created_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.loyalty_point_transactions.createIndex({ user_id: 1, created_at: -1 }); //[cite: 1]
db.loyalty_point_transactions.createIndex({ booking_id: 1 }); //[cite: 1]

// 16. Collection: support_tickets[cite: 1]
db.createCollection("support_tickets", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        booking_id: { bsonType: "objectId" }, //[cite: 1]
        created_by: { bsonType: "objectId" }, //[cite: 1]
        assigned_manager_id: { bsonType: ["objectId", "null"] }, //[cite: 1]
        issue_type: { enum: ["REFUND", "FACILITY_ISSUE", "CHECK_IN_ERROR", "OTHER"] }, //[cite: 1]
        description: { bsonType: "string" }, //[cite: 1]
        status: { enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] }, //[cite: 1]
        created_at: { bsonType: "date" }, //[cite: 1]
        updated_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.support_tickets.createIndex({ booking_id: 1 }); //[cite: 1]
db.support_tickets.createIndex({ created_by: 1 }); //[cite: 1]
db.support_tickets.createIndex({ assigned_manager_id: 1 }); //[cite: 1]
db.support_tickets.createIndex({ status: 1, created_at: -1 }); //[cite: 1]

// 17. Collection: notifications[cite: 1]
db.createCollection("notifications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        user_id: { bsonType: "objectId" }, //[cite: 1]
        title: { bsonType: "string" }, //[cite: 1]
        message: { bsonType: "string" }, //[cite: 1]
        type: { enum: ["SYSTEM", "BOOKING", "PROMOTION", "TICKET_UPDATE"] }, //[cite: 1]
        is_read: { bsonType: "bool" }, //[cite: 1]
        created_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.notifications.createIndex({ user_id: 1, created_at: -1 }); //[cite: 1]
db.notifications.createIndex({ user_id: 1, is_read: 1 }); //[cite: 1]

// 18. Collection: payouts[cite: 1]
db.createCollection("payouts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        vendor_id: { bsonType: "objectId" }, //[cite: 1]
        manager_id: { bsonType: ["objectId", "null"] }, //[cite: 1]
        amount: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 }, //[cite: 1]
        status: { enum: ["PENDING", "APPROVED", "PAID", "REJECTED"] }, //[cite: 1]
        period_start: { bsonType: "date" }, //[cite: 1]
        period_end: { bsonType: "date" }, //[cite: 1]
        created_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.payouts.createIndex({ vendor_id: 1, period_start: 1, period_end: 1 }); //[cite: 1]
db.payouts.createIndex({ status: 1 }); //[cite: 1]

// 19. Collection: payout_details[cite: 1]
db.createCollection("payout_details", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        payout_id: { bsonType: "objectId" }, //[cite: 1]
        booking_detail_id: { bsonType: "objectId" }, //[cite: 1]
        amount: { bsonType: ["double", "decimal", "int", "long"], minimum: 0 } //[cite: 1]
      }
    }
  }
});
db.payout_details.createIndex({ booking_detail_id: 1 }, { unique: true }); //[cite: 1]
db.payout_details.createIndex({ payout_id: 1 }); //[cite: 1]

// 20. Collection: system_configs[cite: 1]
db.createCollection("system_configs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["config_key", "config_value"], //[cite: 1]
      properties: {
        config_key: { bsonType: "string" }, //[cite: 1]
        config_value: { bsonType: "string" }, //[cite: 1]
        description: { bsonType: ["string", "null"] }, //[cite: 1]
        updated_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.system_configs.createIndex({ config_key: 1 }, { unique: true }); //[cite: 1]

// 21. Collection: audit_logs[cite: 1]
db.createCollection("audit_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        user_id: { bsonType: ["objectId", "null"] }, //[cite: 1]
        action: { bsonType: "string" }, //[cite: 1]
        table_name: { bsonType: "string" }, //[cite: 1]
        record_id: { bsonType: "objectId" }, //[cite: 1]
        old_data: { bsonType: ["object", "null"] }, //[cite: 1]
        new_data: { bsonType: ["object", "null"] }, //[cite: 1]
        created_at: { bsonType: "date" } //[cite: 1]
      }
    }
  }
});
db.audit_logs.createIndex({ user_id: 1, created_at: -1 }); //[cite: 1]
db.audit_logs.createIndex({ table_name: 1, record_id: 1 }); //[cite: 1]
db.audit_logs.createIndex({ created_at: -1 }); //[cite: 1]

// 22. Collection: qr_scan_logs
db.createCollection("qr_scan_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["vendor_id", "scanned_by", "qr_code", "result"],
      properties: {
        vendor_id: { bsonType: "objectId" },
        facility_id: { bsonType: ["objectId", "null"] },
        booking_detail_id: { bsonType: ["objectId", "null"] },
        scanned_by: { bsonType: "objectId" },
        qr_code: { bsonType: "string" },
        result: { enum: ["VALID", "ALREADY_REDEEMED", "INVALID", "NOT_YOURS"] },
        scanned_at: { bsonType: "date" }
      }
    }
  }
});
db.qr_scan_logs.createIndex({ vendor_id: 1, scanned_at: -1 });
db.qr_scan_logs.createIndex({ facility_id: 1, scanned_at: -1 });