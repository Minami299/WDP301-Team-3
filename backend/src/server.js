const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

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
const facilityController = require("./controllers/facility.controller");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

// ========================================
// 2. Initialize Express application
// ========================================
const app = express();

if (process.env.TRUST_PROXY) {
  app.set("trust proxy", /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
}
app.use(cors());
app.use(express.json());
app.use('/api/catalog-images', express.static(path.resolve(__dirname, '../public/catalog')));

// ========================================
// 3. Health check route
// ========================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Travelio Backend is running",
  });
});

// ========================================
// 4. Register routes
// ========================================
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test", testRoutes);
  app.use("/api/test/auth", authTestRoutes);
}

app.get("/api/categories/bed-types", facilityController.getBedTypes);
app.get("/api/amenities", facilityController.getAmenities);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/checkin", require("./routes/checkin.routes"));
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
// Same business services, with a dedicated manager namespace. Permissions also
// protect the legacy /api/admin URLs for existing clients.
app.use('/api/manager', require('./middlewares/authMiddleware').verifyToken, require('./middlewares/authMiddleware').authorizeExactRoles('MANAGER'), adminRoutes);
app.use("/api/facilities", facilityRoutes);

// ========================================
// 5. Error handling middleware
// ========================================
app.use(notFound);
app.use(errorHandler);

// ========================================
// 6. Start server and background jobs
// ========================================
const PORT = env.port || process.env.PORT || 5000;

const scheduleBackgroundJob = (label, taskFn, intervalMs, initialDelayMs = 0) => {
  let running = false;
  const execute = async () => {
    if (running || mongoose.connection.readyState !== 1) return;
    running = true;
    try {
      await taskFn();
    } catch (error) {
      console.error(`${label} failed`, error.message);
    } finally {
      running = false;
    }
  };
  if (initialDelayMs > 0) {
    setTimeout(execute, initialDelayMs).unref();
  }
  setInterval(execute, intervalMs).unref();
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    const paymentService = require("./services/payment.service");
    const bookingService = require("./services/booking.service");

    scheduleBackgroundJob("PayOS reconcile", () => paymentService.reconcilePendingPayments(), 10 * 1000);
    scheduleBackgroundJob("Booking completion", () => bookingService.completeFinishedBookings(), 60 * 60 * 1000, 10 * 1000);
    scheduleBackgroundJob("Booking expiry", () => bookingService.expireStaleBookings(), 60 * 1000);
  });
});
