# Cấu trúc thư mục dự án và Mô tả thành phần

Tài liệu mô tả chi tiết kiến trúc phân tầng, cấu trúc thư mục và vai trò của từng thành phần trong hệ thống.

---

## 1. Sơ đồ cấu trúc thư mục tổng quan

```text
WDP301-Team-3/
├── frontend/
│   ├── src/
│   │   ├── views/          # Màn hình/trang chính của ứng dụng
│   │   ├── components/     # UI components tái sử dụng
│   │   ├── hooks/          # Custom hooks quản lý logic và state
│   │   └── services/       # Giao tiếp API qua HTTP requests (Axios/Fetch)
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/         # Định tuyến RESTful API endpoints
│   │   ├── middlewares/    # Xác thực, phân quyền, kiểm tra dữ liệu đầu vào
│   │   ├── controllers/    # Xử lý request/response, điều hướng sang services
│   │   ├── services/       # Nghiệp vụ logic chính (Business Logic)
│   │   ├── models/         # Định nghĩa Mongoose schema và truy vấn CSDL
│   │   └── configs/        # Cấu hình môi trường và kết nối CSDL
│   └── package.json
└── MongoDB                 # Hệ quản trị CSDL NoSQL lưu trữ dữ liệu
```

---

## 2. Bảng mô tả chi tiết chức năng các thành phần

| No | Package / Component | Description |
|:---|:--------------------|:------------|
| 01 | **Frontend** | Encapsulates the entire client-side application built with React, providing user interfaces for travelers and platform administrators. |
| 02 | **Frontend::views** | Contains main page-level views/screens (e.g., category list, category create/edit forms) composed of various components and custom hooks. |
| 03 | **Frontend::components** | Houses reusable presentation UI components (e.g., category table, modal dialogs, category filter tags) used across different pages. |
| 04 | **Frontend::hooks** | Manages component lifecycle, client-side states, and asynchronous API trigger flows via React custom hooks. |
| 05 | **Frontend::services** | Handles client-side networking by sending RESTful HTTP requests (via Axios/Fetch) to backend API endpoints. |
| 06 | **Backend** | Encapsulates the server-side application built with ExpressJS, handling HTTP requests, business logic execution, and database persistence. |
| 07 | **Backend::routes** | Defines RESTful API routing endpoints for category resources (GET, POST, PUT, DELETE) and dispatches incoming requests to middlewares and controllers. |
| 08 | **Backend::middlewares** | Intercepts HTTP requests to perform authentication (JWT token), role-based access control (Admin/Guest), and request payload validation. |
| 09 | **Backend::controllers** | Parses parameters and payloads from HTTP requests, delegates actions to services, and returns formatted JSON responses with appropriate HTTP status codes. |
| 10 | **Backend::services** | Implements core domain business rules, such as category slug generation, hierarchical tree structuring (parent-child), and relational integrity checks. |
| 11 | **Backend::models** | Defines Mongoose schemas and data representations for categories, executing CRUD operations and data access queries. |
| 12 | **Backend::configs** | Manages server-level configurations, including environment variables and database connection setup. |
| 13 | **MongoDB** | External NoSQL database management system responsible for storing category data records as persistent documents within collections. |
