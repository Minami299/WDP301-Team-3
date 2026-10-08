Bạn hãy đóng vai Senior Full-Stack Software Architect và Senior React/Node.js Developer.

Tôi có một project Travelio gồm Frontend React và Backend Node.js/Express/MongoDB.

MỤC TIÊU:
Refactor project hiện tại thành một hệ thống FE + BE có cấu trúc chuẩn, đồng thời giữ lại những phần đã làm tốt và chuyển toàn bộ mock/prototype workflow sang API thật.

QUY TẮC QUAN TRỌNG:

1. KHÔNG rewrite project từ đầu.
2. KHÔNG xóa UI hiện tại nếu UI đã tồn tại và có thể tái sử dụng.
3. KHÔNG xóa các Mongoose models đang đúng.
4. KHÔNG tạo model trùng với model hiện tại.
5. KHÔNG tạo API trùng với API đã tồn tại.
6. Trước khi sửa bất kỳ file nào phải đọc source code hiện tại và hiểu dependency giữa các file.
7. Những phần đã làm đúng phải được giữ lại và refactor nếu cần.
8. Mock data chỉ được giữ tạm thời cho những phần chưa có API. Khi API tương ứng được implement thì phải thay mock bằng API thật.
9. Không hard-code dữ liệu nghiệp vụ trong React nếu dữ liệu đó phải lấy từ database.
10. Không tạo business logic quan trọng ở FE. Business logic phải nằm ở Backend.
11. Không tự ý thay đổi database schema nếu không cần thiết.
12. Nếu phát hiện model/schema hiện tại không hợp lý, hãy báo rõ trước khi thay đổi.
13. Không tạo một file quá lớn chứa toàn bộ logic.
14. Code phải có separation of concerns.
15. Sau mỗi phase phải đảm bảo project vẫn có thể chạy.
16. Không sửa nhiều module không liên quan trong cùng một bước.
17. Sau mỗi thay đổi phải kiểm tra import/export, route, API contract và dependency.
18. Không dùng mock API để giả lập backend. API phải thực sự gọi MongoDB.
19. Không tạo dữ liệu giả trong FE để che lỗi API.
20. Nếu API chưa tồn tại thì phải implement Backend API trước rồi mới connect Frontend.

==================================================
CURRENT PROJECT STATUS
==================================================

PROJECT:

Travelio

FRONTEND:
- React 19
- Vite
- Tailwind CSS
- Recharts
- Hiện có khoảng 9 màn hình
- App hiện chuyển màn hình bằng state active
- Chưa dùng React Router đúng nghĩa
- FE hiện chủ yếu dùng mock data/useState
- services/hooks gần như chưa có implementation

BACKEND:
- Node.js
- Express
- Mongoose
- MongoDB
- JWT middleware
- Role authorization
- Có seed data
- Có 21 Mongoose models
- Có health/test/auth-test routes
- Có user controller/routes nhưng user routes chưa mount hoàn chỉnh
- Business services chưa implement đầy đủ

DATABASE DOMAIN:

roles
users
user_profiles
facilities
facility_images
amenities
facility_amenities
services
service_inventory
promotions
bookings
booking_details
payments
reviews
loyalty_point_transactions
support_tickets
notifications
payouts
payout_details
system_configs
audit_logs

CURRENT MAIN PROBLEM:

FE và BE chưa kết nối end-to-end.

FE đang demo bằng mock data.
BE mới có infrastructure và schema nhưng business API chưa đầy đủ.

==================================================
TARGET FRONTEND ARCHITECTURE
==================================================

Refactor Frontend theo structure tương tự:

src/
├── app/
│   ├── App.jsx
│   ├── routes/
│   │   ├── AppRoutes.jsx
│   │   ├── PublicRoutes.jsx
│   │   └── ProtectedRoutes.jsx
│   └── providers/
│       └── AuthProvider.jsx
│
├── assets/
│
├── components/
│   ├── common/
│   ├── layout/
│   └── ui/
│
├── pages/
│   ├── customer/
│   └── vendor/
│
├── features/
│   ├── auth/
│   ├── facilities/
│   ├── services/
│   ├── bookings/
│   ├── payments/
│   ├── qr/
│   ├── reviews/
│   ├── vendor/
│   └── settlements/
│
├── services/
│   ├── api/
│   │   ├── axiosClient.js
│   │   ├── authApi.js
│   │   ├── facilityApi.js
│   │   ├── serviceApi.js
│   │   ├── bookingApi.js
│   │   ├── paymentApi.js
│   │   ├── qrApi.js
│   │   ├── reviewApi.js
│   │   └── vendorApi.js
│   └── storage/
│
├── hooks/
├── context/
├── utils/
├── constants/
└── styles/

Use React Router instead of manually switching screens with active state.

Do not destroy existing screens.
Move/refactor existing screens into the new architecture and preserve their UI.

==================================================
TARGET BACKEND ARCHITECTURE
==================================================

backend/src/

├── config/
│   ├── database.js
│   └── env.js
│
├── controllers/
│
├── models/
│
├── routes/
│
├── services/
│
├── middlewares/
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   └── validationMiddleware.js
│
├── validations/
├── utils/
├── seeds/
└── server.js

Use this request flow:

Route
→ Middleware
→ Controller
→ Service
→ Model
→ MongoDB

Controllers must not contain large business logic.

Business logic should be placed in services.

==================================================
PHASE IMPLEMENTATION
==================================================

PHASE 0:
Audit and refactor project structure.

Do not implement all business APIs yet.

First:
- inspect all current files
- identify duplicate logic
- identify existing working code
- identify mock data
- identify existing API routes
- identify existing models
- identify dependencies
- create a migration/refactor plan

Then reorganize FE and BE without breaking the application.

==================================================

PHASE 1:
Backend foundation.

Fix:
- environment configuration
- MongoDB connection
- error handling
- API response format
- route registration
- user routes mounting
- validation
- existing incorrect enum/status values
- password handling

Do not implement unnecessary features.

==================================================

PHASE 2:
Authentication.

Implement:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Use bcrypt for password hashing.

Use JWT.

Implement:
- authentication middleware
- role authorization
- protected routes

Frontend:
- login page
- register page
- auth context
- token storage
- protected routes
- role-based routes

==================================================

PHASE 3:
Facility and service APIs.

Implement real MongoDB APIs:

GET /api/facilities
GET /api/facilities/:id
GET /api/facilities/:id/services
GET /api/facilities/:id/amenities
GET /api/facilities/:id/reviews
GET /api/services
GET /api/inventory

Connect:

Homepage
→ Search Results
→ Facility Detail

Remove corresponding mock data after API integration is verified.

==================================================

PHASE 4:
Booking.

Implement:

POST /api/bookings
GET /api/bookings
GET /api/bookings/:id
PATCH /api/bookings/:id/cancel

Booking must validate inventory on the backend.

Do not allow FE to directly modify inventory.

Booking flow:

Customer
→ select service
→ check inventory
→ create booking
→ create booking details
→ reserve/decrease inventory
→ return booking

Use MongoDB transaction/session where appropriate.

Connect:
Checkout
My Trips
Booking Detail

==================================================

PHASE 5:
Payment.

Implement payment module.

Example:

POST /api/payments
GET /api/payments/:bookingId

Use the existing Payment model.

If real payment gateway is not available, implement a clearly separated test/sandbox payment flow on the backend.

Do not pretend a fake frontend payment is a real payment integration.

==================================================

PHASE 6:
QR.

Implement:

GET /api/bookings/:id/qr
POST /api/qr/verify
POST /api/qr/redeem

QR must be validated by Backend.

Connect:
My Trips
QR Terminal

==================================================

PHASE 7:
Vendor.

Implement:

GET /api/vendor/dashboard
GET /api/vendor/bookings
GET /api/vendor/inventory
PATCH /api/vendor/inventory/:id
POST /api/vendor/inventory/:id/stop-sell
GET /api/vendor/settlements

Connect:

Vendor Dashboard
Inventory Manager
QR Terminal
Settlements

==================================================
PHASE 8:
Secondary features.

Implement only after core booking flow works:

Reviews
Loyalty points
Support tickets
Notifications
Payouts
Audit logs

==================================================
FRONTEND API RULE
==================================================

Every API call must go through a centralized API layer.

Do not write fetch/axios directly inside UI components.

Use:

Component
→ custom hook
→ API service
→ Axios client
→ Backend

Example:

FacilityPage
→ useFacility()
→ facilityApi.getFacility(id)
→ axiosClient.get('/facilities/' + id)
→ Backend

Configure API base URL using environment variables.

Example:

VITE_API_BASE_URL

Do not hard-code localhost URLs throughout the application.

==================================================
BACKEND API RESPONSE
==================================================

Use a consistent response format.

Success example:

{
  "success": true,
  "data": {},
  "message": "Success"
}

Error example:

{
  "success": false,
  "message": "Something went wrong",
  "errors": []
}

==================================================
IMPORTANT DATABASE RULE
==================================================

The existing 21 models are the source of truth unless there is a clear reason to modify them.

Before changing a model:
1. inspect its current schema
2. inspect references
3. inspect seed data
4. inspect controllers/services using it
5. explain why modification is needed

Do not create duplicate models.

==================================================
MOCK DATA MIGRATION RULE
==================================================

For every screen:

1. Find mock data.
2. Identify which database entity it represents.
3. Identify the required API.
4. Implement backend API.
5. Test backend API.
6. Create frontend API service.
7. Create hook/state management.
8. Connect UI.
9. Remove the mock data.
10. Test loading/error/empty states.

Never simply replace mock data with another hardcoded array.

==================================================
CURRENT 9 SCREENS
==================================================

Screen 1:
Homepage / Search

Screen 2:
Search Results / Filter

Screen 3:
Facility / Product Detail

Screen 4:
Checkout / Payment / QR

Screen 5:
My Trips

Screen 6:
Vendor Dashboard

Screen 7:
Inventory Manager

Screen 8:
QR Terminal

Screen 9:
Settlements

Keep the existing UI where possible.

==================================================
QUALITY REQUIREMENTS
==================================================

For every implementation:

- clean code
- reusable components
- clear naming
- no duplicate business logic
- no unnecessary abstraction
- proper loading state
- proper error state
- proper empty state
- proper authentication
- proper authorization
- backend validation
- frontend validation where useful
- consistent API responses
- no secrets in source code
- environment variables for configuration
- no mock data after the corresponding API is completed

==================================================
WORKING METHOD
==================================================

Do NOT implement the entire project in one response.

Work phase by phase.

At the beginning of each phase:

1. Inspect relevant files.
2. Explain what currently exists.
3. List files that will be created.
4. List files that will be modified.
5. Explain why each modification is necessary.
6. Implement only that phase.
7. Check imports and dependencies.
8. Run/build/test the affected part.
9. Report what is DONE.
10. Report what remains TODO.

Do not move to the next phase until the current phase is working.

Start with PHASE 0: audit the existing FE and BE structure and propose the exact migration plan based on the actual source code.
Do not modify code yet.