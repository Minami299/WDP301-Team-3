# Khu vực Manager và báo cáo khách sạn

## Điều hướng và quyền

| Vai trò | Khu vực | Nghiệp vụ |
| --- | --- | --- |
| ADMIN | `/admin`, `/admin/users` | Xem/tạo/sửa/khóa/mở khóa tài khoản |
| MANAGER | `/manager` | Tổng quan kinh doanh có bộ lọc thời gian, KPI, biểu đồ và liên kết báo cáo |
| MANAGER | `/manager/revenue`, `/manager/analytics` | Doanh thu theo cơ sở/khách sạn, loại phòng/dịch vụ, phân tích kinh doanh |
| MANAGER | `/manager/approvals` | Duyệt hồ sơ đối tác mới và hồ sơ legacy |
| MANAGER | `/manager/settlements`, `/manager/pricing`, `/manager/promotions` | Đối soát, thanh toán, chính sách, hoa hồng, khuyến mãi |
| MANAGER | `/manager/sales`, `/manager/qr` | Vận hành bán hàng, kiểm tra QR hiện có |
| HOTEL_OWNER / ACTIVITY_VENDOR | `/vendor/revenue` | Chỉ báo cáo các cơ sở của chính mình |

API kinh doanh dùng `/api/manager`. URL API cũ `/api/admin` vẫn kiểm tra cùng quyền; Admin không được gọi API kinh doanh hoặc xuất báo cáo ở cả hai namespace. URL giao diện cũ chuyển tới trang phù hợp với vai trò. Admin không kế thừa Manager hoặc quyền công cụ đối tác.

Quyền hiệu lực là giao của danh sách đã lưu với giới hạn của từng vai trò; danh sách cũ không thể khôi phục quyền bị thu hồi. Danh sách rỗng có nghĩa đã thu hồi mọi quyền; trường chưa có dùng mặc định. Giao diện cũng áp dụng cùng giới hạn và phiên đăng nhập tải lại quyền qua `/auth/me`.

Tạo tài khoản qua Admin chỉ tạo CUSTOMER. Vai trò hiện tại không được đổi qua form sửa tài khoản. Vai trò đối tác chỉ cấp qua xét duyệt hồ sơ; tài khoản nhân sự cấp theo quy trình vận hành ngoài giao diện này. Admin không được sửa email/mật khẩu Manager để đăng nhập thay, và không có API chỉnh quyền vai trò khả dụng. Duyệt hồ sơ đối tác là nghiệp vụ Manager; khóa/mở khóa đăng nhập là nghiệp vụ Admin.

## Migration

Tại thư mục gốc dự án:

```sh
npm run migrate:staff-roles --prefix backend
```

Script đọc cấu hình kết nối hiện có, chỉ cập nhật hai bản ghi role ADMIN và MANAGER, giữ nguyên tài khoản/dữ liệu kinh doanh. Chạy lặp lại an toàn; không cần chạy seed. Seed cũng đã dùng danh sách quyền mới. Sau cập nhật, khởi động lại ứng dụng và tải lại trang hoặc đăng nhập lại.

## Đối chiếu báo cáo

- Múi giờ `Asia/Ho_Chi_Minh`; từ đầu ngày bắt đầu đến trước đầu ngày sau ngày kết thúc.
- Theo ngày thanh toán gốc; chỉ SUCCESS/REFUNDED. Hoàn tiền dùng trạng thái hiện tại, chưa có sổ hoàn theo ngày hoàn hoặc quy tắc hoàn một phần.
- Tính toàn bộ lịch sử thanh toán để giới hạn hoa hồng theo giá trị booking, phân bổ theo dòng booking rồi mới lọc đối tác, cơ sở và loại cơ sở. Lọc trạng thái sau khi tính lịch sử để không tính lại hoa hồng.
- Sau hoàn = tiền thanh toán − tiền hoàn. Phần đối tác = sau hoàn − hoa hồng. Tiền thực chi xem riêng trong Đối soát.
- Số booking là số booking duy nhất có giao dịch đủ điều kiện trong kỳ, không phải tổng booking tạo trong kỳ. Một booking có thể xuất hiện trong nhiều nhóm khách sạn/dịch vụ; không cộng số booking các nhóm thành tổng booking duy nhất.
- Khách sạn không có giao dịch vẫn xuất hiện với 0. Dữ liệu thiếu/bất thường được gắn cảnh báo; số tiền không tính được giữ `null`, giao diện hiển thị “Chưa xác định”. Toàn hệ thống có nhóm cơ sở chưa xác định để đối chiếu.
- Bảng, KPI, biểu đồ và file PDF/Excel dùng cùng bộ lọc đã áp dụng. Excel có các sheet Tổng hợp, Chi tiết, Theo cơ sở, Theo dịch vụ và Theo thời gian. Tiền nguyên VND dùng BigInt và chuỗi số để tránh mất độ chính xác; file Excel từ chối giá trị vượt độ chính xác của Excel.
- Giới hạn kỳ 10 năm, biểu đồ 400 mốc, xuất tối đa 50.000 giao dịch. Chọn nhóm theo tháng cho kỳ dài. Loại phòng/dịch vụ dựa trên Service đã liên kết với dòng booking; chưa suy diễn công suất phòng hoặc loại phòng không có trong dữ liệu.

## Kiểm tra

```sh
node --test backend/test/manager-workspace.test.js
npm test --prefix backend
npm test --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend
```

Test Manager chạy MongoDB biệt lập với dữ liệu thử, không sửa database ứng dụng. Có kiểm tra migration lặp lại, ma trận quyền, booking nhiều khách sạn cùng chủ/khác chủ, nhiều thanh toán, hoàn tiền, cơ sở chưa có doanh thu, phạm vi chủ sở hữu và file xuất có bộ lọc.

Kết quả ngày 10/11/2026: migration đã cập nhật hai role trên database cấu hình sẵn; 18 test frontend đạt; toàn bộ backend có 163 test đạt, 3 test bỏ qua theo điều kiện môi trường và 1 lỗi có sẵn tại `booking.service.js:864` (`isNewUser` chưa định nghĩa trong `listRedeemablePromotions`). Các test tích hợp doanh thu, xuất PDF/Excel, duyệt đối tác và trình duyệt desktop/mobile đều đạt. Lỗi đổi voucher nêu trên cũng hiện diện trong phiên bản code trước thay đổi này.
