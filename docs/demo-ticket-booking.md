# Kế hoạch Demo Luồng Đặt Vé Tham Quan & Soát Vé Cổng (`TICKET_BOOKING`)

Tài liệu này mô tả kịch bản demo chi tiết, đầy đủ từng màn hình và nghiệp vụ thực tế của phân hệ **Đặt vé tham quan/vui chơi (Attraction Ticket Booking)** và **Quy trình Nhân viên quét mã QR soát vé tại cổng** trên nền tảng du lịch **Travelio**.

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
| **Khách hàng (`CUSTOMER`)** | `minhhoang.travel@gmail.com` | Lê Minh Hoàng | Đặt vé tham quan, áp mã giảm giá vé, nhận vé điện tử E-ticket có mã QR. |
| **Đối tác vé (`ACTIVITY_VENDOR`)** | `sunworld.vendor@travelio.com` | Sun World Ba Na Hills Partner | Quản lý danh mục vé, theo dõi số vé bán ra và doanh thu đối soát. |
| **Nhân viên soát vé (`STAFF`)** | Tài khoản nhân viên hoặc link trực tiếp `/checkin/:code` | Nhân viên quầy vé | Quét mã QR của khách tại cổng để cho vào khu du lịch. |
| **Quản lý sàn (`MANAGER`)** | `manager@travelio.com` | Nguyễn Văn Quản Lý | Theo dõi đối soát doanh thu vé, quản lý hoa hồng sàn. |

### 1.3. Kho Mã Voucher dùng khi demo
- `TICKETFIX30`: Giảm ngay **30.000đ** cho các đơn đặt vé tham quan từ 150.000đ.
- `TRAVELIOFIX`: Giảm ngay **100.000đ** cho đơn từ 500.000đ (áp dụng toàn sàn).
- **Điểm thưởng thành viên**: Tỷ giá quy đổi **1 điểm = 1.000 VNĐ**.

---

## 2. Kịch bản Thao tác Chi tiết qua Từng Màn hình

### Sơ đồ luồng tổng quan:
```
[1. Danh mục Điểm tham quan] ➔ [2. Chi tiết Cơ sở & Chọn Hạng vé] ➔ [3. Trang Checkout & Áp Voucher Vé]
       ➔ [4. Cổng thanh toán PayOS VietQR] ➔ [5. Nhận Vé điện tử E-ticket có mã QR]
       ➔ [6. Nhân viên quét mã QR tại Cổng soát vé] ➔ [7. Dashboard Vận hành Vé của Đối tác]
```

---

### Màn hình 1: Khám phá Điểm tham quan & Chọn Hạng vé (`/` hoặc `/facilities/:id`)

1. Mở trình duyệt tại `http://localhost:5173`.
2. Đăng nhập bằng tài khoản khách hàng:
   - Email: `minhhoang.travel@gmail.com`
   - Mật khẩu: `Travelio@123`
3. Tại trang chủ hoặc danh mục Vé tham quan:
   - Chọn điểm du lịch: **Sun World Ba Na Hills** (hoặc **Phố cổ Hội An**).
   - Nhấn vào xem chi tiết cơ sở.
4. **Tại khu vực Bảng giá & Hạng vé tham quan**:
   - Chọn **Ngày tham quan (`visit_date`)**: Chọn ngày **hôm nay** hoặc **ngày mai**.
   - Chọn **Khung giờ (`time_slot`)**: Chọn `Cả ngày (ALL_DAY)` hoặc `Buổi sáng (08:00 - 12:00)`.
   - Xem các hạng vé:
     - *Vé Cáp treo & Tham quan - Người lớn* (Đơn giá: `850.000đ`/vé).
     - *Vé Cáp treo & Tham quan - Trẻ em* (Đơn giá: `700.000đ`/vé).
   - Chọn số lượng: `2 vé Người lớn`, `1 vé Trẻ em`.
5. Nhấn nút **Đặt vé ngay**.

---

### Màn hình 2: Trang Thanh toán Checkout Vé (`/checkout`)

1. **Kiểm tra thông tin đơn hàng vé**:
   - Hệ thống hiển thị tóm tắt: Tên điểm tham quan, ngày sử dụng vé, khung giờ và danh sách từng hạng vé kèm số lượng.
2. **Điền thông tin người nhận vé**:
   - Họ và tên người nhận: `Lê Minh Hoàng`.
   - Email nhận vé điện tử: `minhhoang.travel@gmail.com`.
   - Số điện thoại: `0944556677`.
3. **Áp dụng Mã Voucher giảm giá vé**:
   - Tại ô *Mã khuyến mãi*, nhập mã `TICKETFIX30` ➔ Nhấn **Áp dụng**.
   - Hệ thống áp dụng thành công và trừ ngay **30.000đ** vào tổng tiền vé.
4. **Kiểm tra Bảng tóm tắt chi phí**:
   - Tổng tiền vé gốc: $2 \times 850.000đ + 1 \times 700.000đ = 2.400.000đ$.
   - Chiết khấu voucher: `-30.000đ`.
   - Số tiền cần thanh toán: `2.370.000đ`.
   - Điều kiện vé hiển thị: *Vé có giá trị sử dụng trong ngày đã chọn, xuất trình mã QR tại cổng kiểm soát để vào cửa.*
5. Nhấn **Xác nhận & Thanh toán**.

---

### Màn hình 3: Thanh toán qua Cổng VietQR PayOS (`pay.payos.vn`)

1. Màn hình điều hướng sang cổng thanh toán **PayOS**.
2. Hiển thị mã **VietQR** động:
   - Số tiền: `2.370.000đ`.
   - Nội dung chuyển khoản: `TVL <8 số cuối mã đơn>`.
3. **Thao tác thanh toán**:
   - Thực hiện thanh toán (hoặc dùng nút giả lập thành công trên PayOS Sandbox).
   - PayOS gửi Webhook tức thời về backend Travelio (`POST /api/payments/payos/webhook`).
   - Backend xác thực chữ ký số HMAC-SHA256:
     - Chuyển trạng thái đơn hàng sang **`CONFIRMED`**.
     - Tự động sinh **Mã QR điện tử định danh duy nhất (`qr_code`)** cho từng vé trong đơn hàng.
     - Gửi email xác nhận kèm vé điện tử cho khách.

---

### Màn hình 4: Nhận Vé Điện Tử E-ticket có Mã QR (`/my-trips`)

1. Hệ thống tự động chuyển hướng khách về trang **Chuyến đi của tôi** (`/my-trips/{bookingId}`).
2. **Nội dung Vé điện tử (E-ticket) hiển thị**:
   - Trạng thái: **Đã xác nhận (CONFIRMED)** màu xanh lục.
   - Tên điểm đến: `Sun World Ba Na Hills`.
   - Ngày tham quan: Ngày khách đã chọn.
   - **Mã QR Vé điện tử**: Hiển thị rõ ràng giữa màn hình kèm dòng chữ *"Xuất trình mã này tại cổng soát vé để nhân viên quét mã vào cổng"*.
   - Danh sách chi tiết từng loại vé và số lượng.

---

### Màn hình 5: Nhân viên Soát vé Quét Mã QR tại Cổng (`/checkin/:code`)

1. Mô phỏng nhân viên quầy vé dùng máy quét chuyên dụng hoặc điện thoại mở camera quét mã QR của khách (hoặc truy cập đường link `/checkin/:code` in trên vé).
2. **Giao diện Màn hình Soát vé Cổng**:
   - Hệ thống tự động gọi API `checkinApi.preview(code)` để phân tích mã:
     - Kiểm tra đúng cơ sở du lịch: `Sun World Ba Na Hills`.
     - Kiểm tra ngày tham quan: Đúng ngày hôm nay.
     - Kiểm tra trạng thái vé: Chưa qua cổng (`check_in_status === 'PENDING'`).
   - Màn hình hiển thị xem trước thông tin: Tên khách (đã làm mờ bảo mật `L* M*** H****`), Hạng vé, Số lượng vé.
3. **Thao tác Cho khách vào cổng**:
   - Nhân viên bấm nút **Xác nhận Check-in**.
   - Màn hình chuyển sang màu xanh lục nổi bật: **`VALID - ĐÃ CHECK-IN THÀNH CÔNG` (Mã này đã bị vô hiệu và không thể dùng lại. Cho khách vào cổng)**.
   - Backend cập nhật trạng thái vé sang **`USED`** (`check_in_status: 'CHECKED_IN'`), lưu thời gian quét thực tế (`checked_in_at = now()`) và lưu log IP thiết bị vào `qr_scan_logs`.
4. **Thử nghiệm Chống gian lận (Anti-Fraud Test)**:
   - Khách khác (hoặc người chụp lại màn hình vé) thử đưa mã vừa quét cho người sau vào cổng:
   - Nhân viên quét lại mã lần 2:
   - Hệ thống lập tức hiện thông báo cảnh báo màu vàng: **`ALREADY_REDEEMED` (Vé này đã được quét sử dụng lúc [giờ:phút]. Từ chối cho vào cổng)**.

---

### Màn hình 6: Bảng điều khiển Quản lý Vé của Đối tác (`/vendor/orders` & `/vendor/dashboard`)

1. Mở một trình duyệt khác và đăng nhập bằng tài khoản Đối tác vé:
   - Email: `sunworld.vendor@travelio.com`
   - Mật khẩu: `Travelio@123`
2. **Quan sát dữ liệu cập nhật theo thời gian thực**:
   - Trang **Đơn hàng vé (`/vendor/orders`)**: Đơn vừa đặt chuyển trạng thái đã soát vé thành công.
   - Biểu đồ **Lượt khách vào cổng**: Số lượt vé hợp lệ tăng thêm trong ngày.
   - Nhật ký soát vé: Xem danh sách thời gian từng lượt khách qua cổng kèm kết quả `VALID`.

---

## 3. Kịch bản Hủy Vé & Đối soát Doanh thu

### 3.1. Hủy vé trước giờ tham quan (nếu khách đổi kế hoạch)
1. Tại trang chi tiết vé `/my-trips`: Khách nhấn **Yêu cầu hủy vé**.
2. Hệ thống kiểm tra điều kiện hủy:
   - Vé chưa qua cổng (`check_in_status === 'PENDING'`).
   - Yêu cầu gửi trước ngày tham quan tối thiểu 24 giờ ➔ Đủ điều kiện hoàn tiền 100%.
3. Sau khi Quản lý duyệt hủy:
   - Vé chuyển sang trạng thái `CANCELLED` (Mã QR bị vô hiệu hóa hoàn toàn, nếu mang đến cổng quét sẽ báo `INVALID`).
   - Trả lại số lượng vé vào kho bán.

### 3.2. Đối soát doanh thu Bán vé (`/vendor/settlements`)
1. Đối tác Sun World đăng nhập vào menu **Đối soát & Doanh thu**:
   - Sau ngày tham quan của vé, hệ thống tự động kết toán đơn sang `COMPLETED`:
     - **Tổng doanh thu bán vé (GMV)**.
     - **Hoa hồng sàn (Commission)**: Khấu trừ theo tỷ lệ thỏa thuận.
     - **Doanh thu thực nhận (Net Revenue)**: Đưa vào số dư khả dụng của đối tác.
   - Đối tác có thể nhấn **Yêu cầu rút tiền (Payout)** về tài khoản ngân hàng.

---

## 4. Các Điểm Kỹ thuật Nổi bật khi Thuyết trình Bảo vệ Đồ án

1. **Kiểm soát Tồn kho theo Suất/Ngày (`ServiceInventory`)**: Hỗ trợ giới hạn số lượng vé bán ra theo từng ngày và từng khung giờ cụ thể, tránh quá tải tại điểm tham quan.
2. **Cấp Mã QR E-ticket Định danh Tự động**: Mỗi vé điện tử là một mã ngẫu nhiên 24 ký tự hex kèm chữ ký, tự động sinh ngay khi nhận được tín hiệu Webhook thanh toán thành công từ PayOS.
3. **Cơ chế Soát vé Cổng Chống Gian Lận (Anti-Fraud)**: Kiểm tra đồng thời 3 lớp: Đúng cơ sở (`facility_id`), Đúng ngày (`usageWindow`), và Khóa nguyên tử (Atomic Update) chỉ cho phép quét thành công 1 lần duy nhất (`ALREADY_REDEEMED`).
4. **Đối soát Doanh thu Minh bạch**: Tự động tính toán hoa hồng sàn và doanh thu thực nhận ngay sau khi kết thúc chu kỳ sử dụng vé.
