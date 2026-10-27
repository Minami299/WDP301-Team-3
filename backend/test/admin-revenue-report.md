# Calculate Revenue & Commission

Triển khai API `GET /api/admin/revenue` và báo cáo tại `/admin/revenue`, đồng thời đưa báo cáo vào trang Home của Admin có quyền. Dữ liệu được truy vấn từ MongoDB, không tạo dữ liệu mẫu trong ứng dụng và không gọi cổng thanh toán khi đọc báo cáo.

## Kết quả kiểm tra source hiện tại

- Backend Express/Mongoose; frontend React, Tailwind, API Axios tập trung.
- `payment.service.js` tích hợp PayOS qua API đối soát định kỳ và thao tác kiểm tra thanh toán. **Không có webhook** trong source hiện tại. Khóa unique `Payment.transaction_id` cùng MongoDB transaction ngăn lưu giao dịch ngân hàng lặp.
- `Payment` có `SUCCESS`, `PENDING`, `FAILED`, `REFUNDED`; không có số tiền hoàn, ngày hoàn, ledger hoàn tiền hoặc trạng thái hoàn từng phần. Luồng hủy/đổi booking không thực hiện hoàn tiền ngân hàng.
- Tỷ lệ hiện có: `BookingDetail.commission_rate`, dự phòng `Facility.commission_rate`, bao gồm tỷ lệ hợp lệ 0%. Không tìm thấy cấu hình hoa hồng trong `SystemConfig`. `BookingDetail.commission_amount` có trong schema/seed nhưng không được luồng booking/payment hiện tại duy trì; báo cáo Vendor hiện tại tính từ tỷ lệ, nên không dùng trường này làm bằng chứng đã thu phí.
- Báo cáo Vendor dùng phân bổ theo giá trị từng dòng, tính hoa hồng theo tỷ lệ và làm tròn VND. Báo cáo mới áp dụng cùng cách phân bổ/làm tròn; không cộng tiền khách trả với hoa hồng.
- Không có ledger xác nhận hoa hồng đã thu riêng. `Payout`/`PayoutDetail` phản ánh thanh toán cho đối tác, không chứng minh khoản thu hoa hồng riêng.

## Công thức và quy tắc

1. Chỉ lấy `Payment.status IN (SUCCESS, REFUNDED)`; không lấy pending, failed, cancelled hoặc trạng thái khác. Mỗi mã giao dịch chỉ tính một lần.
2. Tổng thanh toán = tổng `Payment.amount` của các giao dịch trên. Bao gồm giao dịch có trạng thái hiện tại `REFUNDED`, vì đó là khoản thanh toán đã thu trước khi hoàn.
3. Với schema hiện có, `REFUNDED` được diễn giải là hoàn toàn phần: tiền hoàn = số tiền giao dịch, các giao dịch `SUCCESS` có tiền hoàn đã ghi nhận bằng 0. Đây là báo cáo theo trạng thái, chưa phải xác minh chuyển tiền hoàn tại ngân hàng.
4. Giá trị sau hoàn = tổng thanh toán − tổng hoàn. Số này vẫn gồm phần thuộc đối tác, **không phải toàn bộ doanh thu thuộc sàn**.
5. Cơ sở tính hoa hồng mỗi booking = `min(tổng tiền SUCCESS giữ lại, Booking.final_amount)`. Không tính phí trên khoản chuyển vượt giá trị booking.
6. Trọng số dòng = `quantity × unit_price`. Giá phòng theo số đêm đã được luồng booking lưu trong `unit_price`, nên không nhân số đêm lần nữa. Với các dòng sắp theo `_id`, phần phân bổ = `round(base × gross_lũy_kế / tổng_gross) − round(base × gross_trước / tổng_gross)`; tổng các phần bằng đúng cơ sở tính phí, kể cả khi có giảm giá không chia hết.
7. Hoa hồng booking = tổng `round(phần_phân_bổ_dòng × tỷ_lệ_dòng / 100)`. Làm tròn ties-to-even như MongoDB `$round` đang dùng trong báo cáo Vendor. Tỷ lệ snapshot của chi tiết booking được ưu tiên; booking cũ thiếu snapshot dùng tỷ lệ hiện tại của cơ sở và có cảnh báo. Thiếu cả hai nguồn thì hoa hồng là `null`, không tự đặt tỷ lệ.
8. Hoa hồng mỗi giao dịch = phần tăng của hoa hồng booking khi thêm khoản thu được giữ lại của giao dịch đó. Đọc toàn bộ lịch sử thanh toán trước khi lọc thời gian để không tính lại phí của khoản thu kỳ trước. Giao dịch hoàn toàn phần không còn cơ sở doanh số để tính hoa hồng theo công thức này. Chưa áp dụng phí hủy/hoa hồng giữ lại vì chưa có chính sách trong source.
9. Booking đã hủy nhưng còn `Payment.SUCCESS`: vẫn phản ánh tiền đã thu, cảnh báo cần đối soát và để hoa hồng chưa xác định. Booking `REFUNDED` nhưng Payment vẫn `SUCCESS` không được tự ghi tiền hoàn; hoa hồng cũng chưa xác định. Không làm mất dấu giao dịch khi thiếu booking.
10. Số tiền đầu vào phải là số nguyên VND không âm trong miền an toàn của schema Number. Phép tính dùng `BigInt` và tỷ lệ dạng phân số; API trả tiền bằng chuỗi thập phân để giữ chính xác tổng vượt `Number.MAX_SAFE_INTEGER`. Dữ liệu tiền không hợp lệ hoặc dữ liệu hoàn từng phần chưa có quy tắc làm chỉ số liên quan thành `null`, kèm mã lỗi dữ liệu.
11. Khoảng ngày `YYYY-MM-DD` sử dụng `Asia/Ho_Chi_Minh` (UTC+07), mặc định từ đầu đến cuối tháng hiện tại. Điều kiện là từ 00:00 ngày đầu, trước 00:00 ngày sau ngày cuối. Lọc bằng **ngày thanh toán gốc**, áp dụng trạng thái hoàn hiện tại; không gán ngày hoàn không có trong database.
12. `revenue.view` là quyền riêng trong Platform Business Operations. Admin nhận quyền này kể cả khi danh sách quyền đã lưu trước khi tính năng được bổ sung. Vai trò khác chỉ truy cập khi được cấp quyền rõ ràng. Middleware hiện có kiểm tra lại tài khoản/quyền trong database trên mỗi request.

## File sửa và thêm

Backend:

- `src/configs/permissions.js`: đăng ký quyền và khả năng truy cập cho Admin hiện có.
- `src/routes/admin.routes.js`: gắn API thống kê với xác thực và kiểm tra quyền.
- `src/services/revenue.service.js` (mới): truy vấn MongoDB, lọc ngày, tổng chỉ số, phân trang, chất lượng dữ liệu.
- `src/services/revenueCalculation.js` (mới): phép tính tiền chính xác và quy tắc phân bổ hoa hồng.
- `src/services/booking.service.js`: lưu tỷ lệ hoa hồng hiện có vào chi tiết booking mới cho phòng, vé trực tiếp và vé theo lịch; dùng trường đã có, không đổi schema.
- `test/admin-revenue.test.js` (mới): kiểm thử đơn vị, API, MongoDB replica set, chống trùng khi đối soát và snapshot tỷ lệ.
- `test/admin-revenue-browser.cjs` (mới): kiểm thử giao diện trình duyệt với API/MongoDB thật trong môi trường kiểm thử riêng.
- `test/admin-revenue-report.md` (mới): tài liệu này.

Frontend:

- `src/services/api/adminApi.js`: gọi API qua Axios client hiện có.
- `src/hooks/useAdminRevenue.js` (mới): trạng thái tải/lỗi, tải lại và bỏ qua phản hồi cũ.
- `src/components/AdminRevenueReport.jsx` (mới): bốn chỉ số, bộ lọc ngày, bảng/phân trang và cảnh báo giới hạn dữ liệu.
- `src/pages/admin/AdminRevenuePage.jsx` (mới): trang báo cáo theo layout Admin hiện có.
- `src/pages/admin/AdminHomePage.jsx`: hiển thị báo cáo khi có quyền.
- `src/app/routes/AppRoutes.jsx`: route được bảo vệ bằng quyền.
- `src/utils/portalNav.js`: mục điều hướng Revenue & Commission.

## Kiểm thử và giới hạn xác nhận

Kết quả tại workspace: **14/14** kiểm thử tính năng mới (gồm MongoDB thật và Chrome), **32/32** kiểm thử hồi quy backend liên quan, **5/5** kiểm thử frontend; không có test bị skip trong các lệnh này. Build frontend đạt. Lint các file frontend thay đổi không có chẩn đoán; lint toàn dự án exit 0 nhưng còn cảnh báo ở các file cũ ngoài phạm vi. Vite vẫn cảnh báo bundle lớn hơn 500 kB.

Các fixture chỉ được tạo trong MongoDB replica set tạm độc lập, không đưa vào dữ liệu ứng dụng. PayOS chỉ được thay bằng client kiểm thử để kiểm tra tính idempotent của chính luồng đối soát hiện tại; không gọi cổng thanh toán thật.

Lệnh kiểm tra:

```powershell
cd backend
node --test test/admin-revenue.test.js
node --test test/customer-trip-management.test.js test/ticket-orders.test.js test/ticket-selection.test.js test/vendor-routes.test.js test/sales-statistics.test.js
cd ../frontend
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

Kiểm thử tích hợp cần `mongod` (mặc định đường dẫn MongoDB 8.3 trên Windows, có thể đặt `MONGOD_BINARY`), browser test cần Chrome và bản build frontend. Nếu không có các điều kiện này, Node test runner sẽ báo skip rõ ràng.

- Đối chiếu trực tiếp tổng thanh toán báo cáo với tổng các Payment đủ điều kiện trong MongoDB kiểm thử; kiểm tra tổng không đổi giữa các trang.
- Kiểm tra thành công, chưa thanh toán, thất bại, hủy booking, tiền đã thu của booking bị hủy, hoàn toàn phần, dữ liệu hoàn từng phần chưa được hỗ trợ, mismatch trạng thái, thiếu booking, thiếu tỷ lệ, 0%, nhiều tỷ lệ, giảm giá và số tiền lớn.
- Kiểm tra đối soát PayOS trùng/lặp/đồng thời chỉ lưu một Payment, ranh giới ngày/tháng Việt Nam và thu tiền nhiều kỳ không cộng phí trùng.
- Kiểm tra snapshot tỷ lệ cả ba đường tạo booking, thay đổi tỷ lệ cơ sở không đổi hoa hồng của booking đã lưu snapshot, JWT và cấp/thu hồi quyền/khóa tài khoản.
- Kiểm tra browser: Home Admin, route trực tiếp/reload, số liệu từ API thật, lọc ngày, phân trang, trạng thái tải/lỗi/rỗng và phản hồi cũ đến trễ.

Workspace không có `backend/.env` hoặc URI database được cung cấp cho phiên làm việc. Vì vậy **chưa đối chiếu với database đang vận hành**; không dùng kết quả fixture để khẳng định doanh thu thực tế.

Các điểm cần xác nhận trước khi gọi đây là báo cáo hoàn tiền/hoa hồng thực nhận hoàn chỉnh:

- `Payment.REFUNDED` có chắc luôn đồng nghĩa đã hoàn toàn phần tại ngân hàng hay không.
- Nguồn lưu từng khoản hoàn, mã hoàn unique và ngày hoàn; quy tắc hoàn từng phần và phân bổ hoàn theo dòng có tỷ lệ hoa hồng khác nhau.
- Chính sách trả/giữ hoa hồng khi hoàn tiền hoặc hủy; nguồn đối soát xác nhận phí đã thu.
- Có cần báo cáo dòng tiền theo **ngày hoàn** thay vì trạng thái hoàn hiện tại của nhóm thanh toán theo ngày gốc hay không.
- Khôi phục tỷ lệ lịch sử cho booking cũ chưa có snapshot. Hiện fallback tỷ lệ cơ sở có cảnh báo, không tự sửa dữ liệu lịch sử.

Không triển khai cổng thanh toán mới, endpoint hoàn tiền giả, hoặc tự đặt chính sách còn thiếu. Giao diện chủ động gọi chỉ số là **hoa hồng sàn theo thanh toán**, không khẳng định đã xác minh khoản hoa hồng thực nhận.
