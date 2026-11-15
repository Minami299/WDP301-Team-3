# Kế hoạch Demo Luồng Đặt Phòng Khách Sạn (`HOTEL_BOOKING`)

Tài liệu này mô tả kịch bản demo chi tiết, đầy đủ từng màn hình và nghiệp vụ thực tế của phân hệ **Đặt phòng khách sạn (Hotel Room Booking)** và **Quy trình Lễ tân xác nhận Check-in** trên nền tảng du lịch **Travelio**.

---

## 1. Chuẩn bị trước khi demo

### 1.1. Môi trường hệ thống
1. **Backend Server**: Đang chạy tại `http://localhost:5000` (`npm run dev` trong thư mục `backend`).
2. **Frontend Client**: Đang chạy tại `http://localhost:5173` (`npm run dev` trong thư mục `frontend`).
3. **Database**: Đang kết nối trực tiếp tới MongoDB Atlas (`travelio_db`).
4. **Cổng thanh toán PayOS**: API Key và Checksum Key đã cấu hình trong `backend/.env`.

### 1.2. Danh sách tài khoản thử nghiệm (Mật khẩu chung: `Travelio@123`)

| Vai trò | Email đăng nhập | Tên người dùng | Mục đích trong kịch bản demo |
| :--- | :--- | :--- | :--- |
| **Khách hàng (`CUSTOMER`)** | `trungquan2904@gmail.com` | Trần Trung Quân | Đặt phòng, áp mã voucher, đổi điểm thưởng thành viên (có sẵn 350 điểm). |
| **Chủ khách sạn (`HOTEL_OWNER`)** | `vinpearl.vendor@travelio.com` | Vinpearl Phú Quốc Partner | Quản lý phòng, dùng **QR Terminal** tại quầy lễ tân để xác nhận check-in cho khách. |
| **Quản lý sàn (`MANAGER`)** | `manager@travelio.com` | Nguyễn Văn Quản Lý | Theo dõi đối soát doanh thu sàn, duyệt chính sách hủy phòng hoàn tiền. |

### 1.3. Kho Mã Voucher & Điểm thưởng dùng khi demo
- `WELCOMEHOTEL`: Giảm ngay **100.000đ** cho đơn đặt phòng khách sạn từ 500.000đ (dành cho đơn phòng đầu tiên).
- `HOTEL20`: Giảm **20%** (tối đa 250.000đ) cho các đơn đặt phòng khách sạn từ 800.000đ.
- `TRAVELIOFIX`: Giảm **100.000đ** áp dụng toàn sàn cho đơn từ 500.000đ.
- **Điểm thưởng tích lũy (Loyalty Points)**: Tỷ giá quy đổi **1 điểm = 1.000 VNĐ** (trừ trực tiếp vào số tiền thanh toán).

---

## 2. Kịch bản Thao tác Chi tiết qua Từng Màn hình

### Sơ đồ luồng tổng quan:
```
[1. Trang chủ / Tìm kiếm] ➔ [2. Chi tiết Khách sạn & Chọn phòng] ➔ [3. Trang Checkout & Giữ phòng 15p]
       ➔ [4. Cổng thanh toán PayOS VietQR] ➔ [5. Vé điện tử & QR Nhận phòng]
       ➔ [6. Lễ tân quét QR Check-in Terminal] ➔ [7. Dashboard Vận hành Khách sạn]
```

---

### Màn hình 1: Trang chủ & Tìm kiếm Khách sạn (`/` và `/search`)

1. Mở trình duyệt tại `http://localhost:5173`.
2. Đăng nhập bằng tài khoản khách hàng:
   - Email: `trungquan2904@gmail.com`
   - Mật khẩu: `Travelio@123`
3. Tại thanh tìm kiếm ở đầu trang:
   - **Điểm đến**: Chọn hoặc nhập `Phú Quốc`.
   - **Ngày nhận phòng / Trả phòng**: Chọn từ **hôm nay** đến **hôm sau** (ở 1 đêm) hoặc chọn khoảng 2–3 đêm.
   - **Số phòng & Số khách**: Chọn `1 phòng`, `2 người lớn`.
   - Nhấn nút **Tìm kiếm**.
4. **Kết quả trên màn hình `/search`**:
   - Hệ thống hiển thị danh sách các khách sạn đạt tiêu chuẩn tại Phú Quốc.
   - Nhấn chọn khách sạn **Vinpearl Resort & Spa Phú Quốc**.

---

### Màn hình 2: Trang Chi tiết Khách sạn & Chọn Hạng phòng (`/facilities/:id`)

1. Tại trang chi tiết khách sạn:
   - Xem hình ảnh không gian, bảng tiện nghi dịch vụ (`Wifi tốc độ cao`, `Hồ bơi`, `Bãi để xe`...).
   - Cuộn xuống khu vực **Danh sách phòng & Giá**.
2. **Thao tác chọn phòng trên bảng lịch `AgodaDatePicker`**:
   - Chọn khoảng ngày lưu trú: ví dụ từ ngày hôm nay đến ngày mai.
   - Hệ thống hiển thị giá từng đêm và số phòng còn trống trong thời gian thực.
   - Chọn hạng phòng: **Phòng Deluxe Hướng Biển** (Đơn giá: `2.600.000đ`/đêm).
3. **Kiểm tra ràng buộc nghiệp vụ (Business Rules)**:
   - *Kiểm tra sức chứa*: Nếu chọn số khách vượt quá `(service.capacity * rooms)`, hệ thống sẽ cảnh báo không cho đặt.
   - *Kiểm tra ngày nhận phòng*: Ngày check-in không được nhỏ hơn ngày hiện tại.
4. Nhấn nút **Đặt phòng ngay**.

---

### Màn hình 3: Trang Thanh toán Checkout & Giữ chỗ 15 phút (`/checkout`)

1. **Quan sát Cơ chế Giữ phòng tạm thời (`RoomHold`)**:
   - Góc trên màn hình hiển thị đồng hồ đếm ngược **15:00 phút**.
   - *Thuyết minh kỹ thuật*: "Khi khách bấm Đặt phòng, backend gọi `POST /api/bookings/room-hold` để giữ phòng này trong 15 phút bằng `hold_token`. Trong suốt thời gian giữ chỗ, người dùng khác tìm kiếm sẽ thấy phòng tạm hết, ngăn chặn hoàn toàn rủi ro 2 người cùng thanh toán 1 phòng cuối cùng (Overbooking)."
2. **Điền thông tin liên hệ của Khách lưu trú**:
   - Họ và tên: `Trần Trung Quân`.
   - Email: `trungquan2904@gmail.com`.
   - Số điện thoại: `0933221100`.
3. **Áp dụng Khuyến mãi đa tầng (Multi-tier Promotions)**:
   - **Mã Voucher sàn**: Tại ô *Mã khuyến mãi*, nhập `WELCOMEHOTEL` (hoặc `HOTEL20`) ➔ Nhấn **Áp dụng**. Hệ thống trừ ngay 100.000đ (hiển thị dòng chiết khấu voucher riêng biệt).
   - **Điểm thưởng thành viên (Loyalty Points)**: Khách đang có sẵn 350 điểm (tương đương 350.000đ). Nhập dùng `50` điểm ➔ Số tiền thanh toán được trừ thêm 50.000đ.
4. **Kiểm tra Bảng tóm tắt thanh toán & Chính sách hủy phòng**:
   - Tiền phòng gốc: `2.600.000đ`.
   - Giảm giá voucher: `-100.000đ`.
   - Điểm thưởng quy đổi: `-50.000đ`.
   - Số tiền cần thanh toán: `2.450.000đ`.
   - Bảng chính sách hủy phòng hiển thị rõ: *Hủy trước 48h hoàn 100%, hủy trước 24h hoàn 50%, hủy trong 24h không hoàn tiền*.
5. Nhấn **Xác nhận đặt phòng & Thanh toán**.

---

### Màn hình 4: Cổng thanh toán VietQR PayOS (`pay.payos.vn`)

1. Hệ thống điều hướng sang giao diện cổng thanh toán an toàn **PayOS**.
2. Màn hình hiển thị mã **VietQR** động:
   - Số tiền thanh toán chính xác: `2.450.000đ`.
   - Nội dung chuyển khoản chuẩn hóa: `TVL <8 số cuối mã đơn>`.
3. **Thao tác thanh toán**:
   - Quét mã bằng App ngân hàng (hoặc dùng tính năng giả lập thanh toán thành công của PayOS).
   - PayOS gửi Webhook tức thời về backend Travelio (`POST /api/payments/payos/webhook`).
   - Backend xác thực chữ ký bảo mật HMAC-SHA256, chuyển trạng thái đơn hàng sang **`CONFIRMED`**, trừ 50 điểm trong ví khách và tự động sinh mã QR Check-in nhận phòng.

---

### Màn hình 5: Vé điện tử & Mã QR Nhận phòng (`/my-trips` & `/booking-detail/:id`)

1. Sau khi thanh toán thành công, hệ thống chuyển hướng về trang **Chuyến đi của tôi**.
2. **Thông tin hiển thị trên vé điện tử**:
   - Trạng thái: **Đã xác nhận (CONFIRMED)** màu xanh lục.
   - Mã đặt phòng: dạng `TVL-XXXXXXXX`.
   - **Mã QR Check-in nhận phòng**: Hiển thị nổi bật kèm ghi chú *"Xuất trình mã QR này tại quầy Lễ tân khách sạn khi nhận phòng"*.
   - Chi tiết lưu trú: Tên khách sạn `Vinpearl Resort & Spa Phú Quốc`, Ngày nhận phòng, Ngày trả phòng, Số đêm, Số khách.

---

### Màn hình 6: Lễ tân Khách sạn Quét mã Check-in (`/vendor/qr-terminal` hoặc `/checkin/:code`)

1. Mở một trình duyệt khác (hoặc cửa sổ ẩn danh) và đăng nhập bằng tài khoản Chủ khách sạn:
   - Email: `vinpearl.vendor@travelio.com`
   - Mật khẩu: `Travelio@123`
2. Truy cập vào menu **Vận hành Check-in QR** (`/vendor/qr-terminal`):
   - Nhập chuỗi mã QR của khách (hoặc quét trực tiếp qua camera).
   - Nhấn **Xác thực mã**.
3. **Kết quả kiểm tra từ hệ thống**:
   - Màn hình hiện thẻ xanh: **VALID PASS (Hợp lệ - Cho phép nhận phòng)**.
   - Hiển thị đầy đủ thông tin đối chiếu: Tên khách `Trần Trung Quân`, Tên phòng `Phòng Deluxe Hướng Biển`, Mã đơn đặt phòng, Khoảng ngày lưu trú hợp lệ.
4. **Xác nhận bàn giao phòng**:
   - Nhấn nút **Xác nhận Check-in**.
   - Trạng thái phòng chuyển sang **`CHECKED_IN`**, lưu vết thời gian nhận phòng thực tế (`checked_in_at = now()`) và ghi nhật ký vào `qr_scan_logs`.
5. **Thử nghiệm chống gian lận (Anti-Fraud Test)**:
   - Thử nhập lại mã vừa check-in lần thứ 2.
   - Hệ thống lập tức từ chối và cảnh báo màu vàng: **`ALREADY_REDEEMED` (Mã này đã được xác nhận check-in lúc [giờ:phút]. Không thể tái sử dụng)**.

---

### Màn hình 7: Bảng điều khiển Vận hành Khách sạn (`/vendor/dashboard`)

1. Tại Dashboard quản lý của Chủ khách sạn:
   - Cột **Lượt nhận phòng hôm nay** tăng thêm +1.
   - Tỷ lệ quét mã hợp lệ hiển thị **100%**.
   - **No-Show Panel**: Khách đã check-in được tự động xóa khỏi danh sách cảnh báo vắng mặt.

---

## 3. Kịch bản Xử lý Hủy phòng & Đối soát Doanh thu

### 3.1. Khách hàng yêu cầu hủy phòng (`/my-trips`)
1. Khách hàng bấm nút **Yêu cầu hủy phòng** trên đơn vừa đặt.
2. Hệ thống tự động tính toán tỷ lệ hoàn tiền theo chính sách (`calculateCancellationPolicy`):
   - Giả sử hủy trước giờ nhận phòng $\ge 48$ tiếng ➔ Thông báo khách được **hoàn 100% tiền**.
3. Khách nhập lý do hủy ➔ Nhấn **Gửi yêu cầu**. Đơn chuyển sang trạng thái `CANCELLATION_REQUESTED`.

### 3.2. Quản lý / Khách sạn phê duyệt hủy đơn
1. Đăng nhập tài khoản Manager (`manager@travelio.com` / `Travelio@123`).
2. Vào mục **Xét duyệt & Yêu cầu hủy** (`/admin/approvals`):
   - Kiểm tra thông tin đơn hàng và tỷ lệ hoàn tiền.
   - Nhấn **Chấp thuận hủy (Approve)**.
3. **Kết quả xử lý tự động của Backend**:
   - Trạng thái đơn chuyển sang `CANCELLED` / `REFUNDED`.
   - Phòng được nhả ngay lập tức về kho trống để đón khách khác.
   - 50 điểm thưởng thành viên đã dùng được hoàn trả nguyên vẹn về tài khoản của khách.

### 3.3. Đối soát doanh thu Khách sạn (`/vendor/settlements`)
1. Đăng nhập tài khoản Chủ khách sạn `vinpearl.vendor@travelio.com`.
2. Vào trang **Đối soát & Thanh toán** (`/vendor/settlements`):
   - Khi phòng hoàn tất kỳ nghỉ (`COMPLETED`), hệ thống tự động kết toán:
     - **Doanh thu gộp (GMV)**: Tiền khách thanh toán.
     - **Hoa hồng sàn (Commission 12%)**: Phí dịch vụ nền tảng Travelio giữ lại.
     - **Thực nhận (Net)**: Số tiền khách sạn nhận về ví.
   - Khách sạn có thể nhấn **Yêu cầu rút tiền (Payout)** về tài khoản ngân hàng đã đăng ký.

---

## 4. Các Điểm Kỹ thuật Nổi bật khi Thuyết trình Bảo vệ Đồ án

1. **Cơ chế Khóa giữ phòng tạm thời (`RoomHold`)**: Giữ phòng 15 phút kết hợp phiên bản sửa đổi `booking_revision` (Optimistic Locking) trong MongoDB Transaction, loại bỏ hoàn toàn lỗi Overbooking khi có nhiều lượt đặt đồng thời.
2. **Khuyến mãi đa tầng an toàn**: Cho phép kết hợp Khuyến mãi dài ngày của khách sạn + Voucher của sàn + Điểm thưởng thành viên trong một giao dịch ACID, có kiểm tra trần giảm giá để không bị âm tiền.
3. **Thanh toán thời gian thực với PayOS**: Tích hợp Webhook Idempotency có chữ ký số HMAC-SHA256, tự động xác nhận đơn và sinh mã QR sau 1–2 giây.
4. **Hệ thống Check-in QR chống gian lận**: Mã QR Token ngẫu nhiên 24 ký tự hex, kiểm tra đúng cơ sở và đúng khoảng ngày lưu trú, vô hiệu hóa ngay sau khi quét lần đầu tiên.
