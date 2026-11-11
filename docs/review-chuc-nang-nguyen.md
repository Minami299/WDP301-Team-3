# Tài liệu chuẩn bị review — 7 chức năng của Nguyên

Đối chiếu mã nguồn ngày 11/11/2026 theo danh sách trong ảnh. Đây là giải thích cách triển khai hiện tại; không phải xác nhận đã demo thành công trên database và các dịch vụ bên ngoài. Không suy ra tác giả từng dòng code từ danh sách phân công.

## 1. Mở đầu khi trình bày

> Phần em phụ trách gồm quản lý tài khoản khách hàng, xem lịch sử và chi tiết đặt chỗ, hiển thị QR sử dụng và biên nhận, cùng báo cáo hiệu suất kinh doanh toàn sàn. Với khách hàng, mục tiêu là quản lý tài khoản và theo dõi dịch vụ đã đặt. Với quản trị, mục tiêu là theo dõi lượng đặt chỗ, thanh toán, hoa hồng và tăng trưởng giữa các kỳ.

Ứng dụng Travelio bán hai nhóm dịch vụ: phòng khách sạn và vé/hoạt động tham quan. Frontend dùng React, React Router, Tailwind; backend dùng Node.js, Express; lưu dữ liệu MongoDB qua Mongoose. Các thư viện liên quan trực tiếp: bcrypt để băm mật khẩu, jsonwebtoken cho JWT, Nodemailer gửi OTP, qrcode tạo ảnh QR và Recharts vẽ biểu đồ.

Luồng kỹ thuật chung:

```text
Người dùng thao tác trên trang React
→ API client Axios gửi HTTP request
→ Express route kiểm tra xác thực/quyền
→ Controller nhận dữ liệu và gọi service
→ Service kiểm tra nghiệp vụ, đọc/ghi MongoDB
→ Trả JSON → React cập nhật giao diện
```

Backend là nơi quyết định quyền truy cập và tính hợp lệ. Chặn trang ở frontend giúp điều hướng; người dùng gọi API trực tiếp vẫn phải qua kiểm tra backend.

## 2. Đăng ký tài khoản Customer — Iter1

**Nghiệp vụ:** tạo tài khoản khách hàng và xác minh quyền sở hữu email trước khi cho đăng nhập.

**Luồng xử lý:**

1. Khách nhập họ tên, email, mật khẩu, xác nhận mật khẩu trên form đăng ký.
2. Frontend gọi `POST /api/auth/register`.
3. Backend kiểm tra tên không rỗng, tối đa 120 ký tự; email đúng định dạng; mật khẩu ít nhất 8 ký tự. Nếu có gửi xác nhận mật khẩu thì phải khớp.
4. Email được bỏ khoảng trắng đầu/cuối và chuyển chữ thường để tra cứu trùng. Email đã có thường trả 409; tài khoản Customer chưa xác minh được hướng dẫn xác minh tiếp.
5. Backend băm mật khẩu bằng bcrypt với cost 10, gán role `CUSTOMER`, tạo User có `status = ACTIVE`, `is_verified = false`.
6. Sinh OTP 6 chữ số, lưu bản băm SHA-256 cùng hạn dùng rồi gửi qua email. Phản hồi `verificationRequired`, chưa cấp JWT trong luồng đăng ký Customer này.
7. Frontend gọi `POST /api/auth/verify-email` với email và OTP. Mã đúng, còn hạn thì cập nhật `is_verified = true` và xóa dữ liệu mã đã dùng.
8. Khách đăng nhập để nhận JWT.

**Quy tắc OTP:** hạn 5 phút; tối đa 5 lần đoán sai cho mỗi mã; gửi lại cách ít nhất 60 giây, tối đa 5 lần trong một giờ theo tài khoản/mục đích. Cập nhật có điều kiện giúp hạn chế việc hai request đồng thời cùng sử dụng hoặc thay mã. Gửi mail lỗi thì mã tương ứng bị vô hiệu hóa; tài khoản có thể vẫn tồn tại ở trạng thái chưa xác minh để gửi lại.

**Cách nói:** “Em tách đăng ký và xác minh email. Có bản ghi tài khoản chưa có nghĩa đã được đăng nhập; Customer còn phải vượt qua điều kiện xác minh email.”

**Code:** `frontend/src/pages/auth/AuthPage.jsx`, `backend/src/services/auth.service.js` (`register`, `verifyEmail`), `backend/src/services/authOtp.service.js`, `backend/src/utils/password.js`.

## 3. Xác thực và đăng nhập — Iter1

**Nghiệp vụ:** xác định người dùng là ai và đưa về khu vực phù hợp với vai trò.

1. Gọi `POST /api/auth/login` bằng email và mật khẩu.
2. Backend tìm User theo email đã chuẩn hóa và nạp role.
3. So sánh mật khẩu qua hàm `verifyPassword`; sai email hoặc mật khẩu trả chung lỗi 401.
4. Kiểm tra trạng thái tài khoản: khóa, ngừng hoạt động, chờ duyệt, bị từ chối hoặc Customer chưa xác minh đều có thể bị chặn.
5. Thành công thì ký JWT chứa `id`, `email`, `role`. Hạn mặc định là `1d`, có thể cấu hình bằng `JWT_EXPIRES_IN`.
6. Frontend lưu token và thông tin user vào localStorage qua `tokenStorage`, đồng thời giữ trong AuthProvider. Điều hướng Customer về `/`, đối tác về `/vendor`, Admin/Manager về `/admin` theo logic điều hướng.
7. Axios tự thêm `Authorization: Bearer <token>` khi gọi API.
8. Backend kiểm tra chữ ký và hạn JWT, rồi đọc lại trạng thái và role trong database. Vì vậy tài khoản vừa bị khóa hoặc đổi role không được tiếp tục dùng quyền cũ chỉ dựa vào token đã phát.

AuthProvider gọi `/auth/me` khi khôi phục phiên để cập nhật thông tin/quyền. Logout hiện xóa token và user ở trình duyệt; chưa có cơ chế thu hồi JWT phía server trong luồng này.

**Phân biệt cần nhớ:** xác thực trả lời “người dùng là ai”; phân quyền trả lời “người dùng được làm gì”. JWT là token có chữ ký, không nên mô tả là nơi mã hóa mật khẩu.

**Chi tiết nếu thầy hỏi sâu:** tiện ích mật khẩu có tương thích dữ liệu cũ PBKDF2 và chuỗi thuần; khi đăng nhập thành công với hash chưa phải bcrypt, service chuyển sang bcrypt. Vì vậy nên nói “tài khoản tạo mới dùng bcrypt”, không khẳng định mọi dữ liệu lịch sử ban đầu đều đã là bcrypt.

**Code:** `backend/src/services/auth.service.js` (`login`), `backend/src/middlewares/authMiddleware.js`, `backend/src/utils/accountStatus.js`, `frontend/src/app/providers/AuthProvider.jsx`, `frontend/src/services/api/axiosClient.js`, `frontend/src/services/storage/tokenStorage.js`.

## 4. Cập nhật hồ sơ cá nhân — Iter1

**Nghiệp vụ đã triển khai:** Customer xem và cập nhật hồ sơ cá nhân tại `/profile`.

| Thao tác | API | Xử lý chính |
| --- | --- | --- |
| Xem hồ sơ | `GET /api/users/me` | Lấy thông tin tài khoản và hồ sơ của người đang đăng nhập |
| Sửa hồ sơ | `PUT /api/users/me` | Cập nhật họ tên, số điện thoại, địa chỉ |
| Thay/xóa avatar | `POST` / `DELETE /api/users/me/avatar` | Upload ảnh qua Cloudinary, lưu URL hoặc xóa liên kết ảnh |
| Xin đổi email | `POST /api/users/me/email-change` | Gửi OTP đến email mới |
| Xác minh email mới | `POST /api/users/me/email-change/verify` | Chỉ thay email sau khi OTP hợp lệ |

Tên và số điện thoại nằm ở `User`; địa chỉ và avatar nằm ở `UserProfile`, nối qua `user_id`. Service chỉ nhận những trường cho phép; chặn các trường như role, permissions, status và avatar_url trong API cập nhật hồ sơ thường để tránh tự nâng quyền hoặc sửa URL ảnh tùy ý.

Validation backend: tên từ 1 đến 120 ký tự sau trim; số điện thoại là chuỗi tối đa 30 ký tự hoặc null; địa chỉ là chuỗi tối đa 500 ký tự. Đây là kiểm tra độ dài/kiểu dữ liệu, không nên nói backend đã xác minh số điện thoại có thật.

**Phạm vi đã thống nhất:** không triển khai quản lý phương thức thanh toán đã lưu; mục này đã được bỏ khỏi trang hồ sơ.

**Cách nói:** “Em đã triển khai cập nhật hồ sơ cá nhân, avatar và đổi email bằng OTP.”

**Code:** `frontend/src/pages/account/ProfilePage.jsx`, `frontend/src/services/api/accountApi.js`, `backend/src/routes/user.routes.js`, `backend/src/services/user.service.js` (`updateMyProfile`, `requestEmailChange`, `verifyEmailChange`).

## 5. Thay đổi mật khẩu — Iter1

**Nghiệp vụ:** người đã đăng nhập thay mật khẩu sau khi chứng minh biết mật khẩu hiện tại.

1. Form nhận mật khẩu hiện tại và mật khẩu mới; phần xác nhận trên UI giúp tránh nhập nhầm.
2. Gọi `PUT /api/users/me/change-password` kèm JWT.
3. Controller dùng ID người đăng nhập; service yêu cầu có cả mật khẩu cũ và mới.
4. Mật khẩu mới tối thiểu 8 ký tự và khác mật khẩu cũ.
5. Đọc User, kiểm tra mật khẩu hiện tại bằng `verifyPassword`.
6. Băm mật khẩu mới bằng bcrypt rồi lưu vào `password_hash`.

**Ngoại lệ demo:** mật khẩu cũ sai; mật khẩu mới quá ngắn; mới trùng cũ. Đều không được lưu thay đổi thành công.

**Phân biệt:** đổi mật khẩu cần phiên đăng nhập và mật khẩu cũ. Quên mật khẩu dùng OTP email, sau đó nhận reset token có hạn 10 phút, sử dụng một lần để đặt mật khẩu mới.

**Giới hạn:** đổi mật khẩu hiện chưa tự thu hồi toàn bộ JWT đã phát. Không nên giới thiệu là đăng xuất mọi thiết bị.

**Code:** `backend/src/services/user.service.js` (`changePassword`), `backend/src/routes/user.routes.js`, `frontend/src/services/api/accountApi.js`.

## 6. Danh sách đặt chỗ theo trạng thái — Iter2

**Nghiệp vụ:** Customer theo dõi đơn của chính mình tại `/my-trips`.

Frontend gọi `GET /api/bookings`. Backend yêu cầu tài khoản ACTIVE, đúng role CUSTOMER, truy vấn theo `customer_id` lấy từ phiên đăng nhập, sắp xếp mới nhất trước, giới hạn **100 booking gần nhất**. Sau đó bổ sung chi tiết dịch vụ và thanh toán để frontend hiển thị.

Giao diện có 3 tab chính, nhưng dữ liệu được chia thành 5 nhóm bằng `groupTrips`:

| Nhóm | Điều kiện thực tế |
| --- | --- |
| Sắp tới | `CONFIRMED` và có ít nhất một dòng dịch vụ có ngày bắt đầu/ngày sử dụng từ hôm nay trở đi |
| Chờ thanh toán | `PENDING`, hiển thị riêng bên trong tab Sắp tới; số lượng trên tab tính cả nhóm này |
| Đã hoàn thành | Trạng thái chính xác là `COMPLETED` |
| Đã hủy | Trạng thái chính xác là `CANCELLED` |
| Các đơn khác | Những đơn còn lại, ví dụ `REFUNDED`, đơn CONFIRMED đã qua ngày hoặc thiếu ngày; nằm bên dưới tab Sắp tới |

Ngày hôm nay được xác định theo `Asia/Ho_Chi_Minh`. Phòng dùng ngày nhận phòng; vé dùng ngày tham quan, có fallback ngày từ inventory cũ.

**Điểm dễ bị hỏi:** qua ngày không tự có nghĩa là hoàn thành trong hàm phân nhóm. Hotel đang ở nhưng đã qua ngày check-in có thể rơi vào Các đơn khác nếu chưa COMPLETED. REFUNDED cũng không bị gộp vào Đã hủy. Đây là đúng quy tắc code hiện tại, cần nắm để giải thích khi demo.

Tab đang chọn được giữ bằng query `?tab=...`; trang có loading, lỗi/thử lại, tải lại và thông báo khi không có dữ liệu. Phân nhóm diễn ra ở frontend sau khi lấy danh sách; API này chưa phân trang đầy đủ toàn bộ lịch sử.

**Code:** `frontend/src/pages/customer/MyTripsPage.jsx`, `frontend/src/utils/tripManagement.js`, `backend/src/services/booking.service.js` (`listBookings`, `bookingForCustomer`). Không dùng dữ liệu mẫu trong `frontend/src/views/MyTripsScreen.jsx` để giải thích luồng này; route thực tế trỏ tới MyTripsPage.

## 7. Chi tiết đơn, mã QR và biên nhận — Iter2

**Nghiệp vụ:** từ lịch sử đặt chỗ, khách mở `/my-trips/:id` để xem dịch vụ, tiền và QR sử dụng.

1. Frontend đọc `id` trên URL và gọi `GET /api/bookings/:id`.
2. Backend kiểm tra ID hợp lệ, tìm đồng thời theo `_id` và `customer_id` của người đăng nhập. Sửa URL sang đơn của người khác không lấy được dữ liệu; trả 404 khi không tìm thấy đơn thuộc người đó.
3. Đọc `BookingDetail`, liên kết dịch vụ/cơ sở và các bản ghi `Payment`; hỗ trợ cả liên kết trực tiếp lẫn qua inventory cũ.
4. Trả thông tin người liên hệ, cơ sở, loại phòng/hạng vé, ngày sử dụng, số lượng, giá, giảm giá, tổng cuối cùng, trạng thái và giao dịch thanh toán.
5. React hiển thị các phần chi tiết, PayOS nếu cần, QR và biên nhận bằng các component tương ứng.

### QR thanh toán và QR sử dụng

| Loại | Mục đích | Nguồn |
| --- | --- | --- |
| QR thanh toán | Chuyển tiền cho booking | Dữ liệu liên kết thanh toán PayOS |
| QR sử dụng dịch vụ | Xuất trình khi nhận phòng/vào cửa | Chuỗi `TVL-QR-...` gắn với BookingDetail |

Trong luồng xác nhận thanh toán, backend ghi nhận thanh toán và chuyển booking PENDING sang CONFIRMED, cấp QR cho các dòng chưa có mã bằng dữ liệu ngẫu nhiên `crypto.randomBytes(12)`.

QR sử dụng chỉ được trả ra khi booking CONFIRMED và dòng dịch vụ chưa được đánh dấu đã dùng/no-show: `check_in_status` thiếu hoặc là PENDING. Backend loại trường `qr_code` khỏi những dòng không đủ điều kiện; frontend kiểm tra lại bằng `canShowUsageQr`, rồi dùng `qrcode.toDataURL` để tạo ảnh.

**Ý nghĩa:** frontend chỉ biến chuỗi đã được backend cấp thành ảnh. Nó không tự quyết định đã thanh toán, không tự tạo quyền sử dụng dịch vụ. Hiển thị QR thành công cũng chưa chứng minh terminal soát vé hỗ trợ đầy đủ mọi loại booking.

### Biên nhận

`BookingReceipt` dùng dữ liệu đơn đã lưu để hiển thị người liên hệ, các dòng dịch vụ, giảm giá, tổng tiền và danh sách giao dịch. Các trường snapshot như tên/giá/điều kiện ưu tiên dữ liệu lúc đặt; dữ liệu thiếu có thể fallback từ liên kết hiện tại.

Nút “In / Lưu PDF biên nhận” gọi `window.print()`. React portal đưa bản dùng để in vào document body, người dùng chọn lưu PDF trong hộp thoại trình duyệt. Đây là **biên nhận đặt chỗ**, chưa phải hóa đơn thuế điện tử và không phải backend phát hành PDF qua dịch vụ hóa đơn.

**Code:** `frontend/src/pages/customer/BookingDetailPage.jsx`, `frontend/src/components/BookingUsageQr.jsx`, `frontend/src/components/BookingReceipt.jsx`, `backend/src/services/booking.service.js` (`bookingForCustomer`), `backend/src/services/payment.service.js`.

## 8. Tổng quan hiệu suất kinh doanh và tăng trưởng toàn sàn — Iter3

**Nghiệp vụ:** hỗ trợ quản trị đánh giá hoạt động toàn hệ thống và so sánh với kỳ trước. Trang `/admin/analytics`, có tích hợp tổng quan trên trang quản trị.

Gọi `GET /api/admin/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&interval=daily`. Backend kiểm tra JWT, role ADMIN/MANAGER của khu quản trị và quyền `analytics.view`. Customer và đối tác không được xem dữ liệu toàn sàn.

### Luồng xử lý

1. Người quản trị chọn khoảng ngày và nhóm ngày/tháng/năm; có mốc nhanh 7 ngày, 30 ngày, 6 tháng, 12 tháng.
2. Hook/API gửi bộ lọc đang áp dụng. Bộ lọc lưu trên URL nên tải lại trang vẫn giữ được.
3. Service kiểm tra ngày hợp lệ, từ không lớn hơn đến, khoảng tối đa 3.660 ngày, biểu đồ tối đa 400 mốc.
4. Quy đổi ranh giới ngày theo giờ Việt Nam: từ đầu ngày bắt đầu đến trước đầu ngày kế tiếp của ngày kết thúc.
5. Tạo kỳ trước liền kề có cùng số ngày.
6. Tổng hợp Booking, Payment, chi tiết đơn và chủ sở hữu đối tác; tái sử dụng cách tính/phân bổ của module doanh thu.
7. Một response chứa summary, trends, distribution, top_partners, quality và mô tả định nghĩa. Frontend dùng Recharts vẽ toàn bộ biểu đồ theo cùng bộ lọc.

### Bảy KPI cần thuộc

| KPI | Định nghĩa trong code |
| --- | --- |
| Tổng thanh toán thành công | Tổng tiền giao dịch thành công, kể cả giao dịch nay mang trạng thái REFUNDED; theo ngày thanh toán gốc, mỗi transaction_id tính một lần |
| Giá trị thanh toán thuần | Tổng trên trừ phần hoàn toàn bộ được ghi nhận bằng `Payment.status = REFUNDED` |
| Hoa hồng nền tảng | Phân bổ tiền giữ lại cho các dòng đơn, áp dụng tỷ lệ hoa hồng; cơ sở tính cộng dồn bị chặn ở final_amount của booking |
| Tổng đơn | Số Booking tạo trong kỳ, không nhân theo số lần thanh toán |
| Đơn hoàn thành | Trong nhóm đơn tạo trong kỳ, bao nhiêu đơn hiện là COMPLETED |
| Tỷ lệ hủy | CANCELLED / tổng số đơn tạo trong kỳ × 100%; không có đơn thì chưa xác định |
| Đối tác hoạt động | Số chủ sở hữu khác nhau hiện ACTIVE và đủ điều kiện duyệt, có đơn CONFIRMED/COMPLETED tạo trong kỳ |

**Không gọi toàn bộ tiền khách trả là doanh thu phí của sàn.** Ví dụ booking 1.000.000đ, khách thanh toán đủ, hoa hồng 10%, không giảm/hoàn thì tổng thanh toán là 1.000.000đ, hoa hồng tính toán là 100.000đ. Tiền thuần sau hoàn cũng không đồng nghĩa lợi nhuận vì chưa trừ mọi chi phí vận hành.

Hoa hồng ưu tiên tỷ lệ lưu ở BookingDetail lúc đặt; thiếu thì có thể dùng tỷ lệ hiện tại của Facility và kèm cảnh báo. Nếu khách thanh toán nhiều lần thì chỉ cộng phần hoa hồng tăng thêm theo tổng thanh toán tích lũy, tránh cộng lại hoa hồng toàn đơn ở từng giao dịch. Có dùng BigInt và trả tiền dưới dạng chuỗi để giữ số nguyên chính xác.

### Tăng trưởng và biểu đồ

`Tăng trưởng (%) = (kỳ này − kỳ trước) / kỳ trước × 100`.

Ví dụ kỳ trước 100 đơn, kỳ này 120 đơn thì tăng 20%. Kỳ trước 0 và kỳ này dương thì hiển thị “Mới”; cả hai bằng 0 là 0%; thiếu dữ liệu cần thiết thì chưa xác định. Tỷ lệ hủy giảm được thể hiện theo hướng tích cực.

Năm biểu đồ/nhóm trình bày: đường tổng thanh toán, đường hoa hồng, cột số đơn, donut trạng thái đơn, thanh ngang và bảng top 5 đối tác. Các mốc thời gian không phát sinh vẫn có giá trị 0 để trục thời gian liên tục.

Top đối tác xếp theo giá trị final_amount phân bổ từ các booking CONFIRMED/COMPLETED tạo trong kỳ, không theo số lần thanh toán và không phải số tiền thực tế đã quyết toán cho đối tác.

**Các giới hạn phải hiểu:** số đơn hoàn thành dựa vào ngày tạo đơn và trạng thái hiện tại, không phải số đơn hoàn thành đúng trong ngày được lọc. Hoàn tiền chỉ đổi trạng thái booking chưa đủ làm giảm KPI tiền thuần; phải có Payment REFUNDED. Hiện chưa có sổ hoàn từng phần/ngày hoàn riêng. Hoa hồng là số tính toán, chưa phải bằng chứng đã đối soát thu phí. Trạng thái/quyền sở hữu hiện tại không phục dựng đầy đủ lịch sử.

**Code:** `backend/src/services/adminAnalytics.service.js`, `backend/src/services/revenueCalculation.js`, `backend/src/routes/admin.routes.js`, `frontend/src/components/AdminBusinessOverview.jsx`, `frontend/src/hooks/useAdminAnalytics.js`, `frontend/src/utils/adminAnalytics.js`. Xem thêm [tài liệu công thức báo cáo](admin-business-analytics.md).

## 9. Kịch bản demo khoảng 8–10 phút

1. **Đăng ký/xác minh:** dùng email nhận OTP được, thử mật khẩu ngắn hoặc email trùng, đăng ký hợp lệ và xác minh. Nhấn mạnh chưa xác minh không đăng nhập được.
2. **Đăng nhập:** thử sai mật khẩu, sau đó đăng nhập đúng; giải thích JWT và kiểm tra trạng thái tài khoản.
3. **Hồ sơ:** đổi tên/địa chỉ, tải lại trang để chứng minh đã lưu.
4. **Đổi mật khẩu:** thử sai mật khẩu hiện tại, sau đó đổi hợp lệ; đăng xuất và đăng nhập bằng mật khẩu mới.
5. **My Trips:** chuẩn bị sẵn đơn PENDING, CONFIRMED có ngày tương lai, COMPLETED, CANCELLED; chuyển tab và giải thích tiêu chí.
6. **Chi tiết:** mở đơn, xem QR sử dụng và biên nhận; so sánh với đơn PENDING chưa có QR dùng dịch vụ; mở hộp thoại in/lưu PDF.
7. **Phân quyền dữ liệu:** dùng hai tài khoản Customer để cho thấy tài khoản B không đọc được URL đơn của A.
8. **Báo cáo:** đăng nhập quản trị có quyền, đổi khoảng ngày, đọc 2–3 KPI và giải thích tăng trưởng bằng ví dụ cụ thể.

Trước buổi review cần kiểm tra backend/frontend, MongoDB, SMTP nếu demo OTP, Cloudinary nếu demo avatar và PayOS nếu demo thanh toán mới. Chuẩn bị dữ liệu đúng trạng thái/ngày; có dữ liệu kỳ trước để biểu đồ tăng trưởng có ý nghĩa. Trong lần rà soát này chưa xác nhận cấu hình hay thực hiện các giao dịch đó.

## 10. Câu hỏi thầy có thể hỏi

| Câu hỏi | Trả lời ngắn |
| --- | --- |
| Vì sao kiểm tra ở cả frontend và backend? | Frontend giúp người dùng nhập đúng; backend vẫn phải kiểm tra vì có thể gọi API trực tiếp. |
| Vì sao không lưu mật khẩu gốc? | Lưu hash bcrypt để không cần giữ mật khẩu gốc; khi đăng nhập dùng phép so sánh hash. |
| Đã ACTIVE sao vẫn chưa đăng nhập được? | ACTIVE là trạng thái tài khoản, Customer còn phải thỏa điều kiện xác minh email. |
| Đổi ID trên URL có xem được đơn người khác? | Backend truy vấn đồng thời ID đơn và customer_id từ token, không lấy customer_id tùy ý từ giao diện. |
| Tại sao đơn hôm qua chưa nằm ở Đã hoàn thành? | Nhóm này yêu cầu COMPLETED; ngày sử dụng đã qua không tự thay trạng thái trong hàm phân loại. |
| Ai sinh QR? | Backend cấp chuỗi mã sau xác nhận thanh toán; frontend chỉ dựng ảnh QR từ chuỗi đó. |
| QR đã dùng còn trả ra không? | Backend bỏ mã khỏi response khi dòng đã dùng hoặc booking không CONFIRMED, frontend cũng kiểm tra điều kiện. |
| PDF được tạo như thế nào? | Gọi hộp thoại in của trình duyệt, người dùng chọn lưu PDF; nội dung là biên nhận đặt chỗ. |
| Số booking có tăng theo số lần trả tiền? | Không; đếm Booking riêng, thanh toán và hoa hồng có xử lý giao dịch/phân bổ riêng. |
| Kỳ trước bằng 0 tính tăng trưởng ra sao? | Có phát sinh mới thì hiển thị Mới, tránh chia 0; cả hai bằng 0 thì 0%. |
| Tỷ lệ hủy gồm hoàn tiền không? | Chỉ CANCELLED; REFUNDED là một trạng thái riêng. |
| Đăng xuất có vô hiệu JWT đã sao chép không? | Luồng hiện tại xóa phiên phía trình duyệt; chưa có danh sách thu hồi token. |

## 11. Phạm vi xác minh của tài liệu

Đã đọc các route, trang React, API client, middleware và service liên quan trực tiếp đến bảy dòng phân công; đối chiếu thêm tài liệu analytics có sẵn. Không sửa code nghiệp vụ. Không chạy lại toàn bộ test, không khởi động demo và không xác nhận SMTP/Cloudinary/PayOS hoạt động trong phiên rà soát này. Các kết quả kiểm thử ghi trong tài liệu cũ thuộc lần chạy trước, không được coi là kết quả mới của lần rà soát này.
