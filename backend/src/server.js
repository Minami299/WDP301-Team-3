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
const adminRoutes = require("./routes/admin.routes");
const facilityRoutes = require("./routes/facility.routes");
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

// API danh mục tiện ích / dịch vụ từ DB
app.get("/api/amenities", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    const amenities = await Amenity.find(filter).sort({ name: 1 });
    res.json(amenities);
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/facilities", facilityRoutes);

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
  setInterval(() => {
    require('./services/payment.service').reconcilePendingPayments().catch((error) => console.error('PayOS reconcile failed', error.message));
  }, 10 * 1000).unref();
  setTimeout(() => require('./services/booking.service').completeFinishedBookings().catch((error) => console.error('Booking completion failed', error.message)), 10 * 1000).unref();
  setInterval(() => {
    require('./services/booking.service').completeFinishedBookings().catch((error) => console.error('Booking completion failed', error.message));
  }, 60 * 60 * 1000).unref();
  setInterval(() => {
    require('./services/booking.service').expireStaleBookings().catch((error) => console.error('Booking expiry failed', error.message));
  }, 60 * 1000).unref();

  connectDB();
});
