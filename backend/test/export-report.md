# Export Report (PDF/Excel)

## Vị trí và cách sử dụng

- Admin: mở **Home** `/admin` hoặc **Revenue & Commission** `/admin/revenue`. Chọn khoảng ngày, có thể chọn một đối tác hoặc toàn hệ thống, bấm **Áp dụng**, chọn **PDF** hoặc **Excel (.xlsx)** rồi bấm **Xuất báo cáo**.
- Partner (`HOTEL_OWNER`, `ACTIVITY_VENDOR`): mở **Báo cáo tài chính · PDF/Excel** trong menu Partner tại `/vendor/revenue`. Có liên kết từ dashboard khách sạn và dashboard tham quan/thanh toán, mang theo khoảng ngày đang áp dụng. Chọn ngày, áp dụng rồi xuất.
- File chứa **toàn bộ** giao dịch khớp kỳ/phạm vi, không phụ thuộc trang bảng hiện tại. Sửa ngày trên form mà chưa áp dụng không thay đổi kỳ xuất. Kỳ rỗng vẫn xuất file hợp lệ với tổng bằng 0 và thông báo không có giao dịch.
- Mặc định tháng hiện tại theo `Asia/Ho_Chi_Minh`. Tên file: `financial-revenue-YYYY-MM-DD-YYYY-MM-DD-all|partnerId.pdf|xlsx`.
- Trang tài chính Partner sử dụng cùng nguồn và phép tính với báo cáo Admin. Dashboard bán hàng hiện có giữ nguyên cách ghi nhận doanh số/vé bán; liên kết tài chính được ghi nhãn riêng để không đồng nhất hai loại báo cáo có mục đích khác nhau.

## Nguồn dữ liệu và phân quyền

- Dùng trực tiếp `revenue.service.getRevenue` và `revenueCalculation.calculateBookingRevenue` của Calculate Revenue & Commission, bổ sung tùy chọn nội bộ lấy toàn bộ dòng. Bộ render không tự tính lại hoa hồng hoặc tổng tiền.
- Admin/Manager có `revenue.view`: `GET /api/admin/revenue` và `GET /api/admin/revenue/export?format=pdf|xlsx&from=...&to=...&vendor_id=...`.
- Partner có `vendor.dashboard`: `GET /api/vendor/revenue` và `GET /api/vendor/revenue/export?format=pdf|xlsx&from=...&to=...`. Backend dùng ID tài khoản đã xác thực, không lấy phạm vi từ frontend. `vendor_id` trỏ sang người khác bị trả 403; Partner không được truy cập endpoint tài chính toàn sàn kể cả khi được cấp nhầm `revenue.view`.
- Middleware hiện có đọc lại quyền/vai trò/trạng thái tài khoản mỗi request. Các request tải file cũng phải qua cùng kiểm tra.
- Đối tác được xác định từ `Facility.vendor_id` của từng dòng booking, giải tham chiếu được cả `service_id` và `inventory_id`. Không tin vào `booking.vendor_id` để ghi đè chủ sở hữu của các dòng booking hỗn hợp.
- Booking có nhiều đối tác: phân bổ tiền và hoa hồng trên **toàn bộ các dòng trước khi lọc**. Cách làm tròn lũy kế giữ đúng tổng VND. Partner chỉ nhận phần tiền, tỷ lệ và thông tin đối tác của mình; tổng các phần hợp lệ bằng báo cáo toàn sàn.
- Giao dịch/dòng booking thiếu thông tin sở hữu hiển thị cảnh báo `MISSING_PARTNER` cho Admin; không tự gán cho một Partner.

## File PDF và Excel

- PDF A4 ngang, font Roboto nhúng có đầy đủ glyph tiếng Việt; có tên báo cáo, kỳ, giờ xuất theo Việt Nam, phạm vi/đối tác, đơn vị VND, bốn chỉ số, ghi chú dữ liệu, bảng chi tiết, tiêu đề bảng lặp và số trang. Các cột có độ rộng tổng nằm trong vùng in; mã dài có điểm ngắt dòng.
- Excel có sheet **Tổng hợp** và **Chi tiết**, tiêu đề/độ rộng cột/hàng tổng, freeze dòng tiêu đề, AutoFilter, cấu hình in ngang và footer số trang.
- Tiền hợp lệ là ô số với định dạng VND không có phần lẻ; ngày là ô Date/serial Excel theo giờ Việt Nam; tỷ lệ đơn là ô số định dạng phần trăm. Giao dịch có nhiều tỷ lệ liệt kê đầy đủ trong ô; không tự suy ra một tỷ lệ chung.
- Tổng được ghi từ kết quả backend, không dùng `SUM` để biến dữ liệu chưa xác định thành 0. Giá trị không đủ dữ liệu vẫn ghi **Chưa xác định** và mã cảnh báo.
- Văn bản người dùng luôn được gán kiểu **string**, không tạo đối tượng `formula` hoặc `hyperlink`, có định dạng text; kiểm thử cả tiền tố `=`, `+`, `-`, `@`. Giữ nguyên nội dung chữ để đối chiếu.
- Hệ thống hiện lưu VND. Nếu phát hiện giao dịch có `currency` khác VND trong lịch sử tài chính liên quan, API từ chối 422 thay vì cộng lẫn hoặc tự quy đổi.
- Excel chỉ đảm bảo 15 chữ số thập phân: số tiền vượt giới hạn được từ chối 422, đề nghị chọn PDF hoặc kỳ ngắn hơn. PDF giữ nguyên số tiền BigInt. Không xuất Excel đã âm thầm làm tròn mất chính xác.
- Giới hạn một lần xuất 50.000 giao dịch để bảo vệ bộ nhớ. Nếu vượt, trả lỗi 413 và yêu cầu thu hẹp kỳ; **không trả file bị cắt bớt dữ liệu**.
- Phản hồi có Content-Type thực, Content-Disposition attachment, Content-Length và Cache-Control private/no-store. Frontend tải Blob, thu hồi object URL, hiển thị tiến trình/lỗi và giải mã đúng JSON lỗi nhận trong response Blob.

## Dependency mới

- Runtime: `pdfmake ^0.2.20`, `exceljs ^4.4.0`.
- Chỉ dùng kiểm thử: `pdfjs-dist ^6.4.299` để thực sự mở và đọc PDF; yêu cầu Node `>=22.13.0 || >=24` theo package. Workspace đã kiểm tra với Node 24.
- Override `exceljs > uuid` thành `^11.1.1` để dùng bản vá; ExcelJS chỉ sử dụng API `v4` tương thích. Không nâng phiên bản các dependency nghiệp vụ đã có.
- Cập nhật `backend/package-lock.json`. Font lấy từ bundle đã đóng gói của pdfmake; không phụ thuộc font hệ điều hành hoặc tải font qua mạng lúc xuất.

## File sửa/thêm trong lần triển khai export

Backend:

1. `backend/package.json`
2. `backend/package-lock.json`
3. `backend/src/controllers/revenue.controller.js` — mới, đọc báo cáo Partner và tải file.
4. `backend/src/routes/admin.routes.js`
5. `backend/src/routes/vendor.routes.js`
6. `backend/src/services/revenue.service.js` — phạm vi Partner, metadata, toàn bộ dòng, kiểm tra tiền tệ.
7. `backend/src/services/revenueCalculation.js` — phân bổ theo đối tác, giữ cùng công thức tổng.
8. `backend/src/services/reportExport.service.js` — mới, PDF/XLSX.
9. `backend/test/admin-revenue.test.js`
10. `backend/test/admin-revenue-browser.cjs`
11. `backend/test/report-export-cases.cjs` — mới, kiểm tra nội dung file, kiểu dữ liệu, phạm vi.
12. `backend/test/export-report.md` — mới, tài liệu này.

Frontend:

1. `frontend/src/app/routes/AppRoutes.jsx`
2. `frontend/src/components/AdminRevenueReport.jsx`
3. `frontend/src/components/ExportReportButton.jsx` — mới.
4. `frontend/src/hooks/useAdminRevenue.js`
5. `frontend/src/pages/vendor/AttractionDashboardPage.jsx`
6. `frontend/src/pages/vendor/AttractionLayout.jsx`
7. `frontend/src/pages/vendor/HotelOwnerDashboardPage.jsx`
8. `frontend/src/pages/vendor/VendorRevenuePage.jsx` — mới.
9. `frontend/src/services/api/axiosClient.js`
10. `frontend/src/services/api/reportExportApi.js` — mới.
11. `frontend/src/services/api/vendorApi.js`

Các thay đổi Calculate Revenue & Commission từ yêu cầu trước được giữ nguyên; danh sách trên chỉ liệt kê phần bổ sung/chỉnh sửa cho export.

## Kiểm thử đã chạy

- `node --test test/admin-revenue.test.js`: **22/22 đạt**, không skip. Bao gồm MongoDB replica set tạm độc lập, các case doanh thu trước đó và 8 nhóm kiểm thử xuất file mới.
- `node --test test/customer-trip-management.test.js test/ticket-orders.test.js test/ticket-selection.test.js test/vendor-routes.test.js test/sales-statistics.test.js`: **32/32 đạt**, không skip.
- `npm.cmd test` trong frontend: **5/5 đạt**.
- `npm.cmd run build`: đạt; còn cảnh báo bundle lớn đã có trong dự án.
- Lint các file export mới và các file thay đổi liên quan: không có chẩn đoán mới. `HotelOwnerDashboardPage.jsx` vẫn có cảnh báo cũ về unused biến, Date trong phần lọc cũ và setState trong effect; không sửa ngoài phạm vi.
- `git diff --check`: đạt.

Tổng **59 kiểm thử đạt**. Không dùng fixture để báo doanh thu vận hành. PayOS không được gọi khi xuất, không tạo thanh toán hay sửa dữ liệu ứng dụng.

Kiểm tra file:

- 66 giao dịch so với bảng chỉ hiển thị 20 dòng: XLSX vẫn đủ 66; tổng sheet tổng hợp và tổng các dòng chi tiết bằng dashboard.
- Đọc lại XLSX bằng ExcelJS: xác nhận kiểu số của tiền, kiểu Date của ngày, tỷ lệ số, AutoFilter và freeze header; dữ liệu công thức độc hại vẫn là chuỗi.
- Đọc lại PDF bằng PDF.js: xác nhận tiếng Việt, các mã giao dịch, nhiều trang, header bảng/số trang mỗi trang và tọa độ chữ không vượt lề.
- Kỳ rỗng, ranh giới tháng Việt Nam, format/ngày sai, dữ liệu hoàn chưa đầy đủ, tiền tệ khác và số tiền vượt độ chính xác Excel.
- Partner thay tham số đối tác bị 403; Partner không mở được API toàn sàn; thu hồi quyền và khóa tài khoản có hiệu lực; booking nhiều đối tác không rò phần tiền/thông tin bên khác.
- Chrome headless thực sự tải PDF/XLSX xuống thư mục kiểm thử cho Admin và Partner, mở lại XLSX và kiểm tra đủ dòng/tổng; kiểm tra lỗi Blob, ngày chưa áp dụng, route reload và giao diện Partner trên màn hình nhỏ.

Đối chiếu chỉ đọc với database cấu hình trong `backend/.env`, kỳ **01–31/10/2026**: lấy **23 giao dịch**, tạo được cả hai định dạng trong bộ nhớ; bốn chỉ số XLSX khớp kết quả dashboard. Có **14 giao dịch có cảnh báo** `CURRENT_RATE_FALLBACK` và/hoặc `MISSING_PARTNER`. Không sửa hoặc bổ sung dữ liệu lịch sử.

## Phần dữ liệu/chính sách chưa có

Giữ nguyên giới hạn đã nêu ở Calculate Revenue & Commission: chưa có ledger hoàn từng phần, ngày hoàn, chính sách giữ/hoàn hoa hồng khi hủy hoặc sổ xác nhận phí thực nhận. File xuất ghi rõ giới hạn, dùng trạng thái hoàn hiện tại của nhóm giao dịch theo ngày thanh toán gốc. Không tự tạo luồng thanh toán/hoàn tiền, không tự đặt tỷ lệ và không khẳng định dữ liệu thiếu đã được xác nhận.

Tham khảo API thư viện: [pdfmake tables](https://pdfmake.github.io/docs/0.1/document-definition-object/tables/), [ExcelJS](https://github.com/exceljs/exceljs).

## Sửa lỗi Admin export trả Route not found

### Nguyên nhân đã xác minh

Request thực tế `GET /api/admin/revenue/export?from=2026-10-01&to=2026-10-31&format=xlsx` có JWT Admin trả **404** ở cả `http://localhost:5000` và `http://localhost:5173`. Cùng phiên Admin gọi `/api/admin/revenue` trả **200**, 23 giao dịch, nhưng metadata vẫn chỉ có ba ghi chú của bản báo cáo cũ.

Kiểm tra tiến trình cổng 5000 cho thấy đang chạy `node src/server.js` từ `npm start`, khởi động **trước** thời điểm cập nhật `admin.routes.js`. Đây là tiến trình không watch; thay đổi source và HMR của frontend chưa nạp route export vào bộ nhớ backend.

Đã đối chiếu source: frontend dùng GET, `/api` mặc định, JWT từ Axios interceptor; không có `VITE_API_BASE_URL` ghi đè. Vite proxy `/api` đến `http://localhost:5000`. Backend mount `/api/admin` trước `notFound`, route `/revenue/export` có trong router và không bị route động chặn. Vì vậy không đổi URL, không nhân đôi endpoint và không bỏ middleware quyền.

Đã xác minh đúng PID giữ cổng và lệnh chạy trước khi dừng duy nhất tiến trình backend cũ, sau đó chạy lại bằng `node --watch src/server.js` (chế độ của `npm run dev`). Database và frontend đang chạy được giữ nguyên. README bổ sung cách tránh dùng tiến trình cũ khi phát triển.

### Bổ sung bảo vệ tải file

- Kiểm tra Content-Type và chữ ký PDF/ZIP của file XLSX trước khi tạo URL tải xuống; từ chối JSON, plain text, HTML, file rỗng hoặc sai loại, kể cả khi HTTP trả 200.
- Giữ thông báo lỗi JSON/văn bản nhận trong Blob; không tải response lỗi thành báo cáo.
- Dùng khóa `useRef` cùng trạng thái disabled để ngăn nhấn xuất lặp.
- Kiểm thử trình duyệt xác nhận hai lần click chỉ gửi một request Admin; response JSON/HTML HTTP 200 và text HTTP 502 không tạo file tải xuống.

### File thay đổi riêng cho lần sửa lỗi này

1. `README.md`
2. `frontend/package.json` — chạy toàn bộ test frontend hiện có và test download mới.
3. `frontend/src/utils/reportDownload.js` — mới, kiểm tra nội dung file và thông báo lỗi.
4. `frontend/src/services/api/reportExportApi.js`
5. `frontend/src/services/api/axiosClient.js`
6. `frontend/src/components/ExportReportButton.jsx`
7. `frontend/test/report-download.test.js` — mới.
8. `backend/test/admin-revenue.test.js`
9. `backend/test/admin-revenue-browser.cjs`
10. `backend/test/export-report.md` — mục ghi nhận này.

Không thêm dependency; không thay đổi service tính tiền, công thức, route nghiệp vụ, schema, cấu hình quyền hoặc luồng thanh toán.

### Kết quả kiểm tra sau sửa

- Chính request Excel 01–31/10/2026: **200** ở backend và qua proxy, đúng MIME XLSX, attachment filename có loại/kỳ báo cáo. Mở lại file: **23 giao dịch**, bốn tổng khớp dashboard, không chỉ 20 dòng của trang đầu.
- PDF cùng kỳ: **200**, đúng MIME/attachment, mở được **3 trang**; font tiếng Việt đã kiểm tra bằng PDF.js.
- Chrome headless tải thực tế cả XLSX/PDF từ chính trang Admin của Vite đang chạy, sau đó mở lại file XLSX và kiểm tra số dòng/tổng.
- Lọc một đối tác có giao dịch: cả hai định dạng **200**, **4 giao dịch**. Có kiểm tra thêm phạm vi đối tác rỗng và kỳ 01–31/01/2099 rỗng bằng file hợp lệ.
- Không có JWT: **401**. Customer đang hoạt động: **403**. Quyền backend được giữ nguyên.
- Frontend: **9/9 test đạt**, build đạt; lint các file frontend sửa không có chẩn đoán. Vite còn cảnh báo bundle lớn như trước.
- Backend: chạy lại bộ **22 test báo cáo/export**, gồm đọc lại PDF/XLSX, scoped Partner, kỳ rỗng và tải qua Chrome; không skip.
- Các kiểm tra database vận hành chỉ đọc; không ghi thêm fixture hoặc cập nhật lịch sử. Dữ liệu thiếu snapshot/đối tác vẫn được báo như trước, không bị sửa để làm đẹp báo cáo.
