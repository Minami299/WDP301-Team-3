# Kế hoạch Demo Luồng Tạo Tài Khoản `HOTEL_OWNER`

Tài liệu này mô tả kịch bản demo chi tiết luồng đăng ký, xác minh, hoàn thiện hồ sơ đối tác, xét duyệt và kích hoạt tài khoản `HOTEL_OWNER` trên hệ thống Travelio.

---

## 1. Chuẩn bị trước khi demo

1. **Tài nguyên file cần chuẩn bị sẵn trên máy**:
   - **3 ảnh phòng khách sạn** (`.jpg` hoặc `.png`) để tải lên ở Bước 5 của wizard.
   - **2 file tài liệu chứng minh giả lập** (`.pdf`, `.png` hoặc `.jpg` thật, dung lượng từ 12 bytes đến 3 MB; backend kiểm tra chữ ký định dạng file thật nên không đổi đuôi từ `.txt` sang `.pdf` — xem `backend/src/services/partnerApplication.service.js`):
     - File 1: `giay-phep-kinh-doanh.pdf` (dùng cho mục Chứng nhận đăng ký kinh doanh).
     - File 2: `giay-xac-nhan-quyen-quan-ly.pdf` (dùng cho mục Bằng chứng quyền quản lý cơ sở).
2. **Kiểm tra cấu hình môi trường Backend**:
   - Khai báo đầy đủ `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` để gửi OTP xác minh email (xem `backend/src/services/email.service.js`).
   - Khai báo Cloudinary để upload ảnh phòng ở `POST /api/uploads/room-images` (`backend/src/routes/upload.routes.js`).
3. **Tài khoản và hòm thư dùng khi demo**:
   - **Email người đăng ký mới**: dùng 1 email thật có thể mở hộp thư ngay lúc demo (chưa tồn tại trong database).
   - **Tài khoản Manager xét duyệt** (từ `backend/src/seeds/seed.js`):
     - Email: `manager@travelio.com`
     - Mật khẩu: `Travelio@123`

---

## 2. Bộ dữ liệu mẫu (dùng để nhập khi demo)

- **Thông tin tài khoản & người đại diện**:
  - Họ và tên (`Full Name`): `Nguyễn Văn An` (Bước 8: Họ `Nguyễn Văn`, Tên `An`)
  - Email: `<email-that-cua-ban>`
  - Mật khẩu / Xác nhận mật khẩu: `HotelDemo@123`
  - Số điện thoại: `0905123456`
- **Thông tin cơ sở & phòng**:
  - Địa chỉ cơ sở: `252 Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng`
  - Tên cơ sở lưu trú: `Blue Sea Beach Hotel Đà Nẵng`
  - Diện tích cơ sở (m²): `1200`
  - Mô tả cơ sở: `Khách sạn ven biển Mỹ Khê với phòng hướng biển và đầy đủ tiện nghi.`
  - Tên loại phòng 1: `Phòng Deluxe Hướng Biển`
  - Giá mỗi đêm: `1500000`
  - Tổng số phòng: `10`
- **Thông tin chủ thể pháp lý (tại trang hồ sơ đối tác)**:
  - Loại chủ thể: `Doanh nghiệp` (`COMPANY`)
  - Tên doanh nghiệp: `Công ty TNHH Khách sạn Biển Xanh`
  - Tên thương mại: `Blue Sea Hotel`
  - Địa chỉ đăng ký: `252 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, Đà Nẵng`
  - Mã đăng ký doanh nghiệp: `0401234567`
  - Mã số thuế: `0401234567`
  - Họ tên người đại diện: `Nguyễn Văn An`
  - Chức vụ / tư cách đại diện: `Giám đốc`
  - Căn cứ đại diện: `Đại diện pháp luật` (`LEGAL_REPRESENTATIVE`)
  - Loại hình cơ sở lưu trú: `Khách sạn` (`HOTEL`)

---

## 3. Kịch bản thao tác chi tiết trên giao diện

### Giai đoạn 1: Đăng ký tài khoản & Khởi tạo hồ sơ nháp (2–3 phút)

1. Mở trình duyệt tại `/auth/register` (`frontend/src/pages/auth/AuthPage.jsx`).
2. Tại mục **Loại tài khoản đăng ký**, nhấn **Chủ khách sạn** để chuyển hướng sang `/partner/register/hotel` (`frontend/src/pages/vendor/HotelOwnerRegistrationPage.jsx`).
3. Thực hiện lần lượt 9 bước của wizard:
   - **Bước 1 (`Account Information`)**:
     - Nhập `Full Name`: `Nguyễn Văn An`
     - Nhập `Email Address`: `<email-that-cua-ban>`
     - Nhập `Password` và `Confirm Password`: `HotelDemo@123`
     - Tích chọn `Tôi đã đọc và đồng ý điều khoản tài khoản đăng ký Travelio.`
     - Nhấn **Tiếp theo**.
   - **Bước 2 (`Vị trí`)**:
     - Giữ hoặc nhập địa chỉ `252 Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng` (tối thiểu 5 ký tự) và chọn vị trí trên bản đồ.
     - Nhấn **Tiếp theo**.
   - **Bước 3 (`Tiện nghi`)**:
     - Chọn 2–3 tiện nghi (ví dụ: `Bể Bơi`, `Bãi để xe`).
     - Nhấn **Tiếp theo**.
   - **Bước 4 (`Thiết lập phòng`)**:
     - Nhập tên phòng `Phòng Deluxe Hướng Biển`, giá `1500000`, chọn loại giường và số lượng từ 1 trở lên.
     - Nhấn **Tiếp theo**.
   - **Bước 5 (`Hình ảnh`)**:
     - Tải lên đủ **3 ảnh** đã chuẩn bị cho `Phòng Deluxe Hướng Biển` và chờ upload hoàn tất.
     - Nhấn **Tiếp theo**.
   - **Bước 6 (`Khuyến mại & Doanh thu`)**:
     - Giữ mặc định phương thức nhận tiền (`bank_transfer`) và chính sách check-in.
     - Nhấn **Tiếp theo**.
   - **Bước 7 (`Thông tin chi tiết cơ sở lưu trú`)**:
     - Nhập tên cơ sở `Blue Sea Beach Hotel Đà Nẵng`, diện tích `1200`, tổng số phòng `10`, mô tả ngắn.
     - Nhấn **Tiếp theo**.
   - **Bước 8 (`Hồ sơ`)**:
     - Nhập Họ `Nguyễn Văn`, Tên `An`, Số điện thoại `0905123456`.
     - Nhấn **Tiếp theo**.
   - **Bước 9 (`Xác nhận hồ sơ nháp`)**:
     - Tích chọn `Tôi xác nhận thông tin cơ sở vừa nhập là trung thực...`.
     - Nhấn **Tiếp tục hoàn thiện hồ sơ đối tác**.
4. **Kết quả sau Giai đoạn 1**:
   - URL chuyển sang `/partner/registration-pending?verify=1&email=...&sent=1`.
   - Backend gọi `POST /api/auth/register` với `role_name: "HOTEL_OWNER"` (`backend/src/services/partnerApplication.service.js`), tạo `User` với vai trò tạm là `CUSTOMER` (`is_verified: false`), lưu `PartnerApplication` trạng thái `DRAFT` (`role: 'HOTEL_OWNER'`), chưa cấp quyền kinh doanh và chưa công khai khách sạn.

### Giai đoạn 2: Xác minh OTP & Nộp hồ sơ đối tác (2 phút)

1. Tại màn hình **Xác minh email đăng ký** trên `/partner/registration-pending` (`frontend/src/pages/auth/PartnerApplicationPage.jsx`):
   - Mở hộp thư email vừa đăng ký, lấy mã OTP 6 chữ số.
   - Nhập OTP và nhấn **Xác minh email** (`POST /api/auth/verify-email`).
2. Sau khi xác minh thành công, màn hình chuyển sang form **Đăng nhập để mở hồ sơ**:
   - Nhập email vừa đăng ký và mật khẩu `HotelDemo@123`.
   - Nhấn **Đăng nhập và mở hồ sơ**.
3. Điền đầy đủ 4 mục trên trang hồ sơ đối tác:
   - **Mục 1 (`1. Thông tin chủ thể và quyền đại diện`)**: Nhập thông tin theo bộ dữ liệu mẫu ở Mục 2 (`Doanh nghiệp`, tên doanh nghiệp, địa chỉ đăng ký, mã ĐKKD `0401234567`, MST `0401234567`, người đại diện `Nguyễn Văn An`, chức vụ `Giám đốc`, căn cứ đại diện `Đại diện pháp luật`, loại hình `Khách sạn`).
   - **Mục 2 (`2. Cơ sở và dịch vụ dự kiến`)**: Kiểm tra lại thông tin khách sạn và phòng đã lưu từ wizard 9 bước.
   - **Mục 3 (`3. Tài liệu chứng minh`)**:
     - Chọn loại `Chứng nhận đăng ký kinh doanh` (`BUSINESS_REGISTRATION`) và tải lên `giay-phep-kinh-doanh.pdf`.
     - Chọn loại `Bằng chứng quyền quản lý cơ sở / vận hành hoặc phân phối dịch vụ` (`AUTHORITY_PROOF`) và tải lên `giay-xac-nhan-quyen-quan-ly.pdf`.
     - Kiểm tra danh sách yêu cầu phía trên chuyển từ `○` sang `✓` đủ các mục bắt buộc.
   - **Mục 4 (`4. Cam kết và thỏa thuận`)**:
     - Tích đủ 3 checkbox cam kết.
     - Nhấn **Gửi hồ sơ đăng ký đối tác**.
4. **Kết quả sau Giai đoạn 2**:
   - Trạng thái hồ sơ chuyển thành **Chờ xét duyệt** (`PENDING`), các trường dữ liệu và tài liệu bị khóa trong thời gian chờ duyệt.

### Giai đoạn 3: Manager xét duyệt & Cấp quyền `HOTEL_OWNER` (1–2 phút)

1. Đăng xuất hoặc mở cửa sổ trình duyệt ẩn danh mới.
2. Truy cập `/auth/login`, đăng nhập bằng tài khoản Manager: `manager@travelio.com` / `Travelio@123`.
3. Vào mục **Hồ sơ đối tác** tại `/manager/approvals` (`frontend/src/pages/admin/PartnerApplicationApprovals.jsx`).
4. Tại tab **Chờ duyệt** (có thể lọc `Hotel Owner`):
   - Tìm hồ sơ của `Nguyễn Văn An`, nhấn **Xem hồ sơ**.
5. Trong hộp thoại **Chi tiết hồ sơ đối tác**:
   - Kiểm tra thông tin chủ thể, cơ sở/phòng và nhấn vào tên file ở mục **Tài liệu chứng minh** để tải thử tài liệu riêng tư.
   - Tích đủ cả 4 ô trong **Checklist kiểm tra thủ công**:
     - `Đã đối chiếu chủ thể kinh doanh và người đại diện`
     - `Đã kiểm tra quyền quản lý / vận hành / phân phối`
     - `Đã kiểm tra tài liệu, thời hạn và điều kiện áp dụng`
     - `Đã kiểm tra cơ sở, dịch vụ, giá và điều kiện công khai`
   - *(Tùy chọn)*: Có thể giới thiệu nhanh 2 nút **Yêu cầu bổ sung** và **Từ chối** (yêu cầu nhập lý do), sau đó nhấn nút **Phê duyệt và cấp quyền**.
6. **Kết quả sau Giai đoạn 3**:
   - Backend chạy transaction phê duyệt (`backend/src/services/partnerApplication.service.js` và `backend/src/services/partnerBusiness.service.js`):
     - Tạo `Facility` (`type: 'HOTEL'`, `status: 'ACTIVE'`), `Service` (`type: 'ROOM'`), `FacilityImage` và `FacilityAmenity`.
     - Cập nhật `role_id` của `User` từ `CUSTOMER` thành `HOTEL_OWNER` (`approvalStatus: 'APPROVED'`), đồng thời gửi email thông báo cho đối tác.

### Giai đoạn 4: Kiểm chứng kết quả tài khoản `HOTEL_OWNER` (1 phút)

1. Đăng xuất tài khoản Manager.
2. Đăng nhập lại tại `/auth/login` bằng `<email-that-cua-ban>` và mật khẩu `HotelDemo@123`.
3. **Kết quả kiểm chứng**:
   - Hệ thống tự động điều hướng vào `/vendor` (`frontend/src/pages/vendor/HotelOwnerDashboardPage.jsx`).
   - Kiểm tra `/vendor/inventory`: phòng `Phòng Deluxe Hướng Biển` giá `1.500.000 đ` đã hiển thị.
   - Kiểm tra `/vendor/registration`: thông tin cơ sở `Blue Sea Beach Hotel Đà Nẵng` đã kích hoạt.
   - Kiểm tra `/search`: tìm `Blue Sea Beach Hotel Đà Nẵng` để xác nhận cơ sở lưu trú đã hiển thị công khai cho khách hàng đặt phòng.

---

## 4. Kịch bản dự phòng khi demo

- **Lỗi gửi OTP hoặc email chậm**: Kiểm tra lại cấu hình SMTP trước khi demo; nếu hồ sơ nháp đã lưu nhưng chưa gửi được OTP (`sent=0`), nhấn **Gửi lại OTP** trên `/partner/registration-pending` (sau 60 giây).
- **Demo rút gọn từ tài khoản Customer có sẵn (bỏ qua bước tạo user & OTP)**: Đăng nhập sẵn bằng tài khoản Customer đã xác minh email, truy cập `/partner/register/hotel` và hoàn tất 9 bước (hệ thống gọi `POST /api/auth/become-partner`), sau đó thực hiện tiếp Giai đoạn 2–4.

---

## 5. Cách chạy project

1. **Backend** (trong thư mục `backend`):
   - `npm install`
   - `npm run seed` (nếu database chưa có dữ liệu mẫu)
   - `npm run dev`
2. **Frontend** (trong thư mục `frontend`):
   - `npm install`
   - `npm run dev`
