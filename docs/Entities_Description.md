# Entities Description

*Table 3.36: Entity Descriptions*

| # | Entity | Field | Type | Description |
|---|---|---|---|---|
| 1 | Role | _id | ObjectId | Unique identifier of the role. |
| 2 | Role | role_name | String | Unique name of the role (e.g., ADMIN, CUSTOMER, HOTEL_OWNER). |
| 3 | Role | description | String | Short explanation of the purpose of the role. |
| 4 | Role | permissions | String[] | List of permissions granted to the role, used for RBAC. |
| 5 | User | _id | ObjectId | Unique identifier of the user. |
| 6 | User | email | String | Unique email address used to log in. |
| 7 | User | password_hash | String | Hashed password of the account. |
| 8 | User | full_name | String | Full name of the user. |
| 9 | User | phone | String | Contact phone number. |
| 10 | User | role_id | ObjectId | Reference to the role of the user (FK to Role). |
| 11 | User | total_loyalty_points | Number | Current loyalty point balance of the user. |
| 12 | User | status | Enum | Account status: ACTIVE, INACTIVE, LOCKED, or PENDING. |
| 13 | User | account_kind | Enum | Account type: STANDARD or INTERNAL. |
| 14 | User | approvalStatus | Enum | Approval state of a partner account: PENDING, APPROVED, or REJECTED. |
| 15 | User | approvalReviewedBy | ObjectId | Reference to the reviewer who processed the approval (FK to User). |
| 16 | User | lockedBy | ObjectId | Reference to the administrator who locked the account (FK to User). |
| 17 | User | is_verified | Boolean | Indicates whether the email has been verified. |
| 18 | UserProfile | _id | ObjectId | Unique identifier of the profile. |
| 19 | UserProfile | user_id | ObjectId | Reference to the owning user; one profile per user (FK to User). |
| 20 | UserProfile | avatar_url | String | URL of the avatar image of the user. |
| 21 | UserProfile | address | String | Residential address of the user. |
| 22 | UserProfile | nationality | String | Nationality of the user. |
| 23 | UserProfile | birth_date | Date | Date of birth of the user. |
| 24 | UserProfile | preferred_language | String | Language preferred by the user for the interface. |
| 25 | PartnerApplication | _id | ObjectId | Unique identifier of the application. |
| 26 | PartnerApplication | user_id | ObjectId | Reference to the applicant; one application per user (FK to User). |
| 27 | PartnerApplication | role | Enum | Requested partner role: HOTEL_OWNER or ACTIVITY_VENDOR. |
| 28 | PartnerApplication | status | Enum | Review status: DRAFT, PENDING, NEEDS_ADDITIONAL_INFO, APPROVED, or REJECTED. |
| 29 | PartnerApplication | facility_id | ObjectId | Reference to the facility created after approval (FK to Facility). |
| 30 | PartnerApplication | submitted_at | Date | Date and time the application was submitted. |
| 31 | PartnerDocument | _id | ObjectId | Unique identifier of the document. |
| 32 | PartnerDocument | application_id | ObjectId | Reference to the partner application it belongs to (FK to PartnerApplication). |
| 33 | PartnerDocument | data | Buffer | Binary content of the uploaded document. |
| 34 | Facility | _id | ObjectId | Unique identifier of the facility. |
| 35 | Facility | vendor_id | ObjectId | Reference to the vendor who owns the facility (FK to User). |
| 36 | Facility | type | Enum | Facility type: HOTEL or ATTRACTION. |
| 37 | Facility | listing_mode | Enum | BOOKABLE (can be booked) or INFORMATIONAL (display only). |
| 38 | Facility | name | String | Name of the facility. |
| 39 | Facility | address | String | Street address of the facility. |
| 40 | Facility | city | String | City where the facility is located. |
| 41 | Facility | latitude | Number | Geographic latitude of the facility. |
| 42 | Facility | longitude | Number | Geographic longitude of the facility. |
| 43 | Facility | commission_rate | Number | Commission percentage charged by the platform. |
| 44 | Facility | status | Enum | Approval status: PENDING, APPROVED, REJECTED, ACTIVE, or INACTIVE. |
| 45 | Facility | stars | Number | Star rating of the facility (1-5). |
| 46 | Facility | catalog_key | String | Unique key identifying curated catalog entries. |
| 47 | Amenity | _id | ObjectId | Unique identifier of the amenity. |
| 48 | Amenity | name | String | Unique name of the amenity (e.g., Wi-Fi, Pool). |
| 49 | Amenity | icon_url | String | URL of the amenity icon. |
| 50 | Amenity | type | Enum | Category: ROOM_FEATURE, HOTEL_FACILITY, or ATTRACTION_SERVICE. |
| 51 | FacilityAmenity | _id | ObjectId | Unique identifier of the record. |
| 52 | FacilityAmenity | facility_id | ObjectId | Reference to the facility (FK to Facility). |
| 53 | FacilityAmenity | amenity_id | ObjectId | Reference to the amenity provided (FK to Amenity). |
| 54 | FacilityImage | _id | ObjectId | Unique identifier of the image. |
| 55 | FacilityImage | facility_id | ObjectId | Reference to the facility the image belongs to (FK to Facility). |
| 56 | FacilityImage | image_url | String | URL of the image. |
| 57 | FacilityImage | is_primary | Boolean | Marks the primary (cover) image; at most one per facility. |
| 58 | Service | _id | ObjectId | Unique identifier of the service. |
| 59 | Service | facility_id | ObjectId | Reference to the facility offering the service (FK to Facility). |
| 60 | Service | type | Enum | Service type: ROOM or TICKET. |
| 61 | Service | name | String | Name of the room type or ticket/tour. |
| 62 | Service | base_price | Number | Default price of the service. |
| 63 | Service | capacity | Number | Maximum number of guests. |
| 64 | Service | total_rooms | Number | Total number of rooms of this type. |
| 65 | Service | informational_only | Boolean | Indicates the service is shown for information and cannot be booked. |
| 66 | ServiceInventory | _id | ObjectId | Unique identifier of the inventory record. |
| 67 | ServiceInventory | service_id | ObjectId | Reference to the service (FK to Service). |
| 68 | ServiceInventory | ticket_type_id | ObjectId | Reference to an embedded ticket type in Service.ticket_types. |
| 69 | ServiceInventory | target_date | Date | Date the inventory applies to. |
| 70 | ServiceInventory | time_slot | String | Time slot of the inventory. |
| 71 | ServiceInventory | available_qty | Number | Remaining quantity available for booking. |
| 72 | ServiceInventory | price | Number | Price applied for this date and slot. |
| 73 | Promotion | _id | ObjectId | Unique identifier of the promotion. |
| 74 | Promotion | code | String | Unique voucher code. |
| 75 | Promotion | user_id | ObjectId | Owner of a personal voucher; null for public vouchers (FK to User). |
| 76 | Promotion | discount_type | Enum | PERCENTAGE or FIXED discount. |
| 77 | Promotion | discount_value | Number | Discount amount or percentage. |
| 78 | Promotion | valid_from | Date | Start of the validity period. |
| 79 | Promotion | valid_to | Date | End of the validity period. |
| 80 | Promotion | usage_limit | Number | Maximum total number of uses. |
| 81 | Promotion | used_count | Number | Number of times the promotion has been used. |
| 82 | Promotion | status | Enum | Promotion status: ACTIVE, EXPIRED, or DISABLED. |
| 83 | Booking | _id | ObjectId | Unique identifier of the booking. |
| 84 | Booking | booking_code | String | Unique human-readable booking code. |
| 85 | Booking | customer_id | ObjectId | Reference to the customer who placed the booking (FK to User). |
| 86 | Booking | vendor_id | ObjectId | Reference to the vendor fulfilling the booking (FK to User). |
| 87 | Booking | promotion_id | ObjectId | Reference to the promotion applied (FK to Promotion). |
| 88 | Booking | decided_by | ObjectId | Reference to the user who approved or rejected the booking (FK to User). |
| 89 | Booking | total_amount | Number | Total amount before discounts. |
| 90 | Booking | final_amount | Number | Amount payable after discounts and points. |
| 91 | Booking | status | Enum | Booking status: PENDING, CONFIRMED, CANCELLED, REFUNDED, or COMPLETED. |
| 92 | Booking | payos_order_code | Number | Unique order code of the PayOS payment link. |
| 93 | BookingDetail | _id | ObjectId | Unique identifier of the booking line. |
| 94 | BookingDetail | booking_id | ObjectId | Reference to the parent booking (FK to Booking). |
| 95 | BookingDetail | inventory_id | ObjectId | Reference to the reserved inventory (FK to ServiceInventory). |
| 96 | BookingDetail | service_id | ObjectId | Reference to the booked service (FK to Service). |
| 97 | BookingDetail | facility_id | ObjectId | Reference to the facility (FK to Facility). |
| 98 | BookingDetail | quantity | Number | Number of rooms or tickets booked. |
| 99 | BookingDetail | unit_price | Number | Price per unit at the time of booking. |
| 100 | BookingDetail | commission_amount | Number | Commission amount of this line. |
| 101 | BookingDetail | qr_code | String | Unique QR code used for check-in. |
| 102 | BookingDetail | check_in_status | Enum | Check-in status: PENDING, CHECKED_IN, or NO_SHOW. |
| 103 | BookingDetail | checked_in_at | Date | Date and time the guest checked in. |
| 104 | Payment | _id | ObjectId | Unique identifier of the payment. |
| 105 | Payment | booking_id | ObjectId | Reference to the paid booking (FK to Booking). |
| 106 | Payment | transaction_id | String | Unique transaction identifier from the gateway. |
| 107 | Payment | payment_gateway | Enum | Gateway used: VNPAY, MOMO, STRIPE, PAYPAL, SEPAY, or PAYOS. |
| 108 | Payment | amount | Number | Amount paid. |
| 109 | Payment | status | Enum | Payment status: PENDING, SUCCESS, FAILED, or REFUNDED. |
| 110 | Review | _id | ObjectId | Unique identifier of the review. |
| 111 | Review | booking_id | ObjectId | Reference to the related booking (FK to Booking). |
| 112 | Review | facility_id | ObjectId | Reference to the reviewed facility (FK to Facility). |
| 113 | Review | customer_id | ObjectId | Reference to the reviewer (FK to User). |
| 114 | Review | vendor_reply_by | ObjectId | Reference to the vendor who replied (FK to User). |
| 115 | Review | rating | Number | Rating given by the customer (1-5). |
| 116 | LoyaltyPointTransaction | _id | ObjectId | Unique identifier of the transaction. |
| 117 | LoyaltyPointTransaction | user_id | ObjectId | Reference to the user whose points change (FK to User). |
| 118 | LoyaltyPointTransaction | booking_id | ObjectId | Reference to the related booking (FK to Booking). |
| 119 | LoyaltyPointTransaction | points | Number | Points earned (positive) or redeemed (negative). |
| 120 | LoyaltyPointTransaction | reason | String | Reason for the point change. |
| 121 | SupportTicket | _id | ObjectId | Unique identifier of the ticket. |
| 122 | SupportTicket | booking_id | ObjectId | Reference to the related booking (FK to Booking). |
| 123 | SupportTicket | created_by | ObjectId | Reference to the user who opened the ticket (FK to User). |
| 124 | SupportTicket | assigned_manager_id | ObjectId | Reference to the manager handling the ticket (FK to User). |
| 125 | SupportTicket | issue_type | Enum | Issue category: REFUND, FACILITY_ISSUE, CHECK_IN_ERROR, or OTHER. |
| 126 | SupportTicket | status | Enum | Ticket status: OPEN, IN_PROGRESS, RESOLVED, or CLOSED. |
| 127 | Payout | _id | ObjectId | Unique identifier of the payout. |
| 128 | Payout | vendor_id | ObjectId | Reference to the vendor receiving the payout (FK to User). |
| 129 | Payout | manager_id | ObjectId | Reference to the manager who processed it (FK to User). |
| 130 | Payout | amount | Number | Net amount paid to the vendor. |
| 131 | Payout | status | Enum | Payout status: PENDING, APPROVED, PAID, or REJECTED. |
| 132 | Payout | period_start | Date | Start date of the settlement period. |
| 133 | Payout | period_end | Date | End date of the settlement period. |
| 134 | PayoutDetail | _id | ObjectId | Unique identifier of the payout line. |
| 135 | PayoutDetail | payout_id | ObjectId | Reference to the parent payout (FK to Payout). |
| 136 | PayoutDetail | booking_detail_id | ObjectId | Reference to the settled booking line; unique (FK to BookingDetail). |
| 137 | PayoutDetail | gross | Number | Gross revenue of the line. |
| 138 | PayoutDetail | commission | Number | Commission deducted from the line. |
| 139 | PayoutDetail | amount | Number | Net amount of the line payable to the vendor. |
| 140 | QrScanLog | _id | ObjectId | Unique identifier of the scan log. |
| 141 | QrScanLog | vendor_id | ObjectId | Reference to the vendor whose QR was scanned (FK to User). |
| 142 | QrScanLog | facility_id | ObjectId | Reference to the facility of the scan (FK to Facility). |
| 143 | QrScanLog | booking_detail_id | ObjectId | Reference to the scanned booking line (FK to BookingDetail). |
| 144 | QrScanLog | scanned_by | ObjectId | Reference to the user who scanned; null for public-link scans (FK to User). |
| 145 | QrScanLog | source | Enum | Scan origin: TERMINAL or PUBLIC_LINK. |
| 146 | QrScanLog | ip | String | IP address of the scanning device. |
| 147 | QrScanLog | user_agent | String | User-agent of the scanning device. |
| 148 | QrScanLog | result | Enum | Scan result: VALID, ALREADY_REDEEMED, INVALID, NOT_YOURS, or WRONG_DATE. |
| 149 | QrScanLog | scanned_at | Date | Date and time of the scan. |
| 150 | Notification | _id | ObjectId | Unique identifier of the notification. |
| 151 | Notification | user_id | ObjectId | Reference to the recipient (FK to User). |
| 152 | Notification | type | Enum | Notification type: SYSTEM, BOOKING, PROMOTION, or TICKET_UPDATE. |
| 153 | Notification | is_read | Boolean | Indicates whether the user has read the notification. |
| 154 | AuditLog | _id | ObjectId | Unique identifier of the log entry. |
| 155 | AuditLog | user_id | ObjectId | Reference to the user who performed the action (FK to User). |
| 156 | AuditLog | table_name | String | Name of the affected collection. |
| 157 | AuditLog | record_id | ObjectId | Identifier of the affected record (polymorphic reference). |
| 158 | AuditLog | old_data | Mixed | Snapshot of the data before the change. |
| 159 | AuditLog | new_data | Mixed | Snapshot of the data after the change. |
| 160 | SystemConfig | _id | ObjectId | Unique identifier of the configuration. |
| 161 | SystemConfig | config_key | String | Unique configuration key. |
| 162 | SystemConfig | config_value | String | Value of the configuration. |
| 163 | VoucherType | _id | ObjectId | Unique identifier of the voucher type. |
| 164 | VoucherType | code | String | Unique code of the voucher type. |
| 165 | VoucherType | name | String | Display name of the voucher type. |
| 166 | VoucherType | code_prefix | String | Prefix used when generating voucher codes. |
