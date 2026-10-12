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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

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
