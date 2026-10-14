const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// ========================================
// 1. Load environment variables from .env
// ========================================
const envPath = path.resolve(__dirname, "../.env");
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.error("Failed to load .env file:", dotenvResult.error.message);
} else {
  console.log(".env loaded successfully");
}

// ========================================
// 2. Check SMTP configuration (hide password)
// ========================================
// console.log("SMTP diagnostic:", {
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   user: process.env.SMTP_USER,
//   passwordLoaded: Boolean(process.env.SMTP_PASSWORD),
//   passwordLength: process.env.SMTP_PASSWORD
//     ? process.env.SMTP_PASSWORD.replace(/\s/g, "").length
//     : 0,
// });

const connectDB = require("./configs/db");
const env = require("./configs/env");
const testRoutes = require("./routes/testRoutes");
const authTestRoutes = require("./routes/authTestRoutes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const bookingRoutes = require("./routes/booking.routes");
const vendorRoutes = require("./routes/vendor.routes");
const uploadRoutes = require("./routes/upload.routes");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

// ========================================
// 4. Initialize Express application
// ========================================
const app = express();

app.use(cors());
app.use(express.json());

// ========================================
// 5. Health check route
// ========================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Travelio Backend is running",
  });
});

// ========================================
// 6. Register routes
// ========================================
app.use("/api/test", testRoutes);
app.use("/api/test/auth", authTestRoutes);

const { Amenity, SystemConfig } = require("./models");

const DEFAULT_BED_TYPES = [
  "Single Bed",
  "Semi Double-Bed",
  "Double Bed",
  "Queen Bed",
  "King Bed",
  "Super King Bed",
  "Bunk Bed",
  "Sofa Bed",
  "Japanese Futon",
  "Male Capsule",
  "Female Capsule",
];

// API danh mục loại giường động từ DB
app.get("/api/categories/bed-types", async (req, res, next) => {
  try {
    const config = await SystemConfig.findOne({ config_key: "BED_TYPES" });
    if (config && config.config_value) {
      try {
        const parsed = JSON.parse(config.config_value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json(parsed);
        }
      } catch (e) {
        // Fallback
      }
    }
    res.json(DEFAULT_BED_TYPES);
  } catch (err) {
    next(err);
  }
});

const DEFAULT_HOTEL_AMENITIES = [
  {
    name: "Bể Bơi",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18c1.5 1.5 3.5 1.5 5 0 1.5-1.5 3.5-1.5 5 0 1.5 1.5 3.5 1.5 5 0 1.5-1.5 3.5-1.5 5 0"/><path d="M2 14c1.5 1.5 3.5 1.5 5 0 1.5-1.5 3.5-1.5 5 0 1.5 1.5 3.5 1.5 5 0 1.5-1.5 3.5-1.5 5 0"/><path d="M6 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="m14 10-4-2-2 3"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Bãi để xe",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h3a2 2 0 0 1 0 4H4V4Z"/><path d="M4 8v12"/><rect width="14" height="8" x="7" y="12" rx="2"/><circle cx="10" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Spa",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 3-4 6-4 6s-4-3-4-6a4 4 0 0 1 4-4Z"/><path d="M9 13a4.5 4.5 0 0 0-7 3.5A4.5 4.5 0 0 0 6.5 21c3.5 0 5.5-3 5.5-3"/><path d="M15 13a4.5 4.5 0 0 1 7 3.5 4.5 4.5 0 0 1-4.5 4.5c-3.5 0-5.5-3-5.5-3"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Xông khô",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v8a3 3 0 0 0 3 3Z"/><path d="M16 6c1 1 1 2 0 3s-1 2 0 3"/><path d="M19 5c1 1 1 2 0 3s-1 2 0 3"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Không hút thuốc",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18 8h3a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-7"/><path d="M3 14h7V9H5a2 2 0 0 0-2 2v3Z"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Wi-Fi [miễn phí]",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Đưa đón sân bay",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8h5l2 4v5h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3v-5l2-4h5"/><circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/><path d="M10 2 8 6h5l2-4h-5Z"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Được phép đưa thú nuôi vào",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="4" cy="8" r="2"/><path d="M9 10a5 5 0 0 1 7 0c2 2 2 5-1 7l-2.5 3-2.5-3c-3-2-3-5-1-7Z"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Phòng tập",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 16-2.5-2.5-3.5 3.5 2.5 2.5a2 2 0 0 0 2.8 0l.7-.7a2 2 0 0 0 0-2.8Z"/><path d="m3 8 2.5 2.5 3.5-3.5L6.5 4.5a2 2 0 0 0-2.8 0l-.7.7a2 2 0 0 0 0 2.8Z"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Khu vực hút thuốc",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 12h4"/><path d="M18 16h4"/><path d="M2 16h12a2 2 0 0 0 2-2v-4H2v6Z"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Bàn tiếp tân [24 giờ]",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/><path d="M3 21h18"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "máy điều hòa",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="M2 12h20"/><path d="m19.07 4.93-14.14 14.14"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Nhà hàng",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v20"/><path d="M6 2v7a3 3 0 0 0 6 0V2"/><path d="M9 12v10"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Câu lạc bộ đêm",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    type: "HOTEL_FACILITY"
  },
  {
    name: "Tiện nghi cho khách khuyết tật",
    icon_url: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M12 8v5l3 2v4"/><path d="M8 17a5 5 0 1 0 5-5"/></svg>',
    type: "HOTEL_FACILITY"
  }
];

// API danh mục tiện ích / dịch vụ từ DB
app.get("/api/amenities", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    let amenities = await Amenity.find(filter);

    if (req.query.type === "HOTEL_FACILITY") {
      const existingMap = new Map(amenities.map((a) => [a.name, a]));
      let hasUpdates = false;

      for (const def of DEFAULT_HOTEL_AMENITIES) {
        const item = existingMap.get(def.name);
        if (!item) {
          await Amenity.create(def).catch(() => {});
          hasUpdates = true;
        } else if (!item.icon_url || item.icon_url.trim() === "") {
          await Amenity.updateOne({ _id: item._id }, { icon_url: def.icon_url }).catch(() => {});
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        amenities = await Amenity.find(filter);
      }
      if (!amenities || amenities.length === 0) {
        return res.json(DEFAULT_HOTEL_AMENITIES);
      }
    }

    res.json(amenities);
  } catch (err) {
    if (req.query.type === "HOTEL_FACILITY") {
      return res.json(DEFAULT_HOTEL_AMENITIES);
    }
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/uploads", uploadRoutes);

// ========================================
// 7. Error handling middleware
// ========================================
app.use(notFound);
app.use(errorHandler);

// ========================================
// 8. Start server and connect database
// ========================================
const PORT = env.port || process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  connectDB();
});
