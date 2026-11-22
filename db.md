erDiagram
    ROLE {
        ObjectId _id PK
        string role_name UK
        string description
        array permissions
    }

    USER {
        ObjectId _id PK
        string email UK
        string password_hash
        string full_name
        string phone
        ObjectId role_id FK
        int total_loyalty_points
        enum status "ACTIVE | INACTIVE | LOCKED | PENDING"
        enum account_kind "STANDARD | INTERNAL"
        enum approvalStatus "PENDING | APPROVED | REJECTED"
        ObjectId approvalReviewedBy FK
        ObjectId lockedBy FK
        bool is_verified
    }

    USER_PROFILE {
        ObjectId _id PK
        ObjectId user_id FK "UK"
        string avatar_url
        string address
        string nationality
        date birth_date
        string preferred_language
    }

    PARTNER_APPLICATION {
        ObjectId _id PK
        ObjectId user_id FK "UK"
        enum role "HOTEL_OWNER | ACTIVITY_VENDOR"
        enum status "DRAFT | SUBMITTED | APPROVED | REJECTED"
        ObjectId facility_id FK
        date submitted_at
    }

    PARTNER_DOCUMENT {
        ObjectId _id PK
        ObjectId application_id FK
        buffer data
    }

    FACILITY {
        ObjectId _id PK
        ObjectId vendor_id FK
        enum type "HOTEL | ATTRACTION"
        string name
        string address
        string city
        float latitude
        float longitude
        number commission_rate
        enum status "ACTIVE | INACTIVE | PENDING"
        int stars
    }

    AMENITY {
        ObjectId _id PK
        string name UK
        string icon_url
        enum type "ROOM_FEATURE | HOTEL_FACILITY | ATTRACTION_SERVICE"
    }

    FACILITY_AMENITY {
        ObjectId _id PK
        ObjectId facility_id FK
        ObjectId amenity_id FK
    }

    FACILITY_IMAGE {
        ObjectId _id PK
        ObjectId facility_id FK
        string image_url
        bool is_primary
    }

    SERVICE {
        ObjectId _id PK
        ObjectId facility_id FK
        enum type "ROOM | TICKET"
        string name
        number base_price
        int capacity
        int total_rooms
    }

    SERVICE_INVENTORY {
        ObjectId _id PK
        ObjectId service_id FK
        ObjectId ticket_type_id "Ref Service.ticket_types._id"
        date target_date
        string time_slot
        int available_qty
        number price
    }

    PROMOTION {
        ObjectId _id PK
        string code UK
        ObjectId user_id FK "Voucher ca nhan"
        string voucher_type FK "Ref VOUCHER_TYPE.code"
        enum discount_type "PERCENTAGE | FIXED"
        number discount_value
        date valid_from
        date valid_to
        int usage_limit
        int used_count
        enum status "ACTIVE | INACTIVE | EXPIRED"
    }

    BOOKING {
        ObjectId _id PK
        string booking_code UK
        ObjectId customer_id FK
        ObjectId vendor_id FK
        ObjectId promotion_id FK
        ObjectId decided_by FK
        number total_amount
        number final_amount
        enum status "PENDING | CONFIRMED | COMPLETED | CANCELLED | REFUNDED"
        number payos_order_code UK
    }

    BOOKING_DETAIL {
        ObjectId _id PK
        ObjectId booking_id FK
        ObjectId inventory_id FK
        ObjectId service_id FK
        ObjectId facility_id FK
        int quantity
        number unit_price
        number commission_amount
        string qr_code UK
        enum check_in_status "PENDING | CHECKED_IN | EXPIRED"
        date checked_in_at
    }

    PAYMENT {
        ObjectId _id PK
        ObjectId booking_id FK
        string transaction_id UK
        enum payment_gateway "PAYOS"
        number amount
        enum status "PENDING | PAID | FAILED | CANCELLED"
    }

    REVIEW {
        ObjectId _id PK
        ObjectId booking_id FK
        ObjectId facility_id FK
        ObjectId customer_id FK
        ObjectId vendor_reply_by FK
        int rating
    }

    LOYALTY_TRANSACTION {
        ObjectId _id PK
        ObjectId user_id FK
        ObjectId booking_id FK
        int points
        string reason
    }

    SUPPORT_TICKET {
        ObjectId _id PK
        ObjectId booking_id FK
        ObjectId created_by FK
        ObjectId assigned_manager_id FK
        enum issue_type "REFUND | CANCEL | COMPLAINT"
        enum status "OPEN | IN_PROGRESS | RESOLVED | CLOSED"
    }

    PAYOUT {
        ObjectId _id PK
        ObjectId vendor_id FK
        ObjectId manager_id FK
        number amount
        enum status "PENDING | APPROVED | PAID | REJECTED"
        date period_start
        date period_end
    }

    PAYOUT_DETAIL {
        ObjectId _id PK
        ObjectId payout_id FK
        ObjectId booking_detail_id FK "UK"
        number gross
        number commission
        number amount
    }

    QR_SCAN_LOG {
        ObjectId _id PK
        ObjectId vendor_id FK
        ObjectId facility_id FK
        ObjectId booking_detail_id FK
        ObjectId scanned_by FK "Null neu quet qua public link"
        enum source "TERMINAL | PUBLIC_LINK"
        string ip
        string user_agent
        enum result "VALID | ALREADY_REDEEMED | INVALID | NOT_YOURS | WRONG_DATE"
        date scanned_at
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId user_id FK
        enum type
        bool is_read
    }

    AUDIT_LOG {
        ObjectId _id PK
        ObjectId user_id FK
        string table_name
        ObjectId record_id "Tham chieu da hinh"
        mixed old_data
        mixed new_data
    }

    SYSTEM_CONFIG {
        ObjectId _id PK
        string config_key UK
        string config_value
    }

    VOUCHER_TYPE {
        ObjectId _id PK
        string code UK
        string name
        string code_prefix
    }

    ROLE ||--o{ USER : "role_id"
    USER ||--o| USER_PROFILE : "user_id"
    USER ||--o| PARTNER_APPLICATION : "user_id"
    PARTNER_APPLICATION ||--o{ PARTNER_DOCUMENT : "application_id"
    PARTNER_APPLICATION }o--o| FACILITY : "facility_id"
    USER ||--o{ FACILITY : "vendor_id"

    FACILITY ||--o{ FACILITY_AMENITY : "facility_id"
    AMENITY ||--o{ FACILITY_AMENITY : "amenity_id"
    FACILITY ||--o{ FACILITY_IMAGE : "facility_id"
    FACILITY ||--o{ SERVICE : "facility_id"
    SERVICE ||--o{ SERVICE_INVENTORY : "service_id"

    VOUCHER_TYPE |o--o{ PROMOTION : "voucher_type"
    USER |o--o{ PROMOTION : "user_id"
    PROMOTION |o--o{ BOOKING : "promotion_id"

    USER ||--o{ BOOKING : "customer_id"
    USER ||--o{ BOOKING : "vendor_id"
    BOOKING ||--|{ BOOKING_DETAIL : "booking_id"
    SERVICE_INVENTORY |o--o{ BOOKING_DETAIL : "inventory_id"
    SERVICE |o--o{ BOOKING_DETAIL : "service_id"
    FACILITY |o--o{ BOOKING_DETAIL : "facility_id"

    BOOKING ||--o{ PAYMENT : "booking_id"
    USER ||--o{ QR_SCAN_LOG : "vendor_id"
    USER ||--o{ QR_SCAN_LOG : "scanned_by"
    FACILITY |o--o{ QR_SCAN_LOG : "facility_id"
    BOOKING_DETAIL |o--o{ QR_SCAN_LOG : "booking_detail_id"

    USER ||--o{ PAYOUT : "vendor_id"
    USER |o--o{ PAYOUT : "manager_id"
    PAYOUT ||--|{ PAYOUT_DETAIL : "payout_id"
    BOOKING_DETAIL ||--o| PAYOUT_DETAIL : "booking_detail_id"

    BOOKING |o--o{ REVIEW : "booking_id"
    FACILITY ||--o{ REVIEW : "facility_id"
    USER ||--o{ REVIEW : "customer_id"
    USER ||--o{ LOYALTY_TRANSACTION : "user_id"
    BOOKING |o--o{ LOYALTY_TRANSACTION : "booking_id"
    BOOKING |o--o{ SUPPORT_TICKET : "booking_id"
    USER ||--o{ SUPPORT_TICKET : "created_by"
    USER |o--o{ SUPPORT_TICKET : "assigned_manager_id"

    USER ||--o{ NOTIFICATION : "user_id"
    USER |o--o{ AUDIT_LOG : "user_id"
