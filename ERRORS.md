# Báo Cáo Xử Lý Ngoại Lệ & Kiểm Soát Lỗi (Error Handling & Resolution Report)

Tài liệu này ghi nhận toàn bộ các trường hợp ngoại lệ, lỗi nghiệp vụ đã được kiểm soát và tối ưu mã nguồn cho tính năng **Giới hạn 1 cơ sở / tài khoản đối tác** và **CRUD loại phòng**.

---

## 1. Trạng thái xử lý các lỗi nghiệp vụ & kiểm soát dữ liệu đầu vào

Tất cả các trường hợp ngoại lệ nghiệp vụ dưới đây đã được xử lý triệt để ở cả tầng Frontend (phòng ngừa ngay trên giao diện) và tầng Backend (bảo vệ toàn vẹn dữ liệu):

| STT | Tình huống phát sinh lỗi | Mã HTTP | Thông báo lỗi | Giải pháp và trạng thái xử lý |
| :-- | :--- | :---: | :--- | :--- |
| **1** | Tài khoản đối tác đã có cơ sở nhưng cố đăng ký thêm cơ sở thứ 2 | `400 Bad Request` | `Tài khoản đã đăng ký một cơ sở kinh doanh. Mỗi tài khoản chỉ có thể quản lý tối đa 1 cơ sở.` | **ĐÃ XỬ LÝ (FIXED)**:<br>- Backend: `auth.service.js` kiểm tra và chặn tạo thêm cơ sở qua `Facility.findOne({ vendor_id })`.<br>- Frontend: `PartnerRegistrationProfilePage.jsx` ẩn nút tạo thêm và thay bằng huy hiệu "Cơ sở đã kích hoạt (1/1)".<br>- `HotelOwnerRegistrationPage.jsx` hiển thị màn hình cảnh báo và chặn luồng đăng ký nếu đối tác đã có cơ sở. |
| **2** | Tạo hoặc sửa phòng để trống tên | `400 Bad Request` | `Tên loại phòng là bắt buộc` | **ĐÃ XỬ LÝ (FIXED)**:<br>- Frontend: Validate ngay khi bấm Lưu, hiển thị cảnh báo đỏ và ngăn submit.<br>- Backend: `vendor.service.js` kiểm tra `!name.trim()` trả về mã 400. |
| **3** | Nhập giá phòng âm hoặc không hợp lệ | `400 Bad Request` | `Giá cơ bản phòng không hợp lệ` | **ĐÃ XỬ LÝ (FIXED)**:<br>- Frontend: Input đặt `min="0"` và validate `isNaN / < 0` trước khi gửi.<br>- Backend: Kiểm tra `base_price < 0` trả về mã 400. |
| **4** | Sức chứa khách < 1 hoặc số phòng tắm < 0 | `400 Bad Request` | `Sức chứa phòng tối thiểu phải là 1 khách` / `Số lượng phòng tắm không hợp lệ` | **ĐÃ XỬ LÝ (FIXED)**:<br>- Frontend: Ràng buộc input và validate trong `handleSaveRoom`.<br>- Backend: Kiểm tra `capacity < 1` và `bathrooms < 0` trong `createRoom` & `updateRoom`. |
| **5** | Đối tác cố truy cập hoặc sửa phòng của đối tác khác | `403 Forbidden` / `404 Not Found` | `Bạn không có quyền chỉnh sửa loại phòng này` | **ĐÃ XỬ LÝ (FIXED)**:<br>- Backend: Xác thực quyền sở hữu `Facility.findOne({ _id: room.facility_id, vendor_id: user.id })` trước khi thực thi. |
| **6** | Xóa loại phòng duy nhất còn lại của cơ sở | `400 Bad Request` | `Mỗi cơ sở lưu trú phải duy trì ít nhất 1 loại phòng` | **ĐÃ XỬ LÝ (FIXED)**:<br>- Frontend: Nút "Xóa" tự động chuyển sang màu xám mờ (disabled) kèm tooltip thông báo nếu cơ sở chỉ còn 1 phòng duy nhất.<br>- Backend: Kiểm tra `Service.countDocuments({ facility_id, type: 'ROOM' }) <= 1` để chặn tuyệt đối. |
| **7** | Xóa loại phòng đã phát sinh giao dịch đặt phòng | `400 Bad Request` | `Không thể xóa loại phòng này vì đã phát sinh dữ liệu đặt phòng` | **ĐÃ XỬ LÝ (FIXED)**:<br>- Backend: Truy vấn kiểm tra `BookingDetail` liên kết qua `ServiceInventory`. Nếu đã có booking, từ chối xóa để đảm bảo toàn vẹn dữ liệu kế toán và đối soát. |

---

## 2. Các vấn đề kỹ thuật phát sinh và cách khắc phục

| STT | Vấn đề kỹ thuật | Cách khắc phục đã áp dụng | Trạng thái |
| :-- | :--- | :--- | :--- |
| **1** | Lỗi 403 trên Console khi tài khoản Customer truy cập trang đăng ký đối tác | Tối ưu hóa điều kiện kiểm tra trong `HotelOwnerRegistrationPage.jsx`: Chỉ gọi API `vendorApi.getProfile()` khi người dùng đã có vai trò đối tác (`HOTEL_OWNER`, `ACTIVITY_VENDOR`, `ADMIN`, `MANAGER`). | **ĐÃ FIX HOÀN TẤT** |
| **2** | Thiếu icon `IconEdit` và `IconTrash` cho các nút thao tác phòng | Đã bổ sung định nghĩa component SVG cho `IconEdit` và `IconTrash` trong file `frontend/src/components/Icons.jsx`. | **ĐÃ FIX HOÀN TẤT** |
| **3** | Lỗi gọi module `dotenv` khi chạy từ thư mục gốc | Hướng dẫn rõ ràng việc thực thi các lệnh backend phải luôn bắt đầu từ thư mục `backend/` nơi chứa `node_modules`. | **ĐÃ LƯU Ý HƯỚNG DẪN** |

---

## 3. Kết luận kiểm thử

- Toàn bộ 8/8 test cases logic backend đều đạt kết quả `PASS`.
- Frontend build thành công (`vite build` exit code 0).
- Hệ thống hoạt động ổn định, an toàn và thân thiện với người dùng.
